"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { getCurrentUser, requireCurrentUser } from "@/lib/auth/session";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import {
  evaluateMembershipRulesForScope,
  getActiveMembershipForUser,
  membershipBenefitTypes,
  membershipRuleKeys,
  membershipUsagePeriods,
  recordMembershipBenefitUsage,
  supportedMembershipScopes
} from "@/lib/membership";
import { trackCustomerEvent } from "@/lib/customer-events";
import { safeCommerceReturnPath } from "@/lib/commerce-membership-gate";
import { projectMembershipRequest, projectUserMembership } from "@/lib/customer-account";
import { getPublishedMembershipPlanBySlug, publishMembershipPlanVersion } from "@/lib/membership-plan-versioning";

import {
  activateMembershipPlanForUser,
  membershipRequestActions,
  processMembershipRequest,
  submitMembershipCancellationRequest,
  submitMembershipPlanChangeRequest
} from '@/lib/membership-lifecycle';

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function optionalNumber(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalInt(formData: FormData, name: string) {
  const value = optionalNumber(formData, name);
  return value === null ? null : Math.floor(value);
}

function optionalDate(formData: FormData, name: string) {
  const value = text(formData, name);
  return value ? new Date(value) : null;
}

function membershipRedirect(formData: FormData) {
  const redirectTo = text(formData, "redirectTo");
  return redirectTo.startsWith("/") ? redirectTo : "/admin/memberships";
}

export async function activateFreeMembershipAction(formData: FormData) {
  const returnTo = safeCommerceReturnPath(text(formData, "returnTo"), "/membership?membership=activated");
  const user = await getCurrentUser();
  if (!user) {
    const membershipPath = `/membership?membershipRequired=1&returnTo=${encodeURIComponent(returnTo)}`;
    redirect(`/login?redirectTo=${encodeURIComponent(membershipPath)}`);
  }
  const tenantId = await getOmdTenantId();
  const planSlug = text(formData, "planSlug");

  if (!planSlug) throw new Error("Membership plan is required.");

  const plan = await getPublishedMembershipPlanBySlug(tenantId, planSlug, prisma);


  if (!plan) throw new Error("Membership plan is not available.");
  if (Number(plan.price) > 0) throw new Error("Paid membership plans require mock confirmation.");

  const activatedMembership = await activateMembershipPlanForUser({
    tenantId,
    userId: user.id,
    planSlug,
    actorLabel: user.name ?? user.email ?? "Customer",
    idempotentWhenActive: true
  });
  await projectUserMembership(activatedMembership.id);

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: "MEMBERSHIP_RENEWAL_STARTED",
    entityType: "MEMBERSHIP_PLAN",
    entitySlug: planSlug,
    metadata: { planSlug, free: true },
    recompute: false
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect(returnTo);
}

export async function confirmMembershipMockActivationAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const planSlug = text(formData, "planSlug");
  const returnTo = safeCommerceReturnPath(text(formData, "returnTo"), "/membership?membership=activated");

  if (!planSlug) throw new Error("Membership plan is required.");

  const plan = await getPublishedMembershipPlanBySlug(tenantId, planSlug, prisma);


  if (!plan) throw new Error("Membership plan is not available.");
  if (Number(plan.price) <= 0) {
    redirect(`/membership/${planSlug}/review`);
  }

  const activeMembership = await getActiveMembershipForUser(user.id);


  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: activeMembership && Number(plan.price) > Number(activeMembership.plan.price) ? "MEMBERSHIP_UPGRADE_STARTED" : "MEMBERSHIP_RENEWAL_STARTED",
    entityType: "MEMBERSHIP_PLAN",
    entitySlug: planSlug,
    metadata: { planSlug, mockPayment: true },
    recompute: false
  });

  const activationReference = text(formData, 'activationReference');
  if (!activationReference.startsWith('MOCK-MEMBER-')) throw new Error('A valid mock activation reference is required.');

  const activatedMembership = await activateMembershipPlanForUser({
    tenantId,
    userId: user.id,
    planSlug,
    actorLabel: user.name ?? user.email ?? "Customer",
    mockPaymentReference: activationReference
  });
  await projectUserMembership(activatedMembership.id);

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect(returnTo);
}

