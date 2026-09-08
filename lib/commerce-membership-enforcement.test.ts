import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(path, "utf8");
}

describe("membership-first commerce enforcement points", () => {
  it("keeps browsing and cart access public", () => {
    expect(source("app/(public)/shop/page.tsx")).not.toContain("requireCommerceMembership");
    expect(source("app/(public)/product/[slug]/page.tsx")).not.toContain("requireCommerceMembership");
    expect(source("app/(public)/cart/page.tsx")).not.toContain("requireCommerceMembership(");
  });

  it("guards checkout page and direct order draft creation server-side", () => {
    expect(source("app/(public)/checkout/page.tsx")).toContain('requireCommerceMembership("/checkout")');
    expect(source("lib/order-actions.ts")).toContain('requireCommerceMembership("/checkout")');
  });

  it("guards Razorpay checkout and disables legacy simulation actions", () => {
    const actions = source("lib/razorpay-actions.ts");
    expect(actions).toContain("requireCommerceMembership");
    expect(actions).toContain("verifyRazorpaySignature");
    expect(source("lib/payment-actions.ts")).not.toContain("@/lib/mock-payment-provider");
  });

  it("does not apply the commerce gate to Kundli or Asthi actions", () => {
    expect(source("lib/kundli-actions.ts")).not.toContain("requireCommerceMembership");
    expect(source("lib/asthi-actions.ts")).not.toContain("requireCommerceMembership");
  });

  it("preserves returnTo through Free activation", () => {
    const membershipActions = source("lib/membership-actions.ts");
    expect(membershipActions).toContain('text(formData, "returnTo")');
    expect(membershipActions).toContain("idempotentWhenActive: true");
    expect(source("app/(public)/membership/page.tsx")).toContain('name="returnTo"');
  });
});
