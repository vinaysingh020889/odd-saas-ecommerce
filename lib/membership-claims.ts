import type { MembershipRedemptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyRoles } from "@/lib/notifications";
import { transitionMembershipRedemption } from "@/lib/membership-entitlements";
import { releaseCapacity } from "@/lib/service-capacity";

export type ClaimView = "NEW" | "PENDING" | "DUE" | "OVERDUE" | "FULFILLED" | "CANCELLED" | "EXCEPTION";

export function classifyMembershipClaim(input: { status: MembershipRedemptionStatus; createdAt: Date; reservationExpiresAt: Date | null; orderStatus?: string | null; promisedDeliveryAt?: Date | null; manualReview?: boolean }, now = new Date()): ClaimView {
  if (input.manualReview || (input.status === "RESERVED" && input.reservationExpiresAt && input.reservationExpiresAt <= now)) return "EXCEPTION";
  const orderStatus = input.orderStatus?.toUpperCase();
  if (input.status === "RELEASED" || input.status === "REVERSED" || orderStatus === "CANCELLED" || orderStatus === "REFUNDED") return "CANCELLED";
  if (orderStatus === "DELIVERED" || orderStatus === "COMPLETED") return "FULFILLED";
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
    where: { tenantId, scope: { in: ["KUNDLI", "SHOP", "PUJA", "SERVICE_BOOKING", "ASTHI", "OFFERINGS", "GLOBAL"] }, benefit: { method: "CLAIM" } },
    include: { benefit: true, user: { select: { name: true, email: true } }, userMembership: { include: { plan: { select: { name: true } }, planVersion: { select: { name: true } } } } },
    orderBy: { createdAt: "desc" }
  });
  const ids = redemptions.map((item) => item.relatedId).filter((id): id is string => Boolean(id));
  const orders = await prisma.kundliOrder.findMany({ where: { tenantId, id: { in: ids } }, include: { package: { select: { name: true } } } });
  const orderById = new Map(orders.map((item) => [item.id, item]));
  const shopItems = await prisma.orderItem.findMany({ where: { id: { in: ids } }, include: { product: { select: { title: true } }, order: { select: { id: true, orderNumber: true, status: true, fulfillmentStatus: true, shippingEstimateDays: true, createdAt: true } } } });
  const shopById = new Map(shopItems.map((item) => [item.id, item]));
  const serviceBookings = await prisma.serviceBooking.findMany({ where: { tenantId, id: { in: ids } }, include: { service: { select: { title: true } } } });
  const serviceById = new Map(serviceBookings.map((item) => [item.id, item]));
  const asthiApplications = await prisma.asthiApplication.findMany({ where: { tenantId, id: { in: ids } }, include: { package: { select: { name: true } } } });
  const asthiById = new Map(asthiApplications.map((item) => [item.id, item]));
  return redemptions.map((redemption) => {
    const order = redemption.relatedId ? orderById.get(redemption.relatedId) ?? null : null;
    const shopItem = redemption.relatedId ? shopById.get(redemption.relatedId) ?? null : null;
    const serviceBooking = redemption.relatedId ? serviceById.get(redemption.relatedId) ?? null : null;
    const asthiApplication = redemption.relatedId ? asthiById.get(redemption.relatedId) ?? null : null;
    const shopDue = shopItem?.order.shippingEstimateDays ? new Date(shopItem.order.createdAt.getTime() + shopItem.order.shippingEstimateDays * 86400000) : null;
    const orderStatus = order?.status ?? shopItem?.order.fulfillmentStatus ?? shopItem?.order.status ?? serviceBooking?.status ?? asthiApplication?.status;
    const view = classifyMembershipClaim({ status: redemption.status, createdAt: redemption.createdAt, reservationExpiresAt: redemption.reservationExpiresAt, orderStatus: orderStatus ?? undefined, promisedDeliveryAt: order?.promisedDeliveryAt ?? shopDue, manualReview: metadataManualReview(redemption.metadataJson) });
    return { ...redemption, order, shopItem, serviceBooking, asthiApplication, subjectTitle: order?.package.name ?? shopItem?.product.title ?? serviceBooking?.service.title ?? asthiApplication?.package?.name ?? redemption.scope, subjectHref: order ? `/admin/kundli/${order.orderNo ?? order.id}` : shopItem ? `/admin/orders/${shopItem.order.id}` : serviceBooking ? `/admin/service-bookings/${serviceBooking.id}` : asthiApplication ? `/admin/asthi/${asthiApplication.applicationNo ?? asthiApplication.id}` : null, orderStatus, view };
  });
}

