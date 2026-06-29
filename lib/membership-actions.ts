"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import {
  evaluateMembershipRulesForScope,
  getComputedMembershipStatus,
  membershipBenefitTypes,
  membershipRuleKeys,
  membershipUsagePeriods,
  recordMembershipBenefitUsage,
  supportedMembershipScopes
} from "@/lib/membership";
import { trackCustomerEvent } from "@/lib/customer-events";

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

async function activatePlanForUser(input: {
  tenantId: string;
  userId: string;
  planSlug: string;
  actorLabel: string;
  mockPaymentReference?: string | null;
}) {
  return prisma.$transaction(async (tx) => {
    const plan = await tx.membershipPlan.findFirst({
      where: { tenantId: input.tenantId, slug: input.planSlug, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, price: true, durationDays: true }
    });

    if (!plan) {
      throw new Error("This membership plan is not available.");
    }

    const now = new Date();
    const buildExpiry = (base: Date) => {
      const expiresAt = new Date(base);
      expiresAt.setDate(expiresAt.getDate() + plan.durationDays);
      return expiresAt;
    };

    const activeMemberships = await tx.userMembership.findMany({
      where: {
        tenantId: input.tenantId,
        userId: input.userId,
        status: "ACTIVE"
      },
      include: { plan: { select: { id: true, name: true, price: true } } },
      orderBy: { createdAt: "desc" }
    });
    const currentActiveMemberships = activeMemberships.filter((membership) => getComputedMembershipStatus(membership) === "ACTIVE");
    const expiredActiveMemberships = activeMemberships.filter((membership) => getComputedMembershipStatus(membership) === "EXPIRED");
    const currentMembership = currentActiveMemberships[0] ?? null;

    for (const membership of expiredActiveMemberships) {
      await tx.userMembership.update({
        where: { id: membership.id },
        data: { status: "EXPIRED" }
      });
      await tx.membershipStatusHistory.create({
        data: {
          tenantId: input.tenantId,
          userMembershipId: membership.id,
          fromStatus: membership.status,
          toStatus: "EXPIRED",
          note: "Marked expired during membership activation check.",
          actorLabel: input.actorLabel
        }
      });
    }

    const existingSamePlan = currentActiveMemberships.find((membership) => membership.planId === plan.id);

    if (existingSamePlan) {
      const renewalBase = existingSamePlan.expiresAt > now ? existingSamePlan.expiresAt : now;
      const renewed = await tx.userMembership.update({
        where: { id: existingSamePlan.id },
        data: {
          expiresAt: buildExpiry(renewalBase),
          mockPaymentReference: input.mockPaymentReference ?? existingSamePlan.mockPaymentReference,
          activatedByOrderRef: input.mockPaymentReference ? "membership_mock_renewal" : "free_membership_renewal"
        },
        include: { plan: true }
      });

      await tx.membershipStatusHistory.create({
        data: {
          tenantId: input.tenantId,
          userMembershipId: renewed.id,
          fromStatus: existingSamePlan.status,
          toStatus: "ACTIVE",
          note: `Membership renewed. Previous expiry ${existingSamePlan.expiresAt.toLocaleDateString("en-IN")}; new expiry ${renewed.expiresAt.toLocaleDateString("en-IN")}.`,
          actorLabel: input.actorLabel
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.userId,
          action: "membership_renewed",
          entity: "UserMembership",
          entityId: renewed.id,
          metadata: {
            planSlug: plan.slug,
            planName: plan.name,
            previousExpiresAt: existingSamePlan.expiresAt,
            newExpiresAt: renewed.expiresAt,
            mockPaymentReference: input.mockPaymentReference ?? null
          }
        }
      });

      for (const membership of currentActiveMemberships.filter((item) => item.id !== existingSamePlan.id)) {
        await tx.userMembership.update({
          where: { id: membership.id },
          data: { status: "CANCELLED", expiresAt: now }
        });
        await tx.membershipStatusHistory.create({
          data: {
            tenantId: input.tenantId,
            userMembershipId: membership.id,
            fromStatus: membership.status,
            toStatus: "CANCELLED",
            note: "Cancelled duplicate active membership during idempotent activation check.",
            actorLabel: input.actorLabel
          }
        });
      }

      return tx.userMembership.findUniqueOrThrow({
        where: { id: renewed.id },
        include: { plan: true }
      });
    }

    const expiredSamePlan = expiredActiveMemberships.find((membership) => membership.planId === plan.id);

    if (expiredSamePlan) {
      const renewed = await tx.userMembership.update({
        where: { id: expiredSamePlan.id },
        data: {
          status: "ACTIVE",
          startsAt: now,
          expiresAt: buildExpiry(now),
          mockPaymentReference: input.mockPaymentReference ?? expiredSamePlan.mockPaymentReference,
          activatedByOrderRef: input.mockPaymentReference ? "membership_mock_renewal" : "free_membership_renewal"
        },
        include: { plan: true }
      });

      await tx.membershipStatusHistory.create({
        data: {
          tenantId: input.tenantId,
          userMembershipId: renewed.id,
          fromStatus: expiredSamePlan.status,
          toStatus: "ACTIVE",
          note: "Expired membership renewed and restarted from today.",
          actorLabel: input.actorLabel
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId: input.tenantId,
          actorId: input.userId,
          action: "membership_renewed",
          entity: "UserMembership",
          entityId: renewed.id,
          metadata: { planSlug: plan.slug, planName: plan.name, mockPaymentReference: input.mockPaymentReference ?? null }
        }
      });

      return renewed;
    }

    if (Number(plan.price) === 0 && currentActiveMemberships.some((membership) => Number(membership.plan.price) > 0)) {
      throw new Error("A paid membership is already active. Free membership cannot downgrade an active paid plan.");
    }

    if (currentMembership && Number(plan.price) < Number(currentMembership.plan.price)) {
      throw new Error("Active paid membership downgrades must be requested for admin review.");
    }

    for (const membership of currentActiveMemberships) {
      await tx.userMembership.update({
        where: { id: membership.id },
        data: { status: "CANCELLED", expiresAt: now }
      });
      await tx.membershipStatusHistory.create({
        data: {
          tenantId: input.tenantId,
          userMembershipId: membership.id,
          fromStatus: membership.status,
          toStatus: "CANCELLED",
          note: Number(plan.price) > Number(membership.plan.price) ? "Cancelled automatically because a higher membership plan was activated." : "Cancelled automatically because a new membership plan was activated.",
          actorLabel: input.actorLabel
        }
      });
    }

    const created = await tx.userMembership.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        planId: plan.id,
        status: "ACTIVE",
        startsAt: now,
        expiresAt: buildExpiry(now),
        activatedByOrderRef: input.mockPaymentReference ? (currentMembership ? "membership_mock_upgrade" : "membership_mock_activation") : "free_membership_activation",
        mockPaymentReference: input.mockPaymentReference ?? null
      },
      include: { plan: true }
    });

    await tx.membershipStatusHistory.create({
      data: {
        tenantId: input.tenantId,
        userMembershipId: created.id,
        fromStatus: null,
        toStatus: "ACTIVE",
        note: currentMembership
          ? `Membership upgraded from ${currentMembership.plan.name} to ${plan.name}.`
          : input.mockPaymentReference
            ? "Membership activated after mock confirmation."
            : "Free membership activated.",
        actorLabel: input.actorLabel
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.userId,
        action: currentMembership ? "membership_upgraded" : "membership_activated",
        entity: "UserMembership",
        entityId: created.id,
        metadata: {
          planSlug: input.planSlug,
          planName: plan.name,
          previousMembershipId: currentMembership?.id ?? null,
          previousPlanName: currentMembership?.plan.name ?? null,
          mockPaymentReference: input.mockPaymentReference ?? null
        }
      }
    });

    return created;
  });
}

