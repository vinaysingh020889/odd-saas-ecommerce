import type {
  MembershipBenefit,
  MembershipBenefitScope,
  MembershipBenefitTarget,
  MembershipRedemptionStatus,
  MembershipUsagePeriod,
  Prisma
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { versionBenefits } from "@/lib/membership-plan-versioning";

type Db = Prisma.TransactionClient;

export type EntitlementTargetContext = {
  productId?: string | null;
  variantId?: string | null;
  categoryId?: string | null;
  serviceId?: string | null;
  kundliPackageId?: string | null;
  asthiPackageId?: string | null;
  festivalCampaignId?: string | null;
  tagIds?: string[];
  entityType?: string | null;
  entityId?: string | null;
};

export function entitlementContextForTarget(value?: string | null): EntitlementTargetContext {
  if (!value) return {};
  const separator = value.indexOf(":");
  if (separator < 1) return {};
  const type = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!id) return {};
  if (type === "PRODUCT") return { productId: id };
  if (type === "VARIANT") return { variantId: id };
  if (type === "CATEGORY") return { categoryId: id };
  if (type === "SERVICE") return { productId: id, serviceId: id };
  if (type === "KUNDLI_PACKAGE") return { kundliPackageId: id };
  if (type === "ASTHI_PACKAGE") return { asthiPackageId: id };
  if (type === "FESTIVAL_CAMPAIGN") return { festivalCampaignId: id };
  if (type === "TAG") return { tagIds: [id] };
  return { entityType: type, entityId: id };
}
export type TargetedMembershipBenefit = MembershipBenefit & { targets?: MembershipBenefitTarget[] };

const targetContextKeys: Record<string, keyof EntitlementTargetContext> = {
  PRODUCT: "productId",
  VARIANT: "variantId",
  CATEGORY: "categoryId",
  SERVICE: "serviceId",
  KUNDLI_PACKAGE: "kundliPackageId",
  ASTHI_PACKAGE: "asthiPackageId",
  FESTIVAL_CAMPAIGN: "festivalCampaignId"
};

export function membershipBenefitMatchesTarget(benefit: TargetedMembershipBenefit, context: EntitlementTargetContext) {
  const targets = benefit.targets ?? [];
  if (targets.length === 0) return true;
  return targets.some((target) => {
    if (target.targetType === "TAG") return context.tagIds?.includes(target.targetId) ?? false;
    if (target.targetType === "ENTITY") return context.entityType === target.targetId || context.entityId === target.targetId;
    const key = targetContextKeys[target.targetType];
    return key ? context[key] === target.targetId : false;
  });
}

export function calculateMembershipSaving(benefit: Pick<MembershipBenefit, "type" | "valueDecimal" | "maxDiscountAmount">, amount: number) {
  const value = Number(benefit.valueDecimal ?? 0);
  if (amount <= 0 || value <= 0) return 0;
  const raw = benefit.type === "DISCOUNT_PERCENT" ? Math.round((amount * value) / 100)
    : benefit.type === "DISCOUNT_AMOUNT" || benefit.type === "FREE_USAGE" ? Math.min(amount, value || amount)
      : benefit.type === "SHIPPING_BENEFIT" ? Math.min(amount, value)
        : 0;
  const cap = benefit.maxDiscountAmount === null || benefit.maxDiscountAmount === undefined ? raw : Number(benefit.maxDiscountAmount);
  return Math.max(0, Math.min(amount, raw, cap > 0 ? cap : raw));
}

