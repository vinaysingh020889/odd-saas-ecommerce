import { describe, expect, it, vi } from "vitest";
import { confirmWalletDebitForOrder, createPendingCashbackForOrder, createWalletAdjustment, expireWalletCredits, getWalletSnapshot, lockWalletForOrder, releaseCashbackForOrder, releaseWalletLockForOrder, reverseCashbackForOrder, reverseWalletDebitForOrder } from "./wallet";

function dbMock() {
  return {
    order: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    paymentAttempt: { updateMany: vi.fn() },
    walletAccount: { upsert: vi.fn(), findUnique: vi.fn() },
    walletTransaction: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      aggregate: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn()
    },
    $queryRawUnsafe: vi.fn()
  };
}

describe("ODD wallet ledger", () => {
  it("calculates balances from full-ledger aggregates while limiting visible history", async () => {
    const db = dbMock();
    db.walletAccount.findUnique.mockResolvedValue({ id: "wallet", currency: "INR", status: "ACTIVE", syncStatus: "LOCAL_ONLY" });
    db.walletTransaction.aggregate.mockResolvedValueOnce({ _sum: { amount: 25 } }).mockResolvedValueOnce({ _sum: { amount: 80 } });
    db.walletTransaction.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "recent" }]);

    const result = await getWalletSnapshot("tenant", "user", db as never);

    expect(result.balances).toEqual({ pending: 25, available: 80, currency: "INR" });
    expect(db.walletTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }));
  });

  it("creates one idempotent pending cashback entry after successful payment", async () => {
    const db = dbMock();
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "order", tenantId: "tenant", userId: "user", orderNumber: "ODD-1", currency: "INR", cashbackPromiseAmount: 10, paymentStatus: "succeeded" });
    db.walletAccount.upsert.mockResolvedValue({ id: "wallet" });
    db.walletTransaction.upsert.mockResolvedValue({ id: "pending" });

    await createPendingCashbackForOrder("order", db as never);

    expect(db.walletTransaction.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: "cashback:order:pending" },
      create: expect.objectContaining({ amount: 10, bucket: "PENDING", status: "PENDING" }),
      update: {}
    }));
  });

  it("releases pending cashback once when a paid order is delivered", async () => {
    const db = dbMock();
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "order", tenantId: "tenant", userId: "user", orderNumber: "ODD-1", currency: "INR", cashbackPromiseAmount: 10, paymentStatus: "succeeded", fulfillmentStatus: "delivered" });
    db.walletAccount.upsert.mockResolvedValue({ id: "wallet" });
    db.walletTransaction.findUnique.mockResolvedValue({ id: "pending", status: "PENDING" });
    db.walletTransaction.upsert.mockResolvedValue({ id: "available" });

    await releaseCashbackForOrder("order", db as never);

    expect(db.walletTransaction.update).toHaveBeenCalledWith({ where: { id: "pending" }, data: expect.objectContaining({ status: "RELEASED" }) });
    expect(db.walletTransaction.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { idempotencyKey: "cashback:order:available" }, update: {} }));
  });

  it("reverses both pending and released cashback without duplicate credits", async () => {
    const db = dbMock();
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "order", tenantId: "tenant", userId: "user", orderNumber: "ODD-1", currency: "INR" });
    db.walletTransaction.findUnique
      .mockResolvedValueOnce({ id: "pending", status: "PENDING" })
      .mockResolvedValueOnce({ id: "available", status: "POSTED", amount: 10, walletAccountId: "wallet" });
    db.walletTransaction.upsert.mockResolvedValue({ id: "reversal" });

    await reverseCashbackForOrder("order", db as never);

    expect(db.walletTransaction.update).toHaveBeenCalledWith({ where: { id: "pending" }, data: { status: "REVERSED" } });
    expect(db.walletTransaction.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: "cashback:order:reversal" },
      create: expect.objectContaining({ amount: -10, type: "CASHBACK_REVERSAL" }),
      update: {}
    }));
  });

  it("reserves, settles, and returns wallet value through the order lifecycle", async () => {
    const db = dbMock();
    db.walletAccount.upsert.mockResolvedValue({ id: "wallet", currency: "INR" });
    db.walletAccount.findUnique.mockResolvedValue({ id: "wallet", currency: "INR" });
    db.walletTransaction.aggregate.mockResolvedValue({ _sum: { amount: 80 } });
    db.walletTransaction.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "debit", status: "LOCKED", amount: -50, description: "Wallet reserved for order ODD-1" })
      .mockResolvedValueOnce({ id: "debit", status: "POSTED", amount: -50, walletAccountId: "wallet" });
    db.walletTransaction.create.mockResolvedValue({ id: "debit", status: "LOCKED", amount: -50 });
    db.walletTransaction.update.mockResolvedValue({ id: "debit", status: "POSTED", amount: -50 });
    db.order.findUniqueOrThrow.mockResolvedValue({ id: "order", tenantId: "tenant", userId: "user", orderNumber: "ODD-1", currency: "INR" });
    db.walletTransaction.upsert.mockResolvedValue({ id: "return", amount: 50 });

    const locked = await lockWalletForOrder({ tenantId: "tenant", userId: "user", orderId: "order", orderNumber: "ODD-1", maximumAmount: 50, currency: "INR" }, db as never);
    await confirmWalletDebitForOrder("order", db as never);
    await reverseWalletDebitForOrder("order", db as never);

    expect(Number(locked?.amount)).toBe(-50);
    expect(db.walletTransaction.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "POSTED" }) }));
    expect(db.walletTransaction.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: "wallet:order:reversal" },
      create: expect.objectContaining({ amount: 50, type: "ORDER_DEBIT_REVERSAL" })
    }));
  });

  it("releases an unpaid wallet reservation without changing the ledger balance", async () => {
    const db = dbMock();
    db.walletTransaction.findUnique.mockResolvedValue({ id: "debit", status: "LOCKED", description: "Wallet reserved for order ODD-1" });
    await releaseWalletLockForOrder("order", db as never);
    expect(db.walletTransaction.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "RELEASED" }) }));
  });

  it("expires only remaining available cashback and records an idempotent debit", async () => {
    const db = dbMock();
    db.walletAccount.findUnique.mockResolvedValue({ id: "wallet", currency: "INR" });
    db.walletTransaction.findMany.mockResolvedValue([
      { id: "credit", type: "CASHBACK_RELEASE", amount: 25, description: "Cashback available", expiresAt: new Date(0), createdAt: new Date(0), metadataJson: null },
      { id: "spend", type: "ORDER_DEBIT", amount: -15, expiresAt: null, createdAt: new Date(1), metadataJson: null }
    ]);
    db.walletTransaction.findUnique.mockResolvedValue(null);
    db.walletTransaction.aggregate.mockResolvedValue({ _sum: { amount: 10 } });
    await expect(expireWalletCredits("tenant", "user", db as never, new Date())).resolves.toBe(10);
    expect(db.walletTransaction.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { idempotencyKey: "cashback:credit:expiry" },
      create: expect.objectContaining({ amount: -10, type: "CASHBACK_EXPIRY" }),
      update: {}
    }));
  });

  it("requires a reason and prevents an admin debit above the available balance", async () => {
    const db = dbMock();
    db.walletAccount.upsert.mockResolvedValue({ id: "wallet", currency: "INR" });
    db.walletTransaction.aggregate.mockResolvedValue({ _sum: { amount: 5 } });
    await expect(createWalletAdjustment({ tenantId: "tenant", userId: "user", actorId: "admin", amount: -10, reason: "Verified correction", idempotencyKey: "adjustment" }, db as never)).rejects.toThrow(/enough available/);
    expect(db.walletTransaction.upsert).not.toHaveBeenCalled();
  });
});
