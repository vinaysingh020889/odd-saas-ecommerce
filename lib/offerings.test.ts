import { describe, expect, it } from "vitest";
import { assertOfferingTransition, offeringDueState, selectOfferingBenefit } from "@/lib/offerings";

const benefit = (overrides: Record<string, unknown> = {}) => ({
  id: "b1", tenantId: "t1", planId: "p1", type: "ACCESS", scope: "OFFERINGS", title: "Offering access", description: null,
  active: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date(), method: "AUTOMATIC", effectUnit: "ACCESS",
  valueDecimal: null, maxDiscountAmount: null, complimentaryQuantity: null, usageLimit: null, usagePeriod: null,
  validFrom: null, validUntil: null, stackWithCoupons: false, stackWithAutomaticDiscounts: false, stackWithWallet: true,
  residualChargePolicy: "STANDARD", fulfilmentInstructions: null, targets: [], ...overrides
}) as never;

describe("Offerings to Blessings hardening", () => {
  it("enforces the operational state machine", () => {
    expect(() => assertOfferingTransition("SUBMITTED", "ACCEPTED")).not.toThrow();
    expect(() => assertOfferingTransition("SUBMITTED", "CLOSED")).toThrow();
  });
  it("classifies processing and reward obligations", () => {
    const now = new Date("2026-09-10T12:00:00Z");
    expect(offeringDueState({ status: "PROCESSING", processingDueAt: new Date("2026-09-10T11:00:00Z") }, now)).toBe("OVERDUE");
    expect(offeringDueState({ status: "REWARD_SELECTION", rewardSelectionDueAt: new Date("2026-09-11T10:00:00Z") }, now)).toBe("DUE_SOON");
    expect(offeringDueState({ status: "CLOSED", processingDueAt: new Date("2026-09-01") }, now)).toBe("ON_TRACK");
  });
  it("selects semantic scoped benefits without checking plan names", () => {
    expect(selectOfferingBenefit([benefit()], { type: "ACCESS", entityType: "OFFERINGS_ACCESS" })?.benefit.id).toBe("b1");
    expect(selectOfferingBenefit([benefit({ scope: "SHOP" })], { type: "ACCESS", entityType: "OFFERINGS_ACCESS" })).toBeNull();
  });
  it("uses entity targets to separate pickup from reward shipping", () => {
    const pickup = benefit({ type: "SHIPPING_BENEFIT", valueDecimal: 100, targets: [{ id: "x", benefitId: "b1", tenantId: "t1", targetType: "ENTITY", targetId: "OFFERINGS_PICKUP", targetLabel: null, metadataJson: null, createdAt: new Date() }] });
    expect(selectOfferingBenefit([pickup], { type: "SHIPPING_BENEFIT", amount: 80, entityType: "OFFERINGS_PICKUP" })?.saving).toBe(80);
    expect(selectOfferingBenefit([pickup], { type: "SHIPPING_BENEFIT", amount: 80, entityType: "OFFERINGS_REWARD_SHIPPING" })).toBeNull();
  });
});
