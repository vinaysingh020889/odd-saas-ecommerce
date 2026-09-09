import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { getKundliAdminQueue } from "@/lib/kundli-admin";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = { searchParams: Promise<{ state?: string; guruji?: string; packageId?: string; customerSelected?: string; conflict?: string }> };
function riskTone(risk: string | null) { return risk === "OVERDUE" ? "error" as const : risk === "DUE_SOON" ? "warning" as const : "success" as const; }

export default async function AdminKundliPage({ searchParams }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const [queue, practitioners, packages] = await Promise.all([
    getKundliAdminQueue(tenantId, { state: params.state, guruji: params.guruji, packageId: params.packageId, customerSelected: params.customerSelected === "1", conflict: params.conflict === "1" }),
    prisma.kundliPractitionerProfile.findMany({ where: { tenantId, active: true }, select: { id: true, displayName: true }, orderBy: { displayName: "asc" } }),
    prisma.kundliPackage.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  const cards = [
    ["Waiting for details", queue.counts.detailsPending, "DETAILS_PENDING"],
    ["Awaiting assignment", queue.counts.awaiting, "AWAITING_ASSIGNMENT"], ["Assigned", queue.counts.assigned, "ASSIGNED"], ["In review", queue.counts.inReview, "IN_REVIEW"],
    ["Report ready", queue.counts.reportReady, "REPORT_READY"], ["Consultation", queue.counts.consultation, "CONSULTATION_SCHEDULED"], ["Closed", queue.counts.completed, "COMPLETED"], ["Due soon", queue.counts.dueSoon, "DUE_SOON"], ["Overdue", queue.counts.overdue, "OVERDUE"]
  ] as const;
  return <div className="grid gap-6">
    <PageHeader eyebrow="Kundli Operations" title="Kundli Queue" description="Assignment, delivery-risk and fulfilment queue powered by the Kundli assignment engine. Birth details remain confined to the order detail." tone="admin" actions={<><Link href="/admin/kundli/practitioners" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white">Manage Gurujis</Link><Link href="/admin/kundli/packages" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Packages</Link></>} />
    <section className="grid gap-3 md:grid-cols-4 xl:grid-cols-9">{cards.map(([label, value, state]) => <Link key={state} href={`/admin/kundli?state=${state}`}><AdminPanel className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p></AdminPanel></Link>)}</section>
    <AdminPanel><form className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto_auto_auto]"><select name="state" defaultValue={params.state ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All operational states</option>{["DETAILS_PENDING","SUBMITTED","AWAITING_ASSIGNMENT","ASSIGNED","IN_REVIEW","REPORT_READY","CONSULTATION_SCHEDULED","COMPLETED","DUE_SOON","OVERDUE"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}</select><select name="guruji" defaultValue={params.guruji ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All Gurujis</option>{practitioners.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select><select name="packageId" defaultValue={params.packageId ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm"><option value="">All packages</option>{packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="customerSelected" value="1" defaultChecked={params.customerSelected === "1"}/>Customer request</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="conflict" value="1" defaultChecked={params.conflict === "1"}/>Conflict</label><button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Filter</button></form></AdminPanel>
    {queue.filtered.length === 0 ? <EmptyState title="No matching Kundli work" description="No order matches the selected operational filters."/> : <AdminPanel className="overflow-hidden p-0"><div className="overflow-x-auto"><table className="min-w-[1400px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{["Order / customer","Package","Requested Guruji","Current Guruji","Source / priority","State","Queue","Promise / risk","Next action"].map((item) => <th key={item} className="px-4 py-3">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{queue.filtered.map((item) => <tr key={item.id} className="align-top hover:bg-slate-50">
<td className="px-4 py-3"><Link href={`/admin/kundli/${item.orderNo ?? item.id}`} className="font-semibold text-omd-ops">{item.orderNo ?? "Draft request"}</Link><p className="mt-1 font-medium text-slate-800">{item.applicantName}</p><p className="text-xs text-slate-500">{item.applicantEmail}</p></td>

<td className="px-4 py-3 font-semibold">{item.package.name}<p className="mt-1 text-xs font-normal text-slate-500">{statusLabel(item.package.practitionerSelectionMode)}</p></td>

<td className="px-4 py-3">{item.requestedPractitionerProfile?.displayName ?? "\u2014"}</td>

<td className="px-4 py-3 font-semibold">{item.assignment?.assignedUser?.kundliPractitionerProfile?.displayName ?? "Unassigned"}</td>

<td className="px-4 py-3">{item.assignment ? <><StatusBadge tone="ops">{statusLabel(item.assignment.source)}</StatusBadge><p className="mt-1 text-xs">{statusLabel(item.assignment.priority)}</p></> : "\u2014"}</td>

<td className="px-4 py-3"><div className="grid gap-2"><StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge><StatusBadge tone={statusTone(item.assignmentState)}>{statusLabel(item.assignmentState)}</StatusBadge>{item.conflict ? <StatusBadge tone="error">{item.internalNote ?? "Assignment blocked"}</StatusBadge> : null}</div></td>

<td className="px-4 py-3">{item.assignmentQueuePosition ?? (item.assignment ? "Assigned" : "\u2014")}</td>

<td className="px-4 py-3">{item.promisedDeliveryAt ? <><p>{item.promisedDeliveryAt.toLocaleString("en-IN")}</p><StatusBadge tone={riskTone(item.deliveryRisk)}>{statusLabel(item.deliveryRisk ?? "ON_TRACK")}</StatusBadge></> : "Not promised"}</td>

<td className="px-4 py-3 font-semibold">{item.nextAction}</td>
</tr>)}</tbody></table></div></AdminPanel>}
  </div>;
}
