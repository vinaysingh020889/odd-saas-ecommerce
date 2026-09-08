import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Db = Prisma.TransactionClient | typeof prisma;

export const WALLET_PAYMENT_MAX_PERCENT = 50;
export const CASHBACK_VALIDITY_DAYS = 365;

async function lockAccount(accountId: string, db: Db) {
  await db.$queryRawUnsafe('SELECT id FROM "WalletAccount" WHERE id = $1 FOR UPDATE', accountId);
}

async function availableBalance(walletAccountId: string, db: Db) {
  const result = await db.walletTransaction.aggregate({
    where: { walletAccountId, bucket: "AVAILABLE", status: { in: ["POSTED", "LOCKED"] } },
    _sum: { amount: true }
  });
  return Number(result._sum.amount ?? 0);
}

export async function expireWalletCredits(tenantId: string, userId: string, db: Db = prisma, now = new Date()) {
  const account = await db.walletAccount.findUnique({
    where: { tenantId_userId_currency: { tenantId, userId, currency: "INR" } }
  });
  if (!account) return 0;
  await lockAccount(account.id, db);
  const transactions = await db.walletTransaction.findMany({
    where: { walletAccountId: account.id, bucket: "AVAILABLE", status: { in: ["POSTED", "LOCKED"] } },
    orderBy: [{ createdAt: "asc" }]
  });
  const credits = transactions.filter((item) => item.type === "CASHBACK_RELEASE" && Number(item.amount) > 0);
  const remaining = new Map(credits.map((credit) => [credit.id, Number(credit.amount)]));
  const metadataId = (value: unknown, key: string) =>
    value && typeof value === "object" && !Array.isArray(value) && key in value ? String((value as Record<string, unknown>)[key] ?? "") : "";

  for (const transaction of transactions.filter((item) => Number(item.amount) < 0)) {
    let debit = Math.abs(Number(transaction.amount));
    const linkedCreditId =
      transaction.type === "CASHBACK_EXPIRY"
        ? metadataId(transaction.metadataJson, "expiredCreditId")
        : transaction.type === "CASHBACK_REVERSAL"
          ? metadataId(transaction.metadataJson, "availableTransactionId")
          : "";
    if (linkedCreditId && remaining.has(linkedCreditId)) {
      remaining.set(linkedCreditId, Math.max(0, (remaining.get(linkedCreditId) ?? 0) - debit));
      continue;
    }
    for (const credit of credits) {
      const value = remaining.get(credit.id) ?? 0;
      const used = Math.min(value, debit);
      remaining.set(credit.id, value - used);
      debit -= used;
      if (debit <= 0) break;
    }
  }

  let expiredTotal = 0;
  for (const credit of credits.filter((item) => item.expiresAt && item.expiresAt <= now)) {
    const amount = remaining.get(credit.id) ?? 0;
    if (amount <= 0) continue;
    const idempotencyKey = "cashback:" + credit.id + ":expiry";
    await db.walletTransaction.upsert({
      where: { idempotencyKey },
      create: {
        tenantId, userId, walletAccountId: account.id, type: "CASHBACK_EXPIRY", bucket: "AVAILABLE", status: "POSTED",
        amount: -amount, currency: account.currency, idempotencyKey,
        description: "Expired cashback: " + credit.description,
        metadataJson: { source: "OMD_COMMERCE", version: 1, expiredCreditId: credit.id }
      },
      update: {}
    });
    expiredTotal += amount;
  }
  return expiredTotal;
}

export type WalletBalances = {
  pending: number;
  available: number;
  currency: string;
};

async function accountFor(tenantId: string, userId: string, currency: string, db: Db) {
  return db.walletAccount.upsert({
    where: { tenantId_userId_currency: { tenantId, userId, currency } },
    create: { tenantId, userId, currency },
    update: {}
  });
}

