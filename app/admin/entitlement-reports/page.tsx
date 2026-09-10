import { requireAdminRole } from "@/lib/admin-auth";
import { getOmdTenantId, formatMoney } from "@/lib/catalog";
import { getEntitlementOperationsReport, processExpiredMembershipReservations } from "@/lib/entitlement-operations";
import { AdminPanel, PageHeader, SummaryRow } from "@/components/ui";

export default async function EntitlementReportsPage() {
  await requireAdminRole(["SUPER_ADMIN","OPERATIONS_ADMIN"]); const tenantId=await getOmdTenantId();
  await processExpiredMembershipReservations(tenantId);
  const report=await getEntitlementOperationsReport(tenantId);
  return <div className="grid gap-6"><PageHeader eyebrow="Finance and operations" title="Membership obligation report" description="Outstanding reservations, consumed benefits, reversals, releases, savings, and overdue fulfilment across every module." tone="admin"/>
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><AdminPanel><SummaryRow label="Outstanding liability" value={formatMoney(report.outstandingLiability)} strong/><SummaryRow label="Active reservations" value={report.reservations.count}/></AdminPanel><AdminPanel><SummaryRow label="Net member savings" value={formatMoney(report.netSavings)} strong/><SummaryRow label="Consumed" value={report.consumption.count}/></AdminPanel><AdminPanel><SummaryRow label="Reversed / released" value={`${report.reversals.count} / ${report.releases.count}`} strong/><SummaryRow label="Reversed value" value={formatMoney(report.reversals.amount)}/></AdminPanel><AdminPanel><SummaryRow label="Overdue claims" value={report.overdueClaims} strong/><SummaryRow label="Overdue offerings" value={report.overdueOfferings}/></AdminPanel></section>
    <AdminPanel><h2 className="font-semibold">Accounting policy</h2><p className="mt-2 text-sm leading-6 text-slate-600">Reserved savings are outstanding obligations. Consumed savings enter customer history. Cancellation before fulfilment releases a reservation; eligible refunds reverse consumed usage and savings. Normal order refunds remain the source of truth for reward product money and inventory.</p></AdminPanel>
  </div>;
}
