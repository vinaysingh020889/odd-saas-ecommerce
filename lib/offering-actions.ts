"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type OfferingRequestStatus } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireAdminRole } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getActiveMembershipForUser } from "@/lib/membership";
import { versionBenefits } from "@/lib/membership-plan-versioning";
import { reserveMembershipBenefit, transitionMembershipRedemption } from "@/lib/membership-entitlements";
import { assertOfferingTransition, selectOfferingBenefit, type OfferingBenefit } from "@/lib/offerings";
import { notifyRoles } from "@/lib/notifications";
import { addressSnapshotFromRecord, invoiceNumberForOrder, resolveShippingSnapshot } from "@/lib/checkout-maturity";
import { getVariantStockSummary } from "@/lib/inventory";
import { projectCommerceOrder } from "@/lib/customer-account";

function field(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function urls(value: string) {
  const result = value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean);
  if (result.length > 5 || result.some((item) => !/^https:\/\//i.test(item))) throw new Error("Provide up to five HTTPS photo links.");
  return result;
}
function asDate(value: string) { const date = new Date(value); return value && !Number.isNaN(date.getTime()) ? date : null; }
async function numberFor(tx: Prisma.TransactionClient, tenantId: string) {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const count = await tx.offeringRequest.count({ where: { tenantId, requestNumber: { startsWith: `OTB-${date}` } } });
  return `OTB-${date}-${String(count + 1).padStart(5, "0")}`;
}
async function orderNumber(tx: Prisma.TransactionClient) {
  const date = new Date().toISOString().slice(0,10).replaceAll("-","");
  const count = await tx.order.count({where:{orderNumber:{startsWith:`ODD-${date}`}}});
  return `ODD-${date}-${String(count+1).padStart(5,"0")}`;
}

export async function createOfferingRequestAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const description = field(formData, "materialDescription");
  const transferMethod = field(formData, "transferMethod");
  if (description.length < 20 || description.length > 2000) throw new Error("Describe the materials in 20 to 2,000 characters.");
  if (!["PICKUP", "DROP_OFF", "COURIER"].includes(transferMethod)) throw new Error("Choose pickup, drop-off, or courier.");
  const membership = await getActiveMembershipForUser(user.id);
  const benefits = (membership ? membership.planVersion ? versionBenefits(membership.planVersion) : membership.plan.benefits : []) as OfferingBenefit[];
  const access = selectOfferingBenefit(benefits, { type: "ACCESS", entityType: "OFFERINGS_ACCESS" });
  const accessRequired = field(formData, "membershipAccessRequired") === "true";
  if (accessRequired && !access) throw new Error("Your active membership does not include Offerings to Blessings access.");
  const priority = selectOfferingBenefit(benefits, { type: "PRIORITY_QUEUE", entityType: "OFFERINGS_PRIORITY" });
  const pickupPrice = Math.max(0, Number(field(formData, "pickupListAmount") || 0));
  const freePickup = transferMethod === "PICKUP" ? selectOfferingBenefit(benefits, { type: "SHIPPING_BENEFIT", amount: pickupPrice, entityType: "OFFERINGS_PICKUP" }) : null;
  const photoUrls = urls(field(formData, "photoUrls"));
  const addressId = field(formData, "addressId");
  const request = await prisma.$transaction(async (tx) => {
    const address = transferMethod === "PICKUP" ? await tx.customerAddress.findFirst({ where: { id: addressId, tenantId, userId: user.id } }) : null;
    if (transferMethod === "PICKUP" && !address) throw new Error("Choose one of your saved pickup addresses.");
    const created = await tx.offeringRequest.create({ data: {
      tenantId, userId: user.id, requestNumber: await numberFor(tx, tenantId), materialDescription: description,
      photoUrlsJson: photoUrls, transferMethod: transferMethod as "PICKUP" | "DROP_OFF" | "COURIER",
      pickupAddressJson: address ? addressSnapshotFromRecord(address) : Prisma.JsonNull,
      courierTrackingNumber: transferMethod === "COURIER" ? field(formData, "courierTrackingNumber") || null : null,
      customerNote: field(formData, "customerNote") || null, priorityScore: priority ? 100 : 0,
      membershipAccessBenefitId: access?.benefit.id ?? null, pickupBenefitId: freePickup?.benefit.id ?? null,
      pickupListAmount: pickupPrice, pickupSavingAmount: freePickup?.saving ?? 0
    }});
    let pickupRedemptionId: string | null = null;
    if (membership && freePickup && freePickup.saving > 0) {
      const redemption = await reserveMembershipBenefit({ tenantId, userId: user.id, userMembershipId: membership.id,
        benefitId: freePickup.benefit.id, scope: "OFFERINGS", idempotencyKey: `offering-pickup:${created.id}`,
        relatedType: "OFFERING_REQUEST", relatedId: created.id, originalAmount: pickupPrice,
        savingAmount: freePickup.saving, finalAmount: pickupPrice - freePickup.saving, reservationMinutes: 4320,
        context: { entityType: "OFFERINGS_PICKUP" }, metadataJson: { transferMethod } }, tx);
      pickupRedemptionId = redemption.id;
    }
    await tx.offeringActivity.create({ data: { tenantId, offeringId: created.id, actorId: user.id, action: "submitted", toStatus: "SUBMITTED", note: "Offerings request submitted." } });
    await tx.auditLog.create({ data: { tenantId, actorId: user.id, action: "offering_request_created", entity: "OfferingRequest", entityId: created.id, metadata: { transferMethod, photoCount: photoUrls.length } } });
    return pickupRedemptionId ? tx.offeringRequest.update({ where: { id: created.id }, data: { pickupRedemptionId } }) : created;
  });
  await notifyRoles({ tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "OFFERING_SUBMITTED", title: "New Offerings to Blessings request", message: `${request.requestNumber} needs acceptance review.`, destination: `/admin/offerings/${request.id}`, sourceModule: "OFFERINGS", entityType: "OfferingRequest", entityId: request.id, dedupeKey: `offering:${request.id}:submitted` });
  revalidatePath("/offerings"); revalidatePath("/admin/offerings"); redirect(`/offerings/${request.id}`);
}

export async function cancelOfferingRequestAction(formData: FormData) {
  const user = await requireCurrentUser(); const tenantId = await getOmdTenantId(); const id = field(formData, "id");
  await prisma.$transaction(async (tx) => {
    const current = await tx.offeringRequest.findFirstOrThrow({ where: { id, tenantId, userId: user.id } });
    if (!["SUBMITTED", "ACCEPTED", "COLLECTION_SCHEDULED"].includes(current.status)) throw new Error("This request can no longer be cancelled online. Contact support.");
    await tx.offeringRequest.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    await tx.offeringActivity.create({ data: { tenantId, offeringId: id, actorId: user.id, action: "customer_cancelled", fromStatus: current.status, toStatus: "CANCELLED", note: "Cancelled by customer before collection." } });
    if (current.pickupRedemptionId) {
      const redemption = await tx.membershipBenefitRedemption.findUnique({ where: { id: current.pickupRedemptionId } });
      if (redemption?.status === "RESERVED") await transitionMembershipRedemption({ tenantId, idempotencyKey: redemption.idempotencyKey, toStatus: "RELEASED", reason: "Customer cancelled before collection.", actorId: user.id }, tx);
    }
  });
  revalidatePath("/offerings"); revalidatePath(`/offerings/${id}`); revalidatePath("/admin/offerings");
}
export async function updateOfferingStatusAction(formData: FormData) {
  const admin = await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const id = field(formData, "id"); const next = field(formData, "status") as OfferingRequestStatus;
  await prisma.$transaction(async (tx) => {
    const current = await tx.offeringRequest.findFirstOrThrow({ where: { id, tenantId } });
    assertOfferingTransition(current.status, next);
    const now = new Date(); const scheduled = asDate(field(formData, "collectionScheduledAt"));
    const data: Prisma.OfferingRequestUpdateInput = {
      status: next, operationsNote: field(formData, "note") || current.operationsNote,
      rejectionReason: next === "REJECTED" ? field(formData, "note") || "Unable to accept these materials." : current.rejectionReason,
      acceptedAt: next === "ACCEPTED" ? now : current.acceptedAt,
      collectionScheduledAt: next === "COLLECTION_SCHEDULED" ? scheduled : current.collectionScheduledAt,
      collectedAt: next === "COLLECTED" ? now : current.collectedAt,
      receivedAt: next === "RECEIVED" ? now : current.receivedAt,
      processingDueAt: next === "RECEIVED" ? new Date(now.getTime() + 7 * 86400000) : current.processingDueAt,
      processedAt: next === "REWARD_SELECTION" ? now : current.processedAt,
      rewardSelectionDueAt: next === "REWARD_SELECTION" ? new Date(now.getTime() + 7 * 86400000) : current.rewardSelectionDueAt,
      rewardCreditAmount: next === "REWARD_SELECTION" ? Math.max(0, Number(field(formData, "rewardCreditAmount") || current.rewardCreditAmount)) : current.rewardCreditAmount,
      closedAt: next === "CLOSED" ? now : current.closedAt,
      cancelledAt: next === "CANCELLED" ? now : current.cancelledAt
    };
    await tx.offeringRequest.update({ where: { id }, data });
    await tx.offeringActivity.create({ data: { tenantId, offeringId: id, actorId: admin.id, action: "status_changed", fromStatus: current.status, toStatus: next, note: field(formData, "note") || null } });
    if (["COLLECTED", "REJECTED", "CANCELLED"].includes(next) && current.pickupRedemptionId) {
      const redemption = await tx.membershipBenefitRedemption.findUnique({ where: { id: current.pickupRedemptionId } });
      if (redemption?.status === "RESERVED") await transitionMembershipRedemption({ tenantId, idempotencyKey: redemption.idempotencyKey, toStatus: next === "COLLECTED" ? "CONSUMED" : "RELEASED", reason: next === "COLLECTED" ? "Offering pickup completed." : "Offering request ended before pickup.", actorId: admin.id }, tx);
    }
    await tx.auditLog.create({ data: { tenantId, actorId: admin.id, action: "offering_status_changed", entity: "OfferingRequest", entityId: id, metadata: { from: current.status, to: next } } });
  });
  revalidatePath(`/admin/offerings/${id}`); revalidatePath(`/offerings/${id}`); revalidatePath("/admin/offerings");
}

export async function selectOfferingRewardAction(formData: FormData) {
  const user = await requireCurrentUser(); const tenantId = await getOmdTenantId();
  const id = field(formData, "id"); const [productId, variantId] = field(formData, "rewardChoice").split("|"); const addressId = field(formData, "addressId");
  const createdOrderId = await prisma.$transaction(async (tx) => {
    const offering = await tx.offeringRequest.findFirstOrThrow({ where: { id, tenantId, userId: user.id, status: "REWARD_SELECTION" } });
    if (offering.rewardOrderId) return offering.rewardOrderId;
    const product = await tx.product.findFirst({ where: { id: productId, tenantId, status: "ACTIVE", type: "PHYSICAL" }, include: { variants: { where: { id: variantId, active: true } } } });
    const variant = product?.variants[0]; if (!product || !variant) throw new Error("Choose an available reward product and variant.");
    const stock = await getVariantStockSummary(variant.id, tx); if (stock.available < 1) throw new Error("This reward is out of stock.");
    const address = await tx.customerAddress.findFirstOrThrow({ where: { id: addressId, tenantId, userId: user.id } });
    const shipping = await resolveShippingSnapshot(tenantId, address.pincode, tx); if (!shipping.shippingServiceable) throw new Error(shipping.shippingNote ?? "Reward delivery is unavailable.");
    const membership = await tx.userMembership.findFirst({ where: { tenantId, userId: user.id, status: "ACTIVE", startsAt: { lte: new Date() }, expiresAt: { gt: new Date() } }, include: { planVersion: true, plan: { include: { benefits: { include: { targets: true } } } } } });
    const benefits = (membership ? membership.planVersion ? versionBenefits(membership.planVersion) : membership.plan.benefits : []) as OfferingBenefit[];
    const unitPrice = Number(variant.price ?? product.basePrice ?? 0);
    const credit = selectOfferingBenefit(benefits, { type: "DISCOUNT_AMOUNT", method: "CLAIM", amount: unitPrice, entityType: "OFFERINGS_REWARD" });
    const freeShipping = selectOfferingBenefit(benefits, { type: "SHIPPING_BENEFIT", amount: shipping.shippingAmount, entityType: "OFFERINGS_REWARD_SHIPPING" });
    const membershipCredit = Math.min(unitPrice, credit?.saving ?? 0); const rewardCredit = Math.min(unitPrice, Number(offering.rewardCreditAmount) + membershipCredit); const shippingSaving = Math.min(shipping.shippingAmount, freeShipping?.saving ?? 0);
    const total = Math.max(0, unitPrice - rewardCredit) + Math.max(0, shipping.shippingAmount - shippingSaving);
    const number = await orderNumber(tx);
    const order = await tx.order.create({ data: { tenantId, userId: user.id, orderNumber: number, status: total === 0 ? "confirmed" : "payment_pending", paymentStatus: total === 0 ? "succeeded" : "not_started", fulfillmentStatus: "unfulfilled", subtotalAmount: unitPrice, discountAmount: rewardCredit, shippingAmount: shipping.shippingAmount - shippingSaving, taxAmount: 0, taxableAmount: 0, totalAmount: total, currency: product.currency, customerName: address.fullName, customerEmail: user.email ?? "", customerPhone: address.phone, shippingAddressJson: addressSnapshotFromRecord(address), shippingEstimateDays: shipping.shippingEstimateDays, shippingServiceable: true, shippingNote: shipping.shippingNote, invoiceNumber: total === 0 ? invoiceNumberForOrder(number) : null, invoiceDate: total === 0 ? new Date() : null, pricingSnapshotJson: { source: "OFFERINGS_REWARD", offeringId: id, listAmount: unitPrice, rewardCredit, shippingSaving, total } } });
    const item = await tx.orderItem.create({ data: { orderId: order.id, productId, variantId, titleSnapshot: product.title, skuSnapshot: variant.sku, itemType: "OFFERINGS_REWARD", quantity: 1, unitPrice, lineTotal: unitPrice, membershipSavingAmount: rewardCredit, membershipBenefitId: credit?.benefit.id ?? null, taxableAmount: 0, taxAmount: 0, metadataJson: { offeringId: id, reward: true } } });
    await tx.inventoryLedger.create({ data: { tenantId, productId, variantId, orderId: order.id, orderItemId: item.id, movementType: "reserved", quantity: 1, reason: "Reserved for Offerings to Blessings reward.", actorId: user.id } });
    if (total === 0) {
      await tx.inventoryLedger.create({ data: { tenantId, productId, variantId, orderId: order.id, orderItemId: item.id, movementType: "sold", quantity: 1, reason: "Confirmed Offerings reward.", actorId: user.id } });
      await tx.inventoryLedger.create({ data: { tenantId, productId, variantId, orderId: order.id, orderItemId: item.id, movementType: "released", quantity: 1, reason: "Cleared reward stock hold.", actorId: user.id } });
    }
    if (membership && credit && rewardCredit > 0) {
      const redemption = await reserveMembershipBenefit({ tenantId, userId: user.id, userMembershipId: membership.id, benefitId: credit.benefit.id, scope: "OFFERINGS", idempotencyKey: `offering-reward:${id}`, relatedType: "ORDER_ITEM", relatedId: item.id, originalAmount: unitPrice, savingAmount: membershipCredit, finalAmount: total, reservationMinutes: total === 0 ? 1440 : 30, context: { entityType: "OFFERINGS_REWARD" }, metadataJson: { offeringId: id, orderId: order.id } }, tx);
      await tx.orderItem.update({ where: { id: item.id }, data: { membershipRedemptionId: redemption.id } });
      if (total === 0) await transitionMembershipRedemption({ tenantId, idempotencyKey: redemption.idempotencyKey, toStatus: "CONSUMED", reason: "Offerings reward order confirmed.", actorId: user.id }, tx);
    }
    if (membership && freeShipping && shippingSaving > 0) {
      const shippingRedemption = await reserveMembershipBenefit({ tenantId, userId: user.id, userMembershipId: membership.id, benefitId: freeShipping.benefit.id, scope: "OFFERINGS", idempotencyKey: `offering-reward-shipping:${id}`, relatedType: "ORDER_ITEM", relatedId: item.id, originalAmount: shipping.shippingAmount, savingAmount: shippingSaving, finalAmount: total, reservationMinutes: total === 0 ? 1440 : 30, context: { entityType: "OFFERINGS_REWARD_SHIPPING" }, metadataJson: { offeringId: id, orderId: order.id } }, tx);
      if (total === 0) await transitionMembershipRedemption({ tenantId, idempotencyKey: shippingRedemption.idempotencyKey, toStatus: "CONSUMED", reason: "Offerings reward shipping confirmed.", actorId: user.id }, tx);
    }    await tx.offeringRequest.update({ where: { id }, data: { status: "REWARD_ORDERED", rewardProductId: productId, rewardVariantId: variantId, rewardCreditAmount: rewardCredit, rewardShippingSavingAmount: shippingSaving, rewardOrderId: order.id } });
    await tx.offeringActivity.create({ data: { tenantId, offeringId: id, actorId: user.id, action: "reward_selected", fromStatus: "REWARD_SELECTION", toStatus: "REWARD_ORDERED", note: `Reward order ${number} created.` } });
    return order.id;
  }, { timeout: 20000 });
  await projectCommerceOrder(createdOrderId); revalidatePath(`/offerings/${id}`); revalidatePath("/orders"); revalidatePath("/admin/offerings"); redirect(`/orders/${createdOrderId}`);
}
