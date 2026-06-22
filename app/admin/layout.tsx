import Link from "next/link";
import { logoutAction } from "@/lib/auth/actions";
import { requireAdminUser } from "@/lib/admin-auth";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/products", label: "Variants/SKUs" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/queues", label: "Queues" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/settings", label: "Settings" }
];

export default async function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireAdminUser();
  const identity = user.name || user.email || "Admin";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-omd-brown text-white">
        <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" className="font-semibold">
            OMD Admin
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-200">
            {navItems.map((item) => (
              <Link key={`${item.href}-${item.label}`} href={item.href} className="hover:text-omd-gold">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="max-w-48 truncate text-slate-200">{identity}</span>
            <form action={logoutAction}>
              <button className="rounded-md border border-white/30 px-3 py-2 font-semibold hover:border-omd-gold hover:text-omd-gold">
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
