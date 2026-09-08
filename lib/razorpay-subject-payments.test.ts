import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  request: vi.fn(), transaction: vi.fn(), lock: vi.fn(), plan: vi.fn(), user: vi.fn(), membership: vi.fn(), pending: vi.fn(), count: vi.fn(), create: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/razorpay", async (original) => ({ ...await original<typeof import("./razorpay")>(), razorpayConfig: () => ({ keyId: "rzp_test_public", keySecret: "secret" }), razorpayRequest: mocks.request }));
vi.mock("@/lib/membership-lifecycle", () => ({ activateMembershipPlanForUser: vi.fn() }));
vi.mock("@/lib/service-capacity", () => ({ confirmCapacity: vi.fn() }));
vi.mock("@/lib/checklists", () => ({ getOrCreateChecklistForOwner: vi.fn(), syncKundliChecklistFromAuthoritativeState: vi.fn() }));
vi.mock("@/lib/kundli-assignment-engine", () => ({ attemptKundliAssignment: vi.fn() }));
vi.mock("@/lib/customer-account", () => ({ projectAsthiApplication: vi.fn(), projectKundliOrder: vi.fn(), projectServiceBooking: vi.fn(), projectUserMembership: vi.fn() }));
vi.mock("@/lib/customer-events", () => ({ trackCustomerEvent: vi.fn() }));

import { startRazorpaySubjectPayment } from "./razorpay-subject-payments";

beforeEach(() => {
  vi.resetAllMocks();
  const tx = {
    $queryRawUnsafe: mocks.lock,
    membershipPlan: { findFirst: mocks.plan }, user: { findFirst: mocks.user }, userMembership: { findFirst: mocks.membership },
    paymentAttempt: { findFirst: mocks.pending, count: mocks.count, create: mocks.create }
  };
  mocks.transaction.mockImplementation(async (fn) => fn(tx));
  mocks.plan.mockResolvedValue({ id: "premium", tenantId: "tenant", status: "ACTIVE", name: "Premium", price: 5001, currency: "INR" });
  mocks.user.mockResolvedValue({ id: "owner", name: "Owner", email: "owner@example.com" });
  mocks.membership.mockResolvedValue(null);
  mocks.pending.mockResolvedValue(null); mocks.count.mockResolvedValue(0);
  mocks.request.mockResolvedValue({ id: "order_provider", amount: 500100, currency: "INR" });
  mocks.create.mockImplementation(async ({ data }) => ({ id: "attempt", ...data }));
});

describe("subject-aware Razorpay checkout", () => {
  it("binds a paid membership order to its owner and exact amount", async () => {
    await expect(startRazorpaySubjectPayment("MEMBERSHIP", "premium", "owner")).resolves.toMatchObject({ order_id: "order_provider", amount: 500100, currency: "INR" });
    expect(mocks.request).toHaveBeenCalledWith("orders", expect.objectContaining({ amount: 500100, notes: { subjectType: "MEMBERSHIP", subjectId: "premium", userId: "owner" } }));
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "owner", subjectType: "MEMBERSHIP", subjectId: "premium", status: "pending" }) });
  });

  it("rejects an ineligible renewal before creating a provider order", async () => {
    mocks.membership.mockResolvedValue({ status: "ACTIVE", startsAt: new Date(), expiresAt: new Date(Date.now() + 86400000), planId: "premium", plan: { price: 5001, upgradeAllowed: true } });
    mocks.plan.mockResolvedValue({ id: "premium", tenantId: "tenant", status: "ACTIVE", name: "Premium", price: 5001, currency: "INR", renewalAllowed: false });
    await expect(startRazorpaySubjectPayment("MEMBERSHIP", "premium", "owner")).rejects.toThrow(/Renewal is disabled/);
    expect(mocks.request).not.toHaveBeenCalled();
  });

  it("rejects a membership checkout when the authenticated owner cannot be resolved", async () => {
    mocks.user.mockResolvedValue(null);
    await expect(startRazorpaySubjectPayment("MEMBERSHIP", "premium", "other-user")).rejects.toThrow(/not available/);
    expect(mocks.request).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