export async function activateFreeMembershipAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const planSlug = text(formData, "planSlug");

  if (!planSlug) throw new Error("Membership plan is required.");

  const plan = await prisma.membershipPlan.findFirst({
    where: { tenantId, slug: planSlug, status: "ACTIVE" },
    select: { price: true }
  });

  if (!plan) throw new Error("Membership plan is not available.");
  if (Number(plan.price) > 0) throw new Error("Paid membership plans require mock confirmation.");

  await activatePlanForUser({
    tenantId,
    userId: user.id,
    planSlug,
    actorLabel: user.name ?? user.email ?? "Customer"
  });

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
  redirect("/membership?membership=activated");
}

export async function confirmMembershipMockActivationAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const planSlug = text(formData, "planSlug");

  if (!planSlug) throw new Error("Membership plan is required.");

  const plan = await prisma.membershipPlan.findFirst({
    where: { tenantId, slug: planSlug, status: "ACTIVE" },
    select: { price: true }
  });

  if (!plan) throw new Error("Membership plan is not available.");
  if (Number(plan.price) <= 0) {
    redirect(`/membership/${planSlug}/review`);
  }

  const activeMembership = await prisma.userMembership.findFirst({
    where: { tenantId, userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
    include: { plan: { select: { price: true } } },
    orderBy: { expiresAt: "desc" }
  });

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: activeMembership && Number(plan.price) > Number(activeMembership.plan.price) ? "MEMBERSHIP_UPGRADE_STARTED" : "MEMBERSHIP_RENEWAL_STARTED",
    entityType: "MEMBERSHIP_PLAN",
    entitySlug: planSlug,
    metadata: { planSlug, mockPayment: true },
    recompute: false
  });

  await activatePlanForUser({
    tenantId,
    userId: user.id,
    planSlug,
    actorLabel: user.name ?? user.email ?? "Customer",
    mockPaymentReference: `MOCK-MEMBER-${Date.now()}`
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect("/membership?membership=activated");
}

export async function requestMembershipCancellationAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const userMembershipId = text(formData, "userMembershipId");
  const customerNote = text(formData, "customerNote");

  const membership = await prisma.userMembership.findFirst({
    where: { id: userMembershipId, tenantId, userId: user.id },
    include: { plan: true }
  });

  if (!membership || getComputedMembershipStatus(membership) !== "ACTIVE") {
    throw new Error("Only an active membership can be submitted for cancellation.");
  }

  const existing = await prisma.membershipRequest.findFirst({
    where: {
      tenantId,
      userId: user.id,
      userMembershipId: membership.id,
      requestType: "cancellation",
      status: { in: ["submitted", "under_review"] }
    }
  });

  if (!existing) {
    await prisma.$transaction(async (tx) => {
      const request = await tx.membershipRequest.create({
        data: {
          tenantId,
          userId: user.id,
          userMembershipId: membership.id,
          currentPlanId: membership.planId,
          requestType: "cancellation",
          status: "submitted",
          customerNote: customerNote || "Customer requested membership cancellation."
        }
      });

      await tx.membershipStatusHistory.create({
        data: {
          tenantId,
          userMembershipId: membership.id,
          fromStatus: membership.status,
          toStatus: membership.status,
          note: "Cancellation request submitted for admin review.",
          actorLabel: user.name ?? user.email ?? "Customer"
        }
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          action: "membership_cancellation_requested",
          entity: "MembershipRequest",
          entityId: request.id,
          metadata: { userMembershipId: membership.id, planName: membership.plan.name }
        }
      });
    });
  }

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: "MEMBERSHIP_CANCELLATION_REQUESTED",
    entityType: "MEMBERSHIP_PLAN",
    entityId: membership.planId,
    metadata: { userMembershipId: membership.id, planName: membership.plan.name },
    recompute: false
  });

  revalidatePath("/membership");
  revalidatePath("/dashboard");
  revalidatePath("/admin/memberships");
  redirect("/membership?membership=cancellation-requested");
}

