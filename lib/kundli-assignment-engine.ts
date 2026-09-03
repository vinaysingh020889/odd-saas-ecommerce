import { Prisma, type AssignmentSource, type KundliOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const KUNDLI_CAPACITY_CONSUMING_STATUSES = [
  "ASSIGNED",
  "IN_REVIEW",
  "REPORT_READY",
  "CONSULTATION_SCHEDULED"
] as const satisfies readonly KundliOrderStatus[];

const TERMINAL_KUNDLI_STATUSES = new Set<KundliOrderStatus>(["DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"]);
const MAX_TRANSACTION_RETRIES = 3;
const KUNDLI_ASSIGNED_QUEUE_CLEANUP = { assignmentQueuedAt: null, assignmentQueuePosition: null, internalNote: null } as const;

export type AssignmentContext = {
  actorId: string;
  now?: Date;
  source?: AssignmentSource;
  reason?: string;
  assignmentPriority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
};

export type CapacitySnapshot = { daily: number; weekly: number; monthly: number; active: number };
export type PractitionerCandidate = {
  id: string;
  userId: string;
  displayName: string;
  assignmentPriority: number;
  standardDeliveryBusinessDays: number;
  timezone: string;
  dailyActiveOrderLimit: number;
  weeklyActiveOrderLimit: number;
  monthlyActiveOrderLimit: number;
  capacity: CapacitySnapshot;
  unavailable: boolean;
  unavailability?: Array<{ startsAt: Date; endsAt: Date }>;
  active?: boolean;
  acceptingWork?: boolean;
  eligibleForPackage?: boolean;
  capacityValid?: boolean;
};

export type DeliveryRisk = "ON_TRACK" | "DUE_SOON" | "OVERDUE";
export type KundliAssignmentBlockingCode =
  | "NO_ACTIVE_GURUJI"
  | "NO_ACCEPTING_GURUJI"
  | "PACKAGE_RESTRICTION_EMPTY"
  | "ALL_ELIGIBLE_UNAVAILABLE"
  | "DAILY_CAPACITY_FULL"
  | "WEEKLY_CAPACITY_FULL"
  | "MONTHLY_CAPACITY_FULL"
  | "CAPACITY_FULL";

export const KUNDLI_ASSIGNMENT_BLOCKING_MESSAGES: Record<KundliAssignmentBlockingCode, string> = {
  NO_ACTIVE_GURUJI: "No active Guruji.",
  NO_ACCEPTING_GURUJI: "No active Guruji is accepting work.",
  PACKAGE_RESTRICTION_EMPTY: "Package restriction has no eligible Guruji.",
  ALL_ELIGIBLE_UNAVAILABLE: "All eligible Guruji are unavailable.",
  DAILY_CAPACITY_FULL: "Daily capacity is full for all available eligible Guruji.",
  WEEKLY_CAPACITY_FULL: "Weekly capacity is full for all available eligible Guruji.",
  MONTHLY_CAPACITY_FULL: "Monthly capacity is full for all available eligible Guruji.",
  CAPACITY_FULL: "All available eligible Guruji are at daily, weekly, or monthly capacity."
};

export function evaluateKundliCandidatePool(candidates: PractitionerCandidate[], restrictToSelectedPractitioners: boolean) {
  const active = candidates.filter((item) => item.active !== false);
  if (!active.length) return { candidates: [], blockingCode: "NO_ACTIVE_GURUJI" as const };
  const accepting = active.filter((item) => item.acceptingWork !== false);
  if (!accepting.length) return { candidates: [], blockingCode: "NO_ACCEPTING_GURUJI" as const };
  const eligible = restrictToSelectedPractitioners ? accepting.filter((item) => item.eligibleForPackage) : accepting;
  if (!eligible.length) return { candidates: [], blockingCode: "PACKAGE_RESTRICTION_EMPTY" as const };
  const available = eligible.filter((item) => !item.unavailable);
  if (!available.length) return { candidates: eligible, blockingCode: "ALL_ELIGIBLE_UNAVAILABLE" as const };
  const withCapacity = available.filter(candidateHasCapacity);
  if (withCapacity.length) return { candidates: eligible, blockingCode: null };
  if (available.every((item) => item.capacity.daily >= item.dailyActiveOrderLimit)) return { candidates: eligible, blockingCode: "DAILY_CAPACITY_FULL" as const };
  if (available.every((item) => item.capacity.weekly >= item.weeklyActiveOrderLimit)) return { candidates: eligible, blockingCode: "WEEKLY_CAPACITY_FULL" as const };
  if (available.every((item) => item.capacity.monthly >= item.monthlyActiveOrderLimit)) return { candidates: eligible, blockingCode: "MONTHLY_CAPACITY_FULL" as const };
  return { candidates: eligible, blockingCode: "CAPACITY_FULL" as const };
}

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function zonedDateToUtc(parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number }, timezone: string) {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour ?? 0, parts.minute ?? 0, parts.second ?? 0);
  let result = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = zonedParts(new Date(result), timezone);
    const actualAsUtc = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second);
    result += target - actualAsUtc;
  }
  return new Date(result);
}

