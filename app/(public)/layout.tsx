import Link from "next/link";
import { tenantConfig } from "@/tenants/omdivyadarshan/tenant.config";
import { logoutAction } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

const navItems = [
  { href: "/shop", label: "Shop" },
  { href: "/services", label: "Services" },
  { href: "/cart", label: "Cart" }
];

export default async function PublicCustomerLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const identity = user?.name || user?.email || "Customer";

  return (
    <div className="min-h-screen bg-omd-ivory text-omd-brown">
      <header className="border-b border-omd-sand bg-omd-ivory/95">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/shop" className="font-semibold tracking-wide text-omd-brown">
            {tenantConfig.name}
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-omd-muted">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-omd-saffron">
                {item.label}
              </Link>
            ))}
            {user ? (
              <Link href="/dashboard" className="hover:text-omd-saffron">
                Dashboard
              </Link>
            ) : null}
          </nav>
          {user ? (
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
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md border border-omd-sand px-3 py-2 text-sm font-semibold text-omd-brown hover:border-omd-gold hover:text-omd-saffron"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white hover:bg-omd-saffron"
              >
                Signup
              </Link>
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
