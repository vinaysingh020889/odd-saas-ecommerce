import { saveAssignmentAction, updateAssignmentStatusAction } from "@/lib/service-capacity";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, StatusBadge } from "@/components/ui";

type AssignmentItem = {
  id: string;
  workType: string;
  workId: string;
  assignedRole: string | null;
  assignedUserId: string | null;
  assignmentLabel: string | null;
  status: string;
  priority: string;
  dueAt: Date | null;
  internalNote: string | null;
  customerVisibleNote: string | null;
  assignedUser?: { name: string | null; email: string | null } | null;
};

type AssignableUser = {
  id: string;
  name: string | null;
  email: string | null;
};

type AdminAssignmentPanelProps = {
  title: string;
  helper: string;
  workType: string;
  workId: string;
  redirectTo: string;
  defaultRole?: string;
  assignments: AssignmentItem[];
  users: AssignableUser[];
};

const statuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const priorities = ["LOW", "NORMAL", "HIGH", "URGENT"];

export function AdminAssignmentPanel({ title, helper, workType, workId, redirectTo, defaultRole, assignments, users }: AdminAssignmentPanelProps) {
  return (
    <AdminPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{helper}</p>
        </div>
        <StatusBadge tone={assignments.length ? "warning" : "neutral"}>{assignments.length} assignment(s)</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3">
        {assignments.length === 0 ? <p className="text-sm text-slate-600">No assignment has been created yet.</p> : null}
        {assignments.map((assignment) => (
          <div key={assignment.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={statusTone(assignment.status)}>{statusLabel(assignment.status)}</StatusBadge>
              <StatusBadge tone={statusTone(assignment.priority)}>{statusLabel(assignment.priority)}</StatusBadge>
            </div>
            <p className="mt-2 font-semibold text-slate-950">{assignment.assignmentLabel ?? assignment.assignedRole ?? "Operations assignment"}</p>
            <p className="mt-1 text-sm text-slate-600">User: {assignment.assignedUser?.name ?? assignment.assignedUser?.email ?? "Placeholder / not linked"}</p>
            {assignment.dueAt ? <p className="mt-1 text-sm text-slate-600">Due: {assignment.dueAt.toLocaleDateString("en-IN")}</p> : null}
            {assignment.customerVisibleNote ? <p className="mt-2 rounded-md border border-blue-100 bg-blue-50 p-2 text-sm text-omd-ops">Customer note: {assignment.customerVisibleNote}</p> : null}
            {assignment.internalNote ? <p className="mt-2 text-sm text-slate-600">Internal: {assignment.internalNote}</p> : null}
            <form action={updateAssignmentStatusAction} className="mt-3 grid gap-2 md:grid-cols-[150px_130px_1fr_1fr_auto]">
              <input type="hidden" name="id" value={assignment.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
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
          </div>
        ))}
      </div>

      <details className="mt-4 rounded-md border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-950">Create assignment</summary>
        <form action={saveAssignmentAction} className="mt-4 grid gap-3">
          <input type="hidden" name="workType" value={workType} />
          <input type="hidden" name="workId" value={workId} />
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <input name="assignedRole" defaultValue={defaultRole ?? ""} placeholder="Role e.g. Pandit, Astrologer, Operator" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="assignedUserId" defaultValue="" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">No internal user</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email}</option>)}
          </select>
          <input name="assignmentLabel" placeholder="Placeholder assignee/vendor name" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <div className="grid gap-3 sm:grid-cols-3">
            <select name="status" defaultValue="ASSIGNED" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <select name="priority" defaultValue="NORMAL" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              {priorities.map((priority) => <option key={priority} value={priority}>{statusLabel(priority)}</option>)}
            </select>
            <input name="dueAt" type="date" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          </div>
          <textarea name="internalNote" rows={2} placeholder="Internal note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <textarea name="customerVisibleNote" rows={2} placeholder="Customer-visible note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
          <button className="w-fit rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Create assignment</button>
        </form>
      </details>
    </AdminPanel>
  );
}