function addCalendarDays(parts: { year: number; month: number; day: number }, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function getPractitionerCapacityWindows(now: Date, timezone: string) {
  const local = zonedParts(now, timezone);
  const dateOnly = { year: local.year, month: local.month, day: local.day };
  const weekday = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const weekStart = addCalendarDays(dateOnly, mondayOffset);
  const weekEnd = addCalendarDays(weekStart, 7);
  const nextDay = addCalendarDays(dateOnly, 1);
  const nextMonth = local.month === 12 ? { year: local.year + 1, month: 1, day: 1 } : { year: local.year, month: local.month + 1, day: 1 };
  return {
    day: { start: zonedDateToUtc(dateOnly, timezone), end: zonedDateToUtc(nextDay, timezone) },
    week: { start: zonedDateToUtc(weekStart, timezone), end: zonedDateToUtc(weekEnd, timezone) },
    month: { start: zonedDateToUtc({ year: local.year, month: local.month, day: 1 }, timezone), end: zonedDateToUtc(nextMonth, timezone) }
  };
}

export function candidateHasCapacity(candidate: PractitionerCandidate) {
  return candidate.capacity.daily < candidate.dailyActiveOrderLimit
    && candidate.capacity.weekly < candidate.weeklyActiveOrderLimit
    && candidate.capacity.monthly < candidate.monthlyActiveOrderLimit;
}

export function selectInternalAssignmentCandidate(candidates: PractitionerCandidate[]) {
  return candidates
    .filter((candidate) => !candidate.unavailable && candidateHasCapacity(candidate))
    .sort((left, right) =>
      left.assignmentPriority - right.assignmentPriority
      || left.capacity.active - right.capacity.active
      || left.id.localeCompare(right.id)
    )[0] ?? null;
}

export function selectCustomerRequestedCandidate(candidates: PractitionerCandidate[], requestedPractitionerProfileId: string | null) {
  const candidate = candidates.find((item) => item.id === requestedPractitionerProfileId) ?? null;
  return candidate && !candidate.unavailable && candidateHasCapacity(candidate) ? candidate : null;
}

export function assertOneActivePrimaryAssignment(assignments: Array<{ isPrimary: boolean; endedAt: Date | null; status: string }>) {
  const active = assignments.filter((item) => item.isPrimary && item.endedAt === null && !["COMPLETED", "CANCELLED"].includes(item.status));
  if (active.length > 1) throw new Error("Multiple active primary Kundli assignments found.");
  return active[0] ?? null;
}

export function assignmentConsumesKundliCapacity(assignment: { isPrimary: boolean; endedAt: Date | null; status: string }, orderStatus: KundliOrderStatus) {
  return assignment.isPrimary && assignment.endedAt === null && !["COMPLETED", "CANCELLED"].includes(assignment.status) && KUNDLI_CAPACITY_CONSUMING_STATUSES.includes(orderStatus as (typeof KUNDLI_CAPACITY_CONSUMING_STATUSES)[number]);
}

function overlapsDate(unavailable: { startsAt: Date; endsAt: Date }, dayStart: Date, dayEnd: Date) {
  return unavailable.startsAt < dayEnd && unavailable.endsAt >= dayStart;
}

export function calculateKundliPromisedDeliveryAt(input: {
  assignedAt: Date;
  timezone: string;
  businessDays: number;
  unavailability: Array<{ startsAt: Date; endsAt: Date }>;
}) {
  const assignedLocal = zonedParts(input.assignedAt, input.timezone);
  let cursor = { year: assignedLocal.year, month: assignedLocal.month, day: assignedLocal.day };
  let remaining = Math.max(0, input.businessDays);
  while (remaining > 0) {
    cursor = addCalendarDays(cursor, 1);
    const weekday = new Date(Date.UTC(cursor.year, cursor.month - 1, cursor.day)).getUTCDay();
    const dayStart = zonedDateToUtc(cursor, input.timezone);
    const dayEnd = zonedDateToUtc(addCalendarDays(cursor, 1), input.timezone);
    if (weekday !== 0 && !input.unavailability.some((range) => overlapsDate(range, dayStart, dayEnd))) remaining -= 1;
  }
  return zonedDateToUtc({ ...cursor, hour: 23, minute: 59, second: 59 }, input.timezone);
}

export function getKundliDeliveryRisk(promisedDeliveryAt: Date, now = new Date(), dueSoonHours = 24): DeliveryRisk {
  const remaining = promisedDeliveryAt.getTime() - now.getTime();
  if (remaining < 0) return "OVERDUE";
  if (remaining <= dueSoonHours * 60 * 60 * 1000) return "DUE_SOON";
  return "ON_TRACK";
}

export function preserveKundliDeliveryPromise(existing: Date | null, calculated: Date) {
  return existing ?? calculated;
}

function isReady(order: {
  status: KundliOrderStatus;
  paymentStatus: string;
  birthName: string | null;
  dateOfBirth: Date | null;
  timeOfBirth: string | null;
  placeOfBirth: string | null;
  partnerName: string | null;
  partnerDateOfBirth: Date | null;
  partnerTimeOfBirth: string | null;
  partnerPlaceOfBirth: string | null;
  package: { deliveryMode: string };
}) {
  if (order.status !== "SUBMITTED" || order.paymentStatus !== "CONFIRMED") return false;
  if (!order.birthName || !order.dateOfBirth || !order.timeOfBirth || !order.placeOfBirth) return false;
  return order.package.deliveryMode !== "MATCHMAKING"
    || Boolean(order.partnerName && order.partnerDateOfBirth && order.partnerTimeOfBirth && order.partnerPlaceOfBirth);
}

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 1; attempt <= MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(work, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034" || attempt === MAX_TRANSACTION_RETRIES) throw error;
    }
  }
  throw new Error("Kundli assignment transaction retry limit exceeded.");
}

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

