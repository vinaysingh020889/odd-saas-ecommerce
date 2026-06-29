import type { AsthiApplicationStatus, AsthiPaymentStatus, InventoryMovementType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getVariantStockSummary, isPhysicalInventoryType } from "@/lib/inventory";
import { invoiceNumberForOrder } from "@/lib/checkout-maturity";

type PrismaExecutor = Prisma.TransactionClient;

const PROVIDER = "MOCK";
const pendingAttemptStatuses = ["created", "pending"];
const retryablePaymentStatuses = ["not_started", "failed", "cancelled", "expired"];

type PaymentActor = {
  id: string;
  roles?: string[];
};

type InventoryTarget = {
  productId: string | null;
  variantId: string;
  orderItemId: string;
  quantity: number;
  reason: string;
  metadataJson?: Prisma.InputJsonValue;
};

function isAdmin(actor: PaymentActor) {
  return actor.roles?.some((role) => ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"].includes(role)) ?? false;
}

function assertOrderAccess(actor: PaymentActor, orderUserId: string) {
  if (actor.id !== orderUserId && !isAdmin(actor)) {
    throw new Error("You cannot access this payment.");
  }
}

function addOneMonth(date: Date) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  return next;
}

async function inventoryMovementTotals(
  tx: PrismaExecutor,
  tenantId: string,
  orderId: string,
  movementType: InventoryMovementType
) {
  const rows = await tx.inventoryLedger.groupBy({
    by: ["variantId", "productId", "orderItemId"],
    where: { tenantId, orderId, movementType },
    _sum: { quantity: true }
  });

  return new Map(rows.map((row) => [`${row.variantId}:${row.orderItemId ?? ""}`, row._sum.quantity ?? 0]));
}

async function getActiveReservedTargets(tx: PrismaExecutor, tenantId: string, orderId: string) {
  const reservedRows = await tx.inventoryLedger.groupBy({
    by: ["variantId", "productId", "orderItemId"],
    where: { tenantId, orderId, movementType: "reserved" },
    _sum: { quantity: true }
  });
  const released = await inventoryMovementTotals(tx, tenantId, orderId, "released");

  return reservedRows
    .map((row) => {
      const key = `${row.variantId}:${row.orderItemId ?? ""}`;
      return {
        productId: row.productId,
        variantId: row.variantId,
        orderItemId: row.orderItemId,
        quantity: Math.max(0, (row._sum.quantity ?? 0) - (released.get(key) ?? 0))
      };
    })
    .filter((target) => target.quantity > 0 && target.orderItemId);
}

async function resolveInventoryTargetsForOrder(tx: PrismaExecutor, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            include: {
              kitComponents: {
                include: {
                  componentProduct: { select: { id: true, type: true, title: true } },
                  componentVariant: { select: { id: true, sku: true, title: true } }
                }
              }
            }
          }
        }
      }
    }
  });

  const targets: InventoryTarget[] = [];

  for (const item of order.items) {
    if (item.product.type === "KIT" && item.product.kitComponents.length > 0) {
      for (const component of item.product.kitComponents) {
        if (!component.componentVariantId || !isPhysicalInventoryType(component.componentProduct.type)) {
          continue;
        }

        targets.push({
          productId: component.componentProductId,
          variantId: component.componentVariantId,
          orderItemId: item.id,
          quantity: item.quantity * component.quantity,
          reason: "Reserved component stock for kit payment retry.",
          metadataJson: {
            source: "kit_component",
            kitProductId: item.productId,
            componentQuantity: component.quantity
          }
        });
      }
      continue;
    }

    if (isPhysicalInventoryType(item.product.type)) {
      if (!item.variantId) {
        throw new Error("Physical order item requires an inventory-tracked variant.");
      }

      targets.push({
        productId: item.productId,
        variantId: item.variantId,
        orderItemId: item.id,
        quantity: item.quantity,
        reason: "Reserved stock for payment retry."
      });
    }
  }

  return { order, targets };
}

