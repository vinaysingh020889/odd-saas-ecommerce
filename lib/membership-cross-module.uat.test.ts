import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { getOmdTenantId } from "./catalog";
import { commerceMembershipGateDestination } from "./commerce-membership-gate";
import {
  checkMembershipBenefitEligibility,
  evaluateMembershipRulesForScope,
  getActiveMembershipForUser,
  recordMembershipBenefitUsage
} from "./membership";
import {
  activateMembershipPlanForUser,
  processMembershipRequest,
  submitMembershipCancellationRequest,
  submitMembershipPlanChangeRequest
} from "./membership-lifecycle";
import { projectMembershipRequest, projectUserMembership } from "./customer-account";

const describeUat = process.env.RUN_MEMBERSHIP_UAT === "true" ? describe : describe.skip;

describeUat("Gate 2 membership cross-module persisted UAT", () => {
  const runId = randomUUID().slice(0, 12);
  const emailPrefix = `membership-uat-${runId}`;
  const planPrefix = `membership-uat-${runId}`;
  let tenantId = "";
  let customerId = "";
  let otherCustomerId = "";
  let adminId = "";
  const planIds: string[] = [];

  beforeAll(async () => {
    tenantId = await getOmdTenantId();
    const [customer, otherCustomer, admin] = await Promise.all([
      prisma.user.create({ data: { tenantId, email: `${emailPrefix}-customer@example.invalid`, name: "Synthetic Membership UAT Customer", status: "ACTIVE", verifiedEmail: true } }),
      prisma.user.create({ data: { tenantId, email: `${emailPrefix}-other@example.invalid`, name: "Synthetic Membership UAT Other Customer", status: "ACTIVE", verifiedEmail: true } }),
      prisma.user.create({ data: { tenantId, email: `${emailPrefix}-admin@example.invalid`, name: "Synthetic Membership UAT Admin", status: "ACTIVE", verifiedEmail: true } })
    ]);
    customerId = customer.id;
    otherCustomerId = otherCustomer.id;
    adminId = admin.id;

    const planSeeds = [
      { name: "UAT Free", slug: `${planPrefix}-free`, price: 0, durationDays: 30, sortOrder: 910 },
      { name: "UAT Premium", slug: `${planPrefix}-premium`, price: 100, durationDays: 90, sortOrder: 920 },
      { name: "UAT Divya", slug: `${planPrefix}-divya`, price: 200, durationDays: 120, sortOrder: 930 },
      { name: "UAT Locked", slug: `${planPrefix}-locked`, price: 50, durationDays: 30, sortOrder: 940, renewalAllowed: false, upgradeAllowed: false, cancellationRequestAllowed: false }
    ];
    for (const seed of planSeeds) {
      const plan = await prisma.membershipPlan.create({ data: { tenantId, currency: "INR", status: "ACTIVE", featured: false, ...seed } });
      planIds.push(plan.id);
    }
    await prisma.membershipBenefit.createMany({
      data: [
        { tenantId, planId: planIds[1], title: "UAT shop discount", type: "DISCOUNT_PERCENT", scope: "SHOP", valueDecimal: 5, active: true, customerVisible: true, sortOrder: 10 },
        { tenantId, planId: planIds[2], title: "UAT monthly Kundli", type: "FREE_USAGE", scope: "KUNDLI", valueText: "synthetic_kundli", usageLimit: 1, usagePeriod: "MONTHLY", active: true, customerVisible: true, sortOrder: 10 }
      ]
    });
  }, 30_000);

  afterAll(async () => {
    if (tenantId) {
      await prisma.auditLog.deleteMany({ where: { tenantId, actorId: { in: [customerId, otherCustomerId, adminId].filter(Boolean) } } });
      await prisma.user.deleteMany({ where: { id: { in: [customerId, otherCustomerId, adminId].filter(Boolean) } } });
      await prisma.membershipPlan.deleteMany({ where: { id: { in: planIds } } });
    }
  }, 30_000);

  it("validates activation, gating, benefits, requests, projections, expiry, authorization, flags, and idempotency", async () => {
    expect(await getActiveMembershipForUser(customerId)).toBeNull();
    expect(commerceMembershipGateDestination({ id: customerId }, false, "/checkout")).toContain("/membership?");

    const free = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-free`, actorLabel: "Synthetic Customer", idempotentWhenActive: true });
    await projectUserMembership(free.id);
    const freeExpiry = free.expiresAt.getTime();
    const repeatedFree = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-free`, actorLabel: "Synthetic Customer", idempotentWhenActive: true });
    expect(repeatedFree.id).toBe(free.id);
    expect(repeatedFree.expiresAt.getTime()).toBe(freeExpiry);
    expect(commerceMembershipGateDestination({ id: customerId }, true, "/checkout")).toBeNull();

    const premiumReference = `MOCK-MEMBER-${runId}-premium`;
    const premium = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-premium`, actorLabel: "Synthetic Customer", mockPaymentReference: premiumReference });
    await Promise.all([projectUserMembership(free.id), projectUserMembership(premium.id)]);
    const premiumHistoryBeforeRepeat = await prisma.membershipStatusHistory.count({ where: { userMembershipId: premium.id } });
    const repeatedPremium = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-premium`, actorLabel: "Synthetic Customer", mockPaymentReference: premiumReference });
    expect(repeatedPremium.id).toBe(premium.id);
    expect(repeatedPremium.expiresAt.getTime()).toBe(premium.expiresAt.getTime());
    expect(await prisma.membershipStatusHistory.count({ where: { userMembershipId: premium.id } })).toBe(premiumHistoryBeforeRepeat);

    const shopEvaluation = await evaluateMembershipRulesForScope(customerId, "SHOP", { amount: 1_000 });
    expect(shopEvaluation.hasActiveMembership).toBe(true);
    expect(shopEvaluation.discountPercent).toBe(5);

    const renewedPremium = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-premium`, actorLabel: "Synthetic Customer", mockPaymentReference: `MOCK-MEMBER-${runId}-renewal` });
    expect(renewedPremium.id).toBe(premium.id);
    expect(renewedPremium.expiresAt.getTime()).toBeGreaterThan(premium.expiresAt.getTime());
    await projectUserMembership(renewedPremium.id);

    const divya = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-divya`, actorLabel: "Synthetic Customer", mockPaymentReference: `MOCK-MEMBER-${runId}-divya` });
    await Promise.all([projectUserMembership(premium.id), projectUserMembership(divya.id)]);
    const kundliBenefit = await prisma.membershipBenefit.findFirstOrThrow({ where: { planId: planIds[2], scope: "KUNDLI" } });
    expect((await checkMembershipBenefitEligibility({ userId: customerId, scope: "KUNDLI", benefitId: kundliBenefit.id })).eligible).toBe(true);
    await recordMembershipBenefitUsage({ userMembershipId: divya.id, benefitId: kundliBenefit.id, userId: customerId, scope: "KUNDLI", relatedType: "KUNDLI", relatedId: `synthetic-${runId}` });
    expect((await checkMembershipBenefitEligibility({ userId: customerId, scope: "KUNDLI", benefitId: kundliBenefit.id })).reason).toBe("USAGE_LIMIT_REACHED");

    const downgrade = await submitMembershipPlanChangeRequest({ tenantId, userId: customerId, requestedPlanSlug: `${planPrefix}-premium`, customerNote: "Synthetic downgrade", actorLabel: "Synthetic Customer" });
    const repeatedDowngrade = await submitMembershipPlanChangeRequest({ tenantId, userId: customerId, requestedPlanSlug: `${planPrefix}-premium`, customerNote: "Duplicate synthetic downgrade", actorLabel: "Synthetic Customer" });
    expect(repeatedDowngrade.id).toBe(downgrade.id);
    await projectMembershipRequest(downgrade.id);
    await processMembershipRequest({ tenantId, requestId: downgrade.id, action: "under_review", actor: { id: adminId, label: "Synthetic Admin" } });
    const approvedDowngrade = await processMembershipRequest({ tenantId, requestId: downgrade.id, action: "approved", adminDecisionNote: "Synthetic approval", actor: { id: adminId, label: "Synthetic Admin" } });
    await Promise.all([projectMembershipRequest(downgrade.id), ...approvedDowngrade.affectedMembershipIds.map((membershipId) => projectUserMembership(membershipId))]);
    const activeAfterDowngrade = await getActiveMembershipForUser(customerId);
    expect(activeAfterDowngrade?.planId).toBe(planIds[1]);
    expect(activeAfterDowngrade?.expiresAt.getTime()).toBe(divya.expiresAt.getTime());
    expect(await prisma.userMembership.count({ where: { tenantId, userId: customerId, status: "ACTIVE", expiresAt: { gt: new Date() } } })).toBe(1);
    await processMembershipRequest({ tenantId, requestId: downgrade.id, action: "approved", actor: { id: adminId, label: "Synthetic Admin" } });
    await expect(processMembershipRequest({ tenantId, requestId: downgrade.id, action: "rejected", actor: { id: adminId, label: "Synthetic Admin" } })).rejects.toThrow(/already approved/);

    const otherMembership = await prisma.userMembership.create({ data: { tenantId, userId: otherCustomerId, planId: planIds[0], status: "ACTIVE", startsAt: new Date(), expiresAt: new Date(Date.now() + 86_400_000) } });
    await expect(submitMembershipCancellationRequest({ tenantId, userId: customerId, userMembershipId: otherMembership.id, actorLabel: "Synthetic Customer" })).rejects.toThrow(/active membership/);

    const cancellation = await submitMembershipCancellationRequest({ tenantId, userId: customerId, userMembershipId: activeAfterDowngrade!.id, customerNote: "Synthetic cancellation", actorLabel: "Synthetic Customer" });
    const repeatedCancellation = await submitMembershipCancellationRequest({ tenantId, userId: customerId, userMembershipId: activeAfterDowngrade!.id, actorLabel: "Synthetic Customer" });
    expect(repeatedCancellation.id).toBe(cancellation.id);
    await projectMembershipRequest(cancellation.id);
    const approvedCancellation = await processMembershipRequest({ tenantId, requestId: cancellation.id, action: "approved", actor: { id: adminId, label: "Synthetic Admin" } });
    await Promise.all([projectMembershipRequest(cancellation.id), ...approvedCancellation.affectedMembershipIds.map((membershipId) => projectUserMembership(membershipId))]);
    expect(await getActiveMembershipForUser(customerId)).toBeNull();

    const locked = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-locked`, actorLabel: "Synthetic Customer", mockPaymentReference: `MOCK-MEMBER-${runId}-locked` });
    await expect(activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-locked`, actorLabel: "Synthetic Customer", mockPaymentReference: `MOCK-MEMBER-${runId}-locked-renew` })).rejects.toThrow(/Renewal is disabled/);
    await expect(activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-divya`, actorLabel: "Synthetic Customer", mockPaymentReference: `MOCK-MEMBER-${runId}-locked-upgrade` })).rejects.toThrow(/Plan changes are disabled/);
    await expect(submitMembershipCancellationRequest({ tenantId, userId: customerId, userMembershipId: locked.id, actorLabel: "Synthetic Customer" })).rejects.toThrow(/Cancellation requests are disabled/);

    await prisma.userMembership.update({ where: { id: locked.id }, data: { status: "CANCELLED", expiresAt: new Date() } });
    const expiringFree = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-free`, actorLabel: "Synthetic Customer" });
    await prisma.userMembership.update({ where: { id: expiringFree.id }, data: { status: "ACTIVE", expiresAt: new Date(Date.now() - 60_000) } });
    expect(await getActiveMembershipForUser(customerId)).toBeNull();
    const restartedFree = await activateMembershipPlanForUser({ tenantId, userId: customerId, planSlug: `${planPrefix}-free`, actorLabel: "Synthetic Customer", idempotentWhenActive: true });
    expect(restartedFree.id).toBe(expiringFree.id);
    expect(restartedFree.expiresAt.getTime()).toBeGreaterThan(Date.now());

    await prisma.membershipPlan.update({ where: { id: planIds[2] }, data: { status: "INACTIVE" } });
    await expect(activateMembershipPlanForUser({ tenantId, userId: otherCustomerId, planSlug: `${planPrefix}-divya`, actorLabel: "Synthetic Other", mockPaymentReference: `MOCK-MEMBER-${runId}-inactive` })).rejects.toThrow(/not available/);

    const [accountEntries, visibleRequests, visibleMemberships] = await Promise.all([
      prisma.customerAccountEntry.findMany({ where: { tenantId, userId: customerId } }),
      prisma.membershipRequest.findMany({ where: { tenantId, userId: customerId } }),
      prisma.userMembership.findMany({ where: { tenantId, userId: customerId }, include: { plan: true } })
    ]);
    expect(accountEntries.some((entry) => entry.category === "MEMBERSHIP")).toBe(true);
    expect(accountEntries.some((entry) => entry.actionType === "MEMBERSHIP_DOWNGRADE_APPROVED")).toBe(true);
    expect(accountEntries.some((entry) => entry.actionType === "MEMBERSHIP_CANCELLATION_APPROVED")).toBe(true);
    expect(visibleRequests.map((request) => request.status)).toEqual(expect.arrayContaining(["approved"]));
    expect(visibleMemberships.some((membership) => membership.plan.slug === `${planPrefix}-premium`)).toBe(true);
  }, 60_000);
});