async function capacityForCandidate(tx: PrismaExecutor, candidate: { userId: string; timezone: string }, now: Date, excludeOrderId?: string): Promise<CapacitySnapshot> {
  const windows = getPractitionerCapacityWindows(now, candidate.timezone);
  const assignments = await tx.assignment.findMany({
    where: {
      workType: "KUNDLI_ORDER",
      assignedUserId: candidate.userId,
      ...(excludeOrderId ? { workId: { not: excludeOrderId } } : {}),
      isPrimary: true,
      endedAt: null,
      status: { notIn: ["COMPLETED", "CANCELLED"] }
    },
    select: { workId: true, createdAt: true }
  });
  if (!assignments.length) return { daily: 0, weekly: 0, monthly: 0, active: 0 };
  const activeOrders = await tx.kundliOrder.findMany({
    where: { id: { in: assignments.map((item) => item.workId) }, status: { in: [...KUNDLI_CAPACITY_CONSUMING_STATUSES] } },
    select: { id: true }
  });
  const activeIds = new Set(activeOrders.map((order) => order.id));
  const active = assignments.filter((assignment) => activeIds.has(assignment.workId));
  const count = (start: Date, end: Date) => active.filter((assignment) => assignment.createdAt >= start && assignment.createdAt < end).length;
  return { daily: count(windows.day.start, windows.day.end), weekly: count(windows.week.start, windows.week.end), monthly: count(windows.month.start, windows.month.end), active: active.length };
}

export async function getKundliPractitionerCapacitySnapshot(
  input: { userId: string; timezone: string; now?: Date },
  client: PrismaExecutor = prisma
) {
  return capacityForCandidate(client, input, input.now ?? new Date());
}

