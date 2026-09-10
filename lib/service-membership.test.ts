import { describe, expect, it } from "vitest";
import { Prisma, type MembershipBenefit, type MembershipBenefitTarget } from "@prisma/client";
import { calculateServiceBenefitSaving, selectServiceQuote } from "@/lib/service-membership";

function benefit(overrides: Partial<MembershipBenefit> & Pick<MembershipBenefit, "id" | "type" | "method" | "scope">) {
  return {
    active: true,
    validFrom: null,
    validUntil: null,
    valueDecimal: null,
    maxDiscountAmount: null,
    sortOrder: 0,
    targets: [],
    ...overrides
  } as MembershipBenefit & { targets: MembershipBenefitTarget[] };
}

describe("service and Asthi membership pricing", () => {
  it("makes a complimentary Puja unit free while preserving excluded charges", () => {
    const freePuja = benefit({ id: "free-puja", type: "FREE_USAGE", method: "CLAIM", scope: "PUJA" });
    const quote = selectServiceQuote({ scope: "SERVICE_BOOKING", eligibleAmount: 1200, excludedAmount: 250, context: { serviceId: "puja-1" }, benefits: [freePuja], claimBenefitId: freePuja.id });
    expect(quote).toMatchObject({ listAmount: 1450, savingAmount: 1200, payableAmount: 250, excludedAmount: 250, claimRequired: true });
  });

  it("applies an Asthi package percentage only to the package price", () => {
    const discount = benefit({ id: "asthi-10", type: "DISCOUNT_PERCENT", method: "AUTOMATIC", scope: "ASTHI", valueDecimal: new Prisma.Decimal(10) });
    const quote = selectServiceQuote({ scope: "ASTHI", eligibleAmount: 5000, excludedAmount: 900, context: { asthiPackageId: "package-1" }, benefits: [discount] });
    expect(quote).toMatchObject({ listAmount: 5900, savingAmount: 500, payableAmount: 5400, excludedAmount: 900 });
  });

  it("supports a fixed complimentary credit toward an upgraded service", () => {
    expect(calculateServiceBenefitSaving({ type: "FREE_USAGE", valueDecimal: new Prisma.Decimal(750), maxDiscountAmount: null }, 1200)).toBe(750);
  });
});