export function selectBestMembershipBenefit(
  benefits: TargetedMembershipBenefit[],
  input: { scope: MembershipBenefitScope | string; amount: number; context: EntitlementTargetContext; now?: Date; method?: "AUTOMATIC" | "CLAIM" }
) {
  const now = input.now ?? new Date();
  return benefits
    .filter((benefit) => benefit.active)
    .filter((benefit) => benefit.scope === input.scope || benefit.scope === "GLOBAL")
    .filter((benefit) => (benefit.method ?? "AUTOMATIC") === (input.method ?? "AUTOMATIC"))
    .filter((benefit) => !benefit.validFrom || benefit.validFrom <= now)
    .filter((benefit) => !benefit.validUntil || benefit.validUntil >= now)
    .filter((benefit) => membershipBenefitMatchesTarget(benefit, input.context))
    .map((benefit) => ({ benefit, savingAmount: calculateMembershipSaving(benefit, input.amount) }))
    .filter((candidate) => candidate.savingAmount > 0)
    .sort((left, right) => right.savingAmount - left.savingAmount || left.benefit.sortOrder - right.benefit.sortOrder)[0] ?? null;
}

export function membershipPeriodStart(period: MembershipUsagePeriod | null, now = new Date()) {
  if (!period || period === "ONCE" || period === "LIFETIME") return null;
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (period === "DAILY") return date;
  if (period === "WEEKLY") {
    const dayNumber = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - dayNumber + 1);
    return date;
  }
  if (period === "MONTHLY") return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}
