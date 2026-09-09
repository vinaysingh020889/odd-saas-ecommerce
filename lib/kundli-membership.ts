import type { MembershipBenefit, MembershipBenefitTarget, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateMembershipSaving, membershipBenefitMatchesTarget, membershipPeriodKey, selectBestMembershipBenefit, type TargetedMembershipBenefit } from "@/lib/membership-entitlements";
import { versionBenefits } from "@/lib/membership-plan-versioning";

type Db = Prisma.TransactionClient | typeof prisma;
type KundliBenefit = MembershipBenefit & { targets?: MembershipBenefitTarget[] };

export type KundliMembershipQuote = {
  listAmount: number;
  savingAmount: number;
  payableAmount: number;
  benefit: KundliBenefit | null;
  membershipId: string | null;
  claimRequired: boolean;
};

export function calculateKundliBenefitSaving(benefit: Pick<MembershipBenefit, "type" | "valueDecimal" | "maxDiscountAmount">, listAmount: number) {
  if (benefit.type === "FREE_USAGE" && Number(benefit.valueDecimal ?? 0) <= 0) return Math.max(0, listAmount);
  return calculateMembershipSaving(benefit, listAmount);
}

export function selectKundliQuote(input: { listAmount: number; benefits: KundliBenefit[]; packageId: string; claimBenefitId?: string | null }) {
  const context = { kundliPackageId: input.packageId };
  const eligible = input.benefits.filter((benefit) =>
    benefit.active && (benefit.scope === "KUNDLI" || benefit.scope === "GLOBAL") &&
    (!benefit.validFrom || benefit.validFrom <= new Date()) && (!benefit.validUntil || benefit.validUntil >= new Date()) &&
    membershipBenefitMatchesTarget(benefit, context)
  );
  const selectedClaim = input.claimBenefitId
    ? eligible.find((benefit) => benefit.id === input.claimBenefitId && benefit.method === "CLAIM" && benefit.type === "FREE_USAGE") ?? null
    : null;
  const automatic = selectBestMembershipBenefit(eligible as TargetedMembershipBenefit[], { scope: "KUNDLI", amount: input.listAmount, context, method: "AUTOMATIC" });
  const benefit = selectedClaim ?? automatic?.benefit ?? null;
  const savingAmount = benefit ? calculateKundliBenefitSaving(benefit, input.listAmount) : 0;
  return { listAmount: input.listAmount, savingAmount, payableAmount: Math.max(0, input.listAmount - savingAmount), benefit, claimRequired: benefit?.method === "CLAIM" };
}

export async function getKundliMembershipQuote(input: { tenantId: string; userId: string; packageId: string; listAmount: number; claimBenefitId?: string | null }, db: Db = prisma): Promise<KundliMembershipQuote> {
  const membership = await db.userMembership.findFirst({
    where: { tenantId: input.tenantId, userId: input.userId, status: "ACTIVE", startsAt: { lte: new Date() }, expiresAt: { gt: new Date() } },
    include: { planVersion: true, plan: { include: { benefits: { include: { targets: true } } } } },
    orderBy: { expiresAt: "desc" }
  });
  if (!membership) return { listAmount: input.listAmount, savingAmount: 0, payableAmount: input.listAmount, benefit: null, membershipId: null, claimRequired: false };
  const benefits = (membership.planVersion ? versionBenefits(membership.planVersion) : membership.plan.benefits) as KundliBenefit[];
  const availableBenefits = [];
  for (const benefit of benefits) {
    if (benefit.usageLimit === null) { availableBenefits.push(benefit); continue; }
    const periodKey = membershipPeriodKey(benefit.usagePeriod, membership.id);
    const aggregate = await db.membershipBenefitRedemption.aggregate({ where: { userMembershipId: membership.id, benefitId: benefit.id, periodKey, OR: [{ status: "CONSUMED" }, { status: "RESERVED", reservationExpiresAt: { gt: new Date() } }] }, _sum: { quantity: true } });
    if ((aggregate._sum.quantity ?? 0) < benefit.usageLimit) availableBenefits.push(benefit);
  }
  const quote = selectKundliQuote({ ...input, benefits: availableBenefits });
  return { ...quote, membershipId: quote.benefit ? membership.id : null };
}
