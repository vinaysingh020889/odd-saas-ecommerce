import type { MembershipRequest, Prisma, UserMembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getComputedMembershipStatus } from "@/lib/membership";

const openRequestStatuses = ["submitted", "under_review"];
const terminalRequestStatuses = new Set(["approved", "rejected", "closed"]);
export const membershipRequestActions = ["under_review", "approved", "rejected", "closed"] as const;
export type MembershipRequestAction = (typeof membershipRequestActions)[number];

type Actor = {
  id: string;
  label: string;
};

function expiryFrom(base: Date, durationDays: number) {
  const expiresAt = new Date(base);
  expiresAt.setDate(expiresAt.getDate() + durationDays);
  return expiresAt;
}

export function membershipRequestTransition(request: Pick<MembershipRequest, "status">, action: MembershipRequestAction) {
  if (request.status === action) return "NOOP" as const;
  if (terminalRequestStatuses.has(request.status)) {
    throw new Error(`Membership request is already ${request.status} and cannot be changed.`);
  }
  if (!openRequestStatuses.includes(request.status)) {
    throw new Error(`Membership request status ${request.status} is not supported.`);
  }
  return "APPLY" as const;
}

export async function activateMembershipPlanForUser(input: {
  tenantId: string;
  userId: string;
  planSlug: string;
  actorLabel: string;
  mockPaymentReference?: string | null;
  idempotentWhenActive?: boolean;
  db?: Prisma.TransactionClient;
}) {
  const run = async (tx: Prisma.TransactionClient) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:${input.userId}:membership-activation`}))`;
    const plan = await tx.membershipPlan.findFirst({
      where: { tenantId: input.tenantId, slug: input.planSlug, status: "ACTIVE" },
      select: { id: true, name: true, slug: true, price: true, durationDays: true, renewalAllowed: true }
    });
    if (!plan) throw new Error("This membership plan is not available.");

    const now = new Date();
    const activeMemberships = await tx.userMembership.findMany({
      where: { tenantId: input.tenantId, userId: input.userId, status: "ACTIVE" },
      include: { plan: { select: { id: true, name: true, price: true, upgradeAllowed: true } } },
      orderBy: { createdAt: "desc" }
    });
    const currentActiveMemberships = activeMemberships.filter((membership) => getComputedMembershipStatus(membership) === "ACTIVE");
    const expiredActiveMemberships = activeMemberships.filter((membership) => getComputedMembershipStatus(membership) === "EXPIRED");
    const currentMembership = currentActiveMemberships[0] ?? null;

    for (const membership of expiredActiveMemberships) {
      await tx.userMembership.update({ where: { id: membership.id }, data: { status: "EXPIRED" } });
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

    const duplicatePaymentMembership = input.mockPaymentReference
      ? currentActiveMemberships.find((membership) => membership.mockPaymentReference === input.mockPaymentReference)
      : null;
    if (duplicatePaymentMembership) return duplicatePaymentMembership;
    if (input.idempotentWhenActive && currentMembership) return currentMembership;

    const existingSamePlan = currentActiveMemberships.find((membership) => membership.planId === plan.id);
    if (existingSamePlan) {
      if (!plan.renewalAllowed) throw new Error("Renewal is disabled for this membership plan.");
      const renewed = await tx.userMembership.update({
        where: { id: existingSamePlan.id },
        data: {
          expiresAt: expiryFrom(existingSamePlan.expiresAt > now ? existingSamePlan.expiresAt : now, plan.durationDays),
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
          metadata: { planSlug: plan.slug, planName: plan.name, previousExpiresAt: existingSamePlan.expiresAt, newExpiresAt: renewed.expiresAt, mockPaymentReference: input.mockPaymentReference ?? null }
        }
      });
      for (const membership of currentActiveMemberships.filter((item) => item.id !== existingSamePlan.id)) {
        await cancelMembership(tx, membership, now, input.actorLabel, "Cancelled duplicate active membership during renewal.");
      }
      return renewed;
    }

    const expiredSamePlan = expiredActiveMemberships.find((membership) => membership.planId === plan.id);
    if (expiredSamePlan) {
      if (!plan.renewalAllowed) throw new Error("Renewal is disabled for this membership plan.");
      const renewed = await tx.userMembership.update({
        where: { id: expiredSamePlan.id },
        data: {
          status: "ACTIVE",
          startsAt: now,
          expiresAt: expiryFrom(now, plan.durationDays),
          mockPaymentReference: input.mockPaymentReference ?? expiredSamePlan.mockPaymentReference,
          activatedByOrderRef: input.mockPaymentReference ? "membership_mock_renewal" : "free_membership_renewal"
        },
        include: { plan: true }
      });
      await tx.membershipStatusHistory.create({
        data: { tenantId: input.tenantId, userMembershipId: renewed.id, fromStatus: "EXPIRED", toStatus: "ACTIVE", note: "Expired membership renewed and restarted from today.", actorLabel: input.actorLabel }
      });
      await tx.auditLog.create({
        data: { tenantId: input.tenantId, actorId: input.userId, action: "membership_renewed", entity: "UserMembership", entityId: renewed.id, metadata: { planSlug: plan.slug, planName: plan.name, mockPaymentReference: input.mockPaymentReference ?? null } }
      });
      return renewed;
    }

    if (Number(plan.price) === 0 && currentActiveMemberships.some((membership) => Number(membership.plan.price) > 0)) {
      throw new Error("A paid membership is already active. Free membership cannot downgrade an active paid plan.");
    }
    if (currentMembership && Number(plan.price) < Number(currentMembership.plan.price)) {
      throw new Error("Active paid membership downgrades must be requested for admin review.");
    }
    if (currentMembership && !currentMembership.plan.upgradeAllowed) {
      throw new Error("Plan changes are disabled for the current membership.");
    }

    for (const membership of currentActiveMemberships) {
      await cancelMembership(
        tx,
        membership,
        now,
        input.actorLabel,
        Number(plan.price) > Number(membership.plan.price)
          ? "Cancelled automatically because a higher membership plan was activated."
          : "Cancelled automatically because a new membership plan was activated."
      );
    }

    const created = await tx.userMembership.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        planId: plan.id,
        status: "ACTIVE",
        startsAt: now,
        expiresAt: expiryFrom(now, plan.durationDays),
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
        note: currentMembership ? `Membership upgraded from ${currentMembership.plan.name} to ${plan.name}.` : input.mockPaymentReference ? "Membership activated after mock confirmation." : "Free membership activated.",
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
        metadata: { planSlug: input.planSlug, planName: plan.name, previousMembershipId: currentMembership?.id ?? null, previousPlanName: currentMembership?.plan.name ?? null, mockPaymentReference: input.mockPaymentReference ?? null }
      }
    });
    return created;
  };
  return input.db ? run(input.db) : prisma.$transaction(run);
}

