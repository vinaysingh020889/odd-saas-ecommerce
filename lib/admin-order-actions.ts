"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";

type OrderForGuard = {
  id: string;
  tenantId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  refundStatus: string;
};

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function isPaid(order: Pick<OrderForGuard, "paymentStatus">) {
  return order.paymentStatus === "succeeded";
}

function isClosed(order: Pick<OrderForGuard, "status" | "paymentStatus" | "fulfillmentStatus">) {
  return ["cancelled", "refunded"].includes(order.status) || order.paymentStatus === "refunded" || order.fulfillmentStatus === "refunded";
}

function assertPaid(order: OrderForGuard, action: string) {
  if (!isPaid(order)) {
    throw new Error(`Unpaid orders cannot be marked ${action}.`);
  }
}

function assertNotClosed(order: OrderForGuard) {
  if (isClosed(order)) {
    throw new Error("Cancelled or refunded orders have limited actions.");
  }
}

async function writeActivityAndAudit(
  tx: Prisma.TransactionClient,
  order: OrderForGuard,
  actorId: string,
  type: string,
  message: string,
  metadata?: Prisma.InputJsonValue
) {
  await tx.orderActivity.create({
    data: {
      tenantId: order.tenantId,
      orderId: order.id,
      actorId,
      type,
      message,
      metadataJson: metadata
    }
  });

  await tx.auditLog.create({
    data: {
      tenantId: order.tenantId,
      actorId,
      action: type,
      entity: "Order",
      entityId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        message,
        ...(metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {})
      }
    }
  });
}

async function findOrderForTenant(tx: Prisma.TransactionClient, tenantId: string, orderId: string) {
  const order = await tx.order.findFirst({
    where: { id: orderId, tenantId },
    select: {
      id: true,
      tenantId: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      fulfillmentStatus: true,
      refundStatus: true
    }
  });

  if (!order) {
    throw new Error("Order was not found for this tenant.");
  }

  return order;
}

async function releaseActiveReservations(
  tx: Prisma.TransactionClient,
  order: OrderForGuard,
  actorId: string,
  reason: string
) {
  const reserved = await tx.inventoryLedger.groupBy({
    by: ["variantId", "productId", "orderItemId"],
    where: { tenantId: order.tenantId, orderId: order.id, movementType: "reserved" },
    _sum: { quantity: true }
  });
  const released = await tx.inventoryLedger.groupBy({
    by: ["variantId", "productId", "orderItemId"],
    where: { tenantId: order.tenantId, orderId: order.id, movementType: "released" },
    _sum: { quantity: true }
  });
  const releasedByKey = new Map(released.map((row) => [`${row.variantId}:${row.orderItemId ?? ""}`, row._sum.quantity ?? 0]));
  let releasedQuantity = 0;

  for (const row of reserved) {
    const key = `${row.variantId}:${row.orderItemId ?? ""}`;
    const remaining = (row._sum.quantity ?? 0) - (releasedByKey.get(key) ?? 0);

    if (remaining > 0) {
      await tx.inventoryLedger.create({
        data: {
          tenantId: order.tenantId,
          productId: row.productId,
          variantId: row.variantId,
          orderId: order.id,
          orderItemId: row.orderItemId,
          movementType: "released",
          quantity: remaining,
          reason,
          actorId
        }
      });
      releasedQuantity += remaining;
    }
  }

  return releasedQuantity;
}

function revalidateOrder(orderId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin/memberships");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/dashboard");
}

async function updateOrderState(
  orderId: string,
  updater: (tx: Prisma.TransactionClient, order: OrderForGuard, adminId: string) => Promise<void>
) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();

  await prisma.$transaction(async (tx) => {
    const order = await findOrderForTenant(tx, tenantId, orderId);
    await updater(tx, order, admin.id);
  });

  revalidateOrder(orderId);
  redirect(`/admin/orders/${orderId}`);
}

export async function markOrderProcessingAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    assertPaid(order, "processing");
    assertNotClosed(order);
    if (["shipped", "delivered"].includes(order.fulfillmentStatus) || ["shipped", "delivered"].includes(order.status)) {
      throw new Error("Shipped or delivered orders cannot go back to processing.");
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "processing", fulfillmentStatus: "processing" }
    });
    await writeActivityAndAudit(tx, order, adminId, "order_processing", "Order moved to processing.");
  });
}

