import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function appSource(path: string) {
  return readFileSync(new URL(`../app/${path}`, import.meta.url), "utf8");
}

const catalogPages = [
  "admin/products/page.tsx",
  "admin/products/new/page.tsx",
  "admin/products/[id]/edit/page.tsx",
  "admin/categories/page.tsx",
  "admin/categories/new/page.tsx",
  "admin/categories/[id]/edit/page.tsx",
  "admin/inventory/page.tsx",
  "admin/festivals/page.tsx",
  "admin/festivals/new/page.tsx",
  "admin/festivals/[id]/edit/page.tsx",
  "admin/promotions/page.tsx",
  "admin/promotions/new/page.tsx",
  "admin/promotions/[id]/edit/page.tsx",
  "admin/offers/page.tsx",
  "admin/offers/new/page.tsx",
  "admin/offers/[id]/edit/page.tsx"
];

describe("Gate 4 Phase-1 role and dashboard boundaries", () => {
  it.each(catalogPages)("server-gates catalog route %s", (path) => {
    expect(appSource(path)).toContain("await requireCatalogAdminUser()");
  });

  it("keeps the operations dashboard and payment queue behind operations roles", () => {
    expect(appSource("admin/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"])');
    expect(appSource("admin/payments/page.tsx")).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"])');
  });

  it("filters deferred dashboard surfaces while Phase-1 UAT mode is enabled", () => {
    const adminDashboard = appSource("admin/page.tsx");
    const customerDashboard = appSource("(app)/dashboard/page.tsx");
    expect(adminDashboard).toContain("isPhase1AdminNavigationHref");
    expect(adminDashboard).toContain("!runtimeConfig.phase1UatMode ? <AdminPanel>");
    expect(customerDashboard).toContain("visibleQuickActions");
    expect(customerDashboard).toContain("!runtimeConfig.phase1UatMode ? <Panel>");
  });
});
