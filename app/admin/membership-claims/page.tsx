import Link from "next/link";
import { requireAdminRole } from "@/lib/admin-auth";
import { getOmdTenantId, formatMoney } from "@/lib/catalog";
import { syncMembershipClaimAlerts, type ClaimView } from "@/lib/membership-claims";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = { searchParams: Promise<{ view?: string; claim?: string }> };
const views: ClaimView[] = ["NEW", "PENDING", "DUE", "OVERDUE", "FULFILLED", "CANCELLED", "EXCEPTION"];

export default async function MembershipClaimsPage({ searchParams }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const claims = await syncMembershipClaimAlerts(tenantId);
  const selectedView = views.includes(params.view as ClaimView) ? params.view as ClaimView : null;
  const filtered = claims.filter((item) => (!selectedView || item.view === selectedView) && (!params.claim || item.id === params.claim));
  return <div className="grid gap-6"><PageHeader eyebrow="Membership Operations" title="Membership Claims Queue" description="Track complimentary Kundli and physical-product claims from reservation through payment, fulfilment, delivery, cancellation, and exceptions." tone="admin" />
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">{views.map((view) => <Link key={view} href={`/admin/membership-claims?view=${view}`}><AdminPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">{view.replaceAll("_", " ")}</p><p className="mt-2 text-2xl font-semibold">{claims.filter((item) => item.view === view).length}</p></AdminPanel></Link>)}</section>
    {filtered.length === 0 ? <EmptyState title="No matching membership claims" description="Claims appear here as members reserve Kundli entitlements." /> : <AdminPanel className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="min-w-[1100px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{["Claim / customer", "Benefit", "Plan", "Fulfilment", "Financial snapshot", "State", "Next action"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{filtered.map((claim) => <tr key={claim.id} className="align-top"><td className="px-4 py-3"><p className="font-semibold">{claim.id}</p><p className="mt-1">{claim.user.name ?? claim.user.email ?? "Customer"}</p><p className="text-xs text-slate-500">{claim.createdAt.toLocaleString("en-IN")}</p></td><td className="px-4 py-3 font-semibold">{claim.benefit.title}<p className="mt-1 text-xs font-normal text-slate-500">{claim.quantity} unit · {claim.periodKey}</p></td><td className="px-4 py-3">{claim.userMembership.planVersion?.name ?? claim.userMembership.plan.name}</td><td className="px-4 py-3">{claim.subjectHref ? <Link className="font-semibold text-omd-ops" href={claim.subjectHref}>{claim.subjectTitle}</Link> : "Missing fulfilment record"}<p className="mt-1 text-xs text-slate-500">{claim.orderStatus ?? "—"}</p></td><td className="px-4 py-3"><p>{formatMoney(claim.originalAmount)} list</p><p className="text-emerald-700">-{formatMoney(claim.savingAmount)} benefit</p><p className="font-semibold">{formatMoney(claim.finalAmount)} payable</p></td><td className="px-4 py-3"><StatusBadge tone={claim.view === "OVERDUE" || claim.view === "EXCEPTION" ? "error" : claim.view === "FULFILLED" ? "success" : claim.view === "CANCELLED" ? "neutral" : "warning"}>{claim.view}</StatusBadge><p className="mt-2 text-xs text-slate-500">Ledger: {claim.status}</p></td><td className="px-4 py-3">{claim.view === "NEW" ? "Confirm payment or zero-pay details" : claim.view === "PENDING" ? "Follow fulfilment workflow" : claim.view === "DUE" ? "Prioritize delivery" : claim.view === "OVERDUE" ? "Escalate fulfilment" : claim.view === "EXCEPTION" ? "Review reservation/payment" : "No action required"}</td></tr>)}</tbody></table></div></AdminPanel>}
  </div>;
}
