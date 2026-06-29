import Link from "next/link";
import { AdminCatalogTable } from "@/components/admin-catalog-table";
import { getAdminCatalogItems } from "@/lib/catalog";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ type?: string; q?: string }>;
};

const productTypeFilters = [
  { label: "All", value: "" },
  { label: "Physical", value: "PHYSICAL" },
  { label: "Digital", value: "DIGITAL" },
  { label: "Membership", value: "MEMBERSHIP" },
  { label: "Kit", value: "KIT" },
  { label: "Service", value: "SERVICE" }
];

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedType = (params.type ?? "").trim();
  const q = (params.q ?? "").trim();
  const allowedTypes = productTypeFilters.map((filter) => filter.value).filter(Boolean);
  const items = await getAdminCatalogItems(allowedTypes.includes(selectedType) ? [selectedType] : undefined, q);
  const qParam = q ? `q=${encodeURIComponent(q)}` : "";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Products & Services"
        description="Manage catalog records that power the public storefront. Payment and fulfilment remain deferred."
        tone="admin"
        actions={<Link href="/admin/products/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
          New item
        </Link>}
      />
      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_110px]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search product, SKU, slug, category"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          {selectedType ? <input type="hidden" name="type" value={selectedType} /> : null}
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        </form>
      </AdminPanel>
      <div className="flex flex-wrap items-center gap-2">
        {productTypeFilters.map((filter) => {
          const params = [filter.value ? `type=${filter.value}` : "", qParam].filter(Boolean).join("&");
          const href = params ? `/admin/products?${params}` : "/admin/products";
          const active = selectedType === filter.value || (!selectedType && !filter.value);

          return (
            <Link
              key={filter.label}
              href={href}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                active ? "border-blue-100 bg-blue-50 text-omd-ops" : "border-slate-200 bg-white text-slate-600 hover:border-omd-ops hover:text-omd-ops"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
        {selectedType ? <StatusBadge tone="ops">Showing {selectedType.toLowerCase()}</StatusBadge> : null}
        {q ? <StatusBadge tone="neutral">Search: {q}</StatusBadge> : null}
      </div>
      {items.length === 0 ? (
        <EmptyState title="No catalog items found" description={q || selectedType ? "No product or service matches this search. Clear search or choose another type filter." : "Products and services appear here after they are created."} />
      ) : (
        <AdminCatalogTable items={items} />
      )}
    </div>
  );
}