export async function syncMembershipClaimAlerts(tenantId: string) {
  const expiredServiceRedemptions = await prisma.membershipBenefitRedemption.findMany({ where: { tenantId, status: "RESERVED", reservationExpiresAt: { lte: new Date() }, relatedType: "SERVICE_BOOKING", benefit: { method: "AUTOMATIC" } }, select: { idempotencyKey: true, relatedId: true, userId: true } });
  for (const redemption of expiredServiceRedemptions) {
    if (!redemption.relatedId) continue;
    const relatedId = redemption.relatedId;
    await prisma.$transaction(async (tx) => {
      const booking = await tx.serviceBooking.findUnique({ where: { id: relatedId } });
      if (booking?.slotId && booking.capacityStatus === "HELD") await releaseCapacity({ slotId: booking.slotId, quantity: booking.quantity, sourceType: "SERVICE_BOOKING", sourceId: booking.id, reason: "Released after service payment reservation expired.", actorId: redemption.userId }, tx);
      if (booking && booking.paymentStatus !== "CONFIRMED") await tx.serviceBooking.update({ where: { id: booking.id }, data: { status: "CANCELLED", paymentStatus: "FAILED", capacityStatus: booking.slotId ? "RELEASED" : booking.capacityStatus } });
      await transitionMembershipRedemption({ tenantId, idempotencyKey: redemption.idempotencyKey, toStatus: "RELEASED", reason: "Service payment reservation expired before confirmation." }, tx);
    });
  }
  const initialClaims = await getMembershipClaimsQueue(tenantId);
  const expired = initialClaims.filter((claim) => claim.status === "RESERVED" && claim.reservationExpiresAt && claim.reservationExpiresAt <= new Date() && !metadataManualReview(claim.metadataJson));
  for (const claim of expired) {
    await notifyRoles({ tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "MEMBERSHIP_CLAIM_FAILED", title: "Membership claim reservation expired", message: `${claim.benefit.title} for ${claim.user.name ?? claim.user.email ?? "customer"} expired before payment and was released.`, destination: `/admin/membership-claims?claim=${claim.id}`, sourceModule: "MEMBERSHIP", entityType: "MembershipBenefitRedemption", entityId: claim.id, dedupeKey: `membership-claim:${claim.id}:failed` });
    await prisma.$transaction(async (tx) => {
      await transitionMembershipRedemption({ tenantId, idempotencyKey: claim.idempotencyKey, toStatus: "RELEASED", reason: "Claim payment reservation expired before confirmation." }, tx);
      if (claim.shopItem) {
        const reserved = await tx.inventoryLedger.aggregate({ where: { orderItemId: claim.shopItem.id, movementType: "reserved" }, _sum: { quantity: true } });
        const released = await tx.inventoryLedger.aggregate({ where: { orderItemId: claim.shopItem.id, movementType: "released" }, _sum: { quantity: true } });
        const quantity = (reserved._sum.quantity ?? 0) - (released._sum.quantity ?? 0);
        if (quantity > 0) await tx.inventoryLedger.create({ data: { tenantId, productId: claim.shopItem.productId, variantId: claim.shopItem.variantId!, orderId: claim.shopItem.order.id, orderItemId: claim.shopItem.id, movementType: "released", quantity, reason: "Released after physical claim payment reservation expired." } });
        await tx.order.update({ where: { id: claim.shopItem.order.id }, data: { status: "expired", paymentStatus: "expired", fulfillmentStatus: "cancelled" } });
      }
      if (claim.serviceBooking) {
        if (claim.serviceBooking.slotId && claim.serviceBooking.capacityStatus === "HELD") await releaseCapacity({ slotId: claim.serviceBooking.slotId, quantity: claim.serviceBooking.quantity, sourceType: "SERVICE_BOOKING", sourceId: claim.serviceBooking.id, reason: "Released after membership claim payment hold expired.", actorId: claim.userId }, tx);
        await tx.serviceBooking.update({ where: { id: claim.serviceBooking.id }, data: { status: "CANCELLED", paymentStatus: "FAILED", capacityStatus: claim.serviceBooking.slotId ? "RELEASED" : claim.serviceBooking.capacityStatus } });
      }
      if (claim.asthiApplication) await tx.asthiApplication.update({ where: { id: claim.asthiApplication.id }, data: { status: "CANCELLED", paymentStatus: "FAILED" } });
    });
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