export async function getKundliAssignmentCandidateEvaluation(input: { tenantId: string; packageId: string; now?: Date; excludeOrderId?: string }, client: PrismaExecutor = prisma) {
  const now = input.now ?? new Date();
  const packageConfig = await client.kundliPackage.findFirstOrThrow({
    where: { id: input.packageId, tenantId: input.tenantId },
    select: { restrictToSelectedPractitioners: true, eligiblePractitioners: { where: { active: true }, select: { practitionerProfileId: true } } }
  });
  const eligibleIds = new Set(packageConfig.eligiblePractitioners.map((item) => item.practitionerProfileId));
  const profiles = await client.kundliPractitionerProfile.findMany({
    where: {
      tenantId: input.tenantId,
      user: { status: "ACTIVE", roles: { some: { role: { key: "ASTROLOGER" } } } }
    },
    include: { user: { select: { id: true, name: true, email: true } }, unavailability: { where: { active: true }, orderBy: { startsAt: "asc" } } },
    orderBy: [{ assignmentPriority: "asc" }, { id: "asc" }]
  });
  const candidates = [];
  for (const profile of profiles) {
    const capacity = await capacityForCandidate(client, profile, now, input.excludeOrderId);
    const unavailable = profile.unavailability.some((range) => range.startsAt <= now && range.endsAt >= now);
    candidates.push({ ...profile, capacity, unavailable, eligibleForPackage: eligibleIds.has(profile.id), capacityValid: candidateHasCapacity({ ...profile, capacity, unavailable }) });
  }
  const evaluation = evaluateKundliCandidatePool(candidates, packageConfig.restrictToSelectedPractitioners);
  return {
    ...evaluation,
    restrictToSelectedPractitioners: packageConfig.restrictToSelectedPractitioners,
    blockingReason: evaluation.blockingCode ? KUNDLI_ASSIGNMENT_BLOCKING_MESSAGES[evaluation.blockingCode] : null
  };
}

export async function getKundliAssignmentCandidates(input: { tenantId: string; packageId: string; now?: Date; excludeOrderId?: string }, client: PrismaExecutor = prisma) {
  return (await getKundliAssignmentCandidateEvaluation(input, client)).candidates;
}

async function markAwaiting(tx: Prisma.TransactionClient, order: { id: string; tenantId: string; assignmentQueuedAt: Date | null; assignmentQueuePosition: number | null }, now: Date, reason: string) {
  let queuePosition = order.assignmentQueuePosition;
  if (queuePosition === null) {
    const last = await tx.kundliOrder.aggregate({ where: { tenantId: order.tenantId, assignmentState: "AWAITING_ASSIGNMENT" }, _max: { assignmentQueuePosition: true } });
    queuePosition = (last._max.assignmentQueuePosition ?? 0) + 1;
  }
  return tx.kundliOrder.update({ where: { id: order.id }, data: { assignmentState: "AWAITING_ASSIGNMENT", assignmentQueuedAt: order.assignmentQueuedAt ?? now, assignmentQueuePosition: queuePosition, internalNote: reason } });
}

