import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function AdminOffersPage() {
  const tenantId = await getOmdTenantId();
  const offers = await prisma.offerRule.findMany({
    where: { tenantId },
    include: { _count: { select: { targets: true, redemptions: true } } },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Commerce"
        title="Offers & Discounts"
        description="Manage automatic offers, coupon codes, targeted discounts, and cashback promises. Wallet ledger remains disabled."
        tone="admin"
        actions={<Link href="/admin/offers/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white">New offer</Link>}
      />
      {offers.length === 0 ? (
        <EmptyState title="No offers configured" description="Create automatic or coupon offers to power cart and checkout pricing." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr><th className="px-4 py-3">Offer</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Targets</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Action</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {offers.map((offer) => (
                <tr key={offer.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-950">{offer.title}</p>
                    <p className="text-xs text-slate-500">{offer.ruleType}{offer.code ? ` - ${offer.code}` : ""} - priority {offer.priority}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {offer.discountKind === "FLAT" ? formatMoney(offer.discountValue) : `${offer.discountValue}%`}
                    {offer.maxDiscountAmount ? ` cap ${formatMoney(offer.maxDiscountAmount)}` : ""}
                  </td>
                  <td className="px-4 py-3"><StatusBadge tone={statusTone(offer.status)}>{statusLabel(offer.status)}</StatusBadge></td>
                  <td className="px-4 py-3 text-slate-600">{offer.targetScope} - {offer._count.targets}</td>
                  <td className="px-4 py-3 text-slate-600">{offer._count.redemptions}{offer.usageLimit ? ` / ${offer.usageLimit}` : ""}</td>
                  <td className="px-4 py-3"><Link href={`/admin/offers/${offer.id}/edit`} className="font-semibold text-omd-ops">Edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
