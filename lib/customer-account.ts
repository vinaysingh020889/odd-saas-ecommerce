import {
  CustomerAccountActorType,
  CustomerAccountCategory,
  CustomerAccountVisibility,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

export type CustomerAccountEntryInput = {
  tenantId: string;
  userId: string;
  entryAt?: Date;
  title: string;
  description: string;
  sourceType: string;
  sourceId: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  category: CustomerAccountCategory;
  actionType: string;
  status: string;
  visibility?: CustomerAccountVisibility;
  grossAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  shippingAmount?: number;
  paidAmount?: number;
  refundedAmount?: number;
  walletAmount?: number;
  netAmount?: number;
  currency?: string;
  referenceNumber?: string | null;
  customerVisibleNote?: string | null;
  actorType?: CustomerAccountActorType;
  idempotencyKey: string;
};

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function appendCustomerAccountEntry(input: CustomerAccountEntryInput, db: DbClient = prisma) {
  const existing = await db.customerAccountEntry.findUnique({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } }
  });
  if (existing) return existing;
  try {
    return await db.customerAccountEntry.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        entryAt: input.entryAt,
        title: input.title.slice(0, 160),
        description: input.description.slice(0, 500),
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        relatedEntityType: input.relatedEntityType ?? null,
        relatedEntityId: input.relatedEntityId ?? null,
        category: input.category,
        actionType: input.actionType,
        status: input.status,
        visibility: input.visibility ?? "CUSTOMER_VISIBLE",
        grossAmount: input.grossAmount ?? 0,
        discountAmount: input.discountAmount ?? 0,
        taxAmount: input.taxAmount ?? 0,
        shippingAmount: input.shippingAmount ?? 0,
        paidAmount: input.paidAmount ?? 0,
        refundedAmount: input.refundedAmount ?? 0,
        walletAmount: input.walletAmount ?? 0,
        netAmount: input.netAmount ?? 0,
        currency: input.currency ?? "INR",
        referenceNumber: input.referenceNumber ?? null,
        customerVisibleNote: input.customerVisibleNote?.slice(0, 500) ?? null,
        actorType: input.actorType ?? "SYSTEM",
        idempotencyKey: input.idempotencyKey
      }
    });
  } catch (error) {
    if (!isUniqueConflict(error)) throw error;
    return db.customerAccountEntry.findUnique({
      where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } }
    });
  }
}

function orderCategory(items: Array<{ itemType: string }>) {
  return items.some((item) => item.itemType === "KIT") ? CustomerAccountCategory.KIT_ORDER : CustomerAccountCategory.PRODUCT_ORDER;
}

