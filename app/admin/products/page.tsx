import Link from "next/link";
import { AdminCatalogTable } from "@/components/admin-catalog-table";
import { getAdminCatalogItems } from "@/lib/catalog";

export default async function AdminProductsPage() {
  const items = await getAdminCatalogItems();

  return (
    <div className="grid gap-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Operations</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Products & Services</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Manage catalog records that power the public storefront. Payment, inventory reservation, and fulfilment remain disabled.
          </p>
        </div>
        <Link href="/admin/products/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
          New item
        </Link>
      </section>
      <AdminCatalogTable items={items} />
      <div className="grid gap-3">
        {items.map((item) => (
          <Link key={item.id} href={`/admin/products/${item.id}/edit`} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-omd-ops shadow-sm">
            Edit {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
