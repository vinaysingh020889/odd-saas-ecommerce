import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PHASE1_CUSTOMER_PRIMARY_NAV } from "./phase1-uat";
import { getAsthiApplicationHandoff, isPhase1PublicHandoffHref, normalizePublicHttpUrl } from "./public-handoffs";

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8");
}

describe("Gate 5 public discovery and handoffs", () => {
  it("accepts only credential-free public HTTP(S) external URLs", () => {
    expect(normalizePublicHttpUrl("https://docs.google.com/forms/d/e/synthetic/viewform")).toBe("https://docs.google.com/forms/d/e/synthetic/viewform");
    expect(normalizePublicHttpUrl("javascript:alert(1)")).toBeNull();
    expect(normalizePublicHttpUrl("https://user:secret@example.com/form")).toBeNull();
    expect(normalizePublicHttpUrl("/asthi/apply")).toBeNull();
  });

  it("requires explicit client configuration for the Phase-1 Asthi application handoff", () => {
    expect(getAsthiApplicationHandoff({ phase1UatMode: true })).toBeNull();
    expect(getAsthiApplicationHandoff({ phase1UatMode: true, asthiApplicationUrl: "https://example.invalid/form" })).toBe("https://example.invalid/form");
    expect(getAsthiApplicationHandoff({ phase1UatMode: false })).toBe("/asthi/apply");
  });

  it("recognizes only locked public handoff families", () => {
    expect(isPhase1PublicHandoffHref("/shop?sort=rating")).toBe(true);
    expect(isPhase1PublicHandoffHref("/festivals/synthetic#products")).toBe(true);
    expect(isPhase1PublicHandoffHref("/kundli/apply")).toBe(true);
    expect(isPhase1PublicHandoffHref("/services")).toBe(false);
    expect(isPhase1PublicHandoffHref("/wallet")).toBe(false);
  });

  it("publishes all four Phase-1 public entry points", () => {
    expect(PHASE1_CUSTOMER_PRIMARY_NAV.map((item) => item.href)).toEqual([
      "/shop",
      "/membership",
      "/kundli",
      "/services/asthi-visarjan"
    ]);
  });

  it("limits the storefront and festival pages to the locked discovery surface", () => {
    const shop = source("../app/(public)/shop/page.tsx");
    const festival = source("../app/(public)/festivals/[slug]/page.tsx");
    expect(shop).toContain("productIds: runtimeConfig.phase1UatMode ? festivalProductIds : undefined");
    expect(shop).toContain("!runtimeConfig.phase1UatMode ? <StorefrontSection");
    expect(shop).toContain("!runtimeConfig.phase1UatMode ? <section");
    expect(festival).toContain('runtimeConfig.phase1UatMode ? "#festival-products"');
    expect(festival).toContain("!runtimeConfig.phase1UatMode && festivalRecommendations.services.length");
  });

  it("shows a non-broken pending state when the client Asthi URL is absent", () => {
    const asthi = source("../app/(public)/services/asthi-visarjan/page.tsx");
    expect(asthi).toContain("getAsthiApplicationHandoff()");
    expect(asthi).toContain("Application form URL pending client confirmation");
    expect(asthi).toContain("Open Official Application Form");
  });

  it("exposes the admin handoff for every recognized admin role", () => {
    expect(source("../components/customer-header.tsx")).toContain("user?.roles.some(isAdminRole)");
  });
});
