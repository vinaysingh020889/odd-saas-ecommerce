import { prisma } from "@/lib/prisma";
import { transitionMembershipRedemption } from "@/lib/membership-entitlements";
import { notifyRoles } from "@/lib/notifications";
import { offeringDueState } from "@/lib/offerings";
import { getMembershipClaimsQueue } from "@/lib/membership-claims";

export async function processExpiredMembershipReservations(tenantId: string, now = new Date()) {
  const rows = await prisma.membershipBenefitRedemption.findMany({ where: { tenantId, status: "RESERVED", reservationExpiresAt: { lte: now }, relatedType: "OFFERING_REQUEST" }, select: { idempotencyKey: true } });
  for (const row of rows) await transitionMembershipRedemption({ tenantId, idempotencyKey: row.idempotencyKey, toStatus: "RELEASED", reason: "Reservation expired before confirmation." });
  return rows.length;
}

export async function syncOfferingReminders(tenantId: string, now = new Date()) {
  const rows = await prisma.offeringRequest.findMany({ where: { tenantId, status: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] } }, include: { user: { select: { name: true, email: true } } } });
  for (const row of rows) {
    const due = offeringDueState(row, now); if (due === "ON_TRACK") continue;
    await notifyRoles({ tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: `OFFERING_${due}`, title: due === "OVERDUE" ? "Offering request overdue" : "Offering request due soon", message: `${row.requestNumber} for ${row.user.name ?? row.user.email ?? "customer"} is ${due === "OVERDUE" ? "overdue" : "due within 24 hours"}.`, destination: `/admin/offerings/${row.id}`, sourceModule: "OFFERINGS", entityType: "OfferingRequest", entityId: row.id, dedupeKey: `offering:${row.id}:${due.toLowerCase()}` });
  }
  return rows;
}

export async function getEntitlementOperationsReport(tenantId: string, now = new Date()) {
  const [byStatus, savings, overdueClaims, overdueOfferings] = await Promise.all([
    prisma.membershipBenefitRedemption.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true }, _sum: { savingAmount: true } }),
    prisma.membershipBenefitRedemption.aggregate({ where: { tenantId, status: { in: ["CONSUMED", "REVERSED"] } }, _sum: { savingAmount: true } }),
    getMembershipClaimsQueue(tenantId).then((claims) => claims.filter((claim) => claim.view === "OVERDUE").length),
    prisma.offeringRequest.count({ where: { tenantId, status: { notIn: ["CLOSED", "CANCELLED", "REJECTED"] }, OR: [{ processingDueAt: { lt: now } }, { rewardSelectionDueAt: { lt: now } }] } })
  ]);
  const status = new Map(byStatus.map((row) => [row.status, { count: row._count._all, amount: Number(row._sum.savingAmount ?? 0) }]));
  return {
    reservations: status.get("RESERVED") ?? { count: 0, amount: 0 },
    consumption: status.get("CONSUMED") ?? { count: 0, amount: 0 },
    reversals: status.get("REVERSED") ?? { count: 0, amount: 0 },
    releases: status.get("RELEASED") ?? { count: 0, amount: 0 },
    outstandingLiability: (status.get("RESERVED")?.amount ?? 0),
    netSavings: Number(savings._sum.savingAmount ?? 0) - (status.get("REVERSED")?.amount ?? 0),
    overdueClaims, overdueOfferings
  };
}
