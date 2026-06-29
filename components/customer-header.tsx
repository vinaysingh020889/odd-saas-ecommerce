import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { tenantConfig } from "@/tenants/omdivyadarshan/tenant.config";
import { getActiveCategoryTree } from "@/lib/catalog";
import { getCurrentCartItemCount } from "@/lib/cart";
import { HeaderDropdown } from "@/components/header-dropdown";

type CustomerHeaderProps = {
  user: AuthenticatedUser | null;
  accountMode?: boolean;
};

function Icon({ name }: { name: "cart" | "wallet" | "support" | "logout" | "account" | "dashboard" }) {
  const common = "h-5 w-5";

  if (name === "cart") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 6h15l-2 8H8L6 3H3" />
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
      </svg>
    );
  }

  if (name === "wallet") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 7h16v12H4z" />
        <path d="M16 11h4v4h-4z" />
        <path d="M4 7V5h13v2" />
      </svg>
    );
  }

  if (name === "support") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M9.5 9a2.5 2.5 0 0 1 4.7 1.2c0 1.8-2.2 2.1-2.2 3.8" />
        <path d="M12 17h.01" />
      </svg>
    );
  }

  if (name === "logout") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M12 3h7v18h-7" />
      </svg>
    );
  }

  if (name === "dashboard") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 13h7V4H4z" />
        <path d="M13 20h7V4h-7z" />
        <path d="M4 20h7v-5H4z" />
      </svg>
    );
  }

  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function IconLink({
  href,
  label,
  icon,
  badge
}: {
  href: string;
  label: string;
  icon: "cart" | "wallet" | "support" | "account";
  badge?: number;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-omd-sand bg-white text-omd-brown shadow-sm transition hover:border-omd-gold hover:text-omd-saffron"
    >
      <Icon name={icon} />
      {badge ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-omd-error px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

function categoryDescription(category: { name: string; description?: string | null }) {
  return category.description ?? `Browse curated ${category.name.toLowerCase()} for devotional shopping.`;
}

function shortName(value: string) {
  return value.length > 7 ? `${value.slice(0, 7)}...` : value;
}

const serviceHighlights = [
  { href: "/services", title: "All Services", description: "Explore guided puja, seva, Kundli, and future booking experiences." },
  { href: "/services/asthi-visarjan", title: "Asthi Visarjan", description: "Private application, mock payment, document placeholders, and ritual tracking." },
  { href: "/kundli", title: "Kundli Services", description: "Reports, matching, and consultation requests with customer/admin tracking." },
  { href: "/services", title: "Puja Services", description: "Priest-assisted puja service placeholders prepared for future scheduling." }
];

const utilityMessages = ["Authentic Spiritual Products", "Trusted Seva & Guidance", "Secure Checkout", "Pan India Delivery"];

export async function CustomerHeader({ user }: CustomerHeaderProps) {
  const identity = user?.name || user?.email || "Guest";
  const profileLabel = shortName(identity);
  const profileInitial = identity.trim().charAt(0).toUpperCase() || "O";
  const isAdmin = user?.roles.some((role) => ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"].includes(role)) ?? false;
  const [categoryTree, cartCount] = await Promise.all([
    getActiveCategoryTree(["PRODUCT", "MIXED"]),
    getCurrentCartItemCount()
  ]);
  const highlightedCategories = categoryTree.slice(0, 6);

  return (
    <header className="sticky top-0 z-30 border-b border-omd-sand/80 bg-omd-ivory/96 shadow-sm backdrop-blur">
      <div className="border-b border-omd-sand/70 bg-omd-brown text-white">
        <div className="mx-auto flex min-h-10 max-w-[min(95vw,1600px)] items-center justify-between gap-4 px-4 py-1.5">
          <div className="hidden min-w-0 items-center gap-4 text-[11px] font-semibold uppercase tracking-wide text-white/78 md:flex">
            {utilityMessages.map((message, index) => (
              <span key={message} className={index > 1 ? "hidden xl:inline" : "inline"}>{message}</span>
            ))}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {user ? <IconLink href="/wallet" label="Wallet" icon="wallet" /> : null}
            <IconLink href="/cart" label={cartCount ? `Cart, ${cartCount} items` : "Cart"} icon="cart" badge={cartCount} />
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-omd-sand bg-white py-1 pl-1 pr-3 text-sm font-semibold text-omd-brown shadow-sm transition hover:border-omd-gold hover:text-omd-saffron">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-omd-brown text-xs font-bold text-white">{profileInitial}</span>
                <span className="hidden min-w-[68px] text-left sm:inline">{profileLabel}</span>
                <span className="text-[10px]" aria-hidden="true">v</span>
              </summary>
              <div className="absolute right-0 top-12 z-40 hidden w-64 overflow-hidden rounded-2xl border border-omd-sand bg-white text-omd-brown shadow-2xl ring-1 ring-omd-gold/10 group-open:block">
                <div className="border-b border-omd-sand bg-omd-ivory/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Profile</p>
                  <p className="mt-1 truncate text-sm font-semibold">{identity}</p>
                </div>
                <div className="grid p-2 text-sm font-semibold">
                  {user ? (
                    <>
                      <Link href="/dashboard" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-omd-ivory"><Icon name="dashboard" />Dashboard</Link>
                      <Link href="/dashboard#support" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-omd-ivory"><Icon name="support" />Support</Link>
                      {isAdmin ? <Link href="/admin" className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-omd-ivory"><Icon name="account" />Admin</Link> : null}
                      <form action={logoutAction}>
                        <button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold hover:bg-omd-ivory"><Icon name="logout" />Logout</button>
                      </form>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="rounded-xl px-3 py-2.5 hover:bg-omd-ivory">Login</Link>
                      <Link href="/signup" className="rounded-xl px-3 py-2.5 hover:bg-omd-ivory">Create account</Link>
                      <Link href="/services" className="rounded-xl px-3 py-2.5 hover:bg-omd-ivory">Support</Link>
                    </>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>

      <div className="mx-auto flex min-h-[72px] max-w-[min(95vw,1600px)] items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/shop" className="flex min-w-0 items-center gap-3 text-omd-brown">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-omd-gold/60 bg-white text-sm font-bold text-omd-saffron shadow-sm">OMD</span>
            <span className="hidden truncate text-lg font-semibold tracking-wide sm:inline">{tenantConfig.name}</span>
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-semibold text-omd-muted lg:flex">
            <HeaderDropdown label="Products">
              <div className="absolute left-0 top-11 z-30 hidden w-[760px] overflow-hidden rounded-3xl border border-omd-sand bg-white shadow-2xl ring-1 ring-omd-gold/10 group-open:block">
                <div className="grid grid-cols-[260px_1fr]">
                  <div className="bg-omd-brown p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">Shop OMDivyaDarshan</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight">Sacred essentials for every devotion.</h2>
                    <p className="mt-3 text-sm leading-6 text-white/75">Explore products, kits, memberships, and guided services from one premium storefront.</p>
                    <Link href="/shop" className="mt-5 inline-flex rounded-full bg-omd-gold px-4 py-2 text-sm font-semibold text-omd-brown hover:bg-white">All Products</Link>
                    <div className="mt-5 grid gap-2 border-t border-white/15 pt-4 text-xs font-semibold text-white/80">
                      <Link href="/shop?type=KIT" className="hover:text-omd-gold">Puja Kits & Bundles</Link>
                      <Link href="/membership" className="hover:text-omd-gold">Divya Membership</Link>
                      <Link href="/services/asthi-visarjan" className="hover:text-omd-gold">Asthi & Seva Services</Link>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Collections</p>
                        <p className="mt-1 text-sm text-omd-muted">Shop by ritual, intent, or offering type.</p>
                      </div>
                      <Link href="/shop" className="text-xs font-semibold uppercase tracking-wide text-omd-saffron hover:text-omd-brown">View all</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {highlightedCategories.map((category) => (
                        <Link key={category.id} href={`/shop/category/${category.slug}`} className="group/card rounded-2xl border border-omd-sand bg-omd-ivory/50 p-3 transition hover:border-omd-gold hover:bg-white hover:shadow-sm">
                          <p className="text-sm font-semibold text-omd-brown group-hover/card:text-omd-saffron">{category.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-omd-muted">{categoryDescription(category)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </HeaderDropdown>
            <HeaderDropdown label="Services">
              <div className="absolute left-0 top-11 z-30 hidden w-[680px] overflow-hidden rounded-3xl border border-omd-sand bg-white shadow-2xl ring-1 ring-omd-gold/10 group-open:block">
                <div className="grid grid-cols-[240px_1fr]">
                  <div className="bg-omd-brown p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">Guided Seva</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight">Services with clear tracking and care.</h2>
                    <p className="mt-3 text-sm leading-6 text-white/75">Start sensitive applications, Kundli reports, and puja-service journeys with transparent next steps.</p>
                    <Link href="/services" className="mt-5 inline-flex rounded-full bg-omd-gold px-4 py-2 text-sm font-semibold text-omd-brown hover:bg-white">View Services</Link>
                  </div>
                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {serviceHighlights.map((item) => (
                      <Link key={item.title} href={item.href} className="rounded-2xl border border-omd-sand bg-omd-ivory/50 p-4 transition hover:border-omd-gold hover:bg-white hover:shadow-sm">
                        <p className="font-semibold text-omd-brown">{item.title}</p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-omd-muted">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </HeaderDropdown>
            <Link href="/shop" className="rounded-full px-2 py-2 hover:text-omd-saffron">Shop</Link>
            <Link href="/membership" className="rounded-full px-2 py-2 hover:text-omd-saffron">Membership</Link>
            <Link href="/kundli" className="rounded-full px-2 py-2 hover:text-omd-saffron">Kundli</Link>
            <Link href="/services/asthi-visarjan" className="rounded-full px-2 py-2 hover:text-omd-saffron">Asthi</Link>
            <Link href="/festivals/raksha-bandhan-2026" className="rounded-full px-2 py-2 hover:text-omd-saffron">Festivals</Link>
          </nav>
        </div>

        <form action="/search" className="hidden min-w-[280px] flex-1 justify-end lg:flex">
          <label className="relative w-full max-w-xl">
            <span className="sr-only">Search site</span>
            <input name="q" placeholder="Search products, seva, tags..." className="h-11 w-full rounded-full border border-omd-sand bg-white px-4 pr-16 text-sm text-omd-brown shadow-sm outline-none transition placeholder:text-omd-muted/70 focus:border-omd-gold" />
            <input type="hidden" name="source" value="header" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase text-omd-saffron">Search</span>
          </label>
        </form>
      </div>
    </header>
  );
}