async function ensureOrderInventoryReserved(tx: PrismaExecutor, orderId: string, actorId?: string) {
  const { order, targets } = await resolveInventoryTargetsForOrder(tx, orderId);
  const activeReservations = await getActiveReservedTargets(tx, order.tenantId, order.id);
  const activeByKey = new Map(activeReservations.map((target) => [`${target.variantId}:${target.orderItemId}`, target.quantity]));

  for (const target of targets) {
    const key = `${target.variantId}:${target.orderItemId}`;
    const missingQuantity = target.quantity - (activeByKey.get(key) ?? 0);

    if (missingQuantity <= 0) {
      continue;
    }

    const stock = await getVariantStockSummary(target.variantId, tx);

    if (stock.available < missingQuantity) {
      throw new Error(`Insufficient stock to retry payment. Available: ${stock.available}, required: ${missingQuantity}.`);
    }

    await tx.inventoryLedger.create({
      data: {
        tenantId: order.tenantId,
        productId: target.productId,
        variantId: target.variantId,
        orderId: order.id,
        orderItemId: target.orderItemId,
        movementType: "reserved",
        quantity: missingQuantity,
        reason: target.reason,
        actorId,
        metadataJson: target.metadataJson
      }
    });
  }
}

async function releaseActiveReservations(tx: PrismaExecutor, orderId: string, reason: string, actorId?: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { id: true, tenantId: true } });
  const targets = await getActiveReservedTargets(tx, order.tenantId, order.id);
  let releasedQuantity = 0;

  for (const target of targets) {
    await tx.inventoryLedger.create({
      data: {
        tenantId: order.tenantId,
        productId: target.productId,
        variantId: target.variantId,
        orderId: order.id,
        orderItemId: target.orderItemId,
        movementType: "released",
        quantity: target.quantity,
        reason,
        actorId
      }
    });
    releasedQuantity += target.quantity;
  }

  return releasedQuantity;
}

async function sellActiveReservations(tx: PrismaExecutor, orderId: string, actorId?: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { id: true, tenantId: true } });
  const targets = await getActiveReservedTargets(tx, order.tenantId, order.id);
  let soldQuantity = 0;

  for (const target of targets) {
    await tx.inventoryLedger.create({
      data: {
        tenantId: order.tenantId,
        productId: target.productId,
        variantId: target.variantId,
        orderId: order.id,
        orderItemId: target.orderItemId,
        movementType: "sold",
        quantity: target.quantity,
        reason: "Converted payment reservation to sold stock.",
        actorId
      }
    });
    await tx.inventoryLedger.create({
      data: {
        tenantId: order.tenantId,
        productId: target.productId,
        variantId: target.variantId,
        orderId: order.id,
        orderItemId: target.orderItemId,
        movementType: "released",
        quantity: target.quantity,
        reason: "Cleared reservation after stock was sold.",
        actorId
      }
    });
    soldQuantity += target.quantity;
  }

  return soldQuantity;
}

async function createOrGetMockEvent(
  tx: PrismaExecutor,
  attempt: { id: string; tenantId: string; orderId: string },
  eventType: string,
  payload: Prisma.InputJsonValue
) {
  const providerEventId = `mock_${attempt.id}_${eventType}`;

  return tx.paymentEvent.upsert({
    where: {
      provider_providerEventId: {
        provider: PROVIDER,
        providerEventId
      }
    },
    create: {
      tenantId: attempt.tenantId,
      paymentAttemptId: attempt.id,
      orderId: attempt.orderId,
      provider: PROVIDER,
      eventType,
      providerEventId,
      payloadJson: payload
    },
    update: {}
  });
}

async function activateMemberships(tx: PrismaExecutor, orderId: string) {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: { select: { type: true, title: true } }
        }
      }
    }
  });
  const now = new Date();
  const endsAt = addOneMonth(now);
  let activated = 0;

  for (const item of order.items) {
    if (item.itemType !== "MEMBERSHIP" && item.product.type !== "MEMBERSHIP") {
      continue;
    }

    await tx.membershipSubscription.upsert({
      where: { orderItemId: item.id },
      create: {
        tenantId: order.tenantId,
        userId: order.userId,
        orderId: order.id,
        orderItemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        status: "ACTIVE",
        startsAt: now,
        endsAt
      },
      update: {
        status: "ACTIVE",
        startsAt: now,
        endsAt
      }
    });

    activated += 1;
    await tx.orderActivity.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        type: "membership_activated",
        message: `Membership activated for ${item.titleSnapshot}.`,
        metadataJson: { orderItemId: item.id, startsAt: now.toISOString(), endsAt: endsAt.toISOString() }
      }
    });
  }

  return activated;
}

