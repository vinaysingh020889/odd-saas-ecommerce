import { describe, expect, it } from "vitest";
import { calculateMembershipSaving, membershipBenefitMatchesTarget, membershipPeriodKey, selectBestMembershipBenefit } from "./membership-entitlements";

const benefit = (overrides: Record<string, unknown> = {}) => ({
  id: "benefit", tenantId: "tenant", planId: "plan", title: "Member saving", description: null,
  type: "DISCOUNT_PERCENT", scope: "SHOP", method: "AUTOMATIC", valueDecimal: 10, maxDiscountAmount: null,
  valueText: null, usageLimit: null, usagePeriod: null, active: true, validFrom: null, validUntil: null,
  customerVisible: true, stackWithCoupon: false, stackWithAutomatic: false, stackWithWallet: true,
  residualChargePolicy: "CUSTOMER_PAYS", fulfilmentInstructions: null, internalNote: null, sortOrder: 0,
  createdAt: new Date(), updatedAt: new Date(), targets: [], ...overrides
}) as never;

describe("membership entitlement engine", () => {
  it("treats no targets as the whole scope and enforces selected targets", () => {
    expect(membershipBenefitMatchesTarget(benefit(), { productId: "p1" })).toBe(true);
    expect(membershipBenefitMatchesTarget(benefit({ targets: [{ targetType: "PRODUCT", targetId: "p1" }] }), { productId: "p1" })).toBe(true);
    expect(membershipBenefitMatchesTarget(benefit({ targets: [{ targetType: "PRODUCT", targetId: "p2" }] }), { productId: "p1" })).toBe(false);
  });

  it("chooses the best eligible member price per line and respects caps", () => {
    const selected = selectBestMembershipBenefit([
      benefit({ id: "five", valueDecimal: 5 }),
      benefit({ id: "ten-capped", valueDecimal: 10, maxDiscountAmount: 60 })
    ], { scope: "SHOP", amount: 899, context: { productId: "p1" } });
    expect(selected).toMatchObject({ benefit: { id: "ten-capped" }, savingAmount: 60 });
    expect(calculateMembershipSaving(benefit({ type: "DISCOUNT_AMOUNT", valueDecimal: 120 }), 90)).toBe(90);
  });

  it("creates stable reset keys", () => {
    const now = new Date("2026-09-09T12:00:00.000Z");
    expect(membershipPeriodKey("DAILY", "membership", now)).toBe("day:2026-09-09");
    expect(membershipPeriodKey("MONTHLY", "membership", now)).toBe("month:2026-09");
    expect(membershipPeriodKey("LIFETIME", "membership", now)).toBe("membership:membership");
  });
});
