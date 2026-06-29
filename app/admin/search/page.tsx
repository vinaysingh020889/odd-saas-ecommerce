import Link from "next/link";
import { searchAdmin } from "@/lib/admin-search";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function AdminSearchPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const groups = await searchAdmin(q);
  const resultCount = groups.reduce((total, group) => total + group.items.length, 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Command"
        title="Admin Search"
        description="Search across catalog, orders, customers, operations, documents, tags, campaigns and internal work queues."
        tone="admin"
      />

      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_120px]">
          <input
            name="q"
            defaultValue={q}
            autoFocus
            placeholder="Search order number, product, customer, document, tag, campaign..."
            className="h-11 rounded-md border border-slate-300 px-3 text-sm"
          />
          <button className="rounded-md bg-omd-ops px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        </form>
        {q ? <p className="mt-3 text-sm text-slate-600">{resultCount} result(s) found for <span className="font-semibold text-slate-950">{q}</span>.</p> : null}
      </AdminPanel>

      {!q ? (
        <EmptyState
          title="Search the admin workspace"
          description="Try a product name, SKU, order number, customer email, document title, tag, festival, assignment or Asthi/Kundli reference."
        />
      ) : groups.length === 0 ? (
        <EmptyState
          title="No admin records found"
          description="No module matched this search. Try a shorter keyword, customer email, order number, SKU, tag name or document owner ID."
        />
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <AdminPanel key={group.key} className="p-0">
              <div className="border-b border-slate-100 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">{group.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                  </div>
                  <StatusBadge tone="neutral">{group.items.length} shown</StatusBadge>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {group.items.map((item) => (
                  <Link key={`${group.key}-${item.id}`} href={item.href} className="grid gap-2 px-4 py-3 text-sm hover:bg-slate-50 md:grid-cols-[1fr_auto] md:items-center">
                    <span>
                      <span className="font-semibold text-slate-950">{item.title}</span>
                      <span className="mt-1 block text-slate-600">{item.subtitle}</span>
                    </span>
                    {item.badge ? <StatusBadge tone="ops">{item.badge}</StatusBadge> : null}
                  </Link>
                ))}
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
