import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { isCurrentlyActive } from "@/lib/merchandising";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { updateFestivalCampaignStatusAction } from "@/lib/admin-actions";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);
}

export default async function AdminFestivalsPage() {
  const tenantId = await getOmdTenantId();
  const campaigns = await prisma.festivalCampaign.findMany({
    where: { tenantId },
    include: {
      _count: { select: { products: true, services: true, categories: true } }
    },
    orderBy: [{ priority: "desc" }, { startDate: "desc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Merchandising"
        title="Festival Campaigns"
        description="Schedule seasonal storefront experiences and link products, kits, services, and categories."
        tone="admin"
        actions={<Link href="/admin/festivals/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">New festival</Link>}
      />

      {campaigns.length === 0 ? (
        <EmptyState title="No festival campaigns" description="Create a campaign for Raksha Bandhan, Sawan, Shradh, Diwali, or another festival to control storefront merchandising." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Window</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Homepage</th>
                  <th className="px-4 py-3">Links</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{campaign.title}</p>
                      <p className="text-xs text-slate-500">/{campaign.slug} · priority {campaign.priority}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={statusTone(campaign.status)}>{statusLabel(campaign.status)}</StatusBadge>
                        {isCurrentlyActive(campaign) ? <StatusBadge tone="success">Public Now</StatusBadge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {campaign.showOnHomepage ? <StatusBadge tone="ops">Shop</StatusBadge> : null}
                        {campaign.showInHero ? <StatusBadge tone="warning">Hero</StatusBadge> : null}
                        {campaign.showInAnnouncementStrip ? <StatusBadge tone="neutral">Strip</StatusBadge> : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {campaign._count.products} products · {campaign._count.services} services · {campaign._count.categories} categories
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link className="font-semibold text-omd-ops" href={`/admin/festivals/${campaign.id}/edit`}>Edit</Link>
                        <Link className="font-semibold text-omd-ops" href={`/festivals/${campaign.slug}`}>Preview</Link>
                        <form action={updateFestivalCampaignStatusAction}>
                          <input type="hidden" name="id" value={campaign.id} />
                          <input type="hidden" name="status" value={campaign.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE"} />
                          <button className="font-semibold text-slate-700 hover:text-omd-ops">{campaign.status === "ACTIVE" ? "Archive" : "Activate"}</button>
                        </form>
                      </div>
                    </td>
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