export async function requestMembershipCancellationAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const userMembershipId = text(formData, 'userMembershipId');
  const customerNote = text(formData, 'customerNote');
  const request = await submitMembershipCancellationRequest({
    tenantId,
    userId: user.id,
    userMembershipId,
    customerNote,
    actorLabel: user.name ?? user.email ?? 'Customer'
  });
  await projectMembershipRequest(request.id);

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: 'MEMBERSHIP_CANCELLATION_REQUESTED',
    entityType: 'MEMBERSHIP_PLAN',
    entityId: request.currentPlanId,
    metadata: { userMembershipId: request.userMembershipId, requestId: request.id },
    recompute: false
  });

  revalidatePath('/membership');
  revalidatePath('/dashboard');
  revalidatePath('/admin/memberships');
  redirect('/membership?membership=cancellation-requested');
}

export async function requestMembershipDowngradeAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const requestedPlanSlug = text(formData, 'requestedPlanSlug');
  const customerNote = text(formData, 'customerNote');
  const request = await submitMembershipPlanChangeRequest({
    tenantId,
    userId: user.id,
    requestedPlanSlug,
    customerNote,
    actorLabel: user.name ?? user.email ?? 'Customer'
  });
  await projectMembershipRequest(request.id);

  revalidatePath('/membership');
  revalidatePath('/dashboard');
  revalidatePath('/admin/memberships');
  redirect('/membership?membership=change-requested');
}

export async function processMembershipRequestAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const requestId = text(formData, 'requestId');
  const action = text(formData, 'action');
  const adminDecisionNote = text(formData, 'adminDecisionNote');
  const redirectTo = safeCommerceReturnPath(text(formData, 'redirectTo'), '/admin/memberships');
  if (!requestId || !membershipRequestActions.includes(action as (typeof membershipRequestActions)[number])) {
    throw new Error('Valid request action is required.');
  }

  const result = await processMembershipRequest({
    tenantId,
    requestId,
    action: action as (typeof membershipRequestActions)[number],
    adminDecisionNote,
    actor: { id: admin.id, label: admin.name ?? admin.email ?? 'Admin' }
  });
  await projectMembershipRequest(requestId);
  await Promise.all(result.affectedMembershipIds.map((membershipId) => projectUserMembership(membershipId)));

  revalidatePath('/membership');
  revalidatePath('/dashboard');
  revalidatePath('/admin/memberships');
  revalidatePath(redirectTo);
  redirect(redirectTo);
}

export async function recordDemoMembershipBenefitUsageAction(formData: FormData) {
  const user = await requireCurrentUser();
  const userMembershipId = text(formData, "userMembershipId");
  const benefitId = text(formData, "benefitId");
  const scope = text(formData, "scope");

  if (!userMembershipId || !benefitId || !scope) throw new Error("Benefit usage details are required.");

  await recordMembershipBenefitUsage({
    userMembershipId,
    benefitId,
    userId: user.id,
    scope: scope as never,
    relatedType: "MEMBERSHIP",
    relatedId: userMembershipId,
    usageCount: 1,
    metadataJson: { source: "membership_demo_usage" }
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect("/membership?membership=benefit-used");
}

function validPlanSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export async function createMembershipPlanAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();
  const price = Number(text(formData, "price"));
  const durationDays = Number.parseInt(text(formData, "durationDays"), 10);
  const currency = text(formData, "currency").toUpperCase() || "INR";

  if (!name || !validPlanSlug(slug) || !Number.isFinite(price) || price < 0 || !Number.isInteger(durationDays) || durationDays < 1) {
    throw new Error("Name, a lowercase hyphenated slug, non-negative price, and valid duration are required.");
  }

  const plan = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.membershipPlan.findFirst({ where: { tenantId, slug }, select: { id: true } });
    if (duplicate) throw new Error("A membership plan with this slug already exists.");
    const created = await tx.membershipPlan.create({
      data: {
        tenantId,
        name,
        slug,
        description: nullableText(formData, "description"),
        price,
        currency,
        durationDays,
        status: "INACTIVE",
        sortOrder: optionalInt(formData, "sortOrder") ?? 0,
        featured: formData.get("featured") === "on",
        renewalAllowed: true,
        upgradeAllowed: true,
        cancellationRequestAllowed: true,
        customerNote: nullableText(formData, "customerNote"),
        internalNote: nullableText(formData, "internalNote")
      }
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "membership_plan_created",
        entity: "MembershipPlan",
        entityId: created.id,
        metadata: { name: created.name, slug: created.slug, status: "DRAFT" }
      }
    });
    return created;
  });

  revalidatePath("/membership");
  revalidatePath("/admin/memberships");
  redirect("/admin/memberships#plan-" + plan.id);
}

