import { statusLabel, statusTone } from "@/lib/status-labels";
import { Panel, StatusBadge } from "@/components/ui";

export function CustomerChecklistMilestones({
  title = "Progress Milestones",
  milestones
}: {
  title?: string;
  milestones: Array<{
    id: string;
    title: string;
    status: string;
    customerVisibleNote: string | null;
    completedAt: Date | null;
    dueAt: Date | null;
  }>;
}) {
  if (milestones.length === 0) return null;

  return (
    <Panel>
      <h2 className="text-xl font-semibold text-omd-brown">{title}</h2>
      <div className="mt-4 grid gap-3">
        {milestones.map((milestone, index) => (
          <div key={milestone.id} className="flex gap-3 rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-omd-brown shadow-sm">
              {index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-omd-brown">{milestone.title}</p>
                <StatusBadge tone={statusTone(milestone.status)}>{statusLabel(milestone.status)}</StatusBadge>
              </div>
              {milestone.customerVisibleNote ? <p className="mt-1 text-sm text-omd-muted">{milestone.customerVisibleNote}</p> : null}
              <p className="mt-1 text-xs text-omd-muted">
                {milestone.completedAt ? `Completed ${milestone.completedAt.toLocaleString("en-IN")}` : milestone.dueAt ? `Target ${milestone.dueAt.toLocaleString("en-IN")}` : "Operational update"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