export function membershipPeriodKey(period: MembershipUsagePeriod | null, membershipId: string, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  if (period === "DAILY") return `day:${day}`;
  if (period === "WEEKLY") {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const dayNumber = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNumber);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `week:${date.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
  }
  if (period === "MONTHLY") return `month:${day.slice(0, 7)}`;
  if (period === "YEARLY") return `year:${day.slice(0, 4)}`;
  return `membership:${membershipId}`;
}

type ReserveInput = {
  tenantId: string;
  userId: string;
  userMembershipId: string;
  benefitId: string;
  scope: MembershipBenefitScope;
  idempotencyKey: string;
  quantity?: number;
  relatedType?: string | null;
  relatedId?: string | null;
  lineKey?: string | null;
  targetId?: string | null;
  originalAmount?: number;
  savingAmount?: number;
  finalAmount?: number;
  reservationMinutes?: number;
  context?: EntitlementTargetContext;
  metadataJson?: Prisma.InputJsonValue;
};

async function reserveInTransaction(tx: Db, input: ReserveInput) {
  const existing = await tx.membershipBenefitRedemption.findUnique({
    where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } }
  });
  if (existing) return existing;

  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `${input.tenantId}:${input.userMembershipId}:${input.benefitId}:membership-redemption`);
  const now = new Date();
  await tx.membershipBenefitRedemption.updateMany({
    where: { userMembershipId: input.userMembershipId, benefitId: input.benefitId, status: "RESERVED", reservationExpiresAt: { lte: now } },
    data: { status: "RELEASED", releasedAt: now, reason: "Reservation expired before consumption." }
  });
  const membership = await tx.userMembership.findFirst({
    where: { id: input.userMembershipId, tenantId: input.tenantId, userId: input.userId, status: "ACTIVE", startsAt: { lte: now }, expiresAt: { gt: now } },
    include: { planVersion: true, plan: { include: { benefits: { include: { targets: true } } } } }
  });
  const benefits = membership?.planVersion ? versionBenefits(membership.planVersion) : membership?.plan.benefits ?? [];
  const benefit = benefits.find((item) => item.id === input.benefitId) as TargetedMembershipBenefit | undefined;
  if (!membership || !benefit || !benefit.active || (benefit.scope !== input.scope && benefit.scope !== "GLOBAL")) {
    throw new Error("This benefit is not available on the active membership.");
  }
  if (!membershipBenefitMatchesTarget(benefit, input.context ?? {})) throw new Error("This benefit does not apply to the selected item or service.");
  const matchedTarget = benefit.targets?.find((target) => membershipBenefitMatchesTarget({ ...benefit, targets: [target] }, input.context ?? {}));
  const quantity = Math.max(1, Math.floor(input.quantity ?? 1));
  const periodKey = membershipPeriodKey(benefit.usagePeriod, membership.id, now);
  if (benefit.usageLimit !== null) {
    const aggregate = await tx.membershipBenefitRedemption.aggregate({
      where: { userMembershipId: membership.id, benefitId: benefit.id, periodKey, status: { in: ["RESERVED", "CONSUMED"] } },
      _sum: { quantity: true }
    });
    if ((aggregate._sum.quantity ?? 0) + quantity > benefit.usageLimit) throw new Error("Membership benefit usage limit has been reached.");
  }
  const created = await tx.membershipBenefitRedemption.create({ data: {
    tenantId: input.tenantId, userId: input.userId, userMembershipId: membership.id,
    planVersionId: membership.planVersionId, benefitId: benefit.id, targetId: input.targetId ?? null,
    status: "RESERVED", scope: input.scope, relatedType: input.relatedType ?? null, relatedId: input.relatedId ?? null,
    lineKey: input.lineKey ?? null, quantity, originalAmount: input.originalAmount ?? 0,
    savingAmount: input.savingAmount ?? 0, finalAmount: input.finalAmount ?? 0, periodKey,
    idempotencyKey: input.idempotencyKey,
    reservationExpiresAt: new Date(now.getTime() + Math.max(1, input.reservationMinutes ?? 30) * 60000),
    metadataJson: { ...(typeof input.metadataJson === "object" && input.metadataJson && !Array.isArray(input.metadataJson) ? input.metadataJson : {}), matchedTargetType: matchedTarget?.targetType ?? null, matchedTargetId: matchedTarget?.targetId ?? null }
  }});
  await tx.auditLog.create({ data: { tenantId: input.tenantId, actorId: input.userId, action: "membership_benefit_reserved", entity: "MembershipBenefitRedemption", entityId: created.id, metadata: { benefitId: benefit.id, quantity, periodKey, relatedType: input.relatedType ?? null, relatedId: input.relatedId ?? null } } });
  return created;
}

export function reserveMembershipBenefit(input: ReserveInput, tx?: Db) {
  return tx ? reserveInTransaction(tx, input) : prisma.$transaction((client) => reserveInTransaction(client, input));
}

export async function transitionMembershipRedemption(input: {
  tenantId: string;
  idempotencyKey: string;
  toStatus: Exclude<MembershipRedemptionStatus, "RESERVED">;
  reason?: string | null;
  actorId?: string | null;
}, tx?: Db) {
  const run = async (client: Db) => {
    await client.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", `${input.tenantId}:${input.idempotencyKey}:membership-redemption-transition`);
    const redemption = await client.membershipBenefitRedemption.findUnique({ where: { tenantId_idempotencyKey: { tenantId: input.tenantId, idempotencyKey: input.idempotencyKey } } });
    if (!redemption) throw new Error("Membership benefit reservation was not found.");
    if (redemption.status === input.toStatus) return redemption;
    const allowed = redemption.status === "RESERVED" ? ["CONSUMED", "RELEASED"] : redemption.status === "CONSUMED" ? ["REVERSED"] : [];
    if (!allowed.includes(input.toStatus)) throw new Error(`Cannot change redemption from ${redemption.status} to ${input.toStatus}.`);
    const now = new Date();
    const updated = await client.membershipBenefitRedemption.update({ where: { id: redemption.id }, data: {
      status: input.toStatus, reason: input.reason ?? redemption.reason,
      consumedAt: input.toStatus === "CONSUMED" ? now : redemption.consumedAt,
      releasedAt: input.toStatus === "RELEASED" ? now : redemption.releasedAt,
      reversedAt: input.toStatus === "REVERSED" ? now : redemption.reversedAt
    }});
    await client.auditLog.create({ data: { tenantId: input.tenantId, actorId: input.actorId ?? null, action: `membership_benefit_${input.toStatus.toLowerCase()}`, entity: "MembershipBenefitRedemption", entityId: redemption.id, metadata: { fromStatus: redemption.status, toStatus: input.toStatus, reason: input.reason ?? null } } });
    return updated;
  };
  return tx ? run(tx) : prisma.$transaction(run);
}