export async function duplicateMembershipPlanAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const planId = text(formData, "planId");
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();

  if (!planId || !name || !validPlanSlug(slug)) throw new Error("Source plan, new name, and a lowercase hyphenated slug are required.");

  const duplicated = await prisma.$transaction(async (tx) => {
    const source = await tx.membershipPlan.findFirst({
      where: { id: planId, tenantId },
      include: { benefits: { orderBy: { sortOrder: "asc" } }, rules: { orderBy: { priority: "desc" } } }
    });
    if (!source) throw new Error("Source membership plan was not found.");
    if (await tx.membershipPlan.findFirst({ where: { tenantId, slug }, select: { id: true } })) {
      throw new Error("A membership plan with this slug already exists.");
    }

    const copy = await tx.membershipPlan.create({
      data: {
        tenantId,
        name,
        slug,
        description: source.description,
        price: source.price,
        currency: source.currency,
        durationDays: source.durationDays,
        status: "INACTIVE",
        sortOrder: source.sortOrder + 1,
        featured: false,
        renewalAllowed: source.renewalAllowed,
        upgradeAllowed: source.upgradeAllowed,
        cancellationRequestAllowed: source.cancellationRequestAllowed,
        customerNote: source.customerNote,
        internalNote: source.internalNote
      }
    });

    const benefitIds = new Map<string, string>();
    for (const benefit of source.benefits) {
      const created = await tx.membershipBenefit.create({
        data: {
          tenantId,
          planId: copy.id,
          title: benefit.title,
          description: benefit.description,
          type: benefit.type,
          scope: benefit.scope,
          valueDecimal: benefit.valueDecimal,
          valueText: benefit.valueText,
          usageLimit: benefit.usageLimit,
          usagePeriod: benefit.usagePeriod,
          active: benefit.active,
          validFrom: benefit.validFrom,
          validUntil: benefit.validUntil,
          customerVisible: benefit.customerVisible,
          internalNote: benefit.internalNote,
          sortOrder: benefit.sortOrder
        }
      });
      benefitIds.set(benefit.id, created.id);
    }

    for (const rule of source.rules) {
      await tx.membershipRule.create({
        data: {
          tenantId,
          planId: copy.id,
          benefitId: rule.benefitId ? benefitIds.get(rule.benefitId) ?? null : null,
          scope: rule.scope,
          ruleKey: rule.ruleKey,
          ruleValueJson: rule.ruleValueJson as Prisma.InputJsonValue,
          valueDecimal: rule.valueDecimal,
          usageLimit: rule.usageLimit,
          usagePeriod: rule.usagePeriod,
          minAmount: rule.minAmount,
          validFrom: rule.validFrom,
          validUntil: rule.validUntil,
          priority: rule.priority,
          note: rule.note,
          active: rule.active
        }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "membership_plan_duplicated",
        entity: "MembershipPlan",
        entityId: copy.id,
        metadata: { sourcePlanId: source.id, sourceName: source.name, name, slug }
      }
    });
    return copy;
  });

  revalidatePath("/admin/memberships");
  redirect("/admin/memberships#plan-" + duplicated.id);
}

