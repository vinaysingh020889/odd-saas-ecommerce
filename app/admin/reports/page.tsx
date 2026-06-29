import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getVariantStockSummaries } from "@/lib/inventory";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge } from "@/components/ui";

function MetricCard({ label, value, href, tone = "neutral" }: { label: string; value: string | number; href: string; tone?: "neutral" | "success" | "warning" | "error" | "ops" }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-omd-ops">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-slate-600">{label}</p>
        <StatusBadge tone={tone}>Live</StatusBadge>
      </div>
      <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
    </Link>
  );
}

export default async function AdminReportsPage() {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const [
    orderCount,
    revenue,
    pendingRequests,
    pendingDocuments,
    variants,
    asthiStatuses,
    kundliStatuses,
    membershipStatuses,
    searchLogs,
    topViewedProducts,
    topSearchedTerms,
    topClickedTags,
    checkoutStarts,
    addToCartCount,
    wishlistCount,
    highIntentUsers
  ] = await Promise.all([
    prisma.order.count({ where: { tenantId } }),
    prisma.order.aggregate({ where: { tenantId, paymentStatus: "succeeded" }, _sum: { totalAmount: true } }),
    prisma.orderRequest.count({ where: { tenantId, status: { in: ["submitted", "under_review"] } } }),
    prisma.operationalDocument.count({ where: { tenantId, status: { in: ["UPLOADED", "UNDER_REVIEW", "REUPLOAD_REQUIRED"] } } }),
    prisma.productVariant.findMany({ where: { product: { tenantId, status: "ACTIVE", type: { in: ["PHYSICAL", "KIT"] } } }, select: { id: true } }),
    prisma.asthiApplication.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.kundliOrder.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.userMembership.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.searchQueryLog.groupBy({ by: ["normalizedQuery"], where: { tenantId }, _count: { _all: true }, orderBy: { _count: { normalizedQuery: "desc" } }, take: 8 })
    ,
    prisma.customerEvent.groupBy({ by: ["entitySlug"], where: { tenantId, eventType: "PRODUCT_VIEW", entitySlug: { not: null } }, _count: { _all: true }, orderBy: { _count: { entitySlug: "desc" } }, take: 8 }),
    prisma.customerEvent.groupBy({ by: ["entitySlug"], where: { tenantId, eventType: "SEARCH", entitySlug: { not: null } }, _count: { _all: true }, orderBy: { _count: { entitySlug: "desc" } }, take: 8 }),
    prisma.customerEvent.groupBy({ by: ["entitySlug"], where: { tenantId, eventType: "TAG_CLICK", entitySlug: { not: null } }, _count: { _all: true }, orderBy: { _count: { entitySlug: "desc" } }, take: 8 }),
    prisma.customerEvent.count({ where: { tenantId, eventType: "CHECKOUT_STARTED" } }),
    prisma.customerEvent.count({ where: { tenantId, eventType: "ADD_TO_CART" } }),
    prisma.customerEvent.count({ where: { tenantId, eventType: { in: ["WISHLIST_ADD", "WISHLIST_REMOVE"] } } }),
    prisma.customerEvent.groupBy({
      by: ["userId"],
      where: { tenantId, userId: { not: null }, eventType: { in: ["PRODUCT_VIEW", "ADD_TO_CART", "WISHLIST_ADD", "CHECKOUT_STARTED", "ASTHI_STARTED", "KUNDLI_STARTED"] } },
      _count: { _all: true },
      orderBy: { _count: { userId: "desc" } },
      take: 10
    })
  ]);

  const stock = await getVariantStockSummaries(variants.map((variant) => variant.id));
  const lowStock = [...stock.values()].filter((item) => item.status !== "IN_STOCK").length;
  const paidRevenue = Number(revenue._sum.totalAmount ?? 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Reports"
        title="Reports Dashboard"
        description="Read-only operational metrics for demo and internal control. No export or BI pipeline is connected yet."
        tone="admin"
        actions={<StatusBadge tone="ops">Read-only shell</StatusBadge>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Orders" value={orderCount} href="/admin/orders" tone="ops" />
        <MetricCard label="Mock Paid Revenue" value={formatMoney(paidRevenue)} href="/admin/payments" tone="success" />
        <MetricCard label="Pending Requests" value={pendingRequests} href="/admin/requests" tone={pendingRequests ? "warning" : "neutral"} />
        <MetricCard label="Pending Documents" value={pendingDocuments} href="/admin/documents" tone={pendingDocuments ? "warning" : "neutral"} />
        <MetricCard label="Low / Out Stock" value={lowStock} href="/admin/inventory" tone={lowStock ? "error" : "neutral"} />
        <MetricCard label="Checkout Starts" value={checkoutStarts} href="/admin/customer-events?eventType=CHECKOUT_STARTED" tone="ops" />
        <MetricCard label="Add to Cart" value={addToCartCount} href="/admin/customer-events?eventType=ADD_TO_CART" tone="ops" />
        <MetricCard label="Wishlist Events" value={wishlistCount} href="/admin/customer-events?eventType=WISHLIST_ADD" tone="ops" />
        <MetricCard label="High Intent Users" value={highIntentUsers.length} href="/admin/interest-profiles" tone={highIntentUsers.length ? "warning" : "neutral"} />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Asthi Status Summary</h2>
          <div className="mt-4 grid gap-2">
            {asthiStatuses.length === 0 ? <p className="text-sm text-slate-600">No Asthi applications yet.</p> : null}
            {asthiStatuses.map((item) => (
              <div key={item.status} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                <span className="font-semibold">{item._count._all}</span>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Kundli Status Summary</h2>
          <div className="mt-4 grid gap-2">
            {kundliStatuses.length === 0 ? <p className="text-sm text-slate-600">No Kundli orders yet.</p> : null}
            {kundliStatuses.map((item) => (
              <div key={item.status} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                <span className="font-semibold">{item._count._all}</span>
              </div>
            ))}
          </div>
        </AdminPanel>

        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Membership Summary</h2>
          <div className="mt-4 grid gap-2">
            {membershipStatuses.length === 0 ? <p className="text-sm text-slate-600">No memberships yet.</p> : null}
            {membershipStatuses.map((item) => (
              <div key={item.status} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                <span className="font-semibold">{item._count._all}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">Search Query Summary</h2>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {searchLogs.length === 0 ? <p className="text-sm text-slate-600">No search logs yet.</p> : null}
          {searchLogs.map((item) => (
            <div key={item.normalizedQuery} className="rounded-md border border-slate-100 p-3">
              <p className="font-semibold text-slate-950">{item.normalizedQuery || "blank query"}</p>
              <p className="mt-1 text-sm text-slate-600">{item._count._all} search(es)</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      <section className="grid gap-5 xl:grid-cols-3">
        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Top Viewed Products</h2>
          <div className="mt-4 grid gap-2">
            {topViewedProducts.length === 0 ? <p className="text-sm text-slate-600">No product view events yet.</p> : null}
            {topViewedProducts.map((item) => (
              <div key={item.entitySlug ?? "unknown"} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <span className="text-sm font-semibold text-slate-700">{item.entitySlug}</span>
                <span className="font-semibold">{item._count._all}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Top Event Search Terms</h2>
          <div className="mt-4 grid gap-2">
            {topSearchedTerms.length === 0 ? <p className="text-sm text-slate-600">No search events yet.</p> : null}
            {topSearchedTerms.map((item) => (
              <div key={item.entitySlug ?? "unknown"} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <span className="text-sm font-semibold text-slate-700">{item.entitySlug}</span>
                <span className="font-semibold">{item._count._all}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Top Clicked Tags</h2>
          <div className="mt-4 grid gap-2">
            {topClickedTags.length === 0 ? <p className="text-sm text-slate-600">No tag click events yet.</p> : null}
            {topClickedTags.map((item) => (
              <div key={item.entitySlug ?? "unknown"} className="flex items-center justify-between gap-3 rounded-md border border-slate-100 p-3">
                <span className="text-sm font-semibold text-slate-700">{item.entitySlug}</span>
                <span className="font-semibold">{item._count._all}</span>
              </div>
            ))}
          </div>
        </AdminPanel>
      </section>
    </div>
  );
}
