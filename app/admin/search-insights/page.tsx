import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { requireCatalogAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { getSearchInsights } from "@/lib/search";

function formatDate(value: Date | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

export default async function AdminSearchInsightsPage() {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const insights = await getSearchInsights(tenantId);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Search"
        title="Search Insights"
        description="Recent public search activity, repeated terms, and no-result queries from the database-backed Smart Search foundation."
        tone="admin"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminPanel>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent searches</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{insights.recent.length}</p>
        </AdminPanel>
        <AdminPanel>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Repeated terms</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{insights.repeated.length}</p>
        </AdminPanel>
        <AdminPanel>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">No-result terms</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{insights.noResults.length}</p>
        </AdminPanel>
      </div>

      <AdminPanel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold text-slate-950">Recent Searches</h2>
        </div>
        {insights.recent.length === 0 ? (
          <div className="p-4"><EmptyState title="No searches logged yet" description="Searches from /search will appear here after customers use the global search box." /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Query</th>
                  <th className="px-4 py-3">Results</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {insights.recent.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-semibold text-slate-950">{item.query}</td>
                    <td className="px-4 py-3"><StatusBadge tone={item.resultCount ? "success" : "warning"}>{item.resultCount}</StatusBadge></td>
                    <td className="px-4 py-3 text-slate-600">{item.user?.name ?? item.user?.email ?? "Guest"}</td>
                    <td className="px-4 py-3 text-slate-600">{item.source ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-950">Most Repeated Searches</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {insights.repeated.map((item) => (
              <div key={item.normalizedQuery} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="font-semibold text-slate-950">{item.normalizedQuery}</span>
                <span className="text-sm text-slate-500">{item._count.normalizedQuery} search(es)</span>
              </div>
            ))}
            {insights.repeated.length === 0 ? <div className="p-4"><EmptyState title="No repeated searches yet" description="Repeated terms appear after more search usage." /></div> : null}
          </div>
        </AdminPanel>

        <AdminPanel className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold text-slate-950">No-Result Searches</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {insights.noResults.map((item) => (
              <div key={item.normalizedQuery} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="font-semibold text-slate-950">{item.normalizedQuery}</span>
                <span className="text-sm text-slate-500">{item._count.normalizedQuery} time(s)</span>
              </div>
            ))}
            {insights.noResults.length === 0 ? <div className="p-4"><EmptyState title="No no-result searches" description="Good sign. Queries returning zero results will appear here." /></div> : null}
          </div>
        </AdminPanel>
      </div>
    </div>
  );
}
