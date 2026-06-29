"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { requireCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { cancelCapacity, confirmCapacity, getRemainingCapacity, holdCapacity, releaseCapacity } from "@/lib/service-capacity";
import { evaluateServiceBookingCapacity, getQueuePosition } from "@/lib/service-capacity-rules";
import { serviceBookingPaymentStatuses, serviceBookingStatuses } from "@/lib/service-bookings";
import { trackCustomerEvent } from "@/lib/customer-events";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function intValue(formData: FormData, name: string, fallback = 1) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;
}

function dateValue(formData: FormData, name: string) {
  const value = text(formData, name);
  return value ? new Date(value) : null;
}

function bookingNumber() {
  return `PUJA-${Date.now()}`;
}

function revalidateBooking(id: string, bookingNo?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/services");
  revalidatePath("/admin");
  revalidatePath("/admin/queues");
  revalidatePath("/admin/service-bookings");
  revalidatePath(`/service-bookings/${id}`);
  revalidatePath(`/service-bookings/${id}/review`);
  if (bookingNo) {
    revalidatePath(`/admin/service-bookings/${bookingNo}`);
    revalidatePath(`/service-bookings/${bookingNo}`);
  }
}

async function writeServiceBookingActivity(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    serviceBookingId: string;
    actorId?: string | null;
    type: string;
    message: string;
    customerVisible?: boolean;
    metadataJson?: Prisma.InputJsonValue;
  }
) {
  return tx.serviceBookingActivity.create({
    data: {
      tenantId: input.tenantId,
      serviceBookingId: input.serviceBookingId,
      actorId: input.actorId ?? null,
      type: input.type,
      message: input.message,
      customerVisible: input.customerVisible ?? true,
      metadataJson: input.metadataJson
    }
  });
}

