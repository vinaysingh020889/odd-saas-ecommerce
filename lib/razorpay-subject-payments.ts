import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { amountInPaise, assertCapturedPayment, razorpayConfig, razorpayRequest, type RazorpayPayment } from "@/lib/razorpay";
import { activateMembershipPlanForUser } from "@/lib/membership-lifecycle";
import { getComputedMembershipStatus } from "@/lib/membership";
import { confirmCapacity } from "@/lib/service-capacity";
import { getOrCreateChecklistForOwner, syncKundliChecklistFromAuthoritativeState } from "@/lib/checklists";
import { attemptKundliAssignment } from "@/lib/kundli-assignment-engine";
import { projectAsthiApplication, projectKundliOrder, projectServiceBooking, projectUserMembership } from "@/lib/customer-account";
import { trackCustomerEvent } from "@/lib/customer-events";
import { notifyRoles } from "@/lib/notifications";
import { recordSystemEvent } from "@/lib/system-events";
import { getPublishedMembershipPlanById, planFromPublishedVersion } from "@/lib/membership-plan-versioning";
import { transitionMembershipRedemptionsForSubject } from "@/lib/membership-entitlements";

export const RAZORPAY_SUBJECT_TYPES = ["MEMBERSHIP", "KUNDLI", "ASTHI", "SERVICE_BOOKING"] as const;
export type RazorpaySubjectType = (typeof RAZORPAY_SUBJECT_TYPES)[number];
const PROVIDER = "RAZORPAY_TEST";

type SubjectDetails = {
  tenantId: string;
  userId: string;
  amount: number;
  currency: string;
  label: string;
  customerName: string;
  customerEmail: string;
};

function isSubjectType(value: string): value is RazorpaySubjectType {
  return RAZORPAY_SUBJECT_TYPES.includes(value as RazorpaySubjectType);
}

async function resolveSubject(type: RazorpaySubjectType, id: string, userId: string, db: Prisma.TransactionClient | typeof prisma, requirePayable: boolean): Promise<SubjectDetails> {
  if (type === "MEMBERSHIP") {
    const planRecord = await db.membershipPlan.findFirst({ where: { id, status: "ACTIVE" }, select: { tenantId: true } });
    const plan = planRecord ? await getPublishedMembershipPlanById(planRecord.tenantId, id, db) : null;
    const user = await db.user.findFirst({ where: { id: userId, tenantId: plan?.tenantId }, select: { id: true, name: true, email: true } });
    if (!plan || !user || Number(plan.price) <= 0) throw new Error("This paid membership is not available.");
    if (requirePayable) {
      const currentRecord = await db.userMembership.findFirst({ where: { tenantId: plan.tenantId, userId, status: "ACTIVE" }, include: { plan: true, planVersion: true }, orderBy: { createdAt: "desc" } });
      const current = currentRecord ? { ...currentRecord, plan: planFromPublishedVersion(currentRecord.plan, currentRecord.planVersion) } : null;
      if (current && getComputedMembershipStatus(current) === "ACTIVE") {
        if (current.planId === plan.id && !plan.renewalAllowed) throw new Error("Renewal is disabled for this membership plan.");
        if (current.planId !== plan.id && Number(plan.price) < Number(current.plan.price)) throw new Error("Membership downgrades require admin review before payment.");
        if (current.planId !== plan.id && !current.plan.upgradeAllowed) throw new Error("Plan changes are disabled for the current membership.");
      }
    }
    return { tenantId: plan.tenantId, userId, amount: Number(plan.price), currency: plan.currency, label: plan.name, customerName: user.name ?? "Customer", customerEmail: user.email ?? "" };
  }
  if (type === "KUNDLI") {
    const item = await db.kundliOrder.findFirst({ where: { id, userId }, include: { package: true } });
    if (!item) throw new Error("Kundli order was not found.");
    if (requirePayable && (item.status !== "PAYMENT_PENDING" || item.paymentStatus === "CONFIRMED" || item.package.status !== "ACTIVE")) throw new Error("This Kundli order is not available for payment.");
    return { tenantId: item.tenantId, userId: item.userId, amount: Number(item.totalAmount), currency: item.currency, label: item.package.name, customerName: item.applicantName, customerEmail: item.applicantEmail };
  }
  if (type === "ASTHI") {
    const item = await db.asthiApplication.findFirst({ where: { id, userId }, include: { package: true } });
    if (!item || !item.userId) throw new Error("Asthi application was not found.");
    if (requirePayable && (item.status !== "PAYMENT_PENDING" || item.paymentStatus === "CONFIRMED")) throw new Error("This Asthi application is not available for payment.");
    return { tenantId: item.tenantId, userId: item.userId, amount: Number(item.totalAmount), currency: item.currency, label: item.package?.name ?? "Asthi Visarjan", customerName: item.applicantName, customerEmail: item.applicantEmail };
  }
  const item = await db.serviceBooking.findFirst({ where: { id, userId }, include: { service: true } });
  if (!item) throw new Error("Service booking was not found.");
  if (requirePayable && (item.status === "QUEUED" || ["CONFIRMED", "REFUNDED"].includes(item.paymentStatus) || ["COMPLETED", "CANCELLED", "REFUNDED"].includes(item.status))) throw new Error("This service booking is not available for payment.");
  if (item.slotId && item.capacityStatus !== "HELD" && item.paymentStatus !== "CONFIRMED") throw new Error("The service capacity hold is no longer available. Contact support before payment.");
  return { tenantId: item.tenantId, userId: item.userId, amount: Number(item.totalAmount), currency: item.currency, label: item.service.title, customerName: item.customerName, customerEmail: item.customerEmail };
}