export async function attemptKundliAssignment(orderId: string, context: AssignmentContext) {
  return withSerializableRetry(async (tx) => {
    const now = context.now ?? new Date();
    const order = await tx.kundliOrder.findUnique({
      where: { id: orderId },
      include: { package: true, requestedPractitionerProfile: true }
    });
    if (!order || !isReady(order)) return { outcome: "NOT_READY" as const, orderId };

    const current = await tx.assignment.findMany({ where: { tenantId: order.tenantId, workType: "KUNDLI_ORDER", workId: order.id, isPrimary: true, endedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } }, take: 2 });
    if (current.length > 1) throw new Error("Multiple active primary Kundli assignments found.");
    if (current[0]) return { outcome: "ALREADY_ASSIGNED" as const, orderId, assignmentId: current[0].id, promisedDeliveryAt: order.promisedDeliveryAt };

    const evaluation = await getKundliAssignmentCandidateEvaluation({ tenantId: order.tenantId, packageId: order.packageId, now }, tx);
    const candidates = evaluation.candidates;

    let candidate: PractitionerCandidate | null = null;
    let source: AssignmentSource = context.source ?? "AUTO";
    if (order.package.practitionerSelectionMode === "CUSTOMER_SELECTS_GURUJI" && order.requestedPractitionerProfileId) {
      source = context.source ?? "CUSTOMER_SELECTION";
      candidate = selectCustomerRequestedCandidate(candidates, order.requestedPractitionerProfileId);
      if (!candidate) {
        await markAwaiting(tx, order, now, "Requested Guruji is not currently eligible, available, or within capacity.");
        return { outcome: "AWAITING_ASSIGNMENT" as const, orderId };
      }
    } else {
      candidate = selectInternalAssignmentCandidate(candidates);
      if (!candidate) {
        const blockingReason = evaluation.blockingReason ?? KUNDLI_ASSIGNMENT_BLOCKING_MESSAGES.CAPACITY_FULL;
        await markAwaiting(tx, order, now, blockingReason);
        return { outcome: "AWAITING_ASSIGNMENT" as const, orderId, blockingCode: evaluation.blockingCode, blockingReason };
      }
    }

    const promisedDeliveryAt = preserveKundliDeliveryPromise(order.promisedDeliveryAt, calculateKundliPromisedDeliveryAt({ assignedAt: now, timezone: candidate.timezone, businessDays: candidate.standardDeliveryBusinessDays, unavailability: candidate.unavailability ?? [] }));
    const assignment = await tx.assignment.create({
      data: {
        tenantId: order.tenantId,
        workType: "KUNDLI_ORDER",
        workId: order.id,
        assignedRole: "ASTROLOGER",
        assignedUserId: candidate.userId,
        assignmentLabel: candidate.displayName,
        status: "ASSIGNED",
        priority: context.assignmentPriority ?? "NORMAL",
        source,
        assignmentReason: context.reason ?? (source === "CUSTOMER_SELECTION" ? "Customer-selected eligible Guruji." : "Automatic eligible Guruji assignment."),
        isPrimary: true,
        createdById: context.actorId
      }
    });
    await tx.kundliOrder.update({ where: { id: order.id }, data: { status: "ASSIGNED", assignmentState: "ASSIGNED", ...KUNDLI_ASSIGNED_QUEUE_CLEANUP, promisedDeliveryAt, deliveryPromiseSetAt: order.deliveryPromiseSetAt ?? now } });
    await tx.kundliStatusHistory.create({ data: { tenantId: order.tenantId, kundliOrderId: order.id, fromStatus: order.status, toStatus: "ASSIGNED", note: `Assigned to ${candidate.displayName}.`, actorLabel: "Kundli Assignment Engine", customerVisible: false } });
    return { outcome: "ASSIGNED" as const, orderId, assignmentId: assignment.id, practitionerProfileId: candidate.id, promisedDeliveryAt };
  });
}

export async function getKundliPractitionerQueue(input: { tenantId: string; practitionerUserId: string }) {
  const assignments = await prisma.assignment.findMany({
    where: { tenantId: input.tenantId, workType: "KUNDLI_ORDER", assignedUserId: input.practitionerUserId, isPrimary: true, endedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] }, workId: { in: (await prisma.kundliOrder.findMany({ where: { tenantId: input.tenantId, status: { in: [...KUNDLI_CAPACITY_CONSUMING_STATUSES] } }, select: { id: true } })).map((order) => order.id) } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }]
  });
  const rank: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
  return assignments.sort((left, right) => (rank[left.priority] ?? 99) - (rank[right.priority] ?? 99) || left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
}

export async function closeKundliAssignmentsForLifecycle(tx: Prisma.TransactionClient, input: { tenantId: string; orderId: string; status: KundliOrderStatus; actorId: string; reason?: string | null }) {
  if (!TERMINAL_KUNDLI_STATUSES.has(input.status)) return;
  await tx.assignment.updateMany({
    where: { tenantId: input.tenantId, workType: "KUNDLI_ORDER", workId: input.orderId, isPrimary: true, endedAt: null },
    data: { endedAt: new Date(), endedReason: input.reason ?? `Kundli order moved to ${input.status}.`, status: input.status === "COMPLETED" || input.status === "DELIVERED" ? "COMPLETED" : "CANCELLED", updatedById: input.actorId }
  });
}

export async function recalculateKundliDeliveryPromise(input: { orderId: string; actorId: string; reason: string; now?: Date }) {
  if (!input.reason.trim()) throw new Error("A delivery promise change reason is required.");
  return withSerializableRetry(async (tx) => {
    const now = input.now ?? new Date();
    const order = await tx.kundliOrder.findUniqueOrThrow({ where: { id: input.orderId } });
    const assignment = await tx.assignment.findFirst({ where: { tenantId: order.tenantId, workType: "KUNDLI_ORDER", workId: order.id, isPrimary: true, endedAt: null }, include: { assignedUser: { include: { kundliPractitionerProfile: { include: { unavailability: { where: { active: true } } } } } } } });
    const profile = assignment?.assignedUser?.kundliPractitionerProfile;
    if (!profile) throw new Error("An active primary Guruji assignment is required.");
    const promisedDeliveryAt = calculateKundliPromisedDeliveryAt({ assignedAt: now, timezone: profile.timezone, businessDays: profile.standardDeliveryBusinessDays, unavailability: profile.unavailability });
    const updated = await tx.kundliOrder.update({ where: { id: order.id }, data: { promisedDeliveryAt, deliveryPromiseSetAt: now, deliveryPromiseChangedReason: input.reason } });
    await tx.auditLog.create({ data: { tenantId: order.tenantId, actorId: input.actorId, action: "kundli_delivery_promise_recalculated", entity: "KundliOrder", entityId: order.id, metadata: { reason: input.reason, promisedDeliveryAt: promisedDeliveryAt.toISOString() } } });
    return updated;
  });
}

