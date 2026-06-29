import type { MembershipBenefit, MembershipBenefitScope, MembershipRule, Prisma, UserMembership, UserMembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { trackCustomerEvent } from "@/lib/customer-events";

type MembershipContext = {
  relatedType?: string;
  relatedId?: string;
  amount?: number | null;
  date?: Date | string | null;
  productId?: string | null;
  serviceId?: string | null;
  serviceBookingId?: string | null;
  kundliPackageId?: string | null;
  asthiPackageId?: string | null;
  orderId?: string | null;
  location?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export const supportedMembershipScopes = ["SHOP", "PUJA", "KUNDLI", "ASTHI", "SERVICE_BOOKING", "FESTIVAL", "CONTENT", "SUPPORT", "SHIPPING", "GLOBAL"] as const;
const supportedScopes = new Set<string>(supportedMembershipScopes);
export const membershipBenefitTypes = ["DISCOUNT_PERCENT", "DISCOUNT_AMOUNT", "FREE_USAGE", "PRIORITY_SUPPORT", "PRIORITY_QUEUE", "ACCESS", "SHIPPING_BENEFIT", "WALLET_BONUS_PLACEHOLDER", "CUSTOM"] as const;
export const membershipUsagePeriods = ["ONCE", "DAILY", "WEEKLY", "MONTHLY", "YEARLY", "LIFETIME"] as const;
export const membershipRuleKeys = [
  "discount_percent",
  "discount_amount",
  "free_usage",
  "priority_support",
  "priority_queue",
  "access_flag",
  "shipping_benefit",
  "member_badge",
  "manual_review_required",
  "custom_note",
  "usage_limit",
  "validity_window",
  "module_eligibility"
] as const;

export function getComputedMembershipStatus(membership: Pick<UserMembership, "status" | "startsAt" | "expiresAt"> | null | undefined): UserMembershipStatus | null {
  if (!membership) return null;
  if (membership.status === "CANCELLED") return "CANCELLED";
  const now = new Date();
  if (membership.expiresAt <= now) return "EXPIRED";
  return membership.startsAt <= now ? "ACTIVE" : "EXPIRED";
}

export function isMembershipActive(membership: Pick<UserMembership, "status" | "startsAt" | "expiresAt"> | null | undefined) {
  return getComputedMembershipStatus(membership) === "ACTIVE";
}

export async function getActiveMembershipForUser(userId: string) {
  const tenantId = await getOmdTenantId();
  const membership = await prisma.userMembership.findFirst({
    where: {
      tenantId,
      userId,
      status: "ACTIVE",
      startsAt: { lte: new Date() },
      expiresAt: { gt: new Date() }
    },
    include: {
      plan: {
        include: {
          benefits: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { title: "asc" }]
          },
          rules: {
            where: { active: true },
            orderBy: [{ priority: "desc" }, { createdAt: "asc" }]
          }
        }
      },
      usages: {
        include: { benefit: true },
        orderBy: { usedAt: "desc" },
        take: 50
      },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 5 }
    },
    orderBy: { expiresAt: "desc" }
  });

  return membership && isMembershipActive(membership) ? membership : null;
}

