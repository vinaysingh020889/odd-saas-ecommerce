import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  request: vi.fn(), findAttempt: vi.fn(), transaction: vi.fn(), project: vi.fn(), reserve: vi.fn(), sell: vi.fn(), activate: vi.fn(), asthi: vi.fn(),
  walletConfirm: vi.fn(), walletPending: vi.fn(), lock: vi.fn(), findOrder: vi.fn(), event: vi.fn(), eventUpdate: vi.fn(), orderUpdate: vi.fn(), attemptUpdate: vi.fn(), activity: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: { paymentAttempt: { findUnique: mocks.findAttempt }, $transaction: mocks.transaction } }));
vi.mock("@/lib/razorpay", async (original) => ({ ...await original<typeof import("./razorpay")>(), razorpayRequest: mocks.request }));
vi.mock("@/lib/customer-account", () => ({ projectCommerceOrder: mocks.project }));
vi.mock("@/lib/mock-payment-provider", () => ({ ensureOrderInventoryReserved: mocks.reserve, sellActiveReservations: mocks.sell, activateMemberships: mocks.activate, updateAsthiApplicationPayment: mocks.asthi }));
vi.mock("@/lib/checkout-maturity", () => ({ invoiceNumberForOrder: () => "INV-test" }));
vi.mock("@/lib/wallet", () => ({ confirmWalletDebitForOrder: mocks.walletConfirm, createPendingCashbackForOrder: mocks.walletPending }));
import { confirmRazorpayPayment } from "./razorpay-payments";

const order = { id: "local-order", userId: "owner", tenantId: "tenant", status: "payment_pending", paymentStatus: "pending", orderNumber: "ODD-test" };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.request.mockResolvedValue({ id: "pay_test", order_id: "order_test", amount: 10000, currency: "INR", status: "captured", captured: true });
  mocks.findAttempt.mockResolvedValue({ id: "attempt", orderId: order.id, userId: "owner", subjectType: "ORDER", subjectId: order.id, tenantId: "tenant", providerOrderId: "order_test", amount: 100, status: "pending", currency: "INR", order });
  mocks.findOrder.mockResolvedValue(order); mocks.event.mockResolvedValue({ id: "event", processedAt: null }); mocks.sell.mockResolvedValue(1);
  mocks.transaction.mockImplementation(async (fn) => fn({ $queryRaw: mocks.lock, order: { findUniqueOrThrow: mocks.findOrder, update: mocks.orderUpdate },
    paymentEvent: { upsert: mocks.event, update: mocks.eventUpdate }, paymentAttempt: { update: mocks.attemptUpdate }, orderActivity: { create: mocks.activity } }));
});
describe("Razorpay capture processing", () => {
  it("rejects another customer's payment without changing records", async () => {
    await expect(confirmRazorpayPayment("pay_test", "order_test", "other-user")).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("rejects mismatched captured amounts before transaction", async () => {
    mocks.request.mockResolvedValue({ id: "pay_test", order_id: "order_test", amount: 1, currency: "INR", status: "captured", captured: true });
    await expect(confirmRazorpayPayment("pay_test", "order_test", "owner")).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("confirms once and records inventory and provider payment", async () => {
    await expect(confirmRazorpayPayment("pay_test", "order_test", "owner")).resolves.toBe(order.id);
    expect(mocks.lock).toHaveBeenCalled(); expect(mocks.sell).toHaveBeenCalledOnce();
    expect(mocks.attemptUpdate).toHaveBeenCalledWith({ where: { id: "attempt" }, data: { status: "succeeded", providerPaymentId: "pay_test" } });
    expect(mocks.eventUpdate).toHaveBeenCalledOnce();
  });
  it("does not repeat fulfilment for an already processed capture", async () => {
    mocks.event.mockResolvedValue({ id: "event", processedAt: new Date() });
    await confirmRazorpayPayment("pay_test", "order_test", "owner");
    expect(mocks.sell).not.toHaveBeenCalled(); expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });
  it("does not overwrite a cancelled order on a late capture", async () => {
    mocks.findOrder.mockResolvedValue({ ...order, status: "cancelled" });
    await expect(confirmRazorpayPayment("pay_test", "order_test", "owner")).rejects.toThrow(/reconciliation/);
    expect(mocks.sell).not.toHaveBeenCalled();
  });
});
