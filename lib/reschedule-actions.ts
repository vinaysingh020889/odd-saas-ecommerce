"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { requireSupportAdminUser } from "@/lib/admin-auth";
import { requireCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { trackCustomerEvent } from "@/lib/customer-events";
import { cancelCapacity, confirmCapacity, holdCapacity, releaseCapacity } from "@/lib/service-capacity";
import { evaluateServiceBookingCapacity, getQueuePosition } from "@/lib/service-capacity-rules";
import { prisma } from "@/lib/prisma";
import {
  activeRescheduleRequestStatuses,
  isServiceBookingRescheduleEligible,
  rescheduleRequestNumber
} from "@/lib/reschedule-requests";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function dateValue(formData: FormData, name: string) {
  const value = text(formData, name);
  return value ? new Date(value) : null;
}

function redirectPath(formData: FormData, fallback: string) {
  const value = text(formData, "redirectTo");
  return value.startsWith("/") ? value : fallback;
}

function revalidateReschedule(bookingId?: string | null, bookingNo?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/queues");
  revalidatePath("/admin/reschedule-requests");
  revalidatePath("/admin/service-bookings");
  if (bookingId) {
    revalidatePath(`/service-bookings/${bookingId}`);
    revalidatePath(`/admin/service-bookings/${bookingId}`);
  }
  if (bookingNo) {
    revalidatePath(`/service-bookings/${bookingNo}`);
    revalidatePath(`/admin/service-bookings/${bookingNo}`);
  }
}

async function writeRescheduleActivity(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    requestId: string;
    actorId?: string | null;
    action: string;
    note?: string | null;
  }
) {
  return tx.rescheduleRequestActivity.create({
    data: {
      tenantId: input.tenantId,
      rescheduleRequestId: input.requestId,
      actorId: input.actorId ?? null,
      action: input.action,
      note: input.note
    }
  });
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

async function releaseOldCapacity(
  tx: Prisma.TransactionClient,
  booking: { id: string; bookingNo: string | null; slotId: string | null; quantity: number; capacityStatus: string },
  actorId: string
) {
  if (!booking.slotId) return booking.capacityStatus;
  if (booking.capacityStatus === "HELD") {
    await releaseCapacity(
      {
        slotId: booking.slotId,
        quantity: booking.quantity,
        sourceType: "SERVICE_BOOKING",
        sourceId: booking.id,
        reason: `Released old slot for reschedule ${booking.bookingNo ?? booking.id}`,
        actorId
      },
      tx
    );
    return "RELEASED";
  }
  if (booking.capacityStatus === "CONFIRMED") {
    await cancelCapacity(
      {
        slotId: booking.slotId,
        quantity: booking.quantity,
        sourceType: "SERVICE_BOOKING",
        sourceId: booking.id,
        reason: `Released old confirmed slot for reschedule ${booking.bookingNo ?? booking.id}`,
        actorId
      },
      tx
    );
    return "RELEASED";
  }
  return booking.capacityStatus;
}

export async function createServiceBookingRescheduleRequestAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const bookingId = text(formData, "bookingId");
  const requestedDate = dateValue(formData, "requestedDate");
  const requestedTime = nullableText(formData, "requestedTime");
  const requestedSlotId = nullableText(formData, "requestedSlotId");
  const requestedLocation = nullableText(formData, "requestedLocation");
  const customerReason = nullableText(formData, "customerReason");

  const created = await prisma.$transaction(async (tx) => {
    const booking = await tx.serviceBooking.findFirst({
      where: { id: bookingId, tenantId, userId: user.id },
      include: { slot: true }
    });
    if (!booking) throw new Error("Service booking was not found.");
    if (!isServiceBookingRescheduleEligible(booking.status, booking.paymentStatus)) {
      throw new Error("This booking is not eligible for reschedule right now.");
    }

    const existing = await tx.rescheduleRequest.findFirst({
      where: { tenantId, serviceBookingId: booking.id, status: { in: [...activeRescheduleRequestStatuses] } }
    });
    if (existing) throw new Error("A reschedule request is already under review for this booking.");
    if (!requestedDate && !requestedTime && !requestedSlotId && !requestedLocation) {
      throw new Error("Please choose at least one new date, time, slot, or location.");
    }

    const selectedSlot = requestedSlotId
      ? await tx.serviceCapacitySlot.findFirst({ where: { id: requestedSlotId, tenantId, status: { in: ["ACTIVE", "HELD"] } } })
      : null;
    if (requestedSlotId && !selectedSlot) throw new Error("Selected service slot is not available.");
    const effectiveRequestedDate = requestedDate ?? selectedSlot?.date ?? null;
    const effectiveRequestedTime = requestedTime ?? selectedSlot?.startTime ?? null;

    const capacityDecision = await evaluateServiceBookingCapacity(
      {
        tenantId,
        serviceId: booking.serviceId,
        variantId: booking.variantId,
        slotId: requestedSlotId,
        quantity: booking.quantity,
        preferredDate: effectiveRequestedDate ?? booking.preferredDate,
        locationText: requestedLocation ?? booking.locationText
      },
      tx
    );

    const request = await tx.rescheduleRequest.create({
      data: {
        tenantId,
        requestNo: rescheduleRequestNumber(),
        relatedType: "SERVICE_BOOKING",
        relatedId: booking.id,
        serviceBookingId: booking.id,
        currentDate: booking.preferredDate ?? booking.slot?.date ?? null,
        currentTime: booking.preferredTime ?? booking.slot?.startTime ?? null,
        currentSlotId: booking.slotId,
        currentLocation: booking.locationText,
        requestedDate: effectiveRequestedDate,
        requestedTime: effectiveRequestedTime,
        requestedSlotId,
        requestedLocation,
        customerReason,
        requestedById: user.id,
        capacityDecision: capacityDecision.decision,
        capacityReason: capacityDecision.reason,
        status: "submitted"
      }
    });

    await writeRescheduleActivity(tx, {
      tenantId,
      requestId: request.id,
      actorId: user.id,
      action: "reschedule_requested",
      note: customerReason ?? "Customer requested a schedule change."
    });
    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: booking.id,
      actorId: user.id,
      type: "reschedule_requested",
      message: "Reschedule request submitted. Operations will review capacity before changing the booking.",
      metadataJson: { requestId: request.id, requestNo: request.requestNo, capacityDecision: capacityDecision.decision }
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: "reschedule_requested",
        entity: "RescheduleRequest",
        entityId: request.id,
        metadata: { bookingId: booking.id, bookingNo: booking.bookingNo, capacityDecision: capacityDecision.decision }
      }
    });

    return { request, booking };
  });

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: "RESCHEDULE_REQUESTED",
    entityType: "SERVICE_BOOKING",
    entityId: created.booking.id,
    entitySlug: created.booking.bookingNo ?? created.booking.id,
    metadata: { requestId: created.request.id, requestNo: created.request.requestNo },
    recompute: false
  });

  revalidateReschedule(created.booking.id, created.booking.bookingNo);
  redirect(`/service-bookings/${created.booking.id}`);
}

