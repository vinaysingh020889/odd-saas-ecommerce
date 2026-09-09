import type { MembershipRedemptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyRoles } from "@/lib/notifications";
import { transitionMembershipRedemption } from "@/lib/membership-entitlements";

export type ClaimView = "NEW" | "PENDING" | "DUE" | "OVERDUE" | "FULFILLED" | "CANCELLED" | "EXCEPTION";

export function classifyMembershipClaim(input: { status: MembershipRedemptionStatus; createdAt: Date; reservationExpiresAt: Date | null; orderStatus?: string | null; promisedDeliveryAt?: Date | null; manualReview?: boolean }, now = new Date()): ClaimView {
  if (input.manualReview || (input.status === "RESERVED" && input.reservationExpiresAt && input.reservationExpiresAt <= now)) return "EXCEPTION";
  if (input.status === "RELEASED" || input.status === "REVERSED" || input.orderStatus === "CANCELLED" || input.orderStatus === "REFUNDED") return "CANCELLED";
  if (input.orderStatus === "DELIVERED" || input.orderStatus === "COMPLETED") return "FULFILLED";
  if (input.promisedDeliveryAt && input.promisedDeliveryAt <= now) return "OVERDUE";
  if (input.promisedDeliveryAt && input.promisedDeliveryAt.getTime() <= now.getTime() + 48 * 60 * 60 * 1000) return "DUE";
  if (input.status === "RESERVED" && now.getTime() - input.createdAt.getTime() < 24 * 60 * 60 * 1000) return "NEW";
  return "PENDING";
}

function metadataManualReview(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && "manualReview" in value && (value as { manualReview?: unknown }).manualReview);
}

export async function getMembershipClaimsQueue(tenantId: string) {
  const redemptions = await prisma.membershipBenefitRedemption.findMany({
    where: { tenantId, scope: "KUNDLI", relatedType: "KUNDLI", benefit: { method: "CLAIM" } },
    include: { benefit: true, user: { select: { name: true, email: true } }, userMembership: { include: { plan: { select: { name: true } }, planVersion: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  const ids = redemptions.map((item) => item.relatedId).filter((id): id is string => Boolean(id));
  const orders = await prisma.kundliOrder.findMany({ where: { tenantId, id: { in: ids } }, include: { package: { select: { name: true } } } });
  const orderById = new Map(orders.map((item) => [item.id, item]));
  return redemptions.map((redemption) => {
    const order = redemption.relatedId ? orderById.get(redemption.relatedId) ?? null : null;
    const view = classifyMembershipClaim({ status: redemption.status, createdAt: redemption.createdAt, reservationExpiresAt: redemption.reservationExpiresAt, orderStatus: order?.status, promisedDeliveryAt: order?.promisedDeliveryAt, manualReview: metadataManualReview(redemption.metadataJson) });
    return { ...redemption, order, view };
  });
}

export async function syncMembershipClaimAlerts(tenantId: string) {
  const initialClaims = await getMembershipClaimsQueue(tenantId);
  const expired = initialClaims.filter((claim) => claim.status === "RESERVED" && claim.reservationExpiresAt && claim.reservationExpiresAt <= new Date() && !metadataManualReview(claim.metadataJson));
  for (const claim of expired) {
    await notifyRoles({ tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "MEMBERSHIP_CLAIM_FAILED", title: "Membership claim reservation expired", message: `${claim.benefit.title} for ${claim.user.name ?? claim.user.email ?? "customer"} expired before payment and was released.`, destination: `/admin/membership-claims?claim=${claim.id}`, sourceModule: "MEMBERSHIP", entityType: "MembershipBenefitRedemption", entityId: claim.id, dedupeKey: `membership-claim:${claim.id}:failed` });
    await transitionMembershipRedemption({ tenantId, idempotencyKey: claim.idempotencyKey, toStatus: "RELEASED", reason: "Kundli payment reservation expired before confirmation." });
  }
  const claims = expired.length ? await getMembershipClaimsQueue(tenantId) : initialClaims;
  for (const claim of claims) {
    if (claim.view !== "OVERDUE" && claim.view !== "EXCEPTION") continue;
    const overdue = claim.view === "OVERDUE";
    const manualReview = metadataManualReview(claim.metadataJson);
    const type = overdue ? "MEMBERSHIP_CLAIM_OVERDUE" : manualReview ? "MEMBERSHIP_CLAIM_REVIEW" : "MEMBERSHIP_CLAIM_FAILED";
    await notifyRoles({ tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type, title: overdue ? "Membership claim overdue" : manualReview ? "Membership claim needs manual review" : "Membership claim reservation failed", message: `${claim.benefit.title} for ${claim.user.name ?? claim.user.email ?? "customer"} ${overdue ? "is overdue" : manualReview ? "needs manual review" : "has an expired payment reservation"}.`, destination: `/admin/membership-claims?claim=${claim.id}`, sourceModule: "MEMBERSHIP", entityType: "MembershipBenefitRedemption", entityId: claim.id, dedupeKey: `membership-claim:${claim.id}:${overdue ? "overdue" : manualReview ? "review" : "failed"}` });
  }
  return claims;
}