export async function projectCommerceOrder(orderId: string, db: DbClient = prisma) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { select: { itemType: true } },
      paymentAttempts: { orderBy: { createdAt: "asc" } },
      requests: { orderBy: { createdAt: "asc" } }
    }
  });
  if (!order) return 0;
  let created = 0;
  const category = orderCategory(order.items);
  const reference = order.orderNumber;
  const add = async (entry: CustomerAccountEntryInput) => {
    const before = await db.customerAccountEntry.count({ where: { tenantId: entry.tenantId, idempotencyKey: entry.idempotencyKey } });
    await appendCustomerAccountEntry(entry, db);
    if (!before) created += 1;
  };

  await add({
    tenantId: order.tenantId,
    userId: order.userId,
    entryAt: order.createdAt,
    title: category === "KIT_ORDER" ? "Kit order created" : "Order created",
    description: "Your order was created and is awaiting payment confirmation.",
    sourceType: "ORDER",
    sourceId: order.id,
    relatedEntityType: "ORDER",
    relatedEntityId: order.id,
    category,
    actionType: "ORDER_CREATED",
    status: order.status,
    grossAmount: Number(order.totalAmount),
    discountAmount: Number(order.discountAmount),
    taxAmount: Number(order.taxAmount),
    shippingAmount: Number(order.shippingAmount),
    netAmount: Number(order.totalAmount),
    currency: order.currency,
    referenceNumber: reference,
    actorType: "CUSTOMER",
    idempotencyKey: `order:${order.id}:created`
  });

  for (const attempt of order.paymentAttempts) {
    const succeeded = attempt.status === "succeeded";
    const actionType = succeeded
      ? "PAYMENT_SUCCEEDED"
      : ["failed", "cancelled", "expired"].includes(attempt.status)
        ? `PAYMENT_${attempt.status.toUpperCase()}`
        : "PAYMENT_PENDING";
    await add({
      tenantId: order.tenantId,
      userId: order.userId,
      entryAt: attempt.updatedAt,
      title: succeeded ? "Payment confirmed" : attempt.status === "failed" ? "Payment failed" : attempt.status === "cancelled" ? "Payment cancelled" : "Payment pending",
      description: succeeded ? "Your mock payment was confirmed." : `Mock payment status: ${attempt.status}.`,
      sourceType: "PAYMENT_ATTEMPT",
      sourceId: attempt.id,
      relatedEntityType: "ORDER",
      relatedEntityId: order.id,
      category: "PAYMENT",
      actionType,
      status: attempt.status,
      grossAmount: succeeded ? 0 : Number(attempt.amount),
      paidAmount: succeeded ? Number(attempt.amount) : 0,
      netAmount: succeeded ? Number(attempt.amount) : 0,
      currency: attempt.currency,
      referenceNumber: attempt.providerOrderId ?? reference,
      actorType: succeeded ? "CUSTOMER" : "SYSTEM",
      idempotencyKey: `payment-attempt:${attempt.id}:${attempt.status}`
    });
  }

  for (const request of order.requests) {
    const categoryMap = { cancel: "CANCELLATION", return: "RETURN", refund: "REFUND" } as const;
    const requestCategory = categoryMap[request.requestType as keyof typeof categoryMap] ?? "ADJUSTMENT";
    await add({
      tenantId: order.tenantId,
      userId: order.userId,
      entryAt: request.updatedAt,
      title: `${request.requestType === "cancel" ? "Cancellation" : request.requestType === "return" ? "Return" : "Refund"} request ${request.status.replaceAll("_", " ")}`,
      description: "Your request status was updated.",
      sourceType: "ORDER_REQUEST",
      sourceId: request.id,
      relatedEntityType: "ORDER",
      relatedEntityId: order.id,
      category: requestCategory,
      actionType: `${request.requestType.toUpperCase()}_${request.status.toUpperCase()}`,
      status: request.status,
      currency: order.currency,
      referenceNumber: reference,
      customerVisibleNote: request.customerNote,
      actorType: request.reviewedById ? "SUPPORT" : "CUSTOMER",
      idempotencyKey: `order-request:${request.id}:${request.status}`
    });
  }

  if (order.status === "confirmed") {
    await add({
      tenantId: order.tenantId, userId: order.userId, entryAt: order.updatedAt,
      title: "Order confirmed", description: "Your order was confirmed after successful payment.",
      sourceType: "ORDER", sourceId: order.id, relatedEntityType: "ORDER", relatedEntityId: order.id,
      category, actionType: "ORDER_CONFIRMED", status: "confirmed", currency: order.currency,
      referenceNumber: reference, actorType: "SYSTEM", idempotencyKey: `order:${order.id}:confirmed`
    });
  }

  if (order.status === "cancelled" || order.fulfillmentStatus === "cancelled") {
    await add({
      tenantId: order.tenantId, userId: order.userId, entryAt: order.updatedAt,
      title: "Order cancelled", description: "This order was cancelled.", sourceType: "ORDER", sourceId: order.id,
      relatedEntityType: "ORDER", relatedEntityId: order.id, category: "CANCELLATION", actionType: "ORDER_CANCELLED",
      status: "cancelled", currency: order.currency, referenceNumber: reference, actorType: "ADMIN",
      idempotencyKey: `order:${order.id}:cancelled`
    });
  }
  if (order.refundStatus === "refunded" || order.paymentStatus === "refunded") {
    await add({
      tenantId: order.tenantId, userId: order.userId, entryAt: order.updatedAt,
      title: "Refund completed", description: "The completed refund is reflected in your account statement.",
      sourceType: "ORDER", sourceId: order.id, relatedEntityType: "ORDER", relatedEntityId: order.id,
      category: "REFUND", actionType: "REFUND_COMPLETED", status: "refunded",
      refundedAmount: Number(order.totalAmount), netAmount: -Number(order.totalAmount), currency: order.currency,
      referenceNumber: reference, actorType: "ADMIN", idempotencyKey: `order:${order.id}:refund-completed`
    });
  }
  return created;
}

