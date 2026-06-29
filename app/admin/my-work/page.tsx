import Link from "next/link";
import { getRestrictedWorkSummary, addSupportNoteAction } from "@/lib/restricted-work";
import { prisma } from "@/lib/prisma";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";

function workHref(workType: string, workId: string) {
  return `/admin/my-work/${workType}/${workId}`;
}

function dueText(value: Date | null) {
  return value ? value.toLocaleString("en-IN") : "No due date";
}

export default async function AdminMyWorkPage() {
  const { user, tenantId, assignments, checklistItems, recentNotes } = await getRestrictedWorkSummary();
  const isSupport = user.roles.some((role) => ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"].includes(role));
  const customers = isSupport
    ? await prisma.user.findMany({
        where: { tenantId, roles: { some: { role: { key: "CUSTOMER" } } } },
        select: { id: true, name: true, email: true, phone: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
        take: 40
      })
    : [];

  const openAssignments = assignments.filter((assignment) => !["COMPLETED", "CANCELLED"].includes(assignment.status)).length;
  const blockedChecklist = checklistItems.filter((item) => item.status === "blocked").length;
  const overdueChecklist = checklistItems.filter((item) => item.dueAt && item.dueAt < new Date() && !["completed", "skipped"].includes(item.status)).length;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Restricted Workbench"
        title="My Work"
        description="Assigned operational work, checklist tasks, support notes, and safe proof or dispatch placeholders for your role."
        tone="admin"
        actions={<StatusBadge tone="ops">{user.roles.join(", ")}</StatusBadge>}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <AdminPanel>
          <SummaryRow label="Open assignments" value={openAssignments} strong />
        </AdminPanel>
        <AdminPanel>
          <SummaryRow label="Checklist tasks" value={checklistItems.length} strong />
        </AdminPanel>
        <AdminPanel>
          <SummaryRow label="Blocked / overdue" value={`${blockedChecklist} / ${overdueChecklist}`} strong />
        </AdminPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="grid gap-5">
          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Assigned Work</h2>
            <div className="mt-4 grid gap-3">
              {assignments.length === 0 ? <p className="text-sm text-slate-600">No assigned work is visible for this role yet.</p> : null}
              {assignments.map((assignment) => (
                <Link key={assignment.id} href={workHref(assignment.workType, assignment.workId)} className="rounded-md border border-slate-200 bg-slate-50 p-4 hover:border-omd-ops hover:bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(assignment.status)}>{statusLabel(assignment.status)}</StatusBadge>
                      <StatusBadge tone={statusTone(assignment.priority)}>{statusLabel(assignment.priority)}</StatusBadge>
                    </div>
                    <span className="text-xs text-slate-500">{dueText(assignment.dueAt)}</span>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-950">{assignment.assignmentLabel ?? assignment.assignedRole ?? statusLabel(assignment.workType)}</h3>
                  <p className="mt-1 text-sm text-slate-600">{statusLabel(assignment.workType)} - {assignment.workId}</p>
                  <p className="mt-1 text-xs text-slate-500">Owner: {assignment.assignedUser?.name ?? assignment.assignedUser?.email ?? assignment.assignedRole ?? "Role assignment"}</p>
                </Link>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Checklist Queue</h2>
            <div className="mt-4 grid gap-3">
              {checklistItems.length === 0 ? <p className="text-sm text-slate-600">No checklist items are assigned to you or your role.</p> : null}
              {checklistItems.map((item) => (
                <Link key={item.id} href={workHref(item.checklistInstance.relatedType === "ORDER_FULFILMENT" ? "ORDER" : item.checklistInstance.relatedType, item.checklistInstance.relatedId)} className="rounded-md border border-slate-200 bg-white p-4 hover:border-omd-ops">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                    <span className="text-xs text-slate-500">{dueText(item.dueAt)}</span>
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{statusLabel(item.checklistInstance.relatedType)} - {item.assignedUser?.name ?? item.assignedUser?.email ?? item.assignedRole ?? "Assigned role"}</p>
                  {item.blockedReason ? <p className="mt-2 text-xs font-semibold text-red-700">Blocked: {item.blockedReason}</p> : null}
                </Link>
              ))}
            </div>
          </AdminPanel>
        </div>

        {isSupport ? (
          <div className="grid h-fit gap-5">
            <AdminPanel>
              <h2 className="text-lg font-semibold text-slate-950">Add Support Note</h2>
              <form action={addSupportNoteAction} className="mt-4 grid gap-3">
                <input type="hidden" name="redirectTo" value="/admin/my-work" />
                <select name="customerId" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name ?? customer.email ?? customer.phone ?? customer.id}</option>
                  ))}
                </select>
                <input name="category" defaultValue="SUPPORT" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <textarea name="note" required rows={4} placeholder="Internal support/customer note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add note</button>
              </form>
            </AdminPanel>

            <AdminPanel>
              <h2 className="text-lg font-semibold text-slate-950">Recent Support Notes</h2>
              <div className="mt-4 grid gap-3">
                {recentNotes.map((note) => (
                  <div key={note.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-950">{note.customer.name ?? note.customer.email ?? "Customer"}</p>
                    <p className="mt-1 text-slate-600">{note.note}</p>
                    <p className="mt-1 text-xs text-slate-500">{note.createdAt.toLocaleString("en-IN")} by {note.createdBy.name ?? note.createdBy.email}</p>
                  </div>
                ))}
              </div>
            </AdminPanel>
          </div>
        ) : null}
      </section>
    </div>
  );
}
