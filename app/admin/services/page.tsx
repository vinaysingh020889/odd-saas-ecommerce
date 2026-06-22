import Link from "next/link";
import { AdminCatalogTable } from "@/components/admin-catalog-table";
import { getAdminCatalogItems, serviceTypes } from "@/lib/catalog";

export default async function AdminServicesPage() {
  const services = await getAdminCatalogItems(serviceTypes);

  return (
    <div className="grid gap-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Operations</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Services</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Manage service catalog items. Booking, capacity, Asthi workflow, and fulfilment are deferred.
          </p>
        </div>
        <Link href="/admin/services/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
          New service
        </Link>
      </section>
      <AdminCatalogTable items={services} />
      <div className="grid gap-3">
        {services.map((item) => (
          <Link key={item.id} href={`/admin/products/${item.id}/edit`} className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-omd-ops shadow-sm">
            Edit {item.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