export async function publishMembershipPlanAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const planId = text(formData, "planId");
  if (!planId) throw new Error("Membership plan is required.");

  const version = await prisma.$transaction(async (tx) => {
    const published = await publishMembershipPlanVersion(tx, { tenantId, planId });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "membership_plan_published",
        entity: "MembershipPlanVersion",
        entityId: published.id,
        metadata: { planId, versionNumber: published.versionNumber }
      }
    });
    return published;
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect("/admin/memberships#plan-" + version.planId);
}

export async function retireMembershipPlanAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const planId = text(formData, "planId");
  if (!planId) throw new Error("Membership plan is required.");

  await prisma.$transaction(async (tx) => {
    const current = await tx.membershipPlan.findFirst({ where: { id: planId, tenantId } });
    if (!current) throw new Error("Membership plan was not found.");
    const now = new Date();
    await tx.membershipPlan.update({ where: { id: current.id }, data: { status: "INACTIVE" } });
    await tx.membershipPlanVersion.updateMany({
      where: { tenantId, planId, status: "PUBLISHED" },
      data: { status: "RETIRED", retiredAt: now }
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "membership_plan_retired",
        entity: "MembershipPlan",
        entityId: current.id,
        metadata: { name: current.name, activeMembersUnaffected: true }
      }
    });
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect("/admin/memberships#plan-" + planId);
}
export async function updateMembershipPlanAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const planId = text(formData, "planId");
  const name = text(formData, "name");
  const description = text(formData, "description");
  const price = Number(text(formData, "price"));
  const durationDays = Number.parseInt(text(formData, "durationDays"), 10);
  const featured = formData.get("featured") === "on";
  const sortOrder = optionalInt(formData, "sortOrder") ?? 0;
  const renewalAllowed = formData.get("renewalAllowed") === "on";
  const upgradeAllowed = formData.get("upgradeAllowed") === "on";
  const cancellationRequestAllowed = formData.get("cancellationRequestAllowed") === "on";
  const customerNote = nullableText(formData, "customerNote");
  const internalNote = nullableText(formData, "internalNote");

  if (!planId || !name || !Number.isFinite(price) || price < 0 || !Number.isInteger(durationDays) || durationDays < 1) {
    throw new Error("Valid membership plan details are required.");
  }

  await prisma.$transaction(async (tx) => {
    const current = await tx.membershipPlan.findFirst({ where: { id: planId, tenantId } });
    if (!current) throw new Error("Membership plan was not found.");

    const updated = await tx.membershipPlan.update({
      where: { id: planId },
      data: {
        name,
        description,
        price,
        durationDays,
        featured,
        sortOrder,
        renewalAllowed,
        upgradeAllowed,
        cancellationRequestAllowed,
        customerNote,
        internalNote
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "membership_plan_updated",
        entity: "MembershipPlan",
        entityId: updated.id,
        metadata: {
          before: {
            name: current.name,
            description: current.description,
            price: current.price,
            durationDays: current.durationDays,
            featured: current.featured,
            sortOrder: current.sortOrder,
            renewalAllowed: current.renewalAllowed,
            upgradeAllowed: current.upgradeAllowed,
            cancellationRequestAllowed: current.cancellationRequestAllowed
          },
          after: { name, description, price, durationDays, featured, sortOrder, renewalAllowed, upgradeAllowed, cancellationRequestAllowed }
        }
      }
    });
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
}

export async function saveMembershipBenefitAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const benefitId = nullableText(formData, "benefitId");
  const planId = text(formData, "planId");
  const title = text(formData, "title");
  const description = nullableText(formData, "description");
  const type = text(formData, "type");
  const scope = text(formData, "scope");
  const valueDecimal = optionalNumber(formData, "valueDecimal");
  const valueText = nullableText(formData, "valueText");
  const usageLimit = optionalInt(formData, "usageLimit");
  const usagePeriod = nullableText(formData, "usagePeriod");
  const sortOrder = optionalInt(formData, "sortOrder") ?? 0;
  const validFrom = optionalDate(formData, "validFrom");
  const validUntil = optionalDate(formData, "validUntil");
  const active = formData.get("active") === "on";
  const customerVisible = formData.get("customerVisible") === "on";
  const internalNote = nullableText(formData, "internalNote");

  if (!planId || !title) throw new Error("Benefit plan and title are required.");
  if (!membershipBenefitTypes.includes(type as never)) throw new Error("Unsupported membership benefit type.");
  if (!supportedMembershipScopes.includes(scope as never)) throw new Error("Unsupported membership benefit scope.");
  if (usagePeriod && !membershipUsagePeriods.includes(usagePeriod as never)) throw new Error("Unsupported usage period.");

  const saved = await prisma.$transaction(async (tx) => {
    const plan = await tx.membershipPlan.findFirst({ where: { id: planId, tenantId }, select: { id: true, name: true } });
    if (!plan) throw new Error("Membership plan was not found.");
    const data = {
      tenantId,
      planId,
      title,
      description,
      type: type as never,
      scope: scope as never,
      valueDecimal,
      valueText,
      usageLimit,
      usagePeriod: usagePeriod as never,
      validFrom,
      validUntil,
      active,
      customerVisible,
      internalNote,
      sortOrder
    };
    const before = benefitId ? await tx.membershipBenefit.findFirst({ where: { id: benefitId, tenantId, planId } }) : null;
    const benefit = before
      ? await tx.membershipBenefit.update({ where: { id: before.id }, data })
      : await tx.membershipBenefit.create({ data });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: before ? "membership_benefit_updated" : "membership_benefit_created",
        entity: "MembershipBenefit",
        entityId: benefit.id,
        metadata: { planId, planName: plan.name, before, after: data }
      }
    });
    return benefit;
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect(`${membershipRedirect(formData)}#benefit-${saved.id}`);
}

