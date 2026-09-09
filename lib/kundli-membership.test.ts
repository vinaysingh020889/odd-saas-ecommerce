import { describe, expect, it } from "vitest";
import { calculateKundliBenefitSaving, selectKundliQuote } from "./kundli-membership";

const benefit = (overrides: Record<string, unknown> = {}) => ({
  id: "benefit", tenantId: "tenant", planId: "plan", title: "Kundli benefit", description: null,
  type: "DISCOUNT_PERCENT", scope: "KUNDLI", method: "AUTOMATIC", valueDecimal: 10, maxDiscountAmount: null,
  valueText: null, usageLimit: null, usagePeriod: null, active: true, validFrom: null, validUntil: null,
  customerVisible: true, stackWithCoupon: false, stackWithAutomatic: false, stackWithWallet: true,
  residualChargePolicy: "CUSTOMER_PAYS", fulfilmentInstructions: null, internalNote: null, sortOrder: 0,
  createdAt: new Date(), updatedAt: new Date(), targets: [{ id: "target", tenantId: "tenant", benefitId: "benefit", targetType: "KUNDLI_PACKAGE", targetId: "basic", labelSnapshot: "Basic", createdAt: new Date() }], ...overrides
}) as never;

describe("Kundli membership pricing", () => {
  it("applies automatic percentage and fixed discounts only to the selected package", () => {
    expect(selectKundliQuote({ listAmount: 1000, packageId: "basic", benefits: [benefit()] }).payableAmount).toBe(900);
    expect(selectKundliQuote({ listAmount: 1000, packageId: "other", benefits: [benefit()] }).payableAmount).toBe(1000);
    expect(selectKundliQuote({ listAmount: 1000, packageId: "basic", benefits: [benefit({ type: "DISCOUNT_AMOUNT", valueDecimal: 250 })] }).payableAmount).toBe(750);
  });

  it("supports full complimentary claims and a payable upgrade difference", () => {
    const complimentary = benefit({ type: "FREE_USAGE", method: "CLAIM", valueDecimal: null });
    expect(calculateKundliBenefitSaving(complimentary, 799)).toBe(799);
    expect(selectKundliQuote({ listAmount: 1299, packageId: "basic", claimBenefitId: "benefit", benefits: [benefit({ type: "FREE_USAGE", method: "CLAIM", valueDecimal: 799 })] })).toMatchObject({ savingAmount: 799, payableAmount: 500, claimRequired: true });
  });
});
