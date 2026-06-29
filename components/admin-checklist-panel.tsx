import { updateChecklistItemAction } from "@/lib/checklist-actions";
import { checklistWorkTypeLabel } from "@/lib/checklists";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, StatusBadge } from "@/components/ui";

type ChecklistPanelProps = {
  checklist:
    | {
        id: string;
        relatedType: string;
        relatedId: string;
        status: string;
        progressPercent: number;
        requiredPendingCount: number;
        overdueCount: number;
        blockedCount: number;
        template: { name: string; description: string | null } | null;
        items: Array<{
          id: string;
          title: string;
          description: string | null;
          required: boolean;
          status: string;
          assignedRole: string | null;
          dueAt: Date | null;
          completedAt: Date | null;
          skippedReason: string | null;
          blockedReason: string | null;
          internalNote: string | null;
          customerVisibleNote: string | null;
          customerVisibleMilestone: boolean;
          proofRequired: boolean;
          assignedUser: { id: string; name: string | null; email: string | null } | null;
          completedBy: { name: string | null; email: string | null } | null;
        }>;
        activities: Array<{
          id: string;
          action: string;
          note: string | null;
          createdAt: Date;
          actor: { name: string | null; email: string | null } | null;
        }>;
      }
    | null;
  users?: Array<{ id: string; name: string | null; email: string | null }>;
  redirectTo: string;
};

function ownerLabel(item: NonNullable<ChecklistPanelProps["checklist"]>["items"][number]) {
  return item.assignedUser?.name ?? item.assignedUser?.email ?? item.assignedRole ?? "Unassigned";
}

function isOverdue(item: NonNullable<ChecklistPanelProps["checklist"]>["items"][number]) {
  return Boolean(item.dueAt && item.dueAt < new Date() && !["completed", "skipped"].includes(item.status));
}

export function AdminChecklistPanel({ checklist, users = [], redirectTo }: ChecklistPanelProps) {
  if (!checklist) {
    return (
      <AdminPanel>
        <EmptyState title="No checklist template" description="Create an active template for this work type to auto-generate operational checklists." />
      </AdminPanel>
    );
  }

  const requiredItems = checklist.items.filter((item) => item.required);
  const nextItem = checklist.items.find((item) => !["completed", "skipped"].includes(item.status));

  return (
    <AdminPanel>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">{checklistWorkTypeLabel(checklist.relatedType)} Checklist</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-950">{checklist.template?.name ?? "Operational Checklist"}</h2>
          {checklist.template?.description ? <p className="mt-1 text-sm text-slate-600">{checklist.template.description}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={statusTone(checklist.status)}>{statusLabel(checklist.status)}</StatusBadge>
          <StatusBadge tone={checklist.requiredPendingCount ? "warning" : "success"}>{checklist.requiredPendingCount} required pending</StatusBadge>
          {checklist.overdueCount ? <StatusBadge tone="error">{checklist.overdueCount} overdue</StatusBadge> : null}
          {checklist.blockedCount ? <StatusBadge tone="error">{checklist.blockedCount} blocked</StatusBadge> : null}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500">
          <span>Progress</span>
          <span>{checklist.progressPercent}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-omd-ops" style={{ width: `${checklist.progressPercent}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {requiredItems.length} required step(s). Next action: {nextItem?.title ?? "Checklist ready to close."}
        </p>
      </div>

      <div className="mt-5 grid gap-3">
        {checklist.items.map((item) => (
          <div key={item.id} className={`rounded-lg border p-4 ${isOverdue(item) ? "border-red-200 bg-red-50/60" : "border-slate-200 bg-slate-50"}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                  {item.required ? <StatusBadge tone="warning">Required</StatusBadge> : <StatusBadge tone="neutral">Optional</StatusBadge>}
                  {item.customerVisibleMilestone ? <StatusBadge tone="success">Customer Milestone</StatusBadge> : null}
                  {item.proofRequired ? <StatusBadge tone="ops">Proof Needed</StatusBadge> : null}
                </div>
                <h3 className="mt-2 font-semibold text-slate-950">{item.title}</h3>
                {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
                <p className="mt-2 text-xs text-slate-500">
                  Owner: {ownerLabel(item)} · Due: {item.dueAt ? item.dueAt.toLocaleString("en-IN") : "Not set"}
                </p>
                {item.completedAt ? <p className="mt-1 text-xs text-slate-500">Completed: {item.completedAt.toLocaleString("en-IN")} by {item.completedBy?.name ?? item.completedBy?.email ?? "Admin"}</p> : null}
                {item.skippedReason ? <p className="mt-2 text-sm text-amber-800">Skipped: {item.skippedReason}</p> : null}
                {item.blockedReason ? <p className="mt-2 text-sm text-red-700">Blocked: {item.blockedReason}</p> : null}
                {item.customerVisibleNote ? <p className="mt-2 text-sm text-slate-700">Customer note: {item.customerVisibleNote}</p> : null}
              </div>
            </div>

            <form action={updateChecklistItemAction} className="mt-4 grid gap-3 lg:grid-cols-[150px_1fr_1fr_1fr_140px]">
              <input type="hidden" name="itemId" value={item.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <select name="status" defaultValue={item.status} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                {["pending", "in_progress", "completed", "skipped", "blocked"].map((status) => (
                  <option key={status} value={status}>{statusLabel(status)}</option>
                ))}
              </select>
              <select name="assignedUserId" defaultValue={item.assignedUser?.id ?? ""} className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm">
                <option value="">No user assignment</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name ?? user.email ?? user.id}</option>
                ))}
              </select>
              <input name="assignedRole" defaultValue={item.assignedRole ?? ""} placeholder="Owner role" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
              <input name="customerVisibleNote" defaultValue={item.customerVisibleNote ?? ""} placeholder="Customer-visible note" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
              <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save item</button>
              <textarea name="internalNote" rows={2} defaultValue={item.internalNote ?? ""} placeholder="Internal note" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm lg:col-span-2" />
              <input name="skippedReason" defaultValue={item.skippedReason ?? ""} placeholder="Skip reason when skipping" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
              <input name="blockedReason" defaultValue={item.blockedReason ?? ""} placeholder="Block reason when blocked" className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm" />
            </form>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <h3 className="text-sm font-semibold text-slate-950">Checklist Activity</h3>
        <div className="mt-3 grid gap-2">
          {checklist.activities.length === 0 ? <p className="text-sm text-slate-600">No checklist activity yet.</p> : null}
          {checklist.activities.map((activity) => (
            <p key={activity.id} className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{statusLabel(activity.action)}</span>
              {activity.note ? ` - ${activity.note}` : ""} · {activity.createdAt.toLocaleString("en-IN")} · {activity.actor?.name ?? activity.actor?.email ?? "System"}
            </p>
          ))}
        </div>
      </div>
    </AdminPanel>
  );
}