async function nextReference(prefix: string, tenantId: string, count: () => Promise<number>) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return prefix + "-" + datePart + "-" + String((await count()) + 1).padStart(5, "0");
}

async function settleSubject(type: RazorpaySubjectType, id: string, userId: string, paymentId: string, tx: Prisma.TransactionClient) {
  const paymentReference = PROVIDER + ":" + paymentId;
  if (type === "MEMBERSHIP") {
    const plan = await tx.membershipPlan.findUniqueOrThrow({ where: { id }, select: { tenantId: true, slug: true } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true } });
    const membership = await activateMembershipPlanForUser({
      tenantId: plan.tenantId,
      userId,
      planSlug: plan.slug,
      actorLabel: user.name ?? user.email ?? "Customer",
      mockPaymentReference: paymentReference,
      db: tx
    });
    const event = await recordSystemEvent({ tenantId: plan.tenantId, severity: "SUCCESS", module: "MEMBERSHIP", action: "MEMBERSHIP_PAID", outcome: "SUCCESS", actorId: userId, actorRole: "CUSTOMER", entityType: "UserMembership", entityId: membership.id, metadata: { planSlug: plan.slug, paymentProvider: PROVIDER } }, tx);
    await notifyRoles({ tenantId: plan.tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "MEMBERSHIP_PURCHASED", title: "New membership purchase", message: (user.name ?? user.email ?? "A customer") + " purchased the " + plan.slug + " membership.", destination: "/admin/customers/" + userId, sourceModule: "MEMBERSHIP", entityType: "UserMembership", entityId: membership.id, sourceEventId: event.id, dedupeKey: "membership:" + membership.id + ":payment-confirmed" }, tx);
    return membership.id;
  }
  if (type === "KUNDLI") {
    const item = await tx.kundliOrder.findFirstOrThrow({ where: { id, userId }, include: { package: { select: { status: true } } } });
    if (item.paymentStatus === "CONFIRMED") return item.id;
    if (item.status !== "PAYMENT_PENDING" || item.package.status !== "ACTIVE") throw new Error("Kundli payment state requires reconciliation.");
    const orderNo = item.orderNo ?? await nextReference("KUNDLI", item.tenantId, () => tx.kundliOrder.count({ where: { tenantId: item.tenantId, orderNo: { startsWith: "KUNDLI-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") } } }));
    await tx.kundliOrder.update({ where: { id }, data: { orderNo, status: "DETAILS_PENDING", paymentStatus: "CONFIRMED", mockPaymentReference: paymentReference } });
    await transitionMembershipRedemptionsForSubject({ tenantId: item.tenantId, relatedType: "KUNDLI", relatedId: id, fromStatus: "RESERVED", toStatus: "CONSUMED", reason: "Kundli upgrade difference paid and membership benefit confirmed.", actorId: userId }, tx);
    await tx.kundliStatusHistory.create({ data: { tenantId: item.tenantId, kundliOrderId: id, fromStatus: item.status, toStatus: "DETAILS_PENDING", note: "Razorpay Test Mode payment verified. Please complete birth details.", actorLabel: "Customer" } });
    const event = await recordSystemEvent({ tenantId: item.tenantId, severity: "SUCCESS", module: "KUNDLI", action: "PAYMENT_CONFIRMED", outcome: "SUCCESS", actorId: userId, actorRole: "CUSTOMER", entityType: "KundliOrder", entityId: id, metadata: { orderNo, paymentProvider: PROVIDER } }, tx);
    await notifyRoles({ tenantId: item.tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "KUNDLI_PAYMENT_CONFIRMED", title: "New paid Kundli inquiry", message: orderNo + " has been paid. The customer must now complete birth details.", destination: "/admin/kundli/" + id, sourceModule: "KUNDLI", entityType: "KundliOrder", entityId: id, sourceEventId: event.id, dedupeKey: "kundli:" + id + ":payment-confirmed" }, tx);
    return item.id;
  }
  if (type === "ASTHI") {
    const item = await tx.asthiApplication.findFirstOrThrow({ where: { id, userId } });
    if (item.paymentStatus === "CONFIRMED") return item.id;
    if (item.status !== "PAYMENT_PENDING") throw new Error("Asthi payment state requires reconciliation.");
    const applicationNo = item.applicationNo ?? await nextReference("ASTHI", item.tenantId, () => tx.asthiApplication.count({ where: { tenantId: item.tenantId, applicationNo: { startsWith: "ASTHI-" + new Date().toISOString().slice(0, 10).replaceAll("-", "") } } }));
    await tx.asthiApplication.update({ where: { id }, data: { applicationNo, status: "DETAILS_PENDING", paymentStatus: "CONFIRMED", mockPaymentReference: paymentReference } });
    await transitionMembershipRedemptionsForSubject({ tenantId: item.tenantId, relatedType: "ASTHI", relatedId: id, fromStatus: "RESERVED", toStatus: "CONSUMED", reason: "Asthi balance paid and membership benefit confirmed.", actorId: userId }, tx);
    await tx.asthiStatusHistory.create({ data: { tenantId: item.tenantId, applicationId: id, fromStatus: item.status, toStatus: "DETAILS_PENDING", note: "Razorpay Test Mode payment verified. Please complete ritual and family details.", actorLabel: "Customer" } });
    const event = await recordSystemEvent({ tenantId: item.tenantId, severity: "SUCCESS", module: "ASTHI", action: "PAYMENT_CONFIRMED", outcome: "SUCCESS", actorId: userId, actorRole: "CUSTOMER", entityType: "AsthiApplication", entityId: id, metadata: { applicationNo, paymentProvider: PROVIDER } }, tx);
    await notifyRoles({ tenantId: item.tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "ASTHI_PAYMENT_CONFIRMED", title: "New paid Asthi inquiry", message: applicationNo + " has been paid. The customer must now complete the required details.", destination: "/admin/asthi/" + id, sourceModule: "ASTHI", entityType: "AsthiApplication", entityId: id, sourceEventId: event.id, dedupeKey: "asthi:" + id + ":payment-confirmed" }, tx);
    return item.id;
  }
  const item = await tx.serviceBooking.findFirstOrThrow({ where: { id, userId }, include: { service: true } });
  if (item.paymentStatus === "CONFIRMED") return item.id;
  if (item.status === "QUEUED" || ["COMPLETED", "CANCELLED", "REFUNDED"].includes(item.status)) throw new Error("Service booking payment state requires reconciliation.");
  if (item.slotId) {
    if (item.capacityStatus !== "HELD") throw new Error("The service capacity hold expired before payment confirmation.");
    await confirmCapacity({ slotId: item.slotId, quantity: item.quantity, sourceType: "SERVICE_BOOKING", sourceId: item.id, reason: "Confirmed after verified Razorpay Test Mode payment " + item.bookingNo, actorId: userId }, tx);
  }
  await tx.serviceBooking.update({ where: { id }, data: { status: "SUBMITTED", paymentStatus: "CONFIRMED", capacityStatus: item.slotId ? "CONFIRMED" : item.capacityStatus, mockPaymentReference: paymentReference } });
  await transitionMembershipRedemptionsForSubject({ tenantId: item.tenantId, relatedType: "SERVICE_BOOKING", relatedId: id, fromStatus: "RESERVED", toStatus: "CONSUMED", reason: "Service balance paid and membership benefit confirmed.", actorId: userId }, tx);
  await tx.serviceBookingActivity.create({ data: { tenantId: item.tenantId, serviceBookingId: id, actorId: userId, type: "razorpay_payment_confirmed", message: "Razorpay Test Mode payment verified. Service booking submitted to operations.", metadataJson: { provider: PROVIDER, paymentId } } });
  const event = await recordSystemEvent({ tenantId: item.tenantId, severity: "SUCCESS", module: "SERVICE", action: "BOOKING_PAID", outcome: "SUCCESS", actorId: userId, actorRole: "CUSTOMER", entityType: "ServiceBooking", entityId: id, metadata: { bookingNo: item.bookingNo, paymentProvider: PROVIDER } }, tx);
  await notifyRoles({ tenantId: item.tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "SERVICE_BOOKING_PAID", title: "New paid service booking", message: item.bookingNo + " is paid and submitted to Operations.", destination: "/admin/service-bookings/" + id, sourceModule: "SERVICE", entityType: "ServiceBooking", entityId: id, sourceEventId: event.id, dedupeKey: "service-booking:" + id + ":payment-confirmed" }, tx);
  await tx.auditLog.create({ data: { tenantId: item.tenantId, actorId: userId, action: "service_booking_razorpay_test_paid", entity: "ServiceBooking", entityId: id, metadata: { bookingNo: item.bookingNo, amount: item.totalAmount, paymentId } } });
  return item.id;
}