async function updateAsthiApplicationPayment(
  tx: PrismaExecutor,
  orderId: string,
  actorId: string | undefined,
  paymentStatus: AsthiPaymentStatus,
  status: AsthiApplicationStatus,
  message: string
) {
  const application = await tx.asthiApplication.findUnique({
    where: { orderId },
    select: { id: true, tenantId: true, applicationNo: true }
  });

  if (!application) {
    return;
  }

  await tx.asthiApplication.update({
    where: { id: application.id },
    data: { paymentStatus, status }
  });

  await tx.asthiActivity.create({
    data: {
      tenantId: application.tenantId,
      applicationId: application.id,
      actorId,
      type: paymentStatus,
      message,
      metadataJson: { orderId }
    }
  });
}

export async function createMockPaymentAttempt(orderId: string, actor: PaymentActor) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 } }
    });

    assertOrderAccess(actor, order.userId);

    if (order.paymentStatus === "succeeded") {
      throw new Error("This order is already paid.");
    }

    if (order.status === "cancelled") {
      throw new Error("Cancelled admin order drafts cannot be paid.");
    }

    if (!["payment_pending", "failed", "expired"].includes(order.status) || !retryablePaymentStatuses.includes(order.paymentStatus)) {
      throw new Error("This order is not eligible for payment.");
    }

    const existingPending = await tx.paymentAttempt.findFirst({
      where: { orderId: order.id, provider: PROVIDER, status: { in: pendingAttemptStatuses } },
      orderBy: { createdAt: "desc" }
    });

    if (existingPending) {
      return existingPending;
    }

    await ensureOrderInventoryReserved(tx, order.id, actor.id);

    const attemptNo = await tx.paymentAttempt.count({ where: { orderId: order.id, provider: PROVIDER } });
    const attempt = await tx.paymentAttempt.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        provider: PROVIDER,
        providerOrderId: `mock_order_${order.id}_${attemptNo + 1}`,
        amount: order.totalAmount,
        currency: order.currency,
        status: "pending",
        attemptNo: attemptNo + 1,
        metadataJson: { checkoutMode: "mock" }
      }
    });

    await tx.order.update({
      where: { id: order.id },
      data: { status: "payment_pending", paymentStatus: "pending" }
    });

    await tx.orderActivity.create({
      data: {
        tenantId: order.tenantId,
        orderId: order.id,
        actorId: actor.id,
        type: "payment_attempt_started",
        message: `Mock payment attempt #${attempt.attemptNo} started.`,
        metadataJson: { paymentAttemptId: attempt.id, providerOrderId: attempt.providerOrderId }
      }
    });

    return attempt;
  });
}

export async function simulateMockPaymentSuccess(paymentAttemptId: string, actor: PaymentActor) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUniqueOrThrow({
      where: { id: paymentAttemptId },
      include: { order: true }
    });
    assertOrderAccess(actor, attempt.order.userId);

    if (attempt.order.status === "cancelled") {
      throw new Error("Cancelled admin order drafts cannot process payment events.");
    }

    const event = await createOrGetMockEvent(tx, attempt, "payment.succeeded", {
      paymentAttemptId,
      providerPaymentId: `mock_pay_${attempt.id}`,
      amount: attempt.amount.toString(),
      currency: attempt.currency
    });

    if (event.processedAt || attempt.status === "succeeded") {
      if (!event.processedAt) {
        await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      }
      return attempt;
    }

    if (!pendingAttemptStatuses.includes(attempt.status)) {
      throw new Error("Only pending mock payment attempts can succeed.");
    }

    const soldQuantity = await sellActiveReservations(tx, attempt.orderId, actor.id);

    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "succeeded",
        providerPaymentId: `mock_pay_${attempt.id}`
      }
    });
    await tx.order.update({
      where: { id: attempt.orderId },
      data: {
        status: "confirmed",
        paymentStatus: "succeeded",
        invoiceNumber: attempt.order.invoiceNumber ?? invoiceNumberForOrder(attempt.order.orderNumber),
        invoiceDate: attempt.order.invoiceDate ?? new Date()
      }
    });

    await tx.orderActivity.create({
      data: {
        tenantId: attempt.tenantId,
        orderId: attempt.orderId,
        actorId: actor.id,
        type: "payment_succeeded",
        message: "Mock payment succeeded and order was confirmed.",
        metadataJson: { paymentAttemptId: attempt.id, soldQuantity }
      }
    });
    await tx.orderActivity.create({
      data: {
        tenantId: attempt.tenantId,
        orderId: attempt.orderId,
        actorId: actor.id,
        type: "stock_sold",
        message: `Converted ${soldQuantity} reserved unit(s) to sold stock.`,
        metadataJson: { paymentAttemptId: attempt.id, soldQuantity }
      }
    });

    await activateMemberships(tx, attempt.orderId);
    await updateAsthiApplicationPayment(
      tx,
      attempt.orderId,
      actor.id,
      "CONFIRMED",
      "DOCUMENTS_UNDER_REVIEW",
      "Mock payment was confirmed. Document verification is the next step."
    );
    await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });

    return attempt;
  });
}