async function cancelMembership(
  tx: Prisma.TransactionClient,
  membership: { id: string; tenantId: string; status: UserMembershipStatus },
  now: Date,
  actorLabel: string,
  note: string
) {
  await tx.userMembership.update({ where: { id: membership.id }, data: { status: "CANCELLED", expiresAt: now } });
  await tx.membershipStatusHistory.create({
    data: { tenantId: membership.tenantId, userMembershipId: membership.id, fromStatus: membership.status, toStatus: "CANCELLED", note, actorLabel }
  });
}

export async function submitMembershipCancellationRequest(input: {
  tenantId: string;
  userId: string;
  userMembershipId: string;
  customerNote?: string | null;
  actorLabel: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:${input.userId}:membership-request`}))`;
    const membership = await tx.userMembership.findFirst({
      where: { id: input.userMembershipId, tenantId: input.tenantId, userId: input.userId },
      include: { plan: true }
    });
    if (!membership || getComputedMembershipStatus(membership) !== "ACTIVE") throw new Error("Only an active membership can be submitted for cancellation.");
    if (!membership.plan.cancellationRequestAllowed) throw new Error("Cancellation requests are disabled for this membership plan.");

    const existing = await tx.membershipRequest.findFirst({
      where: { tenantId: input.tenantId, userId: input.userId, userMembershipId: membership.id, requestType: "cancellation", status: { in: openRequestStatuses } },
      orderBy: { createdAt: "desc" }
    });
    if (existing) return existing;

    const request = await tx.membershipRequest.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        userMembershipId: membership.id,
        currentPlanId: membership.planId,
        requestType: "cancellation",
        status: "submitted",
        customerNote: input.customerNote || "Customer requested membership cancellation."
      }
    });
    await tx.membershipStatusHistory.create({
      data: { tenantId: input.tenantId, userMembershipId: membership.id, fromStatus: membership.status, toStatus: membership.status, note: "Cancellation request submitted for admin review.", actorLabel: input.actorLabel }
    });
    await tx.auditLog.create({
      data: { tenantId: input.tenantId, actorId: input.userId, action: "membership_cancellation_requested", entity: "MembershipRequest", entityId: request.id, metadata: { userMembershipId: membership.id, planName: membership.plan.name } }
    });
    return request;
  });
}