export async function reviewRescheduleRequestAction(formData: FormData) {
  const admin = await requireSupportAdminUser();
  const tenantId = await getOmdTenantId();
  const requestId = text(formData, "requestId");
  const action = text(formData, "action");
  const adminNote = nullableText(formData, "adminNote");
  const customerVisibleNote = nullableText(formData, "customerVisibleNote");
  const redirectTo = redirectPath(formData, "/admin/reschedule-requests");

  if (!["under_review", "reject", "approve", "queue", "priority_exception", "close"].includes(action)) {
    throw new Error("Unsupported reschedule action.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const request = await tx.rescheduleRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { serviceBooking: true }
    });
    if (!request?.serviceBooking) throw new Error("Reschedule request was not found.");
    if (["approved", "rejected", "closed", "priority_exception"].includes(request.status) && action !== "close") {
      throw new Error("This reschedule request is already closed.");
    }

    const booking = request.serviceBooking;

    if (action === "under_review") {
      const saved = await tx.rescheduleRequest.update({
        where: { id: request.id },
        data: { status: "under_review", adminDecision: "under_review", adminNote, customerVisibleNote, reviewedById: admin.id, reviewedAt: new Date() }
      });
      await writeRescheduleActivity(tx, { tenantId, requestId: request.id, actorId: admin.id, action: "reschedule_under_review", note: adminNote });
      await writeServiceBookingActivity(tx, {
        tenantId,
        serviceBookingId: booking.id,
        actorId: admin.id,
        type: "reschedule_under_review",
        message: customerVisibleNote ?? "Operations is reviewing your reschedule request.",
        customerVisible: true,
        metadataJson: { requestId: request.id }
      });
      return { request: saved, booking, eventType: "RESCHEDULE_REQUESTED" as const };
    }

    if (action === "reject" || action === "close") {
      const status = action === "reject" ? "rejected" : "closed";
      const activityAction = action === "reject" ? "reschedule_rejected" : "reschedule_closed";
      const saved = await tx.rescheduleRequest.update({
        where: { id: request.id },
        data: {
          status,
          adminDecision: status,
          adminNote,
          customerVisibleNote,
          reviewedById: admin.id,
          reviewedAt: new Date(),
          closedAt: new Date()
        }
      });
      await writeRescheduleActivity(tx, { tenantId, requestId: request.id, actorId: admin.id, action: activityAction, note: adminNote });
      await writeServiceBookingActivity(tx, {
        tenantId,
        serviceBookingId: booking.id,
        actorId: admin.id,
        type: activityAction,
        message: customerVisibleNote ?? (action === "reject" ? "Reschedule request was not approved." : "Reschedule request was closed."),
        metadataJson: { requestId: request.id, status }
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: admin.id,
          action: activityAction,
          entity: "RescheduleRequest",
          entityId: request.id,
          metadata: { bookingId: booking.id, bookingNo: booking.bookingNo, adminNote }
        }
      });
      return { request: saved, booking, eventType: action === "reject" ? ("RESCHEDULE_REJECTED" as const) : ("RESCHEDULE_REJECTED" as const) };
    }

    const capacityDecision = await evaluateServiceBookingCapacity(
      {
        tenantId,
        serviceId: booking.serviceId,
        variantId: booking.variantId,
        slotId: request.requestedSlotId,
        quantity: booking.quantity,
        preferredDate: request.requestedDate ?? booking.preferredDate,
        locationText: request.requestedLocation ?? booking.locationText
      },
      tx
    );

    if (capacityDecision.decision === "unavailable") throw new Error(capacityDecision.reason);
    if (capacityDecision.decision === "queue_required" && action === "approve") {
      throw new Error("Requested capacity is full. Use approve to queue or priority exception.");
    }

    const oldCapacityStatus = await releaseOldCapacity(tx, booking, admin.id);
    if (oldCapacityStatus === "RELEASED") {
      await writeServiceBookingActivity(tx, {
        tenantId,
        serviceBookingId: booking.id,
        actorId: admin.id,
        type: "capacity_released_for_reschedule",
        message: "Previous service capacity was released for the approved reschedule.",
        customerVisible: false,
        metadataJson: { oldSlotId: booking.slotId, requestId: request.id }
      });
    }

    let newCapacityStatus = capacityDecision.decision === "manual_review" ? "MANUAL_REVIEW" : "AVAILABLE";
    let newStatus = booking.status;
    let queuePosition: number | null = null;
    const shouldQueue = action === "queue" || capacityDecision.decision === "queue_required";

    if (shouldQueue) {
      newStatus = "QUEUED";
      newCapacityStatus = "QUEUED";
      queuePosition = await getQueuePosition(
        {
          tenantId,
          serviceId: booking.serviceId,
          preferredDate: request.requestedDate ?? booking.preferredDate,
          locationText: request.requestedLocation ?? booking.locationText,
          bookingId: booking.id
        },
        tx
      );
    } else if (action === "priority_exception") {
      newCapacityStatus = "OVERRIDE";
      newStatus = booking.status === "QUEUED" ? "SUBMITTED" : booking.status;
    } else if (request.requestedSlotId && capacityDecision.decision === "available") {
      const movement = booking.paymentStatus === "CONFIRMED" ? confirmCapacity : holdCapacity;
      await movement(
        {
          slotId: request.requestedSlotId,
          quantity: booking.quantity,
          sourceType: "SERVICE_BOOKING",
          sourceId: booking.id,
          reason: `Confirmed reschedule for ${booking.bookingNo ?? booking.id}`,
          actorId: admin.id
        },
        tx
      );
      newCapacityStatus = booking.paymentStatus === "CONFIRMED" ? "CONFIRMED" : "HELD";
    }

    const savedBooking = await tx.serviceBooking.update({
      where: { id: booking.id },
      data: {
        slotId: request.requestedSlotId,
        capacityRuleId: capacityDecision.ruleId ?? booking.capacityRuleId,
        preferredDate: request.requestedDate ?? booking.preferredDate,
        preferredTime: request.requestedTime ?? booking.preferredTime,
        locationText: request.requestedLocation ?? booking.locationText,
        status: newStatus,
        capacityStatus: newCapacityStatus,
        queueJoinedAt: shouldQueue ? new Date() : null,
        queuePosition,
        queueReason: shouldQueue ? (adminNote ?? capacityDecision.reason) : null,
        queuePriority: action === "priority_exception" ? true : booking.queuePriority,
        queuePriorityReason: action === "priority_exception" ? (adminNote ?? "Priority exception for reschedule") : booking.queuePriorityReason,
        queuePriorityAt: action === "priority_exception" ? new Date() : booking.queuePriorityAt,
        queuePrioritizedById: action === "priority_exception" ? admin.id : booking.queuePrioritizedById,
        customerVisibleNote: customerVisibleNote ?? "Your service booking schedule has been updated."
      }
    });

    const finalStatus = shouldQueue ? "queued" : action === "priority_exception" ? "priority_exception" : "approved";
    const savedRequest = await tx.rescheduleRequest.update({
      where: { id: request.id },
      data: {
        status: finalStatus,
        adminDecision: action,
        adminNote,
        customerVisibleNote,
        capacityDecision: capacityDecision.decision,
        capacityReason: capacityDecision.reason,
        queuePosition,
        reviewedById: admin.id,
        reviewedAt: new Date(),
        closedAt: new Date()
      }
    });

    const activityType = shouldQueue ? "reschedule_moved_to_queue" : action === "priority_exception" ? "reschedule_priority_exception" : "reschedule_approved";
    await writeRescheduleActivity(tx, { tenantId, requestId: request.id, actorId: admin.id, action: activityType, note: adminNote });
    await writeServiceBookingActivity(tx, {
      tenantId,
      serviceBookingId: booking.id,
      actorId: admin.id,
      type: "schedule_changed",
      message: customerVisibleNote ?? (shouldQueue ? "Reschedule approved and moved to service queue." : "Service booking schedule updated."),
      metadataJson: {
        requestId: request.id,
        fromDate: request.currentDate,
        toDate: request.requestedDate,
        fromTime: request.currentTime,
        toTime: request.requestedTime,
        capacityDecision: capacityDecision.decision,
        capacityStatus: newCapacityStatus,
        queuePosition
      }
    });
    if (newCapacityStatus === "CONFIRMED" || newCapacityStatus === "HELD") {
      await writeServiceBookingActivity(tx, {
        tenantId,
        serviceBookingId: booking.id,
        actorId: admin.id,
        type: "capacity_confirmed_for_reschedule",
        message: "New service capacity was reserved for the rescheduled booking.",
        customerVisible: false,
        metadataJson: { slotId: request.requestedSlotId, capacityStatus: newCapacityStatus }
      });
    }
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: activityType,
        entity: "RescheduleRequest",
        entityId: request.id,
        metadata: {
          bookingId: booking.id,
          bookingNo: booking.bookingNo,
          action,
          capacityDecision: capacityDecision.decision,
          newCapacityStatus,
          queuePosition
        }
      }
    });

    return {
      request: savedRequest,
      booking: savedBooking,
      eventType: shouldQueue
        ? ("RESCHEDULE_MOVED_TO_QUEUE" as const)
        : action === "priority_exception"
          ? ("RESCHEDULE_PRIORITY_EXCEPTION" as const)
          : ("RESCHEDULE_APPROVED" as const)
    };
  });

  await trackCustomerEvent({
    tenantId,
    userId: updated.booking.userId,
    eventType: updated.eventType,
    entityType: "SERVICE_BOOKING",
    entityId: updated.booking.id,
    entitySlug: updated.booking.bookingNo ?? updated.booking.id,
    metadata: { requestId: updated.request.id, requestNo: updated.request.requestNo, status: updated.request.status },
    recompute: false
  });

  revalidateReschedule(updated.booking.id, updated.booking.bookingNo);
  redirect(redirectTo);
}