export async function projectServiceBooking(bookingId: string, db: DbClient = prisma) {
  const booking = await db.serviceBooking.findUnique({ where: { id: bookingId }, include: { service: { select: { title: true } } } });
  if (!booking) return 0;
  const base = {
    tenantId: booking.tenantId, userId: booking.userId, sourceType: "SERVICE_BOOKING", sourceId: booking.id,
    relatedEntityType: "SERVICE_BOOKING", relatedEntityId: booking.id, category: CustomerAccountCategory.PUJA_BOOKING,
    currency: booking.currency, referenceNumber: booking.bookingNo, actorType: CustomerAccountActorType.SYSTEM
  };
  await appendCustomerAccountEntry({
    ...base, entryAt: booking.createdAt, title: "Puja booking created", description: `${booking.service.title} booking was created.`,
    actionType: "BOOKING_CREATED", status: booking.status, grossAmount: Number(booking.totalAmount),
    netAmount: Number(booking.totalAmount), idempotencyKey: `service-booking:${booking.id}:created`, actorType: "CUSTOMER"
  }, db);
  if (booking.status === "CANCELLED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: booking.updatedAt, title: "Puja booking cancelled", description: "The booking was cancelled.",
      category: "CANCELLATION", actionType: "BOOKING_CANCELLED", status: "CANCELLED",
      idempotencyKey: `service-booking:${booking.id}:cancelled`
    }, db);
  }
  if (booking.status === "REFUNDED" || booking.paymentStatus === "REFUNDED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: booking.updatedAt, title: "Puja booking refund completed", description: "The completed refund is reflected in your statement.",
      category: "REFUND", actionType: "REFUND_COMPLETED", status: "REFUNDED",
      refundedAmount: Number(booking.totalAmount), netAmount: -Number(booking.totalAmount),
      idempotencyKey: `service-booking:${booking.id}:refund-completed`
    }, db);
  }
  if (booking.paymentStatus === "CONFIRMED" && Number(booking.totalAmount) > 0) {
    await appendCustomerAccountEntry({
      ...base, entryAt: booking.updatedAt, title: "Puja booking payment confirmed", description: "Mock payment was confirmed.",
      category: "PAYMENT", actionType: "PAYMENT_SUCCEEDED", status: "CONFIRMED", paidAmount: Number(booking.totalAmount),
      netAmount: Number(booking.totalAmount), idempotencyKey: `service-booking:${booking.id}:payment-confirmed`
    }, db);
  } else if (booking.paymentStatus === "FAILED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: booking.updatedAt, title: "Puja booking payment failed", description: "The mock payment was not completed.",
      category: "PAYMENT", actionType: "PAYMENT_FAILED", status: "FAILED",
      idempotencyKey: `service-booking:${booking.id}:payment-failed`
    }, db);
  }
  await appendCustomerAccountEntry({
    ...base, entryAt: booking.updatedAt, title: "Puja booking status updated", description: `Current booking status: ${booking.status.replaceAll("_", " ")}.`,
    actionType: `BOOKING_${booking.status}`, status: booking.status,
    idempotencyKey: `service-booking:${booking.id}:status:${booking.status}`
  }, db);
  return 1;
}

