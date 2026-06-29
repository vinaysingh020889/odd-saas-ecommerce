"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireSupportAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";

type RequestDecision = "under_review" | "approved" | "rejected" | "closed";

const activeStatuses = ["submitted", "under_review", "approved"];

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function friendlyRequestType(type: string) {
  if (type === "cancel") return "Cancellation";
  if (type === "return") return "Return";
  if (type === "refund") return "Refund";
  return "Order";
}

function safeRequestType(value: string) {
  if (["cancel", "return", "refund"].includes(value)) return value;
  throw new Error("Choose cancellation, return, or refund request.");
}

function assertCustomerEligible(order: { status: string; paymentStatus: string; fulfillmentStatus: string }, requestType: string) {
  if (["cancelled", "refunded"].includes(order.status) || ["cancelled", "refunded"].includes(order.fulfillmentStatus)) {
    throw new Error("This order is already closed for new requests.");
  }

  if (requestType === "cancel" && ["shipped", "delivered"].includes(order.fulfillmentStatus)) {
    throw new Error("Shipped or delivered orders need a return/refund request instead of cancellation.");
  }

  if (requestType === "return" && order.fulfillmentStatus !== "delivered") {
    throw new Error("Return requests are available after delivery.");
  }

  if (requestType === "refund" && !["succeeded", "refunded"].includes(order.paymentStatus)) {
    throw new Error("Refund requests are available only after successful payment.");
  }
}

function revalidateRequestSurfaces(orderId: string) {
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/requests");
}

async function writeRequestActivity(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    orderId: string;
    actorId: string;
    type: string;
    message: string;
    metadata?: Prisma.InputJsonValue;
    audit?: boolean;
    orderNumber?: string;
    requestId?: string;
  }
) {
  await tx.orderActivity.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      actorId: input.actorId,
      type: input.type,
      message: input.message,
      metadataJson: input.metadata
    }
  });

  if (input.audit) {
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actorId,
        action: input.type,
        entity: "OrderRequest",
        entityId: input.requestId,
        metadata: {
          orderId: input.orderId,
          orderNumber: input.orderNumber,
          message: input.message,
          ...(input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? input.metadata : {})
        }
      }
    });
  }
}

export async function createOrderRequestAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const orderItemId = nullableText(formData, "orderItemId");
  const requestType = safeRequestType(text(formData, "requestType"));
  const reason = text(formData, "reason");
  const customerNote = nullableText(formData, "customerNote");

  if (!reason) {
    throw new Error("Please choose a reason for this request.");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirstOrThrow({
      where: { id: orderId, tenantId, userId: user.id },
      include: { items: { select: { id: true } } }
    });

    assertCustomerEligible(order, requestType);

    if (orderItemId && !order.items.some((item) => item.id === orderItemId)) {
      throw new Error("Selected item does not belong to this order.");
    }

    const existingActive = await tx.orderRequest.findFirst({
      where: {
        tenantId,
        orderId,
        requestType,
        status: { in: activeStatuses },
        ...(orderItemId ? { orderItemId } : { orderItemId: null })
      }
    });

    if (existingActive) {
      throw new Error("An active request already exists for this order context.");
    }

    const request = await tx.orderRequest.create({
      data: {
        tenantId,
        orderId,
        orderItemId,
        requestType,
        reason,
        customerNote,
        status: "submitted",
        createdById: user.id
      }
    });

    await writeRequestActivity(tx, {
      tenantId,
      orderId,
      actorId: user.id,
      type: "order_request_submitted",
      message: `${friendlyRequestType(requestType)} request submitted by customer.`,
      metadata: { requestId: request.id, requestType, reason, orderItemId }
    });
  });

  revalidateRequestSurfaces(orderId);
  redirect(`/orders/${orderId}`);
}

export async function updateOrderRequestStatusAction(formData: FormData) {
  const admin = await requireSupportAdminUser();
  const tenantId = await getOmdTenantId();
  const requestId = text(formData, "requestId");
  const status = text(formData, "status") as RequestDecision;
  const adminDecisionNote = nullableText(formData, "adminDecisionNote");

  if (!["under_review", "approved", "rejected", "closed"].includes(status)) {
    throw new Error("Unsupported request decision.");
  }

  const orderId = await prisma.$transaction(async (tx) => {
    const request = await tx.orderRequest.findFirstOrThrow({
      where: { id: requestId, tenantId },
      include: { order: { select: { id: true, orderNumber: true } } }
    });

    if (["closed", "rejected"].includes(request.status) && status !== "closed") {
      throw new Error("Closed or rejected requests cannot be moved back into active review.");
    }

    const now = new Date();
    const updated = await tx.orderRequest.update({
      where: { id: request.id },
      data: {
        status,
        adminDecisionNote,
        reviewedById: admin.id,
        reviewedAt: now,
        closedAt: status === "closed" ? now : request.closedAt
      }
    });

    const message =
      status === "under_review"
        ? `${friendlyRequestType(request.requestType)} request marked under review.`
        : status === "approved"
          ? `${friendlyRequestType(request.requestType)} request approved as admin/mock decision.`
          : status === "rejected"
            ? `${friendlyRequestType(request.requestType)} request rejected.`
            : `${friendlyRequestType(request.requestType)} request closed.`;

    await writeRequestActivity(tx, {
      tenantId,
      orderId: request.orderId,
      actorId: admin.id,
      type: `order_request_${status}`,
      message,
      metadata: { requestId: request.id, requestType: request.requestType, adminDecisionNote },
      audit: ["approved", "rejected", "closed"].includes(status),
      orderNumber: request.order.orderNumber,
      requestId: updated.id
    });

    return request.orderId;
  });

  revalidateRequestSurfaces(orderId);
  redirect(text(formData, "redirectTo") || `/admin/orders/${orderId}`);
}