export async function releaseAbandonedWalletLocksForUser(tenantId: string, userId: string, db: Db = prisma, now = new Date()) {
  const cutoff = new Date(now.getTime() - 30 * 60 * 1000);
  const locks = await db.walletTransaction.findMany({
    where: { tenantId, userId, type: "ORDER_DEBIT", status: "LOCKED", createdAt: { lte: cutoff } },
    include: { order: { select: { id: true, paymentStatus: true, totalAmount: true, walletAmount: true } } }
  });
  let released = 0;
  for (const lock of locks) {
    if (!lock.order || ["succeeded", "refunded"].includes(lock.order.paymentStatus)) continue;
    const claimed = await db.walletTransaction.updateMany({ where: { id: lock.id, status: "LOCKED" }, data: { status: "RELEASED", description: lock.description.replace("reserved", "released after payment timeout") } });
    if (claimed.count === 0) continue;
    await db.paymentAttempt.updateMany({ where: { orderId: lock.order.id, status: { in: ["created", "pending"] } }, data: { status: "expired" } });
    await db.order.update({
      where: { id: lock.order.id },
      data: {
        status: "expired",
        paymentStatus: "expired",
        totalAmount: Number(lock.order.totalAmount) + Number(lock.order.walletAmount),
        walletAmount: 0
      }
    });
    released += Math.abs(Number(lock.amount));
  }
  return released;
}
export async function getWalletSnapshot(tenantId: string, userId: string, db: Db = prisma) {
  await releaseAbandonedWalletLocksForUser(tenantId, userId, db);
  await expireWalletCredits(tenantId, userId, db);
  const account = await db.walletAccount.findUnique({
    where: { tenantId_userId_currency: { tenantId, userId, currency: "INR" } }
  });
  if (!account) {
    return { status: "ACTIVE", syncStatus: "LOCAL_ONLY", account: null, balances: { pending: 0, available: 0, currency: "INR" }, transactions: [] };
  }
  const [pending, available, transactions] = await Promise.all([
    db.walletTransaction.aggregate({ where: { walletAccountId: account.id, bucket: "PENDING", status: "PENDING" }, _sum: { amount: true } }),
    db.walletTransaction.aggregate({ where: { walletAccountId: account.id, bucket: "AVAILABLE", status: { in: ["POSTED", "LOCKED"] } }, _sum: { amount: true } }),
    db.walletTransaction.findMany({ where: { walletAccountId: account.id }, orderBy: { createdAt: "desc" }, take: 100 })
  ]);
  const balances: WalletBalances = {
    pending: Number(pending._sum.amount ?? 0),
    available: Number(available._sum.amount ?? 0),
    currency: account.currency
  };
  return { status: account.status, syncStatus: account.syncStatus, account, balances, transactions };
}

export async function createPendingCashbackForOrder(orderId: string, db: Db) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { id: true, tenantId: true, userId: true, orderNumber: true, currency: true, cashbackPromiseAmount: true, paymentStatus: true }
  });
  const amount = Number(order.cashbackPromiseAmount);
  if (amount <= 0 || order.paymentStatus !== "succeeded") return null;
  const account = await accountFor(order.tenantId, order.userId, order.currency, db);
  return db.walletTransaction.upsert({
    where: { idempotencyKey: `cashback:${order.id}:pending` },
    create: {
      tenantId: order.tenantId,
      userId: order.userId,
      walletAccountId: account.id,
      orderId: order.id,
      type: "CASHBACK_EARN",
      bucket: "PENDING",
      status: "PENDING",
      amount,
      currency: order.currency,
      idempotencyKey: `cashback:${order.id}:pending`,
      description: `Cashback pending for order ${order.orderNumber}`,
      metadataJson: { source: "OMD_COMMERCE", version: 1 }
    },
    update: {}
  });
}

export async function releaseCashbackForOrder(orderId: string, db: Db) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { id: true, tenantId: true, userId: true, orderNumber: true, currency: true, cashbackPromiseAmount: true, paymentStatus: true, fulfillmentStatus: true }
  });
  const amount = Number(order.cashbackPromiseAmount);
  if (amount <= 0 || order.paymentStatus !== "succeeded" || order.fulfillmentStatus !== "delivered") return null;
  const account = await accountFor(order.tenantId, order.userId, order.currency, db);
  const pending = await db.walletTransaction.findUnique({ where: { idempotencyKey: `cashback:${order.id}:pending` } });
  const availableAt = new Date();
  const expiresAt = new Date(availableAt.getTime() + CASHBACK_VALIDITY_DAYS * 24 * 60 * 60 * 1000);
  if (pending?.status === "PENDING") {
    await db.walletTransaction.update({ where: { id: pending.id }, data: { status: "RELEASED", availableAt } });
  }
  return db.walletTransaction.upsert({
    where: { idempotencyKey: `cashback:${order.id}:available` },
    create: {
      tenantId: order.tenantId,
      userId: order.userId,
      walletAccountId: account.id,
      orderId: order.id,
      type: "CASHBACK_RELEASE",
      bucket: "AVAILABLE",
      status: "POSTED",
      amount,
      currency: order.currency,
      idempotencyKey: `cashback:${order.id}:available`,
      description: `Cashback available from order ${order.orderNumber}`,
      availableAt,
      expiresAt,
      metadataJson: { source: "OMD_COMMERCE", version: 1 }
    },
    update: {}
  });
}

export async function reverseCashbackForOrder(orderId: string, db: Db) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { id: true, tenantId: true, userId: true, orderNumber: true, currency: true }
  });
  const pending = await db.walletTransaction.findUnique({ where: { idempotencyKey: `cashback:${order.id}:pending` } });
  if (pending?.status === "PENDING") {
    await db.walletTransaction.update({ where: { id: pending.id }, data: { status: "REVERSED" } });
  }
  const available = await db.walletTransaction.findUnique({ where: { idempotencyKey: `cashback:${order.id}:available` } });
  if (!available || available.status !== "POSTED") return null;
  return db.walletTransaction.upsert({
    where: { idempotencyKey: `cashback:${order.id}:reversal` },
    create: {
      tenantId: order.tenantId,
      userId: order.userId,
      walletAccountId: available.walletAccountId,
      orderId: order.id,
      type: "CASHBACK_REVERSAL",
      bucket: "AVAILABLE",
      status: "POSTED",
      amount: -Number(available.amount),
      currency: order.currency,
      idempotencyKey: `cashback:${order.id}:reversal`,
      description: `Cashback reversed for order ${order.orderNumber}`,
      metadataJson: { source: "OMD_COMMERCE", version: 1, availableTransactionId: available.id }
    },
    update: {}
  });
}

