export const PHASE1_CUSTOMER_PRIMARY_NAV = [
  { href: "/shop", label: "Festival Hampers" },
  { href: "/membership", label: "Membership" },
  { href: "/kundli", label: "Kundli" },
  { href: "/services/asthi-visarjan", label: "Asthi Visarjan" }
] as const;

export const PHASE1_CUSTOMER_ACCOUNT_NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/account/activity", label: "Account" }
] as const;

export const PHASE1_ADMIN_NAV_HREFS = [
  "/admin",
  "/admin/my-work",
  "/admin/search",
  "/admin/products",
  "/admin/categories",
  "/admin/inventory",
  "/admin/festivals",
  "/admin/promotions",
  "/admin/offers",
  "/admin/orders",
  "/admin/payments",
  "/admin/assignments",
  "/admin/kundli",
  "/admin/kundli/practitioners",
  "/admin/kundli/packages",
  "/admin/customers",
  "/admin/memberships",
  "/admin/audit-logs"
] as const;

const phase1AdminNavigation = new Set<string>(PHASE1_ADMIN_NAV_HREFS);

export function isPhase1AdminNavigationHref(href: string) {
  return phase1AdminNavigation.has(href);
}
