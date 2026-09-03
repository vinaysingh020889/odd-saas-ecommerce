import Link from "next/link";
import type { CustomerAccountCategory, Prisma } from "@prisma/client";
import { requireCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId, formatMoney } from "@/lib/catalog";
import { getActiveMembershipForUser } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { customerAccountEntryHref, summarizeCustomerAccountEntries } from "@/lib/customer-account";
import { BreadcrumbHeader, EmptyState, Panel, StatusBadge, SummaryRow } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";

type PageProps = { searchParams: Promise<{ filter?: string }> };

const filters = [
  { key: "all", label: "All", categories: [] },
  { key: "orders", label: "Orders & Kits", categories: ["PRODUCT_ORDER", "KIT_ORDER"] },
  { key: "services", label: "Services", categories: ["SERVICE_BOOKING", "ASTHI_APPLICATION", "KUNDLI_ORDER", "PUJA_BOOKING"] },
  { key: "membership", label: "Membership", categories: ["MEMBERSHIP"] },
  { key: "payments", label: "Payments & Refunds", categories: ["PAYMENT", "REFUND"] },
  { key: "changes", label: "Cancellations & Returns", categories: ["CANCELLATION", "RETURN"] }
] satisfies Array<{ key: string; label: string; categories: CustomerAccountCategory[] }>;

export default async function CustomerAccountActivityPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const selected = filters.find((item) => item.key === params.filter) ?? filters[0];
  const where: Prisma.CustomerAccountEntryWhereInput = {
    tenantId,
    userId: user.id,
    visibility: "CUSTOMER_VISIBLE",
    ...(selected.categories.length ? { category: { in: selected.categories } } : {})
  };
  const [entries, allEntries, activeMembership] = await Promise.all([
    prisma.customerAccountEntry.findMany({ where, orderBy: [{ entryAt: "desc" }, { createdAt: "desc" }], take: 250 }),
    prisma.customerAccountEntry.findMany({
      where: { tenantId, userId: user.id, visibility: "CUSTOMER_VISIBLE" },
      select: { actionType: true, relatedEntityType: true, relatedEntityId: true, sourceId: true, grossAmount: true, paidAmount: true, refundedAmount: true }
    }),
    getActiveMembershipForUser(user.id)
  ]);
  const summary = summarizeCustomerAccountEntries(allEntries);

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Account Activity" }]} />
      <section>
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Account Statement</p>
        <h1 className="mt-2 text-3xl font-semibold text-omd-brown">Your OMD activity</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-omd-muted">A customer-safe history of orders, services, memberships, payments, requests, and completed refunds.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Panel><SummaryRow label="Total paid" value={formatMoney(summary.totalPaid)} strong /></Panel>
        <Panel><SummaryRow label="Total refunded" value={formatMoney(summary.totalRefunded)} strong /></Panel>
        <Panel><SummaryRow label="Net spent" value={formatMoney(summary.netSpent)} strong /></Panel>
        <Panel><SummaryRow label="Active membership" value={activeMembership?.plan.name ?? "None"} strong /></Panel>
      </section>
      {summary.pendingAmount > 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-omd-brown">
          Pending amount: <span className="font-semibold">{formatMoney(summary.pendingAmount)}</span>. Pending payments are not included in total paid or net spent.
        </p>
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label="Account activity filters">
        {filters.map((filter) => (
          <Link key={filter.key} href={filter.key === "all" ? "/account/activity" : `/account/activity?filter=${filter.key}`}
            className={`rounded-full border px-3 py-2 text-sm font-semibold ${selected.key === filter.key ? "border-omd-brown bg-omd-brown text-white" : "border-omd-sand bg-white text-omd-brown hover:border-omd-gold"}`}>
            {filter.label}
          </Link>
        ))}
      </nav>

      {entries.length === 0 ? (
        <EmptyState title="No account activity yet" description="Your completed and pending OMD account activity will appear here." actions={<Link href="/shop" className="font-semibold text-omd-saffron">Browse shop</Link>} />
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => {
            const href = customerAccountEntryHref(entry);
            const amount = Number(entry.paidAmount) || Number(entry.refundedAmount) || Number(entry.grossAmount);
            return (
              <Panel key={entry.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(entry.status)}>{statusLabel(entry.status)}</StatusBadge>
                      <span className="text-xs font-semibold uppercase tracking-wide text-omd-muted">{statusLabel(entry.category)}</span>
                    </div>
                    <h2 className="mt-2 font-semibold text-omd-brown">{entry.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-omd-muted">{entry.description}</p>
                    {entry.customerVisibleNote ? <p className="mt-2 text-sm text-omd-brown">{entry.customerVisibleNote}</p> : null}
                    <p className="mt-2 text-xs text-omd-muted">{entry.entryAt.toLocaleString("en-IN")} · {entry.referenceNumber ?? "No reference"}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    {amount ? <p className="font-semibold text-omd-brown">{entry.refundedAmount.gt(0) ? "-" : ""}{formatMoney(amount, entry.currency)}</p> : <p className="text-sm text-omd-muted">No charge</p>}
                    {href ? <Link href={href} className="mt-2 inline-block text-sm font-semibold text-omd-saffron hover:text-omd-brown">View details</Link> : null}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </div>
  );
}