export async function lockWalletForOrder(input: { tenantId: string; userId: string; orderId: string; orderNumber: string; maximumAmount: number; currency: string }, db: Db) {
  const maximumAmount = Math.max(0, Math.round(input.maximumAmount * 100) / 100);
  if (maximumAmount <= 0) return null;
  const account = await accountFor(input.tenantId, input.userId, input.currency, db);
  await lockAccount(account.id, db);
  await expireWalletCredits(input.tenantId, input.userId, db);
  const idempotencyKey = `wallet:${input.orderId}:debit`;
  const existing = await db.walletTransaction.findUnique({ where: { idempotencyKey } });
  if (existing) return existing;
  const amount = Math.min(await availableBalance(account.id, db), maximumAmount);
  if (amount <= 0) return null;
  return db.walletTransaction.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      walletAccountId: account.id,
      orderId: input.orderId,
      type: "ORDER_DEBIT",
      bucket: "AVAILABLE",
      status: "LOCKED",
      amount: -amount,
      currency: input.currency,
      idempotencyKey,
      description: `Wallet reserved for order ${input.orderNumber}`,
      metadataJson: { source: "OMD_COMMERCE", version: 1 }
    }
  });
}

export async function confirmWalletDebitForOrder(orderId: string, db: Db) {
  const debit = await db.walletTransaction.findUnique({ where: { idempotencyKey: `wallet:${orderId}:debit` } });
  if (!debit || debit.status !== "LOCKED") return debit;
  return db.walletTransaction.update({
    where: { id: debit.id },
    data: { status: "POSTED", description: debit.description.replace("reserved", "used") }
  });
}

export async function releaseWalletLockForOrder(orderId: string, db: Db) {
  const debit = await db.walletTransaction.findUnique({ where: { idempotencyKey: `wallet:${orderId}:debit` } });
  if (!debit || debit.status !== "LOCKED") return debit;
  return db.walletTransaction.update({
    where: { id: debit.id },
    data: { status: "RELEASED", description: debit.description.replace("reserved", "released") }
  });
}

export async function reverseWalletDebitForOrder(orderId: string, db: Db) {
  const order = await db.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { id: true, tenantId: true, userId: true, orderNumber: true, currency: true }
  });
  const debit = await db.walletTransaction.findUnique({ where: { idempotencyKey: `wallet:${orderId}:debit` } });
  if (!debit) return null;
  if (debit.status === "LOCKED") return releaseWalletLockForOrder(orderId, db);
  if (debit.status !== "POSTED") return null;
  return db.walletTransaction.upsert({
    where: { idempotencyKey: `wallet:${orderId}:reversal` },
    create: {
      tenantId: order.tenantId,
      userId: order.userId,
      walletAccountId: debit.walletAccountId,
      orderId,
      type: "ORDER_DEBIT_REVERSAL",
      bucket: "AVAILABLE",
      status: "POSTED",
      amount: Math.abs(Number(debit.amount)),
      currency: order.currency,
      idempotencyKey: `wallet:${orderId}:reversal`,
      description: `Wallet value returned for refunded order ${order.orderNumber}`,
      metadataJson: { source: "OMD_COMMERCE", version: 1, debitTransactionId: debit.id }
    },
    update: {}
  });
}

export async function createWalletAdjustment(input: { tenantId: string; userId: string; amount: number; reason: string; actorId: string; idempotencyKey: string }, db: Db) {
  const amount = Math.round(input.amount * 100) / 100;
  if (!amount) throw new Error("Adjustment amount must be greater than zero.");
  if (input.reason.trim().length < 5) throw new Error("A clear adjustment reason is required.");
  const account = await accountFor(input.tenantId, input.userId, "INR", db);
  await lockAccount(account.id, db);
  if (amount < 0 && (await availableBalance(account.id, db)) < Math.abs(amount)) {
    throw new Error("The wallet does not have enough available value for this debit.");
  }
  return db.walletTransaction.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      tenantId: input.tenantId,
      userId: input.userId,
      walletAccountId: account.id,
      type: "ADMIN_ADJUSTMENT",
      bucket: "AVAILABLE",
      status: "POSTED",
      amount,
      currency: account.currency,
      idempotencyKey: input.idempotencyKey,
      description: input.reason.trim(),
      metadataJson: { source: "OMD_ADMIN", version: 1, actorId: input.actorId }
    },
    update: {}
  });
}
