import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { saveAssignmentAction, updateAssignmentStatusAction } from "@/lib/service-capacity";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ workType?: string; status?: string; priority?: string; dueDate?: string; q?: string }>;
};

const workTypes = ["ASTHI_APPLICATION", "KUNDLI_ORDER", "ORDER", "ORDER_REQUEST", "SERVICE_BOOKING", "GENERAL_TASK"];
const statuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];

function dateValue(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export default async function AdminAssignmentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const dueDate = dateValue(params.dueDate);
  const users = await prisma.user.findMany({
    where: { tenantId, status: "ACTIVE" },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    take: 100
  });
  const assignments = await prisma.assignment.findMany({
    where: {
      tenantId,
      ...(params.workType ? { workType: params.workType } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.priority ? { priority: params.priority } : {}),
      ...(dueDate ? { dueAt: dueDate } : {}),
      ...(params.q
        ? {
            OR: [
              { workId: { contains: params.q, mode: "insensitive" } },
              { assignmentLabel: { contains: params.q, mode: "insensitive" } },
              { assignedRole: { contains: params.q, mode: "insensitive" } },
              { internalNote: { contains: params.q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: {
      assignedUser: { select: { name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } }
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Assignments"
        description="Internal operator, pandit, astrologer, fulfilment and vendor assignment shell. No external calendar or notification is connected."
        tone="admin"
      />

      <AdminPanel>
        <form className="grid gap-3 xl:grid-cols-[1fr_170px_150px_150px_140px_100px]">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Work ID, assignee, role, note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="workType" defaultValue={params.workType ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All work types</option>
            {workTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
          </select>
          <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
          <select name="priority" defaultValue={params.priority ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All priorities</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{statusLabel(priority)}</option>)}
          </select>
          <input name="dueDate" type="date" defaultValue={params.dueDate ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          {assignments.length === 0 ? (
            <EmptyState title="No assignments" description={params.q || params.status || params.workType ? "No assignment matches these filters." : "Create a manual assignment for order, Asthi, Kundli or general operations work."} />
          ) : null}
          {assignments.map((assignment) => (
            <AdminPanel key={assignment.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(assignment.workType)}>{statusLabel(assignment.workType)}</StatusBadge>
                    <StatusBadge tone={statusTone(assignment.status)}>{statusLabel(assignment.status)}</StatusBadge>
                    <StatusBadge tone={statusTone(assignment.priority)}>{statusLabel(assignment.priority)}</StatusBadge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-950">{assignment.assignmentLabel ?? assignment.assignedRole ?? "Operations assignment"}</h2>
                  <p className="mt-1 text-sm text-slate-600">Work ID: {assignment.workId}</p>
                  <p className="mt-1 text-sm text-slate-600">Assigned user: {assignment.assignedUser?.name ?? assignment.assignedUser?.email ?? "Placeholder / not linked"}</p>
                  {assignment.dueAt ? <p className="mt-1 text-sm text-slate-600">Due: {assignment.dueAt.toLocaleDateString("en-IN")}</p> : null}
                  {assignment.customerVisibleNote ? <p className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-2 text-sm text-omd-ops">Customer note: {assignment.customerVisibleNote}</p> : null}
                  {assignment.internalNote ? <p className="mt-2 text-sm text-slate-600">Internal: {assignment.internalNote}</p> : null}
                </div>
                <AssignmentLink workType={assignment.workType} workId={assignment.workId} />
              </div>
              <form action={updateAssignmentStatusAction} className="mt-4 grid gap-2 md:grid-cols-[160px_150px_1fr_1fr_auto]">
                <input type="hidden" name="id" value={assignment.id} />
                <select name="status" defaultValue={assignment.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                </select>
                <select name="priority" defaultValue={assignment.priority} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  {priorities.map((priority) => <option key={priority} value={priority}>{statusLabel(priority)}</option>)}
                </select>
                <input name="internalNote" defaultValue={assignment.internalNote ?? ""} placeholder="Internal note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="customerVisibleNote" defaultValue={assignment.customerVisibleNote ?? ""} placeholder="Customer-visible note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <button className="rounded-md border border-omd-ops px-3 py-2 text-sm font-semibold text-omd-ops hover:bg-slate-50">Update</button>
              </form>
            </AdminPanel>
          ))}
        </div>

        <AdminPanel className="h-fit xl:sticky xl:top-20">
          <h2 className="text-lg font-semibold text-slate-950">Create Assignment</h2>
          <form action={saveAssignmentAction} className="mt-4 grid gap-3">
            <select name="workType" defaultValue="GENERAL_TASK" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              {workTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
            </select>
            <input name="workId" required placeholder="Order/Application/Work ID" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <input name="assignedRole" placeholder="Role e.g. Pandit, Astrologer, Operator" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <select name="assignedUserId" defaultValue="" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              <option value="">No internal user</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email}</option>)}
            </select>
            <input name="assignmentLabel" placeholder="Placeholder assignee/vendor name" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <div className="grid gap-3 sm:grid-cols-2">
              <select name="status" defaultValue="ASSIGNED" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <select name="priority" defaultValue="NORMAL" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                {priorities.map((priority) => <option key={priority} value={priority}>{statusLabel(priority)}</option>)}
              </select>
            </div>
            <input name="dueAt" type="date" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <textarea name="internalNote" rows={3} placeholder="Internal note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <textarea name="customerVisibleNote" rows={3} placeholder="Customer-visible note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Create assignment</button>
          </form>
        </AdminPanel>
      </section>
    </div>
  );
}

function AssignmentLink({ workType, workId }: { workType: string; workId: string }) {
  const href =
    workType === "ORDER"
      ? `/admin/orders/${workId}`
      : workType === "ASTHI_APPLICATION"
        ? `/admin/asthi/${workId}`
        : workType === "KUNDLI_ORDER"
          ? `/admin/kundli/${workId}`
          : null;

  if (!href) return null;
  return <Link href={href} className="text-sm font-semibold text-omd-ops hover:text-omd-brown">Open work</Link>;
}
