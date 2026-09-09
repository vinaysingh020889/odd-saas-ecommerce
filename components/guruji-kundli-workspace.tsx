import Link from "next/link";
import { AdminPanel, EmptyState, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { checklistItemStatusLabel, isKundliAutomaticChecklistItem } from "@/lib/checklists";
import {
  addGurujiKundliReportRecoverableAction,
  getGurujiKundliWorkDetail,
  getGurujiKundliWorkspace,
  updateGurujiKundliChecklistItemAction,
  updateGurujiKundliWorkAction,
  updateGurujiKundliWorkRecoverableAction
} from "@/lib/kundli-guruji-workspace";
import { kundliReportVersionFromStorageKey } from "@/lib/kundli-report-storage";
import { RecoverableActionForm } from "@/components/recoverable-action-form";

function riskTone(value: string | null) {
  return value === "OVERDUE" ? "error" : value === "DUE_SOON" ? "warning" : "success";
}

export async function GurujiKundliQueue() {
  const workspace = await getGurujiKundliWorkspace();
  const currentLeave = workspace.profile.unavailability.find((item) => item.startsAt <= new Date() && item.endsAt >= new Date());
  return <div className="grid gap-6">
    <PageHeader eyebrow="Guruji Workspace" title="My Kundli Work" description="Your current primary Kundli assignments, ordered by operational priority." tone="admin" actions={<StatusBadge tone={workspace.profile.acceptingWork ? "success" : "warning"}>{workspace.profile.displayName}</StatusBadge>}/>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <AdminPanel><SummaryRow label="New / assigned" value={workspace.counts.assigned} strong/></AdminPanel>
      <AdminPanel><SummaryRow label="In review" value={workspace.counts.inReview} strong/></AdminPanel>
      <AdminPanel><SummaryRow label="Report ready" value={workspace.counts.reportReady} strong/></AdminPanel>
      <AdminPanel><SummaryRow label="Due soon" value={workspace.counts.dueSoon} strong/></AdminPanel>
      <AdminPanel><SummaryRow label="Overdue" value={workspace.counts.overdue} strong/></AdminPanel>
      <AdminPanel><SummaryRow label="Completed" value={workspace.history.length} strong/></AdminPanel>
    </section>
    <section className="grid gap-5 xl:grid-cols-[1fr_330px]">
      <AdminPanel className="overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-semibold text-slate-950">My active queue</h2><p className="text-sm text-slate-600">Priority, workload and assignment time determine this order.</p>
</div>
        {workspace.queue.length === 0 ? <div className="p-5"><EmptyState title="No active Kundli work" description="New work will appear here after an active primary assignment is created for you."/></div> : <div className="overflow-x-auto"><table className="min-w-[1050px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{["Order","Customer","Package","Language","Assigned","Promised delivery","Risk","Next action"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{workspace.queue.map(({ assignment, order, deliveryRisk, nextAction }) => <tr key={assignment.id} className="hover:bg-slate-50"><td className="px-4 py-3"><Link href={"/admin/my-work/KUNDLI_ORDER/" + order.id} className="font-semibold text-omd-ops">{order.orderNo ?? order.id}</Link></td><td className="px-4 py-3 font-medium">{order.applicantName}</td><td className="px-4 py-3">{order.package.name}</td><td className="px-4 py-3">{order.languagePreference ?? "Not specified"}</td><td className="px-4 py-3">{assignment.createdAt.toLocaleString("en-IN")}</td><td className="px-4 py-3">{order.promisedDeliveryAt?.toLocaleString("en-IN") ?? "Not set"}</td><td className="px-4 py-3">{deliveryRisk ? <StatusBadge tone={riskTone(deliveryRisk)}>{statusLabel(deliveryRisk)}</StatusBadge> : "\u2014"}</td><td className="px-4 py-3 font-semibold">{nextAction}</td></tr>)}</tbody></table></div>}
      </AdminPanel>
      <div className="grid h-fit gap-5">
        <AdminPanel><h2 className="font-semibold text-slate-950">Capacity</h2><div className="mt-4 grid gap-3"><SummaryRow label="Active workload" value={workspace.capacity.active}/><SummaryRow label="Today" value={workspace.capacity.daily + " / " + workspace.profile.dailyActiveOrderLimit}/><SummaryRow label="This week" value={workspace.capacity.weekly + " / " + workspace.profile.weeklyActiveOrderLimit}/><SummaryRow label="This month" value={workspace.capacity.monthly + " / " + workspace.profile.monthlyActiveOrderLimit}/></div></AdminPanel>
        <AdminPanel><h2 className="font-semibold text-slate-950">Availability</h2><StatusBadge tone={currentLeave ? "warning" : "success"}>{currentLeave ? "Currently unavailable" : "Available"}</StatusBadge><div className="mt-3 grid gap-2 text-sm">{workspace.profile.unavailability.slice(0, 4).map((item) => <div key={item.id} className="rounded-md bg-slate-50 p-3"><p className="font-medium">{item.startsAt.toLocaleString("en-IN")} {"\u2013"} {item.endsAt.toLocaleString("en-IN")}</p>
<p className="text-slate-600">{item.reason ?? "Unavailable"}</p>
</div>)}{workspace.profile.unavailability.length === 0 ? <p className="text-slate-600">No active leave ranges.</p>
 : null}</div></AdminPanel>
      </div>
    </section>
    <AdminPanel className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-5 py-4"><h2 className="text-lg font-semibold text-slate-950">Completed Kundli work</h2><p className="text-sm text-slate-600">Your delivered and completed assignments remain available as read-only history.</p></div>
      {workspace.history.length === 0 ? <div className="p-5"><EmptyState title="No completed Kundli work" description="Finished assignments will remain available here."/></div> : <div className="overflow-x-auto"><table className="min-w-[800px] text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-600"><tr>{["Order","Customer","Package","Status","Completed"].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{workspace.history.map(({ assignment, order }) => <tr key={assignment.id}><td className="px-4 py-3"><Link href={"/admin/my-work/KUNDLI_ORDER/" + order.id} className="font-semibold text-omd-ops">{order.orderNo ?? order.id}</Link></td><td className="px-4 py-3">{order.applicantName}</td><td className="px-4 py-3">{order.package.name}</td><td className="px-4 py-3"><StatusBadge tone="success">{statusLabel(order.status)}</StatusBadge></td><td className="px-4 py-3">{assignment.endedAt?.toLocaleString("en-IN") ?? assignment.updatedAt.toLocaleString("en-IN")}</td></tr>)}</tbody></table></div>}
    </AdminPanel>
  </div>;
}

function DataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="rounded-md border border-slate-200 p-3"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
<div className="mt-1 text-sm font-medium text-slate-950">{value || "Not provided"}</div></div>;
}

export async function GurujiKundliDetail({ orderId }: { orderId: string }) {
  const { user, assignment, order, checklist, reports, deliveryRisk } = await getGurujiKundliWorkDetail(orderId);
  const readOnly = assignment.status === "COMPLETED" || Boolean(assignment.endedAt);
  const canPrepare = !readOnly && ["ASSIGNED", "IN_REVIEW"].includes(order.status);
  return <div className="grid gap-6">
    <PageHeader eyebrow="Assigned Kundli" title={order.orderNo ?? order.id} description={order.package.name} tone="admin" actions={<Link href="/admin/my-work" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Back to my work</Link>}/>
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-5">
        <AdminPanel><div className="flex flex-wrap gap-2"><StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge><StatusBadge tone={statusTone(order.reportStatus)}>{statusLabel(order.reportStatus)}</StatusBadge>{deliveryRisk ? <StatusBadge tone={riskTone(deliveryRisk)}>{statusLabel(deliveryRisk)}</StatusBadge> : null}</div><div className="mt-4 grid gap-3 md:grid-cols-2"><DataRow label="Customer" value={order.applicantName}/><DataRow label="Operational contact" value={<>{order.applicantPhone}<br/>{order.applicantEmail}</>}/><DataRow label="Language" value={order.languagePreference}/><DataRow label="Promised delivery" value={order.promisedDeliveryAt?.toLocaleString("en-IN")}/></div></AdminPanel>
        <AdminPanel><h2 className="text-lg font-semibold">Birth and report details</h2><div className="mt-4 grid gap-3 md:grid-cols-2"><DataRow label="Birth name" value={order.birthName}/><DataRow label="Gender" value={order.gender}/><DataRow label="Date of birth" value={order.dateOfBirth?.toLocaleDateString("en-IN")}/><DataRow label="Time of birth" value={order.timeOfBirth}/><DataRow label="Place of birth" value={order.placeOfBirth}/><DataRow label="Customer concern" value={order.questionOrConcern}/></div>{order.partnerName || order.package.deliveryMode === "MATCHMAKING" ? <><h3 className="mt-5 font-semibold">Matching details</h3><div className="mt-3 grid gap-3 md:grid-cols-2"><DataRow label="Partner name" value={order.partnerName}/><DataRow label="Partner date of birth" value={order.partnerDateOfBirth?.toLocaleDateString("en-IN")}/><DataRow label="Partner birth time" value={order.partnerTimeOfBirth}/><DataRow label="Partner birth place" value={order.partnerPlaceOfBirth}/></div></> : null}</AdminPanel>
        <AdminPanel><h2 className="text-lg font-semibold">Work progress</h2><p className="mt-1 text-sm text-slate-600">Only internal preparation states are available. Final delivery remains an admin action.</p>
{readOnly ? <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">This assignment is completed and retained as read-only work history.</p> : null}<div className="mt-4 flex flex-wrap gap-3">{!readOnly && order.status === "ASSIGNED" ? <form action={updateGurujiKundliWorkAction}><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="command" value="START"/><button className="rounded-md bg-omd-ops px-4 py-2 text-sm font-semibold text-white">Mark work started</button></form> : null}{!readOnly && order.status === "IN_REVIEW" ? <form action={updateGurujiKundliWorkAction}><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="command" value="REPORT_IN_PROGRESS"/><button className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold">Mark report preparation in progress</button></form> : null}{!readOnly && order.status === "IN_REVIEW" ? <RecoverableActionForm action={updateGurujiKundliWorkRecoverableAction} buttonLabel="Mark report ready for admin review" pendingLabel="Marking ready..." buttonClassName="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="command" value="REPORT_READY"/></RecoverableActionForm> : null}</div>{!readOnly ? <form action={updateGurujiKundliWorkAction} className="mt-4 grid gap-3"><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="command" value="NOTE"/><textarea name="note" required rows={3} placeholder="Internal work note" className="rounded-md border border-slate-300 px-3 py-2"/><button className="w-fit rounded-md border border-omd-ops px-4 py-2 text-sm font-semibold text-omd-ops">Add internal note</button></form> : null}{assignment.internalNote ? <p className="mt-4 rounded-md bg-slate-50 p-3 text-sm">{assignment.internalNote}</p>
 : null}</AdminPanel>
        {checklist ? <AdminPanel><h2 className="text-lg font-semibold">Work checklist</h2><p className="mt-1 text-sm text-slate-600">{checklist.progressPercent}% complete {"\u00B7"} {checklist.requiredPendingCount} required pending</p>
<div className="mt-4 grid gap-3">{checklist.items.map((item) => { const roleOwned = item.assignedRole?.toUpperCase().includes("ASTROLOGER") || item.assignedRole?.toUpperCase().includes("GURUJI"); const mayUpdate = !readOnly && !isKundliAutomaticChecklistItem(item.title) && Boolean(roleOwned) && (!item.assignedUserId || item.assignedUserId === user.id); return <div key={item.id} className="rounded-md border border-slate-200 p-3"><div className="flex justify-between gap-2"><p className="font-semibold">{item.title}</p>
<StatusBadge tone={statusTone(item.status)}>{checklistItemStatusLabel(item.status)}</StatusBadge></div>{item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p>
 : null}{mayUpdate ? <form action={updateGurujiKundliChecklistItemAction} className="mt-3 grid gap-2 md:grid-cols-[150px_1fr_auto]"><input type="hidden" name="orderId" value={order.id}/><input type="hidden" name="itemId" value={item.id}/><select name="status" defaultValue={item.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">{["pending","in_progress","blocked","completed"].map((status) => <option key={status} value={status}>{checklistItemStatusLabel(status)}</option>)}</select><input name="note" defaultValue={item.internalNote ?? item.blockedReason ?? ""} placeholder="Internal checklist note" className="h-10 rounded-md border border-slate-300 px-3 text-sm"/><button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold">Save</button></form> : <p className="mt-2 text-xs text-slate-500">Read-only system or Operations task.</p>
}</div>; })}</div></AdminPanel> : null}
      </div>
      <div className="grid h-fit gap-5">
        <AdminPanel><h2 className="font-semibold">Supporting documents</h2><div className="mt-3 grid gap-2">{order.documents.map((item) => <div key={item.id} className="rounded-md bg-slate-50 p-3 text-sm"><p className="font-medium">{item.filename ?? statusLabel(item.type)}</p>
{item.fileUrl ? <Link href={item.fileUrl} className="text-omd-ops">Open document</Link> : <p className="text-slate-500">No file link</p>
}</div>)}{order.documents.length === 0 ? <p className="text-sm text-slate-600">No approved supporting documents.</p>
 : null}</div></AdminPanel>
        <AdminPanel><h2 className="font-semibold">Prepared report</h2><p className="mt-1 text-sm text-slate-600">Reports remain internal until an admin completes customer delivery.</p>
{canPrepare ? <RecoverableActionForm action={addGurujiKundliReportRecoverableAction} className="mt-4 grid gap-3" buttonLabel="Upload private report" pendingLabel="Uploading..." buttonClassName="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"><input type="hidden" name="orderId" value={order.id}/><input name="title" defaultValue="Prepared Kundli report" className="h-10 rounded-md border border-slate-300 px-3 text-sm"/><label className="grid gap-2 text-sm font-medium text-slate-700">Private PDF report<input name="reportFile" type="file" accept=".pdf,application/pdf" required className="rounded-md border border-slate-300 px-3 py-2 text-sm"/><span className="text-xs font-normal text-slate-500">PDF only, maximum 10 MB.</span></label><textarea name="note" rows={3} placeholder="Internal report note" className="rounded-md border border-slate-300 px-3 py-2 text-sm"/></RecoverableActionForm> : null}<div className="mt-4 grid gap-2">{reports.map((report) => <div key={report.id} className="rounded-md border border-slate-200 p-3 text-sm"><div className="flex gap-2"><StatusBadge tone={statusTone(report.status)}>{statusLabel(report.status)}</StatusBadge><StatusBadge tone="neutral">Internal only</StatusBadge>{kundliReportVersionFromStorageKey(report.storageKey) ? <StatusBadge tone="ops">Version {kundliReportVersionFromStorageKey(report.storageKey)}</StatusBadge> : null}</div><p className="mt-2 font-semibold">{report.title}</p>
{report.rejectionReason ? <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-red-800">Correction requested: {report.rejectionReason}</p> : null}
{report.storageKey && !report.fileUrl && report.mimeType === "application/pdf" ? <Link href={`/admin/my-work/kundli-reports/${report.id}/download`} className="text-omd-ops">Open private report</Link> : report.fileUrl ? <p className="text-amber-700">Legacy external report — not a production-secure upload.</p> : null}</div>)}{reports.length === 0 ? <p className="text-sm text-slate-600">No prepared report attached.</p>
 : null}</div></AdminPanel>
      </div>
    </section>
  </div>;
}
