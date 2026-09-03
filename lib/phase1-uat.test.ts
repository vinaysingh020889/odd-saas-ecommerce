import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  isPhase1AdminNavigationHref,
  PHASE1_CUSTOMER_ACCOUNT_NAV,
  PHASE1_CUSTOMER_PRIMARY_NAV
} from "@/lib/phase1-uat";

describe("Phase-1 UAT surface policy", () => {
  it("keeps only the locked customer journeys in primary navigation", () => {
    expect(PHASE1_CUSTOMER_PRIMARY_NAV.map((item) => item.href)).toEqual(["/shop", "/membership", "/kundli"]);
    expect(PHASE1_CUSTOMER_ACCOUNT_NAV.map((item) => item.href)).toEqual(["/dashboard", "/orders", "/account/activity"]);
  });

  it("keeps the Phase-1 admin control surfaces", () => {
    expect(isPhase1AdminNavigationHref("/admin/kundli")).toBe(true);
    expect(isPhase1AdminNavigationHref("/admin/kundli/practitioners")).toBe(true);
    expect(isPhase1AdminNavigationHref("/admin/memberships")).toBe(true);
    expect(isPhase1AdminNavigationHref("/admin/festivals")).toBe(true);
    expect(isPhase1AdminNavigationHref("/admin/products")).toBe(true);
    expect(isPhase1AdminNavigationHref("/admin/orders")).toBe(true);
    expect(isPhase1AdminNavigationHref("/admin/audit-logs")).toBe(true);
  });

  it("removes deferred modules from primary admin navigation without deleting routes", () => {
    expect(isPhase1AdminNavigationHref("/admin/asthi")).toBe(false);
    expect(isPhase1AdminNavigationHref("/admin/service-bookings")).toBe(false);
    expect(isPhase1AdminNavigationHref("/admin/vendor-workbench")).toBe(false);
    expect(isPhase1AdminNavigationHref("/admin/notifications")).toBe(false);
    expect(isPhase1AdminNavigationHref("/admin/settings")).toBe(false);
  });

  it("applies the policy to customer and admin navigation", () => {
    const customerHeader = readFileSync("components/customer-header.tsx", "utf8");
    const adminLayout = readFileSync("app/admin/layout.tsx", "utf8");

    expect(customerHeader).toContain("PHASE1_CUSTOMER_PRIMARY_NAV.map");
    expect(customerHeader).toContain("Phase-1 Client UAT - synthetic and provisional data only");
    expect(customerHeader).toContain("!runtimeConfig.phase1UatMode && user");
    expect(adminLayout).toContain("isPhase1AdminNavigationHref(item.href)");
  });
});