export async function submitMembershipPlanChangeRequest(input: {
  tenantId: string;
  userId: string;
  requestedPlanSlug: string;
  customerNote?: string | null;
  actorLabel: string;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:${input.userId}:membership-request`}))`;
    const [currentMembership, requestedPlan] = await Promise.all([
      tx.userMembership.findFirst({
        where: { tenantId: input.tenantId, userId: input.userId, status: "ACTIVE", startsAt: { lte: new Date() }, expiresAt: { gt: new Date() } },
        include: { plan: true },
        orderBy: { expiresAt: "desc" }
      }),
      tx.membershipPlan.findFirst({ where: { tenantId: input.tenantId, slug: input.requestedPlanSlug, status: "ACTIVE" } })
    ]);
    if (!currentMembership || !requestedPlan) throw new Error("A current membership and requested plan are required.");
    if (currentMembership.planId === requestedPlan.id) throw new Error("The requested plan is already active.");
    const requestType = Number(requestedPlan.price) < Number(currentMembership.plan.price) ? "downgrade" : "upgrade";
    if (requestType === "upgrade" && !currentMembership.plan.upgradeAllowed) throw new Error("Plan changes are disabled for the current membership.");
    if (requestType === "downgrade" && !currentMembership.plan.cancellationRequestAllowed) throw new Error("Downgrade requests are disabled for the current membership.");

    const existing = await tx.membershipRequest.findFirst({
      where: { tenantId: input.tenantId, userId: input.userId, userMembershipId: currentMembership.id, requestedPlanId: requestedPlan.id, requestType, status: { in: openRequestStatuses } },
      orderBy: { createdAt: "desc" }
    });
    if (existing) return existing;

    const request = await tx.membershipRequest.create({
      data: {
        tenantId: input.tenantId,
        userId: input.userId,
        userMembershipId: currentMembership.id,
        currentPlanId: currentMembership.planId,
        requestedPlanId: requestedPlan.id,
        requestType,
        status: "submitted",
        customerNote: input.customerNote || `Customer requested switch from ${currentMembership.plan.name} to ${requestedPlan.name}.`
      }
    });
    await tx.membershipStatusHistory.create({
      data: { tenantId: input.tenantId, userMembershipId: currentMembership.id, fromStatus: currentMembership.status, toStatus: currentMembership.status, note: `Plan change request submitted: ${currentMembership.plan.name} to ${requestedPlan.name}.`, actorLabel: input.actorLabel }
    });
    await tx.auditLog.create({
      data: { tenantId: input.tenantId, actorId: input.userId, action: "membership_plan_change_requested", entity: "MembershipRequest", entityId: request.id, metadata: { currentPlan: currentMembership.plan.name, requestedPlan: requestedPlan.name } }
    });
    return request;
  });
}