export async function toggleMembershipBenefitAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const benefitId = text(formData, "benefitId");
  const active = text(formData, "active") === "true";
  const redirectTo = membershipRedirect(formData);
  const benefit = await prisma.$transaction(async (tx) => {
    const current = await tx.membershipBenefit.findFirst({ where: { id: benefitId, tenantId } });
    if (!current) throw new Error("Membership benefit was not found.");
    const saved = await tx.membershipBenefit.update({ where: { id: current.id }, data: { active } });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: active ? "membership_benefit_reactivated" : "membership_benefit_deactivated",
        entity: "MembershipBenefit",
        entityId: current.id,
        metadata: { planId: current.planId, title: current.title, fromActive: current.active, toActive: active }
      }
    });
    return saved;
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect(`${redirectTo}#benefit-${benefit.id}`);
}

export async function saveMembershipRuleAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const ruleId = nullableText(formData, "ruleId");
  const planId = text(formData, "planId");
  const benefitId = nullableText(formData, "benefitId");
  const ruleKey = text(formData, "ruleKey");
  const scope = text(formData, "scope");
  const valueDecimal = optionalNumber(formData, "valueDecimal");
  const usageLimit = optionalInt(formData, "usageLimit");
  const usagePeriod = nullableText(formData, "usagePeriod");
  const minAmount = optionalNumber(formData, "minAmount");
  const validFrom = optionalDate(formData, "validFrom");
  const validUntil = optionalDate(formData, "validUntil");
  const priority = optionalInt(formData, "priority") ?? 0;
  const note = nullableText(formData, "note");
  const active = formData.get("active") === "on";

  if (!planId) throw new Error("Membership plan is required.");
  if (!membershipRuleKeys.includes(ruleKey as never)) throw new Error("Unsupported membership rule key.");
  if (!supportedMembershipScopes.includes(scope as never)) throw new Error("Unsupported membership rule scope.");
  if (usagePeriod && !membershipUsagePeriods.includes(usagePeriod as never)) throw new Error("Unsupported usage period.");

  const saved = await prisma.$transaction(async (tx) => {
    const plan = await tx.membershipPlan.findFirst({ where: { id: planId, tenantId }, select: { id: true, name: true } });
    if (!plan) throw new Error("Membership plan was not found.");
    if (benefitId) {
      const benefit = await tx.membershipBenefit.findFirst({ where: { id: benefitId, tenantId, planId } });
      if (!benefit) throw new Error("Linked benefit must belong to this plan.");
    }
    const ruleValueJson = {
      value: valueDecimal,
      usageLimit,
      usagePeriod,
      minAmount,
      note,
      source: "guided_admin_editor_v1"
    };
    const data = {
      tenantId,
      planId,
      benefitId,
      scope: scope as never,
      ruleKey,
      ruleValueJson,
      valueDecimal,
      usageLimit,
      usagePeriod: usagePeriod as never,
      minAmount,
      validFrom,
      validUntil,
      priority,
      note,
      active
    };
    const before = ruleId ? await tx.membershipRule.findFirst({ where: { id: ruleId, tenantId, planId } }) : null;
    const rule = before
      ? await tx.membershipRule.update({ where: { id: before.id }, data })
      : await tx.membershipRule.create({ data });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: before ? "membership_rule_updated" : "membership_rule_created",
        entity: "MembershipRule",
        entityId: rule.id,
        metadata: { planId, planName: plan.name, before, after: data }
      }
    });
    return rule;
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect(`${membershipRedirect(formData)}#rule-${saved.id}`);
}