export async function createServiceBookingAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const serviceSlug = text(formData, "serviceSlug");
  const variantId = nullableText(formData, "variantId");
  const slotId = nullableText(formData, "slotId");
  const quantity = intValue(formData, "quantity", 1);
  const participantCount = intValue(formData, "participantCount", 1);
  const preferredDate = dateValue(formData, "preferredDate");
  const preferredTime = nullableText(formData, "preferredTime");
  const locationText = nullableText(formData, "locationText");

  const service = await prisma.product.findFirst({
    where: { tenantId, slug: serviceSlug, type: "SERVICE", status: "ACTIVE" },
    include: { variants: { where: { active: true }, orderBy: { createdAt: "asc" } } }
  });

  if (!service) throw new Error("Service is not available for booking.");
  const variant = variantId ? service.variants.find((item) => item.id === variantId) : service.variants[0] ?? null;
  const unitPrice = Number(variant?.price ?? service.basePrice ?? 0);
  const totalAmount = unitPrice * quantity;

  const created = await prisma.$transaction(async (tx) => {
    const capacityDecision = await evaluateServiceBookingCapacity(
      { tenantId, serviceId: service.id, variantId: variant?.id ?? null, slotId, quantity, preferredDate, locationText },
      tx
    );
    let capacityStatus = capacityDecision.decision === "available" && slotId ? "HELD" : capacityDecision.decision === "available" ? "AVAILABLE" : "MANUAL_REVIEW";
    let status = totalAmount > 0 ? "PAYMENT_PENDING" : "SUBMITTED";
    let paymentStatus = totalAmount > 0 ? "PENDING" : "CONFIRMED";

    if (slotId) {
      const slot = await tx.serviceCapacitySlot.findFirst({ where: { id: slotId, tenantId, status: { in: ["ACTIVE", "HELD"] } } });
      if (!slot) throw new Error("Selected service slot is not available.");
    }

    if (capacityDecision.decision === "unavailable") {
      throw new Error(capacityDecision.reason);
    }

    if (capacityDecision.decision === "queue_required") {
      status = "QUEUED";
      paymentStatus = "NOT_STARTED";
      capacityStatus = "QUEUED";
    }

    const booking = await tx.serviceBooking.create({
      data: {
        tenantId,
        userId: user.id,
        serviceId: service.id,
        variantId: variant?.id ?? null,
        slotId,
        capacityRuleId: capacityDecision.ruleId ?? null,
        bookingNo: bookingNumber(),
        status,
        paymentStatus,
        capacityStatus,
        queueJoinedAt: status === "QUEUED" ? new Date() : null,
        queueReason: status === "QUEUED" ? capacityDecision.reason : null,
        quantity,
        participantCount,
        preferredDate,
        preferredTime,
        locationText,
        customerName: user.name ?? user.email ?? "Customer",
        customerEmail: user.email ?? "",
        customerPhone: "",
        specialInstructions: nullableText(formData, "specialInstructions"),
        totalAmount,
        currency: service.currency
      }
    });

    if (status === "QUEUED") {
      const queuePosition = await getQueuePosition({ tenantId, serviceId: service.id, preferredDate, locationText, bookingId: booking.id }, tx);
      await tx.serviceBooking.update({ where: { id: booking.id }, data: { queuePosition } });
      await writeServiceBookingActivity(tx, {
        tenantId,
        serviceBookingId: booking.id,
        actorId: user.id,
        type: "service_booking_queued",
        message: `Booking joined the service queue at position ${queuePosition}. ${capacityDecision.reason}`,
        metadataJson: { queuePosition, reason: capacityDecision.reason, ruleId: capacityDecision.ruleId ?? null }
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          action: "service_booking_queued",
          entity: "ServiceBooking",
          entityId: booking.id,
          metadata: { bookingNo: booking.bookingNo, queuePosition, reason: capacityDecision.reason, serviceId: service.id }
        }
      });
    } else if (slotId && capacityDecision.decision === "available") {
      await holdCapacity({ slotId, quantity, sourceType: "SERVICE_BOOKING", sourceId: booking.id, reason: `Held for ${booking.bookingNo}`, actorId: user.id }, tx);
    }

    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: booking.id,
      actorId: user.id,
      type: "booking_started",
      message: status === "QUEUED" ? "Service booking created and queued for operations review." : totalAmount > 0 ? "Service booking created. Mock payment confirmation is pending." : "Service booking submitted for operations review.",
      metadataJson: { serviceSlug, variantId: variant?.id ?? null, slotId, totalAmount, capacityDecision: capacityDecision.decision }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: "service_booking_created",
        entity: "ServiceBooking",
        entityId: booking.id,
        metadata: { bookingNo: booking.bookingNo, serviceId: service.id, serviceTitle: service.title, totalAmount, capacityDecision: capacityDecision.decision }
      }
    });

    return status === "QUEUED" ? tx.serviceBooking.findUniqueOrThrow({ where: { id: booking.id } }) : booking;
  });

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: "SERVICE_BOOKING_STARTED",
    entityType: "SERVICE_BOOKING",
    entityId: created.id,
    entitySlug: created.bookingNo ?? created.id,
    metadata: { serviceId: service.id, serviceSlug, serviceTitle: service.title, totalAmount },
    recompute: false
  });

  revalidateBooking(created.id, created.bookingNo);
  redirect(created.status === "QUEUED" ? `/service-bookings/${created.id}` : `/service-bookings/${created.id}/review`);
}

export async function confirmServiceBookingMockPaymentAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const bookingId = text(formData, "bookingId");

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findFirst({
      where: { id: bookingId, tenantId, userId: user.id },
      include: { service: true, slot: true }
    });
    if (!booking) throw new Error("Service booking was not found.");
    if (["COMPLETED", "CANCELLED", "REFUNDED"].includes(booking.status)) throw new Error("This booking can no longer be paid.");
    if (booking.status === "QUEUED") throw new Error("This booking is queued. Operations must confirm capacity before mock payment can continue.");

    if (booking.slotId && booking.capacityStatus !== "CONFIRMED") {
      if (booking.capacityStatus === "HELD") {
        await releaseCapacity({ slotId: booking.slotId, quantity: booking.quantity, sourceType: "SERVICE_BOOKING", sourceId: booking.id, reason: `Released hold before confirm ${booking.bookingNo}`, actorId: user.id }, tx);
      }
      const capacityDecision = await evaluateServiceBookingCapacity(
        {
          tenantId,
          serviceId: booking.serviceId,
          variantId: booking.variantId,
          slotId: booking.slotId,
          quantity: booking.quantity,
          preferredDate: booking.preferredDate,
          locationText: booking.locationText
        },
        tx
      );
      if (capacityDecision.decision === "queue_required") {
        const saved = await tx.serviceBooking.update({
          where: { id: booking.id },
          data: { status: "QUEUED", paymentStatus: "NOT_STARTED", capacityStatus: "QUEUED", queueJoinedAt: new Date(), queueReason: capacityDecision.reason, capacityRuleId: capacityDecision.ruleId ?? booking.capacityRuleId }
        });
        const queuePosition = await getQueuePosition({ tenantId, serviceId: booking.serviceId, preferredDate: booking.preferredDate, locationText: booking.locationText, bookingId: booking.id }, tx);
        await tx.serviceBooking.update({ where: { id: booking.id }, data: { queuePosition } });
        await writeServiceBookingActivity(tx, {
          tenantId,
          serviceBookingId: booking.id,
          actorId: user.id,
          type: "service_booking_queued",
          message: `Capacity changed before payment. Booking moved to queue position ${queuePosition}.`,
          metadataJson: { queuePosition, reason: capacityDecision.reason }
        });
        return saved;
      }
      await confirmCapacity({ slotId: booking.slotId, quantity: booking.quantity, sourceType: "SERVICE_BOOKING", sourceId: booking.id, reason: `Confirmed for ${booking.bookingNo}`, actorId: user.id }, tx);
    }

    const saved = await tx.serviceBooking.update({
      where: { id: booking.id },
      data: {
        status: "SUBMITTED",
        paymentStatus: "CONFIRMED",
        capacityStatus: booking.slotId ? "CONFIRMED" : booking.capacityStatus,
        mockPaymentReference: `MOCK-SERVICE-${Date.now()}`
      }
    });

    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: booking.id,
      actorId: user.id,
      type: "mock_payment_confirmed",
      message: "Mock payment confirmed. Service booking submitted to operations.",
      metadataJson: { mockPaymentReference: saved.mockPaymentReference }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: "service_booking_mock_paid",
        entity: "ServiceBooking",
        entityId: booking.id,
        metadata: { bookingNo: booking.bookingNo, amount: booking.totalAmount, capacityStatus: saved.capacityStatus }
      }
    });

    return saved;
  });

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: updated.status === "QUEUED" ? "SERVICE_BOOKING_QUEUED" : "SERVICE_BOOKING_PAID_MOCK",
    entityType: "SERVICE_BOOKING",
    entityId: updated.id,
    entitySlug: updated.bookingNo ?? updated.id,
    metadata: { amount: Number(updated.totalAmount), paymentStatus: updated.paymentStatus, status: updated.status },
    recompute: false
  });

  revalidateBooking(updated.id, updated.bookingNo);
  redirect(updated.status === "QUEUED" ? `/service-bookings/${updated.id}` : `/service-bookings/${updated.id}`);
}

export async function failServiceBookingMockPaymentAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const bookingId = text(formData, "bookingId");

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findFirst({ where: { id: bookingId, tenantId, userId: user.id } });
    if (!booking) throw new Error("Service booking was not found.");
    if (booking.slotId && booking.capacityStatus === "HELD") {
      await releaseCapacity({ slotId: booking.slotId, quantity: booking.quantity, sourceType: "SERVICE_BOOKING", sourceId: booking.id, reason: `Released after mock payment failure ${booking.bookingNo}`, actorId: user.id }, tx);
    }
    const saved = await tx.serviceBooking.update({
      where: { id: booking.id },
      data: { paymentStatus: "FAILED", capacityStatus: booking.slotId ? "RELEASED" : booking.capacityStatus }
    });
    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: booking.id,
      actorId: user.id,
      type: "mock_payment_failed",
      message: "Mock payment failed. Retry is available from review.",
      metadataJson: { releasedCapacity: Boolean(booking.slotId) }
    });
    return saved;
  });

  revalidateBooking(updated.id, updated.bookingNo);
  redirect(`/service-bookings/${updated.id}/review`);
}

export async function updateServiceBookingAdminAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const bookingId = text(formData, "bookingId");
  const status = text(formData, "status");
  const paymentStatus = text(formData, "paymentStatus");
  const internalNote = nullableText(formData, "internalNote");
  const customerVisibleNote = nullableText(formData, "customerVisibleNote");
  const redirectTo = text(formData, "redirectTo") || "/admin/service-bookings";

  if (!serviceBookingStatuses.includes(status as never)) throw new Error("Unsupported service booking status.");
  if (!serviceBookingPaymentStatuses.includes(paymentStatus as never)) throw new Error("Unsupported service booking payment status.");

  const updated = await prisma.$transaction(async (tx) => {
    const current = await tx.serviceBooking.findFirst({ where: { id: bookingId, tenantId } });
    if (!current) throw new Error("Service booking was not found.");
    const terminalReleasesCapacity = ["CANCELLED", "REFUNDED", "COMPLETED"].includes(status);
    let capacityStatus = current.capacityStatus;

    if (terminalReleasesCapacity && current.slotId && current.capacityStatus === "HELD") {
      await releaseCapacity({ slotId: current.slotId, quantity: current.quantity, sourceType: "SERVICE_BOOKING", sourceId: current.id, reason: `Capacity released after ${status.toLowerCase()} ${current.bookingNo}`, actorId: admin.id }, tx);
      capacityStatus = "RELEASED";
    }
    if (terminalReleasesCapacity && current.slotId && current.capacityStatus === "CONFIRMED") {
      await cancelCapacity({ slotId: current.slotId, quantity: current.quantity, sourceType: "SERVICE_BOOKING", sourceId: current.id, reason: `Capacity released after ${status.toLowerCase()} ${current.bookingNo}`, actorId: admin.id }, tx);
      capacityStatus = "RELEASED";
    }

    const saved = await tx.serviceBooking.update({
      where: { id: current.id },
      data: {
        status,
        paymentStatus,
        capacityStatus,
        internalNote,
        customerVisibleNote,
        proofStatus: status === "PROOF_UPLOADED" ? "uploaded" : current.proofStatus
      }
    });

    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: current.id,
      actorId: admin.id,
      type: "admin_status_updated",
      message: customerVisibleNote || `Booking status updated to ${status.toLowerCase().replaceAll("_", " ")}.`,
      customerVisible: Boolean(customerVisibleNote),
      metadataJson: { fromStatus: current.status, toStatus: status, fromPaymentStatus: current.paymentStatus, toPaymentStatus: paymentStatus }
    });

    if (capacityStatus === "RELEASED" && current.capacityStatus !== "RELEASED") {
      await writeServiceBookingActivity(tx, {
        tenantId,
        serviceBookingId: current.id,
        actorId: admin.id,
        type: "capacity_released",
        message: "Service capacity was released for this booking.",
        customerVisible: false,
        metadataJson: { fromCapacityStatus: current.capacityStatus, toCapacityStatus: capacityStatus, status }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "service_booking_updated",
        entity: "ServiceBooking",
        entityId: current.id,
        metadata: { fromStatus: current.status, toStatus: status, fromPaymentStatus: current.paymentStatus, toPaymentStatus: paymentStatus }
      }
    });

    return saved;
  });

  if (updated.status === "COMPLETED") {
    await trackCustomerEvent({
      tenantId,
      userId: updated.userId,
      eventType: "SERVICE_BOOKING_COMPLETED",
      entityType: "SERVICE_BOOKING",
      entityId: updated.id,
      entitySlug: updated.bookingNo ?? updated.id,
      metadata: { status: updated.status },
      recompute: false
    });
  }

  revalidateBooking(updated.id, updated.bookingNo);
  redirect(redirectTo);
}

export async function setServiceBookingQueuePriorityAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const bookingId = text(formData, "bookingId");
  const redirectTo = text(formData, "redirectTo") || "/admin/service-bookings";
  const enabled = text(formData, "priority") === "true";
  const reason = nullableText(formData, "reason");

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findFirst({ where: { id: bookingId, tenantId } });
    if (!booking) throw new Error("Service booking was not found.");
    if (booking.status !== "QUEUED") throw new Error("Only queued bookings can be prioritized.");

    const saved = await tx.serviceBooking.update({
      where: { id: booking.id },
      data: {
        queuePriority: enabled,
        queuePriorityReason: enabled ? reason : null,
        queuePriorityAt: enabled ? new Date() : null,
        queuePrioritizedById: enabled ? admin.id : null
      }
    });
    const queuePosition = await getQueuePosition({ tenantId, serviceId: booking.serviceId, preferredDate: booking.preferredDate, locationText: booking.locationText, bookingId: booking.id }, tx);
    await tx.serviceBooking.update({ where: { id: booking.id }, data: { queuePosition } });

    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: booking.id,
      actorId: admin.id,
      type: enabled ? "service_booking_prioritized" : "service_booking_priority_removed",
      message: enabled ? `Priority added to queue. ${reason ?? ""}`.trim() : "Queue priority removed.",
      customerVisible: false,
      metadataJson: { enabled, reason, queuePosition }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: enabled ? "service_booking_prioritized" : "service_booking_priority_removed",
        entity: "ServiceBooking",
        entityId: booking.id,
        metadata: { bookingNo: booking.bookingNo, reason, queuePosition }
      }
    });

    return saved;
  });

  revalidateBooking(updated.id, updated.bookingNo);
  redirect(redirectTo);
}

export async function promoteQueuedServiceBookingAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const bookingId = text(formData, "bookingId");
  const redirectTo = text(formData, "redirectTo") || "/admin/service-bookings";
  const override = text(formData, "override") === "true";
  const note = nullableText(formData, "note");

  const updated = await prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findFirst({ where: { id: bookingId, tenantId }, include: { service: true } });
    if (!booking) throw new Error("Service booking was not found.");
    if (booking.status !== "QUEUED") throw new Error("Only queued bookings can be promoted.");

    const capacityDecision = await evaluateServiceBookingCapacity(
      {
        tenantId,
        serviceId: booking.serviceId,
        variantId: booking.variantId,
        slotId: booking.slotId,
        quantity: booking.quantity,
        preferredDate: booking.preferredDate,
        locationText: booking.locationText
      },
      tx
    );
    if (capacityDecision.decision === "unavailable") throw new Error(capacityDecision.reason);
    if (capacityDecision.decision === "queue_required" && !override) throw new Error("Capacity is still full. Use priority override only when operations explicitly accepts manual capacity.");

    let capacityStatus = booking.capacityStatus;
    if (booking.slotId && capacityDecision.decision === "available") {
      await confirmCapacity({ slotId: booking.slotId, quantity: booking.quantity, sourceType: "SERVICE_BOOKING", sourceId: booking.id, reason: `Promoted queued booking ${booking.bookingNo}`, actorId: admin.id }, tx);
      capacityStatus = "CONFIRMED";
    } else if (override) {
      capacityStatus = "OVERRIDE";
    } else {
      capacityStatus = capacityDecision.decision === "manual_review" ? "MANUAL_REVIEW" : "AVAILABLE";
    }

    const status = Number(booking.totalAmount) > 0 ? "PAYMENT_PENDING" : "SUBMITTED";
    const paymentStatus = Number(booking.totalAmount) > 0 ? "PENDING" : "CONFIRMED";
    const saved = await tx.serviceBooking.update({
      where: { id: booking.id },
      data: {
        status,
        paymentStatus,
        capacityStatus,
        capacityRuleId: capacityDecision.ruleId ?? booking.capacityRuleId,
        queuePosition: null,
        queueReason: null,
        customerVisibleNote: note ?? "Your service booking is now ready to continue."
      }
    });

    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: booking.id,
      actorId: admin.id,
      type: "queued_booking_promoted",
      message: note ?? "Queued booking promoted by operations.",
      metadataJson: { fromStatus: booking.status, toStatus: status, capacityStatus, override, decision: capacityDecision.decision }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "queued_booking_promoted",
        entity: "ServiceBooking",
        entityId: booking.id,
        metadata: { bookingNo: booking.bookingNo, status, capacityStatus, override, note }
      }
    });

    return saved;
  });

  await trackCustomerEvent({
    tenantId,
    userId: updated.userId,
    eventType: "QUEUED_BOOKING_PROMOTED",
    entityType: "SERVICE_BOOKING",
    entityId: updated.id,
    entitySlug: updated.bookingNo ?? updated.id,
    metadata: { status: updated.status, capacityStatus: updated.capacityStatus },
    recompute: false
  });

  revalidateBooking(updated.id, updated.bookingNo);
  redirect(redirectTo);
}

export async function saveServiceCapacityRuleAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const serviceId = nullableText(formData, "serviceId");
  const variantId = nullableText(formData, "variantId");
  const redirectTo = text(formData, "redirectTo") || "/admin/service-capacity-rules";

  const data = {
    tenantId,
    serviceId,
    variantId,
    locationText: nullableText(formData, "locationText"),
    specificDate: dateValue(formData, "specificDate"),
    startDate: dateValue(formData, "startDate"),
    endDate: dateValue(formData, "endDate"),
    dailyLimit: nullableText(formData, "dailyLimit") ? intValue(formData, "dailyLimit", 0) : null,
    weeklyLimit: nullableText(formData, "weeklyLimit") ? intValue(formData, "weeklyLimit", 0) : null,
    monthlyLimit: nullableText(formData, "monthlyLimit") ? intValue(formData, "monthlyLimit", 0) : null,
    totalLimit: nullableText(formData, "totalLimit") ? intValue(formData, "totalLimit", 0) : null,
    manualReviewFallback: text(formData, "manualReviewFallback") === "on",
    active: text(formData, "active") === "on",
    notes: nullableText(formData, "notes")
  };

  const rule = await prisma.$transaction(async (tx) => {
    if (serviceId) {
      const service = await tx.product.findFirst({ where: { id: serviceId, tenantId, type: "SERVICE" } });
      if (!service) throw new Error("Selected service is not valid.");
    }
    if (variantId) {
      const variant = await tx.productVariant.findFirst({ where: { id: variantId, product: { tenantId, ...(serviceId ? { id: serviceId } : {}) } } });
      if (!variant) throw new Error("Selected variant is not valid for this tenant/service.");
    }

    const saved = id
      ? await tx.serviceCapacityRule.update({ where: { id }, data })
      : await tx.serviceCapacityRule.create({ data });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: id ? "capacity_rule_updated" : "capacity_rule_created",
        entity: "ServiceCapacityRule",
        entityId: saved.id,
        metadata: { serviceId, variantId, active: saved.active, dailyLimit: saved.dailyLimit, weeklyLimit: saved.weeklyLimit, monthlyLimit: saved.monthlyLimit, totalLimit: saved.totalLimit }
      }
    });

    return saved;
  });

  revalidatePath("/admin/service-capacity-rules");
  revalidatePath("/admin/service-bookings");
  revalidatePath("/admin/queues");
  redirect(`${redirectTo}?saved=${rule.id}`);
}
