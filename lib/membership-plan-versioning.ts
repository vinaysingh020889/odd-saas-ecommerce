import type { MembershipBenefit, MembershipPlan, MembershipPlanVersion, MembershipRule, MembershipBenefitTarget, Prisma } from "@prisma/client";

type DbClient = Prisma.TransactionClient | typeof import("@/lib/prisma").prisma;

type BenefitWithTargets = MembershipBenefit & { targets?: MembershipBenefitTarget[] };
type SerializedTarget = Omit<MembershipBenefitTarget, "createdAt"> & { createdAt: string };

type SerializedBenefit = Omit<MembershipBenefit, "valueDecimal" | "validFrom" | "validUntil" | "createdAt" | "updatedAt"> & {
  valueDecimal: number | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

type SerializedRule = Omit<MembershipRule, "valueDecimal" | "minAmount" | "validFrom" | "validUntil" | "createdAt" | "updatedAt"> & {
  valueDecimal: number | null;
  minAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  createdAt: string;
  updatedAt: string;
};

function serializeBenefit(benefit: BenefitWithTargets): SerializedBenefit {
  const { targets, ...record } = benefit;
  void targets;
  return {
    ...record,
    valueDecimal: benefit.valueDecimal === null ? null : Number(benefit.valueDecimal),
    validFrom: benefit.validFrom?.toISOString() ?? null,
    validUntil: benefit.validUntil?.toISOString() ?? null,
    createdAt: benefit.createdAt.toISOString(),
    updatedAt: benefit.updatedAt.toISOString()
  };
}

function serializeRule(rule: MembershipRule): SerializedRule {
  return {
    ...rule,
    valueDecimal: rule.valueDecimal === null ? null : Number(rule.valueDecimal),
    minAmount: rule.minAmount === null ? null : Number(rule.minAmount),
    validFrom: rule.validFrom?.toISOString() ?? null,
    validUntil: rule.validUntil?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString()
  };
}

function deserializeDate(value: unknown) {
  return typeof value === "string" && value ? new Date(value) : null;
}

function serializeTarget(target: MembershipBenefitTarget): SerializedTarget {
  return { ...target, createdAt: target.createdAt.toISOString() };
}

export function versionTargets(version: Pick<MembershipPlanVersion, "targetsSnapshotJson">) {
  const raw = Array.isArray(version.targetsSnapshotJson) ? version.targetsSnapshotJson : [];
  return raw.map((item) => {
    const target = item as unknown as SerializedTarget;
    return { ...target, createdAt: new Date(target.createdAt) } as MembershipBenefitTarget;
  });
}

export function versionBenefits(version: Pick<MembershipPlanVersion, "benefitsSnapshotJson" | "targetsSnapshotJson">) {
  const raw = Array.isArray(version.benefitsSnapshotJson) ? version.benefitsSnapshotJson : [];
  return raw.map((item) => {
    const benefit = item as unknown as SerializedBenefit;
    return {
      ...benefit,
      validFrom: deserializeDate(benefit.validFrom),
      validUntil: deserializeDate(benefit.validUntil),
      createdAt: new Date(benefit.createdAt),
      updatedAt: new Date(benefit.updatedAt),
      targets: versionTargets(version).filter((target) => target.benefitId === benefit.id)
    } as unknown as MembershipBenefit & { targets: MembershipBenefitTarget[] };
  });
}

export function versionRules(version: Pick<MembershipPlanVersion, "rulesSnapshotJson">) {
  const raw = Array.isArray(version.rulesSnapshotJson) ? version.rulesSnapshotJson : [];
  return raw.map((item) => {
    const rule = item as unknown as SerializedRule;
    return {
      ...rule,
      validFrom: deserializeDate(rule.validFrom),
      validUntil: deserializeDate(rule.validUntil),
      createdAt: new Date(rule.createdAt),
      updatedAt: new Date(rule.updatedAt)
    } as unknown as MembershipRule;
  });
}

export function planFromPublishedVersion<T extends MembershipPlan>(
  plan: T,
  version: MembershipPlanVersion | null | undefined
): T & { benefits: MembershipBenefit[]; rules: MembershipRule[]; publishedVersion: MembershipPlanVersion | null } {
  if (!version) {
    const fallback = plan as T & { benefits?: MembershipBenefit[]; rules?: MembershipRule[] };
    return {
      ...plan,
      benefits: fallback.benefits ?? [],
      rules: fallback.rules ?? [],
      publishedVersion: null
    };
  }
  return {
    ...plan,
    name: version.name,
    description: version.description,
    price: version.price,
    currency: version.currency,
    durationDays: version.durationDays,
    renewalAllowed: version.renewalAllowed,
    upgradeAllowed: version.upgradeAllowed,
    cancellationRequestAllowed: version.cancellationRequestAllowed,
    customerNote: version.customerNote,
    benefits: versionBenefits(version).filter((benefit) => benefit.active),
    rules: versionRules(version).filter((rule) => rule.active),
    publishedVersion: version
  };
}

export async function latestPublishedPlanVersion(
  db: DbClient,
  input: { tenantId: string; planId?: string; planSlug?: string }
) {
  return db.membershipPlanVersion.findFirst({
    where: {
      tenantId: input.tenantId,
      status: "PUBLISHED",
      ...(input.planId ? { planId: input.planId } : {}),
      ...(input.planSlug ? { plan: { slug: input.planSlug } } : {})
    },
    orderBy: [{ versionNumber: "desc" }, { publishedAt: "desc" }]
  });
}

export async function publishMembershipPlanVersion(
  tx: Prisma.TransactionClient,
  input: { tenantId: string; planId: string }
) {
  await tx.$executeRawUnsafe("SELECT pg_advisory_xact_lock(hashtext($1))", input.tenantId + ":" + input.planId + ":membership-plan-publish");
  const plan = await tx.membershipPlan.findFirst({
    where: { id: input.planId, tenantId: input.tenantId },
    include: {
      benefits: { include: { targets: true }, orderBy: [{ sortOrder: "asc" }, { title: "asc" }] },
      rules: { orderBy: [{ priority: "desc" }, { createdAt: "asc" }] }
    }
  });
  if (!plan) throw new Error("Membership plan was not found.");

  const latest = await tx.membershipPlanVersion.findFirst({
    where: { tenantId: input.tenantId, planId: input.planId },
    orderBy: { versionNumber: "desc" },
    select: { versionNumber: true }
  });
  const now = new Date();

  await tx.membershipPlanVersion.updateMany({
    where: { tenantId: input.tenantId, planId: input.planId, status: "PUBLISHED" },
    data: { status: "RETIRED", retiredAt: now }
  });

  const version = await tx.membershipPlanVersion.create({
    data: {
      tenantId: input.tenantId,
      planId: input.planId,
      versionNumber: (latest?.versionNumber ?? 0) + 1,
      status: "PUBLISHED",
      name: plan.name,
      description: plan.description,
      price: plan.price,
      currency: plan.currency,
      durationDays: plan.durationDays,
      renewalAllowed: plan.renewalAllowed,
      upgradeAllowed: plan.upgradeAllowed,
      cancellationRequestAllowed: plan.cancellationRequestAllowed,
      customerNote: plan.customerNote,
      benefitsSnapshotJson: plan.benefits.map(serializeBenefit) as unknown as Prisma.InputJsonValue,
      rulesSnapshotJson: plan.rules.map(serializeRule) as unknown as Prisma.InputJsonValue,
      targetsSnapshotJson: plan.benefits.flatMap((benefit) => benefit.targets.map(serializeTarget)) as unknown as Prisma.InputJsonValue,
      publishedAt: now
    }
  });

  await tx.membershipPlan.update({ where: { id: plan.id }, data: { status: "ACTIVE" } });
  return version;
}

export async function getPublishedMembershipPlanById(tenantId: string, planId: string, db: DbClient) {
  const plan = await db.membershipPlan.findFirst({
    where: { tenantId, id: planId, status: "ACTIVE" },
    include: { benefits: { include: { targets: true } }, rules: true }
  });
  if (!plan) return null;
  const version = await latestPublishedPlanVersion(db, { tenantId, planId: plan.id });
  return version ? planFromPublishedVersion(plan, version) : null;
}
export async function getPublishedMembershipPlanBySlug(tenantId: string, slug: string, db: DbClient) {
  const plan = await db.membershipPlan.findFirst({
    where: { tenantId, slug, status: "ACTIVE" },
    include: { benefits: { include: { targets: true } }, rules: true }
  });
  if (!plan) return null;
  const version = await latestPublishedPlanVersion(db, { tenantId, planId: plan.id });
  return version ? planFromPublishedVersion(plan, version) : null;
}

export async function getPublishedMembershipPlans(tenantId: string, db: DbClient) {
  const plans = await db.membershipPlan.findMany({
    where: { tenantId, status: "ACTIVE" },
    include: { benefits: { include: { targets: true } }, rules: true, versions: { where: { status: "PUBLISHED" }, orderBy: { versionNumber: "desc" }, take: 1 } },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
  });
  return plans.flatMap((plan) => {
    const version = plan.versions[0];
    return version ? [planFromPublishedVersion(plan, version)] : [];
  }).sort((left, right) => left.sortOrder - right.sortOrder || Number(left.price) - Number(right.price));
}