async function simulateTerminalPaymentEvent(
  paymentAttemptId: string,
  actor: PaymentActor,
  status: "failed" | "cancelled" | "expired",
  eventType: string,
  orderStatus: "failed" | "payment_pending" | "expired",
  message: string
) {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUniqueOrThrow({
      where: { id: paymentAttemptId },
      include: { order: true }
    });
    assertOrderAccess(actor, attempt.order.userId);

    if (attempt.order.status === "cancelled") {
      throw new Error("Cancelled admin order drafts cannot process payment events.");
    }

    const event = await createOrGetMockEvent(tx, attempt, eventType, {
      paymentAttemptId,
      amount: attempt.amount.toString(),
      currency: attempt.currency
    });

    if (event.processedAt || attempt.status === status) {
      if (!event.processedAt) {
        await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
      }
      return attempt;
    }

    if (!pendingAttemptStatuses.includes(attempt.status)) {
      throw new Error("Only pending mock payment attempts can change terminal status.");
    }

    const releasedQuantity = await releaseActiveReservations(tx, attempt.orderId, message, actor.id);

    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status } });
    await tx.order.update({
      where: { id: attempt.orderId },
      data: { status: orderStatus, paymentStatus: status }
    });
    await tx.orderActivity.create({
      data: {
        tenantId: attempt.tenantId,
        orderId: attempt.orderId,
        actorId: actor.id,
        type: `payment_${status}`,
        message,
        metadataJson: { paymentAttemptId: attempt.id, releasedQuantity }
      }
    });
    await tx.orderActivity.create({
      data: {
        tenantId: attempt.tenantId,
        orderId: attempt.orderId,
        actorId: actor.id,
        type: "stock_released",
        message: `Released ${releasedQuantity} reserved unit(s) after mock payment ${status}.`,
        metadataJson: { paymentAttemptId: attempt.id, releasedQuantity }
      }
    });
    await updateAsthiApplicationPayment(
      tx,
      attempt.orderId,
      actor.id,
      status === "failed" ? "FAILED" : "PENDING",
      "PAYMENT_PENDING",
      status === "failed"
        ? "Mock payment failed. The application is saved and payment can be retried."
        : "Mock payment was cancelled or expired. The application is saved and payment can be retried."
    );
    await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });

    return attempt;
  });
}

export async function simulateMockPaymentFailure(paymentAttemptId: string, actor: PaymentActor) {
  return simulateTerminalPaymentEvent(
    paymentAttemptId,
    actor,
    "failed",
    "payment.failed",
    "failed",
    "Mock payment failed. Reserved stock was released and the order can be retried."
  );
}

export async function simulateMockPaymentCancel(paymentAttemptId: string, actor: PaymentActor) {
  return simulateTerminalPaymentEvent(
    paymentAttemptId,
    actor,
    "cancelled",
    "payment.cancelled",
    "payment_pending",
    "Mock payment was cancelled. Reserved stock was released and the customer can retry."
  );
}

export async function expireMockPaymentAttempt(paymentAttemptId: string, actor: PaymentActor) {
  return simulateTerminalPaymentEvent(
    paymentAttemptId,
    actor,
    "expired",
    "payment.expired",
    "expired",
    "Mock payment expired. Reserved stock was released and the order can be retried."
  );
}
