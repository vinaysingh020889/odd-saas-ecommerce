import Image from "next/image";
import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import type { AuthenticatedUser } from "@/lib/auth/session";
import { getActiveCategoryTree } from "@/lib/catalog";
import { getCurrentCartItemCount } from "@/lib/cart";
import { HeaderDropdown } from "@/components/header-dropdown";
import { TopOfferStrip } from "@/components/top-offer-strip";
import { getActiveTopMenuOffer } from "@/lib/top-menu-offer";
import mgLogo from "@/app/logo/mg-logo.png";

type CustomerHeaderProps = {
  user: AuthenticatedUser | null;
  accountMode?: boolean;
};

function Icon({ name }: { name: "cart" | "wallet" | "support" | "logout" | "account" | "dashboard" | "search" }) {
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

  if (name === "search") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
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
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9b98b] bg-white/88 text-[#3a160f] shadow-[0_8px_22px_rgba(73,28,17,0.12)] transition hover:border-[#ff3b16] hover:text-[#dd2100]"
    >
      <Icon name={icon} />
      {badge ? (
        <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#dd2100] px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white">
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

export async function CustomerHeader({ user }: CustomerHeaderProps) {
  const identity = user?.name || user?.email || "Guest";
  const profileLabel = shortName(identity);
  const profileInitial = identity.trim().charAt(0).toUpperCase() || "O";
  const isAdmin = user?.roles.some((role) => ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"].includes(role)) ?? false;
  const [categoryTree, cartCount, topMenuOffer] = await Promise.all([
    getActiveCategoryTree(["PRODUCT", "MIXED"]),
    getCurrentCartItemCount(),
    getActiveTopMenuOffer()
  ]);
  const highlightedCategories = categoryTree.slice(0, 6);

  return (
    <header className="sticky top-0 z-30 w-full overflow-visible bg-[#fff4df] text-[#34150f] shadow-[0_16px_42px_rgba(70,24,13,0.16)]">
      <TopOfferStrip key={topMenuOffer?.id ?? "no-top-offer"} offer={topMenuOffer} />

      <div className="border-b border-[#e7caa1] bg-[linear-gradient(180deg,#fff8ea_0%,#ffefd2_100%)]">
        <div className="mx-auto grid min-h-[76px] w-full max-w-[1680px] grid-cols-[minmax(120px,1fr)_auto_minmax(120px,1fr)] items-center gap-4 px-4 py-2 md:px-7">
          <div className="hidden md:block" aria-hidden="true" />

          <Link href="/shop" className="justify-self-start md:justify-self-center" aria-label="OMDivyaDarshan home">
            <Image src={mgLogo} alt="OMDivyaDarshan" width={156} height={86} priority className="h-[58px] w-auto object-contain sm:h-[66px]" />
          </Link>

          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-3">
            <form action="/search" className="hidden min-w-[240px] max-w-[420px] flex-1 justify-end xl:flex">
              <label className="relative w-full">
                <span className="sr-only">Search site</span>
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7b6656]"><Icon name="search" /></span>
                <input name="q" placeholder="Search for puja, seva, gifts..." className="h-11 w-full rounded-xl border border-[#dfc49a] bg-white px-12 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#dd2100] focus:ring-2 focus:ring-[#ff3b16]/15" />
                <input type="hidden" name="source" value="header" />
              </label>
            </form>
            {user ? <IconLink href="/wallet" label="Wallet" icon="wallet" /> : null}
            <IconLink href="/cart" label={cartCount ? `Cart, ${cartCount} items` : "Cart"} icon="cart" badge={cartCount} />
            <details className="group relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-[#d9b98b] bg-white/88 py-1 pl-1 pr-3 text-sm font-bold text-[#34150f] shadow-[0_8px_22px_rgba(73,28,17,0.12)] transition hover:border-[#ff3b16] hover:text-[#dd2100]">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#ff4a1f,#c90000)] text-xs font-bold text-white">{profileInitial}</span>
                <span className="hidden min-w-[68px] text-left sm:inline">{profileLabel}</span>
                <span className="text-[10px]" aria-hidden="true">v</span>
              </summary>
              <div className="absolute right-0 top-12 z-40 hidden w-64 overflow-hidden rounded-2xl border border-omd-sand bg-white text-omd-brown shadow-2xl ring-1 ring-omd-gold/10 group-open:block">
                <div className="border-b border-omd-sand bg-omd-ivory/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#dd2100]">Profile</p>
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

      <div className="border-b border-[#ff4a1f]/45 bg-[linear-gradient(90deg,#42160e_0%,#7a1a0c_43%,#d92c00_100%)] text-white">
        <div className="mx-auto flex min-h-[46px] w-full max-w-[1680px] items-center gap-3 px-3 md:px-7">
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap text-sm font-semibold text-white/90 [-ms-overflow-style:none] lg:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:justify-center lg:gap-4">
            <HeaderDropdown label="Products">
              <div className="absolute left-0 top-10 z-30 hidden w-[760px] overflow-hidden rounded-2xl border border-omd-sand bg-white text-omd-brown shadow-2xl ring-1 ring-omd-gold/10 group-open:block">
                <div className="grid grid-cols-[260px_1fr]">
                  <div className="bg-[linear-gradient(145deg,#3a160f,#8a1b0b)] p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#ffd35c]">Shop OMDivyaDarshan</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight">Sacred essentials for every devotion.</h2>
                    <p className="mt-3 text-sm leading-6 text-white/75">Explore products, kits, memberships, and guided services from one premium storefront.</p>
                    <Link href="/shop" className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#8a1b0b] hover:bg-[#ffd35c]">All Products</Link>
                    <div className="mt-5 grid gap-2 border-t border-white/15 pt-4 text-xs font-semibold text-white/80">
                      <Link href="/shop?type=KIT" className="hover:text-[#ffd35c]">Puja Kits & Bundles</Link>
                      <Link href="/membership" className="hover:text-[#ffd35c]">Divya Membership</Link>
                      <Link href="/services/asthi-visarjan" className="hover:text-[#ffd35c]">Asthi & Seva Services</Link>
                    </div>
                  </div>
                  <div className="grid gap-4 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#dd2100]">Collections</p>
                        <p className="mt-1 text-sm text-omd-muted">Shop by ritual, intent, or offering type.</p>
                      </div>
                      <Link href="/shop" className="text-xs font-semibold uppercase tracking-wide text-[#dd2100] hover:text-omd-brown">View all</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {highlightedCategories.map((category) => (
                        <Link key={category.id} href={`/shop/category/${category.slug}`} className="group/card rounded-xl border border-omd-sand bg-omd-ivory/50 p-3 transition hover:border-[#ff3b16] hover:bg-white hover:shadow-sm">
                          <p className="text-sm font-semibold text-omd-brown group-hover/card:text-[#dd2100]">{category.name}</p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-omd-muted">{categoryDescription(category)}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </HeaderDropdown>
            <HeaderDropdown label="Services">
              <div className="absolute left-0 top-10 z-30 hidden w-[680px] overflow-hidden rounded-2xl border border-omd-sand bg-white text-omd-brown shadow-2xl ring-1 ring-omd-gold/10 group-open:block">
                <div className="grid grid-cols-[240px_1fr]">
                  <div className="bg-[linear-gradient(145deg,#3a160f,#8a1b0b)] p-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#ffd35c]">Guided Seva</p>
                    <h2 className="mt-2 text-2xl font-semibold leading-tight">Services with clear tracking and care.</h2>
                    <p className="mt-3 text-sm leading-6 text-white/75">Start sensitive applications, Kundli reports, and puja-service journeys with transparent next steps.</p>
                    <Link href="/services" className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#8a1b0b] hover:bg-[#ffd35c]">View Services</Link>
                  </div>
                  <div className="grid gap-3 p-5 sm:grid-cols-2">
                    {serviceHighlights.map((item) => (
                      <Link key={item.title} href={item.href} className="rounded-xl border border-omd-sand bg-omd-ivory/50 p-4 transition hover:border-[#ff3b16] hover:bg-white hover:shadow-sm">
                        <p className="font-semibold text-omd-brown">{item.title}</p>
                        <p className="mt-1 line-clamp-3 text-xs leading-5 text-omd-muted">{item.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </HeaderDropdown>
            <Link href="/membership" className="rounded-full px-3 py-2 hover:text-[#ffd35c]">Membership</Link>
            <Link href="/kundli" className="rounded-full px-3 py-2 hover:text-[#ffd35c]">Kundli</Link>
            <Link href="/services/asthi-visarjan" className="rounded-full px-3 py-2 hover:text-[#ffd35c]">Asthi</Link>
            <Link href="/festivals/raksha-bandhan-2026" className="rounded-full px-3 py-2 hover:text-[#ffd35c]">Festivals</Link>
          </nav>

          <form action="/search" className="hidden w-[340px] shrink-0 lg:block xl:hidden">
            <label className="relative block w-full">
              <span className="sr-only">Search site</span>
              <input name="q" placeholder="Search products, seva, tags..." className="h-9 w-full rounded-full border border-white/20 bg-white/95 px-4 pr-14 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-[#ffd35c]" />
              <input type="hidden" name="source" value="header" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-[#dd2100]">Search</span>
            </label>
          </form>
        </div>
      </div>
    </header>
  );
}