export async function projectKundliOrder(orderId: string, db: DbClient = prisma) {
  const order = await db.kundliOrder.findUnique({ where: { id: orderId }, include: { package: { select: { name: true } } } });
  if (!order) return 0;
  const base = {
    tenantId: order.tenantId, userId: order.userId, sourceType: "KUNDLI_ORDER", sourceId: order.id,
    relatedEntityType: "KUNDLI_ORDER", relatedEntityId: order.id, category: CustomerAccountCategory.KUNDLI_ORDER,
    currency: order.currency, referenceNumber: order.orderNo, actorType: CustomerAccountActorType.SYSTEM
  };
  await appendCustomerAccountEntry({
    ...base, entryAt: order.createdAt, title: "Kundli request created", description: `${order.package.name} request was created.`,
    actionType: "KUNDLI_CREATED", status: order.status, grossAmount: Number(order.totalAmount), netAmount: Number(order.totalAmount),
    idempotencyKey: `kundli:${order.id}:created`, actorType: "CUSTOMER"
  }, db);
  if (order.status === "CANCELLED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: order.updatedAt, title: "Kundli request cancelled", description: "The Kundli request was cancelled.",
      category: "CANCELLATION", actionType: "KUNDLI_CANCELLED", status: "CANCELLED",
      idempotencyKey: `kundli:${order.id}:cancelled`
    }, db);
  }
  if (order.status === "REFUNDED" || order.paymentStatus === "REFUNDED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: order.updatedAt, title: "Kundli refund completed", description: "The completed refund is reflected in your statement.",
      category: "REFUND", actionType: "REFUND_COMPLETED", status: "REFUNDED",
      refundedAmount: Number(order.totalAmount), netAmount: -Number(order.totalAmount),
      idempotencyKey: `kundli:${order.id}:refund-completed`
    }, db);
  }
  if (order.paymentStatus === "CONFIRMED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: order.updatedAt, title: "Kundli payment confirmed", description: "Mock payment was confirmed.",
      category: "PAYMENT", actionType: "PAYMENT_SUCCEEDED", status: "CONFIRMED", paidAmount: Number(order.totalAmount),
      netAmount: Number(order.totalAmount), idempotencyKey: `kundli:${order.id}:payment-confirmed`
    }, db);
  }
  if (order.paymentStatus === "FAILED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: order.updatedAt, title: "Kundli payment failed", description: "The mock payment was not completed.",
      category: "PAYMENT", actionType: "PAYMENT_FAILED", status: "FAILED", idempotencyKey: `kundli:${order.id}:payment-failed`
    }, db);
  }
  await appendCustomerAccountEntry({
    ...base, entryAt: order.updatedAt, title: "Kundli status updated", description: `Current Kundli status: ${order.status.replaceAll("_", " ")}.`,
    actionType: `KUNDLI_${order.status}`, status: order.status, idempotencyKey: `kundli:${order.id}:status:${order.status}`
  }, db);
  return 1;
}

export async function projectAsthiApplication(applicationId: string, db: DbClient = prisma) {
  const application = await db.asthiApplication.findUnique({ where: { id: applicationId }, include: { package: { select: { name: true } } } });
  if (!application?.userId) return 0;
  const base = {
    tenantId: application.tenantId, userId: application.userId, sourceType: "ASTHI_APPLICATION", sourceId: application.id,
    relatedEntityType: "ASTHI_APPLICATION", relatedEntityId: application.id, category: CustomerAccountCategory.ASTHI_APPLICATION,
    currency: application.currency, referenceNumber: application.applicationNo, actorType: CustomerAccountActorType.SYSTEM
  };
  await appendCustomerAccountEntry({
    ...base, entryAt: application.createdAt, title: "Asthi Visarjan application created",
    description: `${application.package?.name ?? "Asthi Visarjan seva"} application was created.`,
    actionType: "ASTHI_CREATED", status: application.status, grossAmount: Number(application.totalAmount),
    netAmount: Number(application.totalAmount), idempotencyKey: `asthi:${application.id}:created`, actorType: "CUSTOMER"
  }, db);
  if (application.status === "CANCELLED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: application.updatedAt, title: "Asthi Visarjan application cancelled", description: "The application was cancelled.",
      category: "CANCELLATION", actionType: "ASTHI_CANCELLED", status: "CANCELLED",
      idempotencyKey: `asthi:${application.id}:cancelled`
    }, db);
  }
  if (application.status === "REFUNDED" || application.paymentStatus === "REFUNDED") {
    await appendCustomerAccountEntry({
      ...base, entryAt: application.updatedAt, title: "Asthi Visarjan refund completed", description: "The completed refund is reflected in your statement.",
      category: "REFUND", actionType: "REFUND_COMPLETED", status: "REFUNDED",
      refundedAmount: Number(application.totalAmount), netAmount: -Number(application.totalAmount),
      idempotencyKey: `asthi:${application.id}:refund-completed`
    }, db);
  }
  if (application.paymentStatus === "CONFIRMED" && !application.orderId) {
    await appendCustomerAccountEntry({
      ...base, entryAt: application.updatedAt, title: "Asthi Visarjan payment confirmed", description: "Mock payment was confirmed.",
      category: "PAYMENT", actionType: "PAYMENT_SUCCEEDED", status: "CONFIRMED", paidAmount: Number(application.totalAmount),
      netAmount: Number(application.totalAmount), idempotencyKey: `asthi:${application.id}:payment-confirmed`
    }, db);
  }
  await appendCustomerAccountEntry({
    ...base, entryAt: application.updatedAt, title: "Asthi Visarjan status updated",
    description: `Current application status: ${application.status.replaceAll("_", " ")}.`,
    actionType: `ASTHI_${application.status}`, status: application.status,
    idempotencyKey: `asthi:${application.id}:status:${application.status}`
  }, db);
  return 1;
}