async function runPostSettlement(type: RazorpaySubjectType, subjectId: string, resultId: string, userId: string) {
  if (type === "MEMBERSHIP") {
    await projectUserMembership(resultId);
  } else if (type === "KUNDLI") {
    const item = await prisma.kundliOrder.findUniqueOrThrow({ where: { id: subjectId }, select: { tenantId: true } });
    await getOrCreateChecklistForOwner({ tenantId: item.tenantId, relatedType: "KUNDLI_ORDER", relatedId: subjectId });
    await syncKundliChecklistFromAuthoritativeState(item.tenantId, subjectId);
    await attemptKundliAssignment(subjectId, { actorId: userId });
    await projectKundliOrder(subjectId);
  } else if (type === "ASTHI") {
    await projectAsthiApplication(subjectId);
  } else {
    await projectServiceBooking(subjectId);
    await trackCustomerEvent({ userId, eventType: "SERVICE_BOOKING_PAID_MOCK", entityType: "SERVICE_BOOKING", entityId: subjectId, metadata: { provider: PROVIDER }, recompute: false });
  }
}

export async function startRazorpaySubjectPayment(type: RazorpaySubjectType, subjectId: string, userId: string) {
  const { keyId } = razorpayConfig();
  const attempt = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', "payment:" + type + ":" + subjectId);
    const subject = await resolveSubject(type, subjectId, userId, tx, true);
    if (subject.currency !== "INR" || subject.amount <= 0) throw new Error("This checkout requires a positive INR amount.");
    const existing = await tx.paymentAttempt.findFirst({ where: { subjectType: type, subjectId, userId, provider: PROVIDER, status: "pending" }, orderBy: { createdAt: "desc" } });
    if (existing) return { attempt: existing, subject };
    const amount = amountInPaise(subject.amount);
    const remote = await razorpayRequest<{ id: string; amount: number; currency: string }>("orders", {
      amount,
      currency: subject.currency,
      receipt: (type + "_" + subjectId).slice(0, 40),
      notes: { subjectType: type, subjectId, userId }
    });
    if (!remote.id?.startsWith("order_") || remote.amount !== amount || remote.currency !== subject.currency) throw new Error("Unexpected payment order response.");
    const attemptNo = await tx.paymentAttempt.count({ where: { subjectType: type, subjectId, provider: PROVIDER } });
    const created = await tx.paymentAttempt.create({ data: {
      tenantId: subject.tenantId,
      orderId: null,
      userId,
      subjectType: type,
      subjectId,
      provider: PROVIDER,
      providerOrderId: remote.id,
      amount: subject.amount,
      currency: subject.currency,
      status: "pending",
      attemptNo: attemptNo + 1,
      metadataJson: { mode: "test", label: subject.label }
    } });
    return { attempt: created, subject };
  }, { timeout: 25000 });
  return {
    key: keyId,
    order_id: attempt.attempt.providerOrderId,
    amount: amountInPaise(attempt.attempt.amount),
    currency: attempt.attempt.currency,
    customerName: attempt.subject.customerName,
    customerEmail: attempt.subject.customerEmail
  };
}