export async function getLatestMembershipForUser(userId: string) {
  const tenantId = await getOmdTenantId();
  return prisma.userMembership.findFirst({
    where: { tenantId, userId },
    include: {
      plan: {
        include: {
          benefits: {
            where: { active: true, customerVisible: true },
            orderBy: [{ sortOrder: "asc" }, { title: "asc" }]
          }
        }
      },
      usages: { include: { benefit: true }, orderBy: { usedAt: "desc" }, take: 100 },
      requests: { orderBy: { createdAt: "desc" }, take: 10 },
      statusHistory: { orderBy: { createdAt: "desc" }, take: 20 }
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getMembershipBenefitsForUser(userId: string) {
  const membership = await getActiveMembershipForUser(userId);
  return membership?.plan.benefits ?? [];
}

function isCurrentlyValid(record: { validFrom?: Date | null; validUntil?: Date | null }, now = new Date()) {
  if (record.validFrom && record.validFrom > now) return false;
  if (record.validUntil && record.validUntil < now) return false;
  return true;
}

function scopeMatches(recordScope: string, scope: string) {
  return recordScope === scope || recordScope === "GLOBAL";
}

function ruleValue(rule: Pick<MembershipRule, "valueDecimal" | "ruleValueJson">) {
  if (rule.valueDecimal !== null && rule.valueDecimal !== undefined) return Number(rule.valueDecimal);
  const json = rule.ruleValueJson;
  if (typeof json === "object" && json && "value" in json) {
    const value = Number((json as { value?: unknown }).value);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

function bestNumber(values: Array<number | null | undefined>) {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return clean.length ? Math.max(...clean) : undefined;
}

export async function getMembershipPlanConfig(planId: string) {
  const tenantId = await getOmdTenantId();
  const plan = await prisma.membershipPlan.findFirst({
    where: { id: planId, tenantId },
    include: {
      benefits: { orderBy: [{ sortOrder: "asc" }, { title: "asc" }] },
      rules: { include: { benefit: true }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }] }
    }
  });
  if (!plan) return null;
  const now = new Date();
  const activeBenefits = plan.benefits.filter((benefit) => benefit.active && isCurrentlyValid(benefit, now));
  const activeRules = plan.rules.filter((rule) => rule.active && isCurrentlyValid(rule, now));
  return {
    plan,
    activeBenefits,
    activeRules,
    displayBenefits: activeBenefits
      .filter((benefit) => benefit.customerVisible)
      .map((benefit) => ({
        id: benefit.id,
        title: benefit.title,
        description: benefit.description,
        type: benefit.type,
        scope: benefit.scope,
        value: benefit.valueDecimal !== null ? Number(benefit.valueDecimal) : benefit.valueText,
        usageLimit: benefit.usageLimit,
        usagePeriod: benefit.usagePeriod,
        validFrom: benefit.validFrom,
        validUntil: benefit.validUntil
      })),
    safetyFlags: {
      renewalAllowed: plan.renewalAllowed,
      upgradeAllowed: plan.upgradeAllowed,
      cancellationRequestAllowed: plan.cancellationRequestAllowed
    }
  };
}

export async function evaluateMembershipForScope(userId: string, scope: MembershipBenefitScope | string, context: MembershipContext = {}) {
  const normalizedScope = String(scope).toUpperCase();
  const safeScope = supportedScopes.has(normalizedScope) ? (normalizedScope as MembershipBenefitScope) : null;
  const membership = await getActiveMembershipForUser(userId);

  if (!membership) {
    return {
      hasActiveMembership: false,
      plan: null,
      activePlan: null,
      benefits: [],
      applicableBenefits: [],
      unavailableBenefits: [],
      reason: "NO_ACTIVE_MEMBERSHIP",
      blockedReason: "NO_ACTIVE_MEMBERSHIP",
      scope: safeScope ?? normalizedScope,
      context
    };
  }

  const benefits = membership.plan.benefits ?? [];
  const applicableBenefits = safeScope ? benefits.filter((benefit) => benefit.scope === safeScope || benefit.scope === "GLOBAL") : [];
  const unavailableBenefits = safeScope ? benefits.filter((benefit) => !applicableBenefits.some((applicable) => applicable.id === benefit.id)) : benefits;

  return {
    hasActiveMembership: true,
    plan: membership.plan,
    activePlan: membership.plan,
    userMembership: membership,
    benefits,
    applicableBenefits,
    unavailableBenefits,
    reason: safeScope ? (applicableBenefits.length ? null : "NO_SCOPE_BENEFIT") : "UNSUPPORTED_SCOPE",
    blockedReason: safeScope ? (applicableBenefits.length ? null : "NO_SCOPE_BENEFIT") : "UNSUPPORTED_SCOPE",
    usageAvailability: applicableBenefits.map((benefit) => ({
      benefitId: benefit.id,
      usageLimit: benefit.usageLimit,
      usagePeriod: benefit.usagePeriod,
      hasUsageLimit: typeof benefit.usageLimit === "number"
    })),
    scope: safeScope ?? normalizedScope,
    context,
    discountBenefits: applicableBenefits.filter((benefit) => ["DISCOUNT_PERCENT", "DISCOUNT_AMOUNT"].includes(benefit.type)),
    usageBenefits: applicableBenefits.filter((benefit) => benefit.type === "FREE_USAGE")
  };
}

export async function evaluateMembershipRulesForScope(userId: string, scope: MembershipBenefitScope | string, context: MembershipContext = {}) {
  const normalizedScope = String(scope).toUpperCase();
  const safeScope = supportedScopes.has(normalizedScope) ? (normalizedScope as MembershipBenefitScope) : null;
  const membership = await getActiveMembershipForUser(userId);

  if (!safeScope) {
    return {
      hasActiveMembership: Boolean(membership),
      activePlan: membership?.plan ?? null,
      userMembership: membership,
      matchingBenefits: [] as MembershipBenefit[],
      matchingRules: [] as MembershipRule[],
      allowed: false,
      blockedReason: "UNSUPPORTED_SCOPE",
      usage: [],
      usageRemaining: null,
      resetPeriod: null,
      displayMessages: ["This membership scope is not supported yet."]
    };
  }

  if (!membership) {
    return {
      hasActiveMembership: false,
      activePlan: null,
      userMembership: null,
      matchingBenefits: [] as MembershipBenefit[],
      matchingRules: [] as MembershipRule[],
      allowed: false,
      blockedReason: "NO_ACTIVE_MEMBERSHIP",
      usage: [],
      usageRemaining: null,
      resetPeriod: null,
      displayMessages: ["No active membership found."]
    };
  }

  const now = new Date();
  const amount = Number(context.amount ?? 0);
  const benefits = (membership.plan.benefits ?? [])
    .filter((benefit) => benefit.active && scopeMatches(benefit.scope, safeScope) && isCurrentlyValid(benefit, now));
  const rules = ((membership.plan.rules ?? []) as MembershipRule[])
    .filter((rule) => rule.active && scopeMatches(rule.scope, safeScope) && isCurrentlyValid(rule, now))
    .filter((rule) => rule.minAmount === null || amount >= Number(rule.minAmount))
    .sort((a, b) => {
      const scopeDelta = (b.scope === safeScope ? 1 : 0) - (a.scope === safeScope ? 1 : 0);
      if (scopeDelta) return scopeDelta;
      const benefitDelta = (b.benefitId ? 1 : 0) - (a.benefitId ? 1 : 0);
      if (benefitDelta) return benefitDelta;
      return b.priority - a.priority;
    });

  const usage = await Promise.all(
    benefits.map(async (benefit) => {
      const periodStart = usagePeriodStart(benefit.usagePeriod ?? rules.find((rule) => rule.benefitId === benefit.id)?.usagePeriod);
      const used = await prisma.membershipBenefitUsage.aggregate({
        where: {
          tenantId: membership.tenantId,
          userMembershipId: membership.id,
          benefitId: benefit.id,
          ...(periodStart ? { usedAt: { gte: periodStart } } : {})
        },
        _sum: { usageCount: true }
      });
      const usedCount = used._sum.usageCount ?? 0;
      const ruleLimit = rules.find((rule) => rule.benefitId === benefit.id && typeof rule.usageLimit === "number")?.usageLimit ?? null;
      const limit = benefit.usageLimit ?? ruleLimit;
      return {
        benefitId: benefit.id,
        title: benefit.title,
        usedCount,
        usageLimit: limit,
        remaining: limit === null ? null : Math.max(0, limit - usedCount),
        usagePeriod: benefit.usagePeriod ?? rules.find((rule) => rule.benefitId === benefit.id)?.usagePeriod ?? null
      };
    })
  );

  const discountPercent = bestNumber([
    ...benefits.filter((benefit) => benefit.type === "DISCOUNT_PERCENT").map((benefit) => Number(benefit.valueDecimal ?? 0)),
    ...rules.filter((rule) => rule.ruleKey === "discount_percent").map(ruleValue)
  ]);
  const discountAmount = bestNumber([
    ...benefits.filter((benefit) => benefit.type === "DISCOUNT_AMOUNT").map((benefit) => Number(benefit.valueDecimal ?? 0)),
    ...rules.filter((rule) => rule.ruleKey === "discount_amount").map(ruleValue)
  ]);
  const freeUsageAvailable = usage.some((item) => item.usageLimit === null || item.remaining === null || item.remaining > 0) && (benefits.some((benefit) => benefit.type === "FREE_USAGE") || rules.some((rule) => rule.ruleKey === "free_usage"));
  const prioritySupport = benefits.some((benefit) => benefit.type === "PRIORITY_SUPPORT") || rules.some((rule) => rule.ruleKey === "priority_support");
  const priorityQueue = benefits.some((benefit) => benefit.type === "PRIORITY_QUEUE") || rules.some((rule) => rule.ruleKey === "priority_queue");
  const accessGranted = benefits.some((benefit) => benefit.type === "ACCESS") || rules.some((rule) => rule.ruleKey === "access_flag");
  const manualReview = rules.some((rule) => rule.ruleKey === "manual_review_required");
  const blockedReason = manualReview ? "MANUAL_REVIEW_REQUIRED" : benefits.length || rules.length ? null : "NO_SCOPE_BENEFIT";

  return {
    hasActiveMembership: true,
    activePlan: membership.plan,
    userMembership: membership,
    matchingBenefits: benefits,
    matchingRules: rules,
    allowed: !blockedReason || blockedReason === "MANUAL_REVIEW_REQUIRED",
    discountPercent,
    discountAmount,
    freeUsageAvailable,
    prioritySupport,
    priorityQueue,
    accessGranted,
    usage,
    usageRemaining: usage.find((item) => typeof item.remaining === "number")?.remaining ?? null,
    resetPeriod: usage.find((item) => item.usagePeriod)?.usagePeriod ?? null,
    blockedReason,
    displayMessages: [
      ...benefits.filter((benefit) => benefit.customerVisible).map((benefit) => benefit.description || benefit.title),
      ...rules.map((rule) => rule.note).filter((note): note is string => Boolean(note))
    ]
  };
}

function usagePeriodStart(period: string | null | undefined, now = new Date()) {
  if (!period || period === "LIFETIME") return null;
  const date = new Date(now);
  if (period === "DAILY") date.setHours(0, 0, 0, 0);
  else if (period === "WEEKLY") {
    date.setHours(0, 0, 0, 0);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  }
  else if (period === "MONTHLY") {
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
  } else if (period === "YEARLY") {
    date.setMonth(0, 1);
    date.setHours(0, 0, 0, 0);
  }
  else return null;
  return date;
}

export async function getMembershipBenefitUsageSummary(userMembershipId: string) {
  const tenantId = await getOmdTenantId();
  const membership = await prisma.userMembership.findFirst({
    where: { id: userMembershipId, tenantId },
    include: {
      plan: {
        include: {
          benefits: {
            where: { active: true },
            orderBy: [{ sortOrder: "asc" }, { title: "asc" }]
          }
        }
      }
    }
  });

  if (!membership) return [];

  return Promise.all(
    membership.plan.benefits.map(async (benefit) => {
      const periodStart = usagePeriodStart(benefit.usagePeriod);
      const used = await prisma.membershipBenefitUsage.aggregate({
        where: {
          tenantId,
          userMembershipId: membership.id,
          benefitId: benefit.id,
          ...(periodStart ? { usedAt: { gte: periodStart } } : {})
        },
        _sum: { usageCount: true }
      });
      const usedCount = used._sum.usageCount ?? 0;
      const remaining = benefit.usageLimit === null ? null : Math.max(0, benefit.usageLimit - usedCount);

      return {
        benefit,
        usedCount,
        remaining,
        usageLimit: benefit.usageLimit,
        usagePeriod: benefit.usagePeriod
      };
    })
  );
}

export async function checkMembershipBenefitEligibility(input: {
  userId: string;
  scope: MembershipBenefitScope | string;
  benefitId?: string | null;
}) {
  const evaluation = await evaluateMembershipForScope(input.userId, input.scope);
  if (!evaluation.hasActiveMembership || !evaluation.userMembership) {
    return { eligible: false, reason: evaluation.blockedReason ?? "NO_ACTIVE_MEMBERSHIP", evaluation, benefit: null, remaining: null };
  }

  const benefit = input.benefitId
    ? evaluation.applicableBenefits.find((item) => item.id === input.benefitId)
    : evaluation.applicableBenefits[0];

  if (!benefit) {
    return { eligible: false, reason: "NO_APPLICABLE_BENEFIT", evaluation, benefit: null, remaining: null };
  }

  if (benefit.usageLimit === null) {
    return { eligible: true, reason: null, evaluation, benefit, remaining: null };
  }

  const tenantId = await getOmdTenantId();
  const periodStart = usagePeriodStart(benefit.usagePeriod);
  const used = await prisma.membershipBenefitUsage.aggregate({
    where: {
      tenantId,
      userMembershipId: evaluation.userMembership.id,
      benefitId: benefit.id,
      ...(periodStart ? { usedAt: { gte: periodStart } } : {})
    },
    _sum: { usageCount: true }
  });
  const usedCount = used._sum.usageCount ?? 0;
  const remaining = Math.max(0, benefit.usageLimit - usedCount);

  return {
    eligible: remaining > 0,
    reason: remaining > 0 ? null : "USAGE_LIMIT_REACHED",
    evaluation,
    benefit,
    remaining
  };
}

export async function recordMembershipBenefitUsage(input: {
  userMembershipId: string;
  benefitId: string;
  userId: string;
  scope: MembershipBenefitScope;
  relatedType?: string | null;
  relatedId?: string | null;
  usageCount?: number;
  metadataJson?: Prisma.InputJsonValue;
}) {
  const tenantId = await getOmdTenantId();
  const usageCount = Math.max(1, Math.floor(input.usageCount ?? 1));
  const eligibility = await checkMembershipBenefitEligibility({
    userId: input.userId,
    scope: input.scope,
    benefitId: input.benefitId
  });
  const membership = eligibility.evaluation.userMembership;
  const benefit = eligibility.benefit;

  if (!membership || membership.id !== input.userMembershipId || !isMembershipActive(membership)) {
    throw new Error("An active membership is required before recording benefit usage.");
  }

  if (!benefit || !eligibility.eligible) {
    throw new Error("Benefit does not belong to this active membership or scope.");
  }

  if (typeof eligibility.remaining === "number" && usageCount > eligibility.remaining) {
    throw new Error("Membership benefit usage limit has been reached.");
  }

  const usage = await prisma.membershipBenefitUsage.create({
    data: {
      tenantId,
      userMembershipId: input.userMembershipId,
      benefitId: input.benefitId,
      userId: input.userId,
      scope: input.scope,
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId ?? null,
      usageCount,
      metadataJson: input.metadataJson ?? undefined
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: input.userId,
      action: "membership_benefit_used",
      entity: "MembershipBenefitUsage",
      entityId: usage.id,
      metadata: {
        userMembershipId: input.userMembershipId,
        benefitId: input.benefitId,
        scope: input.scope,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        usageCount
      }
    }
  });

  await trackCustomerEvent({
    tenantId,
    userId: input.userId,
    eventType: "MEMBERSHIP_BENEFIT_USED",
    entityType: "MEMBERSHIP_PLAN",
    entityId: membership.planId,
    metadata: {
      benefitId: benefit.id,
      benefitTitle: benefit.title,
      scope: input.scope,
      relatedType: input.relatedType ?? null,
      relatedId: input.relatedId ?? null,
      usageCount
    },
    recompute: false
  });

  return usage;
}