export async function processMembershipRequest(input: {
  tenantId: string;
  requestId: string;
  action: MembershipRequestAction;
  adminDecisionNote?: string | null;
  actor: Actor;
}) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:${input.requestId}:membership-decision`}))`;
    const requestOwner = await tx.membershipRequest.findFirst({
      where: { id: input.requestId, tenantId: input.tenantId },
      select: { userId: true }
    });
    if (!requestOwner) throw new Error("Membership request was not found.");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${input.tenantId}:${requestOwner.userId}:membership-activation`}))`;
    const request = await tx.membershipRequest.findFirst({
      where: { id: input.requestId, tenantId: input.tenantId },
      include: { userMembership: { include: { plan: true } }, requestedPlan: true }
    });
    if (!request) throw new Error("Membership request was not found.");
    if (membershipRequestTransition(request, input.action) === "NOOP") {
      return { request, affectedMembershipIds: request.userMembershipId ? [request.userMembershipId] : [] };
    }

    const now = new Date();
    const affectedMembershipIds = new Set<string>();
    if (input.action === "approved" && request.requestType === "cancellation") {
      if (!request.userMembership || getComputedMembershipStatus(request.userMembership) !== "ACTIVE") throw new Error("The membership is no longer active; this cancellation request is stale.");
      await cancelMembership(tx, request.userMembership, now, input.actor.label, input.adminDecisionNote || "Cancellation request approved by admin.");
      affectedMembershipIds.add(request.userMembership.id);
    } else if (input.action === "approved" && ["downgrade", "upgrade"].includes(request.requestType)) {
      if (!request.userMembership || getComputedMembershipStatus(request.userMembership) !== "ACTIVE") throw new Error("The current membership is no longer active; this plan-change request is stale.");
      if (!request.requestedPlan || request.requestedPlan.status !== "ACTIVE") throw new Error("The requested membership plan is no longer available.");
      if (request.requestedPlan.id === request.userMembership.planId) throw new Error("The requested membership plan is already active.");

      const oldMembership = request.userMembership;
      await cancelMembership(tx, oldMembership, now, input.actor.label, `${request.requestType} request approved; replaced by ${request.requestedPlan.name}.`);
      affectedMembershipIds.add(oldMembership.id);
      const replacement = await tx.userMembership.create({
        data: {
          tenantId: input.tenantId,
          userId: request.userId,
          planId: request.requestedPlan.id,
          status: "ACTIVE",
          startsAt: now,
          expiresAt: oldMembership.expiresAt,
          activatedByOrderRef: "membership_admin_plan_change",
          mockPaymentReference: null
        }
      });
      await tx.membershipStatusHistory.create({
        data: { tenantId: input.tenantId, userMembershipId: replacement.id, fromStatus: null, toStatus: "ACTIVE", note: `${request.requestType} approved from ${oldMembership.plan.name} to ${request.requestedPlan.name}; original expiry retained.`, actorLabel: input.actor.label }
      });
      affectedMembershipIds.add(replacement.id);
    } else if (request.userMembership) {
      await tx.membershipStatusHistory.create({
        data: { tenantId: input.tenantId, userMembershipId: request.userMembership.id, fromStatus: request.userMembership.status, toStatus: request.userMembership.status, note: `${request.requestType} request marked ${input.action}. ${input.adminDecisionNote || ""}`.trim(), actorLabel: input.actor.label }
      });
      affectedMembershipIds.add(request.userMembership.id);
    }

    const updated = await tx.membershipRequest.update({
      where: { id: request.id },
      data: {
        status: input.action,
        adminDecisionNote: input.adminDecisionNote || request.adminDecisionNote,
        reviewedById: terminalRequestStatuses.has(input.action) ? input.actor.id : request.reviewedById,
        reviewedAt: terminalRequestStatuses.has(input.action) ? now : request.reviewedAt,
        closedAt: terminalRequestStatuses.has(input.action) ? now : request.closedAt
      }
    });
    await tx.auditLog.create({
      data: {
        tenantId: input.tenantId,
        actorId: input.actor.id,
        action: `membership_request_${input.action}`,
        entity: "MembershipRequest",
        entityId: updated.id,
        metadata: { requestType: request.requestType, previousStatus: request.status, newStatus: input.action, userMembershipId: request.userMembershipId, affectedMembershipIds: [...affectedMembershipIds], adminDecisionNote: input.adminDecisionNote || null }
      }
    });
    return { request: updated, affectedMembershipIds: [...affectedMembershipIds] };
  });
}
