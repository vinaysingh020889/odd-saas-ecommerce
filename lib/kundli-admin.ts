import { prisma } from "@/lib/prisma";
import { getKundliDeliveryRisk, type DeliveryRisk } from "@/lib/kundli-assignment-engine";

export type KundliQueueFilter = { state?: string; guruji?: string; packageId?: string; customerSelected?: boolean; conflict?: boolean };
export type KundliQueueItem = {
  id: string; orderNo: string | null; applicantName: string; applicantEmail: string; status: string; paymentStatus: string; assignmentState: string;
  assignmentQueuePosition: number | null; promisedDeliveryAt: Date | null; internalNote: string | null;
  package: { id: string; name: string; practitionerSelectionMode: string };
  requestedPractitionerProfile: { id: string; displayName: string } | null;
  assignment: { source: string; priority: string; createdAt: Date; assignedUser: { id: string; kundliPractitionerProfile: { id: string; displayName: string } | null } | null } | null;
  deliveryRisk: DeliveryRisk | null; conflict: boolean; nextAction: string;
};

export function kundliNextRequiredAction(item: { status: string; paymentStatus: string; assignmentState: string }) {
  if (item.paymentStatus !== "CONFIRMED") return "Await payment";
  if (item.status === "DETAILS_PENDING") return "Await required details";
  if (item.assignmentState === "AWAITING_ASSIGNMENT") return "Resolve assignment conflict";
  if (item.status === "ASSIGNED") return "Start review";
  if (item.status === "IN_REVIEW") return "Prepare report";
  if (item.status === "REPORT_READY") return "Deliver report";
  if (item.status === "CONSULTATION_SCHEDULED") return "Complete consultation";
  if (item.status === "DELIVERED") return "Close order";
  return item.status === "COMPLETED" ? "Completed" : "Review";
}

export function matchesKundliQueueFilter(item: KundliQueueItem, filter: KundliQueueFilter) {
  if (filter.state === "AWAITING_ASSIGNMENT" && item.assignmentState !== "AWAITING_ASSIGNMENT") return false;
  if (["DETAILS_PENDING", "SUBMITTED", "ASSIGNED", "IN_REVIEW", "REPORT_READY", "CONSULTATION_SCHEDULED", "COMPLETED"].includes(filter.state ?? "") && item.status !== filter.state) return false;
  if (["DUE_SOON", "OVERDUE"].includes(filter.state ?? "") && item.deliveryRisk !== filter.state) return false;
  if (filter.guruji && item.assignment?.assignedUser?.kundliPractitionerProfile?.id !== filter.guruji) return false;
  if (filter.packageId && item.package.id !== filter.packageId) return false;
  if (filter.customerSelected && !item.requestedPractitionerProfile) return false;
  if (filter.conflict && !item.conflict) return false;
  return true;
}

export function countKundliQueueStates(items: KundliQueueItem[]) {
  const count = (predicate: (item: KundliQueueItem) => boolean) => items.filter(predicate).length;
  return {
    detailsPending: count((item) => item.status === "DETAILS_PENDING"),
    awaiting: count((item) => item.assignmentState === "AWAITING_ASSIGNMENT"), assigned: count((item) => item.status === "ASSIGNED"),
    inReview: count((item) => item.status === "IN_REVIEW"), reportReady: count((item) => item.status === "REPORT_READY"),
    consultation: count((item) => item.status === "CONSULTATION_SCHEDULED"), completed: count((item) => item.status === "COMPLETED"), dueSoon: count((item) => item.deliveryRisk === "DUE_SOON"),
    overdue: count((item) => item.deliveryRisk === "OVERDUE"), conflicts: count((item) => item.conflict)
  };
}

export async function getKundliAdminQueue(tenantId: string, filter: KundliQueueFilter = {}) {
  const orders = await prisma.kundliOrder.findMany({ where: { tenantId }, include: { package: { select: { id: true, name: true, practitionerSelectionMode: true } }, requestedPractitionerProfile: { select: { id: true, displayName: true } } }, orderBy: { createdAt: "desc" }, take: 250 });
  const assignments = await prisma.assignment.findMany({ where: { tenantId, workType: "KUNDLI_ORDER", workId: { in: orders.map((item) => item.id) }, isPrimary: true, OR: [{ endedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } }, { status: "COMPLETED" }] }, include: { assignedUser: { select: { id: true, kundliPractitionerProfile: { select: { id: true, displayName: true } } } } } });
  const assignmentByOrder = new Map(assignments.map((item) => [item.workId, item]));
  const items: KundliQueueItem[] = orders.map((order) => {
    const assignment = assignmentByOrder.get(order.id) ?? null;
    const deliveryRisk = order.promisedDeliveryAt ? getKundliDeliveryRisk(order.promisedDeliveryAt) : null;
    const conflict = order.assignmentState === "AWAITING_ASSIGNMENT" && Boolean(order.internalNote);
    const base = { ...order, assignment, deliveryRisk, conflict };
    return { ...base, nextAction: kundliNextRequiredAction(base) };
  });
  return { all: items, filtered: items.filter((item) => matchesKundliQueueFilter(item, filter)), counts: countKundliQueueStates(items) };
}
