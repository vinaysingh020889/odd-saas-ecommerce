import { describe, expect, it } from "vitest";
import { commerceMembershipGateDestination, safeCommerceReturnPath } from "./commerce-membership-gate";
import { getComputedMembershipStatus, isMembershipActive } from "./membership";

describe("commerce membership checkout gate", () => {
  const user = { id: "customer-1" };

  it("redirects a guest checkout to login and preserves checkout", () => {
    expect(commerceMembershipGateDestination(null, false, "/checkout?coupon=OMD")).toBe(
      "/login?redirectTo=%2Fcheckout%3Fcoupon%3DOMD"
    );
  });

  it("redirects a logged-in non-member to Membership and preserves the return path", () => {
    expect(commerceMembershipGateDestination(user, false, "/cart")).toBe(
      "/membership?membershipRequired=1&returnTo=%2Fcart"
    );
  });

  it("allows Free, Premium, and Divya through the same active-membership rule", () => {
    for (const plan of ["Free", "Premium", "Divya"]) {
      expect(commerceMembershipGateDestination(user, true, "/checkout"), plan).toBeNull();
    }
  });

  it("blocks expired and cancelled memberships", () => {
    const activeDates = { startsAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 60_000) };
    expect(getComputedMembershipStatus({ status: "CANCELLED", ...activeDates })).toBe("CANCELLED");
    expect(isMembershipActive({ status: "CANCELLED", ...activeDates })).toBe(false);
    expect(isMembershipActive({ status: "EXPIRED", ...activeDates })).toBe(false);
    expect(isMembershipActive({ status: "ACTIVE", startsAt: activeDates.startsAt, expiresAt: new Date(Date.now() - 1) })).toBe(false);
  });

  it("rejects unsafe return URLs", () => {
    expect(safeCommerceReturnPath("//attacker.example", "/cart")).toBe("/cart");
    expect(safeCommerceReturnPath("https://attacker.example", "/checkout")).toBe("/checkout");
  });
});
