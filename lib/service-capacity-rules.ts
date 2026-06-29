import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRemainingCapacity } from "@/lib/service-capacity";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

export type ServiceCapacityDecisionValue = "available" | "manual_review" | "queue_required" | "unavailable";

export type ServiceCapacityDecision = {
  decision: ServiceCapacityDecisionValue;
  reason: string;
  ruleId?: string | null;
  confirmedQuantity: number;
  queuedQuantity: number;
  limit?: number | null;
};

const activeBookingStatuses = ["SUBMITTED", "CONFIRMED", "SCHEDULED", "ASSIGNED", "IN_PROGRESS", "PROOF_PENDING", "PROOF_UPLOADED"];

function dayRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function weekRange(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function monthRange(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

function normalized(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function sameDay(a: Date, b: Date) {
  return dayRange(a).start.getTime() === dayRange(b).start.getTime();
}

function dateMatchesRule(rule: { specificDate: Date | null; startDate: Date | null; endDate: Date | null }, date: Date | null) {
  if (!rule.specificDate && !rule.startDate && !rule.endDate) return true;
  if (!date) return false;
  if (rule.specificDate) return sameDay(rule.specificDate, date);
  if (rule.startDate && date < dayRange(rule.startDate).start) return false;
  if (rule.endDate && date >= dayRange(rule.endDate).end) return false;
  return true;
}

function specificity(rule: { serviceId: string | null; variantId: string | null; locationText: string | null; specificDate: Date | null; startDate: Date | null; endDate: Date | null }) {
  return [rule.variantId, rule.serviceId, rule.locationText, rule.specificDate, rule.startDate || rule.endDate].filter(Boolean).length;
}

async function sumBookingQuantity(
  client: PrismaExecutor,
  where: Prisma.ServiceBookingWhereInput
) {
  const result = await client.serviceBooking.aggregate({ where, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}

async function countForPeriod(
  client: PrismaExecutor,
  input: {
    tenantId: string;
    serviceId: string;
    variantId?: string | null;
    locationText?: string | null;
    range?: { start: Date; end: Date };
    includeQueued?: boolean;
  }
) {
  const baseWhere: Prisma.ServiceBookingWhereInput = {
    tenantId: input.tenantId,
    serviceId: input.serviceId,
    ...(input.variantId ? { variantId: input.variantId } : {}),
    ...(input.locationText ? { locationText: { equals: input.locationText, mode: "insensitive" } } : {}),
    ...(input.range ? { preferredDate: { gte: input.range.start, lt: input.range.end } } : {})
  };

  const [confirmedQuantity, queuedQuantity] = await Promise.all([
    sumBookingQuantity(client, { ...baseWhere, status: { in: activeBookingStatuses } }),
    sumBookingQuantity(client, { ...baseWhere, status: "QUEUED" })
  ]);

  return { confirmedQuantity, queuedQuantity: input.includeQueued === false ? 0 : queuedQuantity };
}

function overLimit(current: number, requested: number, limit?: number | null) {
  return typeof limit === "number" && limit > 0 && current + requested > limit;
}

export async function evaluateServiceBookingCapacity(
  input: {
    tenantId: string;
    serviceId: string;
    variantId?: string | null;
    slotId?: string | null;
    quantity: number;
    preferredDate?: Date | null;
    locationText?: string | null;
  },
  client: PrismaExecutor = prisma
): Promise<ServiceCapacityDecision> {
  const targetDate = input.preferredDate ?? null;

  if (input.slotId) {
    const slot = await client.serviceCapacitySlot.findFirst({ where: { id: input.slotId, tenantId: input.tenantId } });
    if (!slot || !["ACTIVE", "HELD"].includes(slot.status)) {
      return { decision: "unavailable", reason: "Selected capacity slot is not active.", confirmedQuantity: 0, queuedQuantity: 0 };
    }
    if (getRemainingCapacity(slot) < input.quantity) {
      return {
        decision: "queue_required",
        reason: "Selected capacity slot is full. Booking can join the service queue.",
        confirmedQuantity: slot.capacityConfirmed,
        queuedQuantity: 0,
        limit: slot.capacityTotal
      };
    }
  }

  const rules = await client.serviceCapacityRule.findMany({
    where: {
      tenantId: input.tenantId,
      active: true,
      OR: [{ serviceId: null }, { serviceId: input.serviceId }]
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }]
  });

  const matchingRules = rules
    .filter((rule) => !rule.variantId || rule.variantId === input.variantId)
    .filter((rule) => !rule.locationText || normalized(rule.locationText) === normalized(input.locationText))
    .filter((rule) => dateMatchesRule(rule, targetDate))
    .sort((a, b) => specificity(b) - specificity(a));

  const rule = matchingRules[0] ?? null;
  if (!rule) {
    return {
      decision: input.slotId ? "available" : "manual_review",
      reason: input.slotId ? "Capacity slot has availability." : "No capacity rule matched. Operations will manually review this booking.",
      confirmedQuantity: 0,
      queuedQuantity: 0
    };
  }

  if (!targetDate && (rule.dailyLimit || rule.weeklyLimit || rule.monthlyLimit)) {
    return {
      decision: rule.manualReviewFallback ? "manual_review" : "unavailable",
      reason: "A date is required to evaluate this capacity rule.",
      ruleId: rule.id,
      confirmedQuantity: 0,
      queuedQuantity: 0
    };
  }

  const checks: Array<{ range?: { start: Date; end: Date }; limit?: number | null; label: string }> = [
    { limit: rule.totalLimit, label: "total" }
  ];
  if (targetDate) {
    checks.unshift(
      { range: dayRange(targetDate), limit: rule.dailyLimit, label: "daily" },
      { range: weekRange(targetDate), limit: rule.weeklyLimit, label: "weekly" },
      { range: monthRange(targetDate), limit: rule.monthlyLimit, label: "monthly" }
    );
  }

  let confirmedQuantity = 0;
  let queuedQuantity = 0;
  for (const check of checks) {
    if (!check.limit) continue;
    const count = await countForPeriod(client, {
      tenantId: input.tenantId,
      serviceId: input.serviceId,
      variantId: rule.variantId ? input.variantId : null,
      locationText: rule.locationText ? input.locationText : null,
      range: check.range
    });
    confirmedQuantity = count.confirmedQuantity;
    queuedQuantity = count.queuedQuantity;
    if (overLimit(confirmedQuantity + queuedQuantity, input.quantity, check.limit)) {
      return {
        decision: "queue_required",
        reason: `The ${check.label} service capacity limit has been reached. Booking can join the queue.`,
        ruleId: rule.id,
        confirmedQuantity,
        queuedQuantity,
        limit: check.limit
      };
    }
  }

  return {
    decision: "available",
    reason: "Service capacity is available.",
    ruleId: rule.id,
    confirmedQuantity,
    queuedQuantity,
    limit: rule.dailyLimit ?? rule.weeklyLimit ?? rule.monthlyLimit ?? rule.totalLimit
  };
}

export async function getQueuePosition(
  input: { tenantId: string; serviceId: string; preferredDate?: Date | null; locationText?: string | null; bookingId?: string },
  client: PrismaExecutor = prisma
) {
  const range = input.preferredDate ? dayRange(input.preferredDate) : null;
  const bookings = await client.serviceBooking.findMany({
    where: {
      tenantId: input.tenantId,
      serviceId: input.serviceId,
      status: "QUEUED",
      ...(input.locationText ? { locationText: { equals: input.locationText, mode: "insensitive" } } : {}),
      ...(range ? { preferredDate: { gte: range.start, lt: range.end } } : {})
    },
    orderBy: [{ queuePriority: "desc" }, { queueJoinedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true }
  });
  const index = bookings.findIndex((booking) => booking.id === input.bookingId);
  return index >= 0 ? index + 1 : bookings.length + 1;
}

export async function getNextQueuedServiceBooking(
  input: { tenantId: string; serviceId?: string; preferredDate?: Date | null; locationText?: string | null },
  client: PrismaExecutor = prisma
) {
  const range = input.preferredDate ? dayRange(input.preferredDate) : null;
  return client.serviceBooking.findFirst({
    where: {
      tenantId: input.tenantId,
      status: "QUEUED",
      ...(input.serviceId ? { serviceId: input.serviceId } : {}),
      ...(input.locationText ? { locationText: { equals: input.locationText, mode: "insensitive" } } : {}),
      ...(range ? { preferredDate: { gte: range.start, lt: range.end } } : {})
    },
    orderBy: [{ queuePriority: "desc" }, { queueJoinedAt: "asc" }, { createdAt: "asc" }],
    include: { service: true, variant: true }
  });
}