export async function confirmRazorpaySubjectPayment(paymentId: string, expectedProviderOrderId?: string, userId?: string) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new Error("Invalid payment reference.");
  const payment = await razorpayRequest<RazorpayPayment>("payments/" + paymentId);
  if (payment.id !== paymentId) throw new Error("Payment reference mismatch.");
  const attempt = await prisma.paymentAttempt.findUnique({ where: { provider_providerOrderId: { provider: PROVIDER, providerOrderId: payment.order_id } } });
  if (!attempt || !isSubjectType(attempt.subjectType) || (expectedProviderOrderId && attempt.providerOrderId !== expectedProviderOrderId) || (userId && attempt.userId !== userId)) throw new Error("Payment was not found for this customer.");
  assertCapturedPayment(payment, attempt.providerOrderId, attempt.amount, attempt.currency);

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "PaymentAttempt" WHERE id = $1 FOR UPDATE', attempt.id);
    const event = await tx.paymentEvent.upsert({
      where: { provider_providerEventId: { provider: PROVIDER, providerEventId: "captured:" + payment.id } },
      create: {
        tenantId: attempt.tenantId,
        paymentAttemptId: attempt.id,
        orderId: null,
        subjectType: attempt.subjectType,
        subjectId: attempt.subjectId,
        provider: PROVIDER,
        providerEventId: "captured:" + payment.id,
        eventType: "payment.captured",
        payloadJson: { paymentId: payment.id, providerOrderId: payment.order_id, amount: payment.amount, currency: payment.currency }
      },
      update: {}
    });
    if (event.processedAt) return { resultId: attempt.subjectId, processed: false };
    if (attempt.status !== "pending") throw new Error("This payment attempt is closed and requires support reconciliation.");
    const current = await resolveSubject(attempt.subjectType as RazorpaySubjectType, attempt.subjectId, attempt.userId, tx, false);
    if (current.amount !== Number(attempt.amount) || current.currency !== attempt.currency) throw new Error("The payable amount changed and requires support reconciliation.");
    const settledId = await settleSubject(attempt.subjectType as RazorpaySubjectType, attempt.subjectId, attempt.userId, payment.id, tx);
    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "succeeded", providerPaymentId: payment.id } });
    await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
    return { resultId: settledId, processed: true };
  }, { timeout: 25000 });
  if (outcome.processed) await runPostSettlement(attempt.subjectType as RazorpaySubjectType, attempt.subjectId, outcome.resultId, attempt.userId);
  return { subjectType: attempt.subjectType as RazorpaySubjectType, subjectId: attempt.subjectId };
}

export async function refreshRazorpaySubjectPayment(type: RazorpaySubjectType, subjectId: string, userId: string) {
  const attempt = await prisma.paymentAttempt.findFirst({ where: { subjectType: type, subjectId, userId, provider: PROVIDER }, orderBy: { createdAt: "desc" } });
  if (attempt?.status === "succeeded") return true;
  if (!attempt || attempt.status !== "pending") return false;
  const result = await razorpayRequest<{ items: RazorpayPayment[] }>("orders/" + encodeURIComponent(attempt.providerOrderId) + "/payments");
  const captured = result.items.find((item) => item.status === "captured" && item.captured);
  if (!captured) return false;
  await confirmRazorpaySubjectPayment(captured.id, attempt.providerOrderId, userId);
  return true;
}
