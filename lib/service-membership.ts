import type { MembershipBenefit, MembershipBenefitTarget, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateMembershipSaving, membershipBenefitMatchesTarget, membershipPeriodKey, type EntitlementTargetContext } from "@/lib/membership-entitlements";
import { versionBenefits } from "@/lib/membership-plan-versioning";

type Db = Prisma.TransactionClient | typeof prisma;
type Benefit = MembershipBenefit & { targets?: MembershipBenefitTarget[] };

export function calculateServiceBenefitSaving(benefit: Pick<MembershipBenefit, "type" | "valueDecimal" | "maxDiscountAmount">, amount: number) {
  if (benefit.type === "FREE_USAGE") {
    const credit = Number(benefit.valueDecimal ?? 0);
    return credit > 0 ? Math.min(amount, credit) : amount;
  }
  return calculateMembershipSaving(benefit, amount);
}

export function selectServiceQuote(input: { scope: "SERVICE_BOOKING" | "ASTHI"; eligibleAmount: number; excludedAmount?: number; context: EntitlementTargetContext; benefits: Benefit[]; claimBenefitId?: string | null }) {
  const now = new Date();
  const scopes = input.scope === "SERVICE_BOOKING" ? ["SERVICE_BOOKING", "PUJA", "GLOBAL"] : ["ASTHI", "GLOBAL"];
  const eligible = input.benefits.filter((benefit) => benefit.active && scopes.includes(benefit.scope) && (!benefit.validFrom || benefit.validFrom <= now) && (!benefit.validUntil || benefit.validUntil >= now) && membershipBenefitMatchesTarget(benefit, input.context));
  const claim = input.claimBenefitId ? eligible.find((benefit) => benefit.id === input.claimBenefitId && benefit.method === "CLAIM" && benefit.type === "FREE_USAGE") ?? null : null;
  const automatic = eligible.filter((benefit) => benefit.method === "AUTOMATIC" && ["DISCOUNT_PERCENT", "DISCOUNT_AMOUNT"].includes(benefit.type)).map((benefit) => ({ benefit, savingAmount: calculateServiceBenefitSaving(benefit, input.eligibleAmount) })).sort((a, b) => b.savingAmount - a.savingAmount)[0] ?? null;
  const benefit = claim ?? automatic?.benefit ?? null;
  const savingAmount = benefit ? calculateServiceBenefitSaving(benefit, input.eligibleAmount) : 0;
  const excludedAmount = Math.max(0, input.excludedAmount ?? 0);
  return { listAmount: input.eligibleAmount + excludedAmount, eligibleAmount: input.eligibleAmount, excludedAmount, savingAmount, payableAmount: Math.max(0, input.eligibleAmount - savingAmount) + excludedAmount, benefit, claimRequired: benefit?.method === "CLAIM" };
}

export async function getServiceMembershipQuote(input: { tenantId: string; userId: string; scope: "SERVICE_BOOKING" | "ASTHI"; eligibleAmount: number; excludedAmount?: number; context: EntitlementTargetContext; claimBenefitId?: string | null }, db: Db = prisma) {
  const now = new Date();
  const membership = await db.userMembership.findFirst({ where: { tenantId: input.tenantId, userId: input.userId, status: "ACTIVE", startsAt: { lte: now }, expiresAt: { gt: now } }, include: { planVersion: true, plan: { include: { benefits: { include: { targets: true } } } } }, orderBy: { expiresAt: "desc" } });
  if (!membership) return { ...selectServiceQuote({ ...input, benefits: [] }), membershipId: null, hasPriority: false };
  const benefits = (membership.planVersion ? versionBenefits(membership.planVersion) : membership.plan.benefits) as Benefit[];
  const available: Benefit[] = [];
  for (const benefit of benefits) {
    if (benefit.usageLimit === null) { available.push(benefit); continue; }
    const periodKey = membershipPeriodKey(benefit.usagePeriod, membership.id, now);
    const used = await db.membershipBenefitRedemption.aggregate({ where: { userMembershipId: membership.id, benefitId: benefit.id, periodKey, OR: [{ status: "CONSUMED" }, { status: "RESERVED", reservationExpiresAt: { gt: now } }] }, _sum: { quantity: true } });
    if ((used._sum.quantity ?? 0) < benefit.usageLimit) available.push(benefit);
  }
  const quote = selectServiceQuote({ ...input, benefits: available });
  const hasPriority = available.some((benefit) => benefit.active && benefit.type === "PRIORITY_QUEUE" && (benefit.scope === input.scope || benefit.scope === "PUJA" || benefit.scope === "GLOBAL") && membershipBenefitMatchesTarget(benefit, input.context));
  return { ...quote, membershipId: quote.benefit ? membership.id : null, hasPriority };
}