export async function requestMembershipDowngradeAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const requestedPlanSlug = text(formData, "requestedPlanSlug");
  const customerNote = text(formData, "customerNote");
  const [currentMembership, requestedPlan] = await Promise.all([
    prisma.userMembership.findFirst({
      where: { tenantId, userId: user.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
      include: { plan: true },
      orderBy: { expiresAt: "desc" }
    }),
    prisma.membershipPlan.findFirst({ where: { tenantId, slug: requestedPlanSlug, status: "ACTIVE" } })
  ]);

  if (!currentMembership || !requestedPlan) throw new Error("A current membership and requested plan are required.");

  await prisma.$transaction(async (tx) => {
    const request = await tx.membershipRequest.create({
      data: {
        tenantId,
        userId: user.id,
        userMembershipId: currentMembership.id,
        currentPlanId: currentMembership.planId,
        requestedPlanId: requestedPlan.id,
        requestType: Number(requestedPlan.price) < Number(currentMembership.plan.price) ? "downgrade" : "upgrade",
        status: "submitted",
        customerNote: customerNote || `Customer requested switch from ${currentMembership.plan.name} to ${requestedPlan.name}.`
      }
    });

    await tx.membershipStatusHistory.create({
      data: {
        tenantId,
        userMembershipId: currentMembership.id,
        fromStatus: currentMembership.status,
        toStatus: currentMembership.status,
        note: `Plan change request submitted: ${currentMembership.plan.name} to ${requestedPlan.name}.`,
        actorLabel: user.name ?? user.email ?? "Customer"
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: "membership_plan_change_requested",
        entity: "MembershipRequest",
        entityId: request.id,
        metadata: { currentPlan: currentMembership.plan.name, requestedPlan: requestedPlan.name }
      }
    });
  });

  revalidatePath("/membership");
  revalidatePath("/admin/memberships");
  redirect("/membership?membership=change-requested");
}