export async function markOrderReadyToShipAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    assertPaid(order, "ready to ship");
    assertNotClosed(order);
    if (["shipped", "delivered"].includes(order.fulfillmentStatus) || ["shipped", "delivered"].includes(order.status)) {
      throw new Error("Shipped or delivered orders cannot go back to ready to ship.");
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "ready_to_ship", fulfillmentStatus: "ready_to_ship" }
    });
    await writeActivityAndAudit(tx, order, adminId, "order_ready_to_ship", "Order marked ready to ship.");
  });
}

export async function markOrderShippedAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    assertPaid(order, "shipped");
    assertNotClosed(order);
    if (order.status === "delivered" || order.fulfillmentStatus === "delivered") {
      throw new Error("Delivered orders cannot be shipped again.");
    }

    const courierName = nullableText(formData, "courierName");
    const trackingNumber = nullableText(formData, "trackingNumber");
    const fulfillmentNote = nullableText(formData, "fulfillmentNote");

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "shipped",
        fulfillmentStatus: "shipped",
        courierName,
        trackingNumber,
        fulfillmentNote,
        shippedAt: new Date()
      }
    });
    await writeActivityAndAudit(tx, order, adminId, "order_shipped", "Order marked shipped.", { courierName, trackingNumber });
  });
}

export async function markOrderDeliveredAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    assertPaid(order, "delivered");
    assertNotClosed(order);
    if (order.status !== "shipped" && order.fulfillmentStatus !== "shipped") {
      throw new Error("Only shipped orders can be marked delivered.");
    }

    await tx.order.update({
      where: { id: order.id },
      data: { status: "delivered", fulfillmentStatus: "delivered", deliveredAt: new Date() }
    });
    await writeActivityAndAudit(tx, order, adminId, "order_delivered", "Order marked delivered.");
  });
}

export async function saveOrderTrackingAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    if (isClosed(order)) {
      throw new Error("Tracking cannot be updated on cancelled or refunded orders.");
    }

    const courierName = nullableText(formData, "courierName");
    const trackingNumber = nullableText(formData, "trackingNumber");
    const fulfillmentNote = nullableText(formData, "fulfillmentNote");

    await tx.order.update({
      where: { id: order.id },
      data: { courierName, trackingNumber, fulfillmentNote }
    });
    await writeActivityAndAudit(tx, order, adminId, "tracking_updated", "Tracking placeholder updated.", { courierName, trackingNumber });
  });
}

export async function cancelOperationalOrderAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    if (["shipped", "delivered", "refunded"].includes(order.status) || ["shipped", "delivered", "refunded"].includes(order.fulfillmentStatus)) {
      throw new Error("Shipped, delivered, or refunded orders cannot be cancelled here.");
    }

    const releasedQuantity = !isPaid(order)
      ? await releaseActiveReservations(tx, order, adminId, "Released because admin cancelled unpaid order.")
      : 0;

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "cancelled",
        paymentStatus: isPaid(order) ? order.paymentStatus : "cancelled",
        fulfillmentStatus: "cancelled"
      }
    });
    await tx.paymentAttempt.updateMany({
      where: { orderId: order.id, provider: "MOCK", status: { in: ["created", "pending"] } },
      data: { status: "cancelled" }
    });
    await writeActivityAndAudit(tx, order, adminId, "order_cancelled", "Admin cancelled order.", { releasedQuantity });
  });
}

export async function markRefundRequestedAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    if (!isPaid(order)) {
      throw new Error("Refund can only be requested for paid orders.");
    }
    if (order.paymentStatus === "refunded") {
      throw new Error("Order is already refunded.");
    }

    await tx.order.update({
      where: { id: order.id },
      data: { refundStatus: "requested" }
    });
    await writeActivityAndAudit(tx, order, adminId, "refund_requested", "Mock refund requested. No gateway refund was executed.");
  });
}

export async function markRefundedAction(formData: FormData) {
  const orderId = text(formData, "orderId");

  await updateOrderState(orderId, async (tx, order, adminId) => {
    if (!isPaid(order) && order.paymentStatus !== "refunded") {
      throw new Error("Only paid orders can be marked refunded.");
    }
    if (order.fulfillmentStatus === "delivered") {
      throw new Error("Delivered orders need a return flow before refund. Return flow is deferred.");
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "refunded",
        paymentStatus: "refunded",
        fulfillmentStatus: "refunded",
        refundStatus: "refunded"
      }
    });
    await writeActivityAndAudit(tx, order, adminId, "mock_refunded", "Order marked refunded as mock/admin state. No gateway refund was executed.");
  });
}
