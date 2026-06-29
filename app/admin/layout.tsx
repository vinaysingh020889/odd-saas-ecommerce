import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { hasAnyRole, requireAdminUser } from "@/lib/admin-auth";

type IconName = "overview" | "search" | "catalog" | "kit" | "inventory" | "orders" | "payment" | "truck" | "customers" | "membership" | "settings";

const navGroups: Array<{
  label: string;
  caption: string;
  items: Array<{ href: string; label: string; icon: IconName; roles?: string[] }>;
}> = [
  {
    label: "Command",
    caption: "Super Admin overview",
    items: [
      { href: "/admin", label: "Overview", icon: "overview", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/my-work", label: "My Work", icon: "orders" },
      { href: "/admin/search", label: "Admin Search", icon: "search", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"] }
    ]
  },
  {
    label: "Catalog",
    caption: "Products, kits, and stock",
    items: [
      { href: "/admin/products", label: "Products", icon: "catalog", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/services", label: "Services", icon: "catalog", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/categories", label: "Categories", icon: "catalog", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/tags", label: "Tags", icon: "catalog", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/reviews", label: "Reviews", icon: "catalog", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/inventory", label: "Inventory", icon: "inventory", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] }
    ]
  },
  {
    label: "Merchandising",
    caption: "Homepage and campaigns",
    items: [
      { href: "/admin/homepage-layout", label: "Homepage Layout", icon: "overview", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/hero-slides", label: "Hero Slides", icon: "overview", roles: ["SUPER_ADMIN", "ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/festivals", label: "Festivals", icon: "membership", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/promotions", label: "Promotions", icon: "payment", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/offers", label: "Offers", icon: "payment", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] }
    ]
  },
  {
    label: "Operations",
    caption: "Orders and fulfilment",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "orders", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/service-bookings", label: "Service Bookings", icon: "orders", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/reschedule-requests", label: "Reschedules", icon: "orders", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"] },
      { href: "/admin/requests", label: "Requests", icon: "orders", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"] },
      { href: "/admin/capacity", label: "Capacity", icon: "truck", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/service-capacity-rules", label: "Capacity Rules", icon: "truck", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/assignments", label: "Assignments", icon: "customers", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/checklists", label: "Checklists", icon: "orders", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/documents", label: "Documents", icon: "orders", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/vendor-workbench", label: "Vendor Workbench", icon: "truck", roles: ["VENDOR", "RURAL_SUBADMIN"] },
      { href: "/admin/assigned-service-work", label: "Assigned Services", icon: "membership", roles: ["PANDIT", "ASTROLOGER", "OPERATOR", "RURAL_SUBADMIN"] },
      { href: "/admin/orders?fulfillmentStatus=ready_to_ship", label: "Fulfilment", icon: "truck", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/shipping-rules", label: "Shipping Rules", icon: "truck", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/delivery-zones", label: "Delivery Zones", icon: "truck", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/asthi", label: "Asthi", icon: "membership", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/kundli", label: "Kundli", icon: "membership", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/support-workbench", label: "Support Workbench", icon: "customers", roles: ["SUPPORT_AGENT"] },
      { href: "/admin/customers", label: "Customers", icon: "customers", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"] },
      { href: "/admin/memberships", label: "Memberships", icon: "membership", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] }
    ]
  },
  {
    label: "Finance",
    caption: "Mock payments only",
    items: [
      { href: "/admin/payments", label: "Payments", icon: "payment", roles: ["SUPER_ADMIN"] },
      { href: "/admin/orders?paymentStatus=refunded", label: "Refunds", icon: "payment", roles: ["SUPER_ADMIN"] }
    ]
  },
  {
    label: "System",
    caption: "Deferred tooling",
    items: [
      { href: "/admin/queues", label: "Queues", icon: "settings", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/notifications", label: "Notifications", icon: "settings", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/reports", label: "Reports", icon: "settings", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/customer-events", label: "Customer Events", icon: "customers", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/interest-profiles", label: "Interest Profiles", icon: "customers", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/search-insights", label: "Search Insights", icon: "settings", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"] },
      { href: "/admin/roles", label: "Roles", icon: "customers", roles: ["SUPER_ADMIN"] },
      { href: "/admin/permissions", label: "Permissions", icon: "settings", roles: ["SUPER_ADMIN"] },
      { href: "/admin/audit-logs", label: "Audit Logs", icon: "settings", roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"] },
      { href: "/admin/settings", label: "Settings", icon: "settings", roles: ["SUPER_ADMIN"] }
    ]
  }
];

function Icon({ name }: { name: IconName }) {
  const common = "h-4 w-4";

  if (name === "overview") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 13h6V4H4z" />
        <path d="M14 20h6V4h-6z" />
        <path d="M4 20h6v-3H4z" />
      </svg>
    );
  }

  if (name === "kit") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3l8 4-8 4-8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 17l8 4 8-4" />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    );
  }

  if (name === "inventory") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 7l9-4 9 4-9 4z" />
        <path d="M5 10v7l7 4 7-4v-7" />
      </svg>
    );
  }

  if (name === "orders") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 3h12v18H6z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    );
  }

  if (name === "payment") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 7h18v10H3z" />
        <path d="M3 10h18" />
        <path d="M7 15h4" />
      </svg>
    );
  }

  if (name === "truck") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M3 7h11v10H3z" />
        <path d="M14 10h4l3 3v4h-7z" />
        <circle cx="7" cy="19" r="2" />
        <circle cx="17" cy="19" r="2" />
      </svg>
    );
  }

  if (name === "customers") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="9" cy="8" r="3" />
        <path d="M3 21a6 6 0 0 1 12 0" />
        <path d="M16 11a3 3 0 0 0 0-6" />
        <path d="M19 21a5 5 0 0 0-4-5" />
      </svg>
    );
  }

  if (name === "membership") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 3l3 6 6 .8-4.5 4.3 1.1 6-5.6-3-5.6 3 1.1-6L3 9.8 9 9z" />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a8 8 0 0 0 .1-6l-2.1.6a6 6 0 0 0-1-1.7l1.1-1.9a8 8 0 0 0-5.2-3l-.5 2.2a6 6 0 0 0-2 0L9.3 3a8 8 0 0 0-5.2 3l1.1 1.9a6 6 0 0 0-1 1.7L2.1 9a8 8 0 0 0 .1 6l2.1-.6a6 6 0 0 0 1 1.7l-1.1 1.9a8 8 0 0 0 5.2 3l.5-2.2a6 6 0 0 0 2 0l.5 2.2a8 8 0 0 0 5.2-3l-1.1-1.9a6 6 0 0 0 1-1.7z" />
      </svg>
    );
  }

  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
    </svg>
  );
}

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAdminUser();
  const identity = user.name || user.email || "Admin";
  const roleLabel = user.roles.includes("SUPER_ADMIN") ? "Super Admin" : user.roles[0]?.replaceAll("_", " ") ?? "Admin";
  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || hasAnyRole(user, item.roles)) }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-slate-950 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <div className="border-b border-white/10 px-5 py-5">
          <Link href="/admin" className="text-lg font-semibold tracking-wide">
            OMD Admin
          </Link>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{roleLabel}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleGroups.map((group) => (
            <section key={group.label} className="mb-5">
              <div className="px-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{group.label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{group.caption}</p>
              </div>
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10 hover:text-omd-gold"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white/5 text-slate-300">
                      <Icon name={item.icon} />
                    </span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950 lg:hidden">OMD Admin</p>
              <p className="hidden text-sm font-semibold text-slate-950 lg:block">Operations Console</p>
              <p className="hidden text-xs text-slate-500 md:block">Mock payment, orders, fulfilment, catalog and customer operations</p>
            </div>
            <form action="/admin/search" className="hidden min-w-0 flex-1 items-center justify-center md:flex">
              <div className="flex w-full max-w-xl overflow-hidden rounded-md border border-slate-300 bg-white shadow-sm focus-within:border-omd-ops">
                <input
                  name="q"
                  placeholder="Search admin: order, product, customer, tag..."
                  className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                />
                <button className="border-l border-slate-200 px-3 text-xs font-semibold uppercase tracking-wide text-omd-ops hover:bg-blue-50">
                  Search
                </button>
              </div>
            </form>
            <div className="flex items-center gap-3">
              <span className="hidden max-w-56 truncate text-sm text-slate-600 sm:inline">
                {identity} - {roleLabel}
              </span>
              <form action={logoutAction}>
                <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold hover:border-omd-ops hover:text-omd-ops">
                  Logout
                </button>
              </form>
            </div>
          </div>
          <nav className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm lg:hidden">
            {visibleGroups.flatMap((group) => group.items).map((item) => (
              <Link
                key={`${item.href}-${item.label}-mobile`}
                href={item.href}
                className="inline-flex shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700"
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
      </div>
    </div>
  );
}
