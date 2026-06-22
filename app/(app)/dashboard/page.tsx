import Link from "next/link";
import { requireCurrentUser } from "@/lib/auth/session";

const quickActions = [
  { href: "/shop", label: "Shop Festival Essentials" },
  { href: "/services", label: "Book Puja" },
  { href: "/services", label: "Kundli / Astrology" },
  { href: "/services/asthi-visarjan", label: "Asthi Visarjan Support" },
  { href: "/orders", label: "View Orders" },
  { href: "/wallet", label: "Wallet Rewards" }
];

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const displayName = user.name || user.email || "Customer";

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-omd-gold bg-white p-7 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Customer app</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Welcome, {displayName}</h1>
        <p className="mt-3 text-omd-muted">
          {user.email ? `Signed in as ${user.email}.` : "Your customer dashboard is ready."}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-lg border border-omd-sand bg-white p-5 font-semibold text-omd-brown shadow-sm hover:border-omd-gold hover:text-omd-saffron"
          >
            {action.label}
          </Link>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-omd-brown">Active Items</h2>
          <p className="mt-3 text-sm leading-6 text-omd-muted">No active orders or bookings yet.</p>
        </div>
        <div className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-omd-brown">Wallet Rewards</h2>
          <p className="mt-3 text-sm leading-6 text-omd-muted">
            Wallet integration is disabled in this phase.
          </p>
        </div>
        <div id="support" className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-omd-brown">Support</h2>
          <p className="mt-3 text-sm leading-6 text-omd-muted">Need help? Contact support.</p>
        </div>
      </section>
    </div>
  );
}