export async function reassignKundliOrder(input: { orderId: string; practitionerProfileId: string; actorId: string; reason: string; now?: Date }) {
  if (!input.reason.trim()) throw new Error("A reassignment reason is required.");
  return withSerializableRetry(async (tx) => {
    const now = input.now ?? new Date();
    const order = await tx.kundliOrder.findUniqueOrThrow({ where: { id: input.orderId }, include: { package: true } });
    const profile = await tx.kundliPractitionerProfile.findFirst({
      where: {
        id: input.practitionerProfileId,
        tenantId: order.tenantId,
        active: true,
        acceptingWork: true,
        ...(order.package.restrictToSelectedPractitioners ? { packageEligibility: { some: { packageId: order.packageId, active: true } } } : {}),
        user: { status: "ACTIVE", roles: { some: { role: { key: "ASTROLOGER" } } } }
      },
      include: { unavailability: { where: { active: true } } }
    });
    if (!profile || profile.unavailability.some((range) => range.startsAt <= now && range.endsAt >= now)) throw new Error("Replacement Guruji is not eligible or available.");
    const capacity = await capacityForCandidate(tx, profile, now, order.id);
    if (!candidateHasCapacity({ ...profile, capacity, unavailable: false })) throw new Error("Replacement Guruji has no capacity.");
    const previous = await tx.assignment.findFirst({ where: { tenantId: order.tenantId, workType: "KUNDLI_ORDER", workId: order.id, isPrimary: true, endedAt: null }, select: { id: true } });
    await tx.assignment.updateMany({ where: { tenantId: order.tenantId, workType: "KUNDLI_ORDER", workId: order.id, isPrimary: true, endedAt: null }, data: { endedAt: now, endedReason: input.reason, isPrimary: false, status: "CANCELLED", updatedById: input.actorId } });
    const assignment = await tx.assignment.create({ data: { tenantId: order.tenantId, workType: "KUNDLI_ORDER", workId: order.id, assignedRole: "ASTROLOGER", assignedUserId: profile.userId, assignmentLabel: profile.displayName, status: "ASSIGNED", priority: "NORMAL", source: "ADMIN", assignmentReason: input.reason, isPrimary: true, createdById: input.actorId } });
    const promisedDeliveryAt = calculateKundliPromisedDeliveryAt({ assignedAt: now, timezone: profile.timezone, businessDays: profile.standardDeliveryBusinessDays, unavailability: profile.unavailability });
    await tx.kundliOrder.update({ where: { id: order.id }, data: { assignmentState: previous ? "REASSIGNED" : "ASSIGNED", status: "ASSIGNED", ...KUNDLI_ASSIGNED_QUEUE_CLEANUP, promisedDeliveryAt, deliveryPromiseSetAt: now, deliveryPromiseChangedReason: previous || order.promisedDeliveryAt ? input.reason : null } });
    await tx.kundliStatusHistory.create({ data: { tenantId: order.tenantId, kundliOrderId: order.id, fromStatus: order.status, toStatus: "ASSIGNED", note: `${previous ? "Reassigned" : "Assigned"} to ${profile.displayName}: ${input.reason}`, actorLabel: "Admin", customerVisible: false } });
    await tx.auditLog.create({ data: { tenantId: order.tenantId, actorId: input.actorId, action: previous ? "kundli_assignment_reassigned" : "kundli_assignment_admin_created", entity: "KundliOrder", entityId: order.id, metadata: { previousAssignmentId: previous?.id ?? null, practitionerProfileId: profile.id, assignmentId: assignment.id, reason: input.reason, promisedDeliveryAt: promisedDeliveryAt.toISOString() } } });
    return assignment;
  });
}