export async function toggleMembershipRuleAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const ruleId = text(formData, "ruleId");
  const active = text(formData, "active") === "true";
  const redirectTo = membershipRedirect(formData);
  const rule = await prisma.$transaction(async (tx) => {
    const current = await tx.membershipRule.findFirst({ where: { id: ruleId, tenantId } });
    if (!current) throw new Error("Membership rule was not found.");
    const saved = await tx.membershipRule.update({ where: { id: current.id }, data: { active } });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: active ? "membership_rule_reactivated" : "membership_rule_deactivated",
        entity: "MembershipRule",
        entityId: current.id,
        metadata: { planId: current.planId, ruleKey: current.ruleKey, fromActive: current.active, toActive: active }
      }
    });
    return saved;
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect(`${redirectTo}#rule-${rule.id}`);
}

export async function previewMembershipRuleEvaluationAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const userId = text(formData, "userId");
  const scope = text(formData, "scope");
  const amount = optionalNumber(formData, "amount");

  if (!userId || !scope) throw new Error("Preview requires a user and scope.");
  const evaluation = await evaluateMembershipRulesForScope(userId, scope, { amount });
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: admin.id,
      action: "membership_rule_previewed",
      entity: "MembershipRule",
      entityId: null,
      metadata: {
        userId,
        scope,
        amount,
        activePlanId: evaluation.activePlan?.id ?? null,
        matchingBenefits: evaluation.matchingBenefits.length,
        matchingRules: evaluation.matchingRules.length,
        blockedReason: evaluation.blockedReason
      }
    }
  });
  redirect(`/admin/memberships?previewUserId=${encodeURIComponent(userId)}&previewScope=${encodeURIComponent(scope)}&previewAmount=${encodeURIComponent(String(amount ?? ""))}#membership-preview`);
}

export async function updateMembershipPlanStatusAction(formData: FormData) {
  throw new Error("Direct status changes are disabled. Publish a version or retire the plan.");
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const planId = text(formData, "planId");
  const status = text(formData, "status");

  if (!planId || !["ACTIVE", "INACTIVE"].includes(status)) {
    throw new Error("Valid membership plan and status are required.");
  }

  await prisma.$transaction(async (tx) => {
    const currentPlan = await tx.membershipPlan.findFirst({
      where: { id: planId, tenantId },
      include: {
        _count: {
          select: {
            userMemberships: {
              where: {
                status: "ACTIVE",
                expiresAt: { gt: new Date() }
              }
            }
          }
        }
      }
    });

    if (!currentPlan) throw new Error("Membership plan was not found.");

    const updated = await tx.membershipPlan.update({
      where: { id: planId },
      data: { status: status as "ACTIVE" | "INACTIVE" }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "membership_plan_status_updated",
        entity: "MembershipPlan",
        entityId: updated.id,
        metadata: {
          fromStatus: currentPlan.status,
          toStatus: status,
          activeMemberCount: currentPlan._count.userMemberships
        }
      }
    });

  });

  revalidatePath("/membership");
  revalidatePath("/admin/memberships");
}