export async function projectUserMembership(membershipId: string, db: DbClient = prisma) {
  const membership = await db.userMembership.findUnique({ where: { id: membershipId }, include: { plan: true } });
  if (!membership) return 0;
  const paid = membership.mockPaymentReference && membership.status === "ACTIVE" ? Number(membership.plan.price) : 0;
  const action = membership.activatedByOrderRef?.includes("renewal")
    ? "MEMBERSHIP_RENEWED"
    : membership.activatedByOrderRef?.includes("upgrade")
      ? "MEMBERSHIP_UPGRADED"
      : "MEMBERSHIP_ACTIVATED";
  await appendCustomerAccountEntry({
    tenantId: membership.tenantId, userId: membership.userId, entryAt: membership.updatedAt,
    title: `${membership.plan.name} ${action === "MEMBERSHIP_RENEWED" ? "renewed" : action === "MEMBERSHIP_UPGRADED" ? "activated" : "activated"}`,
    description: paid ? "Membership activated through the existing mock confirmation flow." : "Complimentary membership activated.",
    sourceType: "USER_MEMBERSHIP", sourceId: membership.id, relatedEntityType: "MEMBERSHIP_PLAN",
    relatedEntityId: membership.planId, category: "MEMBERSHIP", actionType: action, status: membership.status,
    grossAmount: Number(membership.plan.price), paidAmount: paid, netAmount: paid, currency: membership.plan.currency,
    referenceNumber: membership.mockPaymentReference ?? membership.plan.slug, actorType: "CUSTOMER",
    idempotencyKey: `membership:${membership.id}:${action.toLowerCase()}:${membership.updatedAt.toISOString()}`
  }, db);
  if (membership.status !== "ACTIVE") {
    await appendCustomerAccountEntry({
      tenantId: membership.tenantId, userId: membership.userId, entryAt: membership.updatedAt,
      title: `${membership.plan.name} ${membership.status.toLowerCase()}`, description: "Membership status changed.",
      sourceType: "USER_MEMBERSHIP", sourceId: membership.id, relatedEntityType: "MEMBERSHIP_PLAN",
      relatedEntityId: membership.planId, category: "MEMBERSHIP", actionType: `MEMBERSHIP_${membership.status}`,
      status: membership.status, currency: membership.plan.currency, referenceNumber: membership.plan.slug,
      actorType: "SYSTEM", idempotencyKey: `membership:${membership.id}:status:${membership.status}`
    }, db);
  }
  return 1;
}

export async function projectMembershipRequest(requestId: string, db: DbClient = prisma) {
  const request = await db.membershipRequest.findUnique({
    where: { id: requestId },
    include: { currentPlan: true, requestedPlan: true, userMembership: { include: { plan: true } } }
  });
  if (!request) return 0;
  const plan = request.requestedPlan ?? request.currentPlan ?? request.userMembership?.plan;
  await appendCustomerAccountEntry({
    tenantId: request.tenantId,
    userId: request.userId,
    entryAt: request.updatedAt,
    title: `Membership ${request.requestType.replaceAll("_", " ")} ${request.status.replaceAll("_", " ")}`,
    description: "Your membership request status was updated.",
    sourceType: "MEMBERSHIP_REQUEST",
    sourceId: request.id,
    relatedEntityType: "USER_MEMBERSHIP",
    relatedEntityId: request.userMembershipId,
    category: request.requestType === "cancellation" ? "CANCELLATION" : "MEMBERSHIP",
    actionType: `MEMBERSHIP_${request.requestType.toUpperCase()}_${request.status.toUpperCase()}`,
    status: request.status,
    currency: plan?.currency ?? "INR",
    referenceNumber: plan?.slug ?? request.id,
    customerVisibleNote: request.customerNote,
    actorType: request.reviewedById ? "SUPPORT" : "CUSTOMER",
    idempotencyKey: `membership-request:${request.id}:${request.status}`
  }, db);
  return 1;
}