export async function processMembershipRequestAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const requestId = text(formData, "requestId");
  const action = text(formData, "action");
  const adminDecisionNote = text(formData, "adminDecisionNote");
  const redirectTo = text(formData, "redirectTo") || "/admin/memberships";
  const allowed = new Set(["under_review", "approved", "rejected", "closed"]);

  if (!requestId || !allowed.has(action)) throw new Error("Valid request action is required.");

  await prisma.$transaction(async (tx) => {
    const request = await tx.membershipRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { userMembership: { include: { plan: true } }, requestedPlan: true }
    });
    if (!request) throw new Error("Membership request was not found.");

    const now = new Date();
    const updated = await tx.membershipRequest.update({
      where: { id: request.id },
      data: {
        status: action,
        adminDecisionNote: adminDecisionNote || request.adminDecisionNote,
        reviewedById: ["approved", "rejected", "closed"].includes(action) ? admin.id : request.reviewedById,
        reviewedAt: ["approved", "rejected", "closed"].includes(action) ? now : request.reviewedAt,
        closedAt: ["approved", "rejected", "closed"].includes(action) ? now : request.closedAt
      }
    });

    if (action === "approved" && request.requestType === "cancellation" && request.userMembership) {
      await tx.userMembership.update({
        where: { id: request.userMembership.id },
        data: { status: "CANCELLED", expiresAt: now }
      });
      await tx.membershipStatusHistory.create({
        data: {
          tenantId,
          userMembershipId: request.userMembership.id,
          fromStatus: request.userMembership.status,
          toStatus: "CANCELLED",
          note: adminDecisionNote || "Cancellation request approved by admin.",
          actorLabel: admin.name ?? admin.email ?? "Admin"
        }
      });
    } else if (request.userMembership) {
      await tx.membershipStatusHistory.create({
        data: {
          tenantId,
          userMembershipId: request.userMembership.id,
          fromStatus: request.userMembership.status,
          toStatus: request.userMembership.status,
          note: `${request.requestType} request marked ${action}. ${adminDecisionNote || ""}`.trim(),
          actorLabel: admin.name ?? admin.email ?? "Admin"
        }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: `membership_request_${action}`,
        entity: "MembershipRequest",
        entityId: updated.id,
        metadata: {
          requestType: request.requestType,
          previousStatus: request.status,
          newStatus: action,
          userMembershipId: request.userMembershipId,
          adminDecisionNote: adminDecisionNote || null
        }
      }
    });
  });

  revalidatePath("/admin/memberships");
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

export async function updateMembershipPlanAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const planId = text(formData, "planId");
  const name = text(formData, "name");
  const description = text(formData, "description");
  const price = Number(text(formData, "price"));
  const durationDays = Number.parseInt(text(formData, "durationDays"), 10);
  const status = text(formData, "status");
  const featured = formData.get("featured") === "on";
  const sortOrder = optionalInt(formData, "sortOrder") ?? 0;
  const renewalAllowed = formData.get("renewalAllowed") === "on";
  const upgradeAllowed = formData.get("upgradeAllowed") === "on";
  const cancellationRequestAllowed = formData.get("cancellationRequestAllowed") === "on";
  const customerNote = nullableText(formData, "customerNote");
  const internalNote = nullableText(formData, "internalNote");

  if (!planId || !name || Number.isNaN(price) || Number.isNaN(durationDays) || !["ACTIVE", "INACTIVE"].includes(status)) {
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
        status: status as "ACTIVE" | "INACTIVE",
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
            status: current.status,
            featured: current.featured,
            sortOrder: current.sortOrder,
            renewalAllowed: current.renewalAllowed,
            upgradeAllowed: current.upgradeAllowed,
            cancellationRequestAllowed: current.cancellationRequestAllowed
          },
          after: { name, description, price, durationDays, status, featured, sortOrder, renewalAllowed, upgradeAllowed, cancellationRequestAllowed }
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
