import Link from "next/link";
import { tenantConfig } from "@/tenants/omdivyadarshan/tenant.config";

const footerColumns = [
  {
    title: "Shop",
    links: [
      { label: "All Products", href: "/shop" },
      { label: "Puja Kits", href: "/shop?type=KIT" },
      { label: "Membership", href: "/membership" },
      { label: "Best Sellers", href: "/shop?sort=rating" }
    ]
  },
  {
    title: "Seva",
    links: [
      { label: "All Services", href: "/services" },
      { label: "Asthi Visarjan", href: "/services/asthi-visarjan" },
      { label: "Kundli", href: "/kundli" },
      { label: "Festival Campaigns", href: "/festivals/raksha-bandhan-2026" }
    ]
  },
  {
    title: "Account",
    links: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Orders", href: "/orders" },
      { label: "Cart", href: "/cart" },
      { label: "Support", href: "/dashboard#support" }
    ]
  }
];

export function StorefrontFooter() {
  return (
    <footer className="mt-14 border-t border-omd-sand bg-[linear-gradient(135deg,#2f1c14_0%,#422416_55%,#1f120d_100%)] text-white">
      <div className="mx-auto grid max-w-[min(95vw,1600px)] gap-8 px-4 py-10 sm:px-5 lg:grid-cols-[1.15fr_1.6fr] lg:px-6 lg:py-12">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-omd-gold/70 bg-white text-sm font-bold text-omd-saffron">OMD</span>
            <div>
              <p className="text-lg font-semibold">{tenantConfig.name}</p>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-omd-gold">Connected Sanatan Dharma</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-white/72">
            Premium devotional commerce for products, puja kits, guided seva, membership benefits, Kundli journeys, and festival-ready offerings.
          </p>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-white/82 sm:grid-cols-3">
            <span className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3">Authentic products</span>
            <span className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3">Guided services</span>
            <span className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3">Secure checkout</span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-omd-gold">{column.title}</p>
              <div className="mt-4 grid gap-3 text-sm font-semibold text-white/74">
                {column.links.map((link) => (
                  <Link key={link.href} href={link.href} className="hover:text-omd-gold">{link.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[min(95vw,1600px)] flex-col gap-2 px-4 py-5 text-xs font-semibold text-white/55 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
          <span>Demo commerce platform for OMDivyaDarshan.</span>
          <span>Products, seva, memberships, festivals, and support in one storefront.</span>
        </div>
      </div>
    </footer>
  );
}