type SummaryEntry = {
  actionType: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  sourceId: string;
  grossAmount: unknown;
  paidAmount: unknown;
  refundedAmount: unknown;
};

export function summarizeCustomerAccountEntries(entries: SummaryEntry[]) {
  const totalPaid = entries.reduce((sum, entry) => sum + (entry.actionType === "PAYMENT_SUCCEEDED" || entry.actionType.startsWith("MEMBERSHIP_") ? Number(entry.paidAmount) : 0), 0);
  const totalRefunded = entries.reduce((sum, entry) => sum + (entry.actionType === "REFUND_COMPLETED" ? Number(entry.refundedAmount) : 0), 0);
  const settledEntities = new Set(
    entries
      .filter((entry) => ["PAYMENT_SUCCEEDED", "PAYMENT_FAILED", "PAYMENT_CANCELLED", "PAYMENT_EXPIRED"].includes(entry.actionType))
      .map((entry) => `${entry.relatedEntityType}:${entry.relatedEntityId}`)
  );
  const pendingAmount = entries.reduce((sum, entry) => {
    if (entry.actionType !== "PAYMENT_PENDING") return sum;
    const key = `${entry.relatedEntityType}:${entry.relatedEntityId}`;
    return settledEntities.has(key) ? sum : sum + Number(entry.grossAmount);
  }, 0);
  return { totalPaid, totalRefunded, netSpent: totalPaid - totalRefunded, pendingAmount };
}

export function customerAccountEntryHref(entry: { relatedEntityType: string | null; relatedEntityId: string | null; sourceType: string; sourceId: string }) {
  const type = entry.relatedEntityType ?? entry.sourceType;
  const id = entry.relatedEntityId ?? entry.sourceId;
  if (type === "ORDER") return `/orders/${id}`;
  if (type === "SERVICE_BOOKING") return `/service-bookings/${id}`;
  if (type === "KUNDLI_ORDER") return `/kundli/${id}`;
  if (type === "ASTHI_APPLICATION") return `/asthi/${id}`;
  if (type === "MEMBERSHIP_PLAN" || type === "USER_MEMBERSHIP") return "/membership";
  return null;
}

export async function backfillCustomerAccountEntries(tenantId: string) {
  const [orders, bookings, kundliOrders, asthiApplications, memberships] = await Promise.all([
    prisma.order.findMany({ where: { tenantId }, select: { id: true } }),
    prisma.serviceBooking.findMany({ where: { tenantId }, select: { id: true } }),
    prisma.kundliOrder.findMany({ where: { tenantId }, select: { id: true } }),
    prisma.asthiApplication.findMany({ where: { tenantId, userId: { not: null } }, select: { id: true } }),
    prisma.userMembership.findMany({ where: { tenantId }, select: { id: true } })
  ]);
  const membershipRequests = await prisma.membershipRequest.findMany({ where: { tenantId }, select: { id: true } });
  const before = await prisma.customerAccountEntry.count({ where: { tenantId } });
  for (const order of orders) await projectCommerceOrder(order.id);
  for (const booking of bookings) await projectServiceBooking(booking.id);
  for (const order of kundliOrders) await projectKundliOrder(order.id);
  for (const application of asthiApplications) await projectAsthiApplication(application.id);
  for (const membership of memberships) await projectUserMembership(membership.id);
  for (const request of membershipRequests) await projectMembershipRequest(request.id);
  const after = await prisma.customerAccountEntry.count({ where: { tenantId } });
  return {
    scanned: orders.length + bookings.length + kundliOrders.length + asthiApplications.length + memberships.length + membershipRequests.length,
    before,
    after,
    created: after - before
  };
}
