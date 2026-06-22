import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { requireCurrentUser } from "@/lib/auth/session";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/services", label: "Services" },
  { href: "/shop", label: "Shop" },
  { href: "/orders", label: "Orders" },
  { href: "/wallet", label: "Wallet" },
  { href: "/dashboard#support", label: "Support" }
];

export default async function AppDashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireCurrentUser();
  const identity = user.name || user.email || "Customer";

  return (
    <div className="min-h-screen bg-omd-ivory text-omd-brown">
      <aside className="border-b border-omd-sand bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="font-semibold text-omd-brown">
            OMD Account
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-omd-muted">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-omd-saffron">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="max-w-48 truncate text-omd-muted">{identity}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-omd-sand px-3 py-2 font-semibold text-omd-brown hover:border-omd-gold hover:text-omd-saffron"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
