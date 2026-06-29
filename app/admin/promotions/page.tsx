import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { isCurrentlyActive } from "@/lib/merchandising";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value) : "Open";
}

export default async function AdminPromotionsPage() {
  const tenantId = await getOmdTenantId();
  const placements = await prisma.promotionPlacement.findMany({
    where: { tenantId },
    orderBy: [{ priority: "desc" }, { placementKey: "asc" }, { sortOrder: "asc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Merchandising"
        title="Promotion Placements"
        description="Control banners, hero overrides, seasonal cards, cross-sell slots, and checkout suggestions."
        tone="admin"
        actions={<Link href="/admin/promotions/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">New placement</Link>}
      />

      {placements.length === 0 ? (
        <EmptyState title="No promotion placements" description="Create a placement to override the storefront hero, show announcement strips, or add seasonal merchandising blocks." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {placements.map((placement) => (
                  <tr key={placement.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{placement.title}</p>
                      <p className="text-xs text-slate-500">{placement.placementKey} · {placement.surface} · priority {placement.priority}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{placement.targetType}{placement.targetId ? ` · ${placement.targetId}` : ""}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(placement.startDate)} - {formatDate(placement.endDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={statusTone(placement.status)}>{statusLabel(placement.status)}</StatusBadge>
                        {isCurrentlyActive(placement) ? <StatusBadge tone="success">Public Now</StatusBadge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Link className="font-semibold text-omd-ops" href={`/admin/promotions/${placement.id}/edit`}>Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
