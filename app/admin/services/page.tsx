import Link from "next/link";
import { AdminCatalogTable } from "@/components/admin-catalog-table";
import { getAdminCatalogItems, serviceTypes } from "@/lib/catalog";
import { AdminPanel, EmptyState, PageHeader } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const services = await getAdminCatalogItems(serviceTypes, q);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Services"
        description="Manage service catalog items. Booking, capacity, Asthi workflow, and fulfilment are deferred."
        tone="admin"
        actions={<Link href="/admin/services/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
          New service
        </Link>}
      />
      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_110px]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search service, slug, category"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        </form>
      </AdminPanel>
      {services.length === 0 ? (
        <EmptyState title="No services found" description={q ? "No service matches this search. Clear search to review the full service catalog." : "Service catalog items appear here after they are created."} />
      ) : (
        <AdminCatalogTable items={services} />
      )}
    </div>
  );
}
