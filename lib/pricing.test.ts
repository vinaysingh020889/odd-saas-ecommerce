import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rules: vi.fn(), redemptions: vi.fn(), membership: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { offerRule: { findMany: mocks.rules }, offerRedemption: { findMany: mocks.redemptions } } }));
vi.mock("@/lib/membership", () => ({ getActiveMembershipForUser: mocks.membership }));
import { quoteCartPricing } from "./pricing";

const cart = { tenantId: "tenant", items: [{ productId: "product", variantId: "variant", quantity: 1, priceSnapshot: 899, product: { type: "PHYSICAL", categoryId: "category" } }] } as never;
function rule(overrides: Record<string, unknown> = {}) {
  return { id: "offer", title: "₹10 cashback", code: "SAVE10", ruleType: "COUPON", status: "ACTIVE", startDate: null, endDate: null,
    targetScope: "ALL", targets: [], minCartValue: 0, usageLimit: null, perUserLimit: null, stackWithAutomatic: false,
    discountKind: "PERCENT", discountValue: 0, maxDiscountAmount: null, cashbackKind: "FLAT", cashbackValue: 10,
    priority: 1, updatedAt: new Date(), _count: { redemptions: 0 }, ...overrides };
}
beforeEach(() => { vi.resetAllMocks(); mocks.redemptions.mockResolvedValue([]); mocks.membership.mockResolvedValue(null); });
describe("cart coupon pricing", () => {
  it("applies and labels the best active membership saving", async () => {
    mocks.rules.mockResolvedValue([]);
    mocks.membership.mockResolvedValue({
      plan: {
        name: "Premium Member",
        benefits: [
          { id: "shop-five", title: "5% shop saving", active: true, type: "DISCOUNT_PERCENT", scope: "SHOP", valueDecimal: 5, validFrom: null, validUntil: null }
        ]
      }
    });
    const quote = await quoteCartPricing(cart, null, { id: "user" });
    expect(quote.discountTotal).toBe(45);
    expect(quote.total).toBe(854);
    expect(quote.discountLines[0]).toMatchObject({
      offerRuleId: "membership:shop-five",
      title: "Premium Member savings: 5% shop saving",
      amount: 45
    });
  });

  it("does not grant coupon cashback until its code is applied", async () => {
    mocks.rules.mockResolvedValue([rule()]);
    const withoutCode = await quoteCartPricing(cart);
    expect(withoutCode.cashbackPromiseTotal).toBe(0);
    const withCode = await quoteCartPricing(cart, "save10", { id: "user" });
    expect(withCode.couponStatus).toBe("applied");
    expect(withCode.cashbackPromiseTotal).toBe(10);
    expect(withCode.couponMessage).toContain("payable amount is unchanged");
  });
  it("explains the exact minimum and shortfall", async () => {
    mocks.rules.mockResolvedValue([rule({ minCartValue: 999 })]);
    const quote = await quoteCartPricing(cart, "SAVE10", { id: "user" });
    expect(quote.couponStatus).toBe("ineligible");
    expect(quote.couponMessage).toContain("minimum cart subtotal of ₹999");
    expect(quote.couponMessage).toContain("Add ₹100 more");
  });
  it("counts only distinct paid orders toward redemption limits", async () => {
    mocks.rules.mockResolvedValue([rule({ perUserLimit: 1 })]);
    mocks.redemptions.mockResolvedValue([{ orderId: "paid-order" }]);
    const quote = await quoteCartPricing(cart, "SAVE10", { id: "user" });
    expect(quote.couponMessage).toContain("already used");
    expect(mocks.redemptions).toHaveBeenCalledWith(expect.objectContaining({ distinct: ["orderId"], where: expect.objectContaining({ order: { paymentStatus: "succeeded" } }) }));
  });
});
