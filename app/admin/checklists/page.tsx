import { addChecklistTemplateItemAction, createChecklistTemplateAction } from "@/lib/checklist-actions";
import { checklistWorkTypes, checklistWorkTypeLabel } from "@/lib/checklists";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function AdminChecklistsPage() {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const templates = await prisma.checklistTemplate.findMany({
    where: { tenantId },
    include: { items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }, _count: { select: { instances: true } } },
    orderBy: [{ workType: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Checklist Templates"
        description="Reusable operational templates for Asthi, Puja/service bookings, Kundli, order fulfilment, document review and proof delivery."
        tone="admin"
        actions={<StatusBadge tone="ops">Internal task layer</StatusBadge>}
      />

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">Create Template</h2>
        <form action={createChecklistTemplateAction} className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr_1fr_120px_140px]">
          <select name="workType" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            {checklistWorkTypes.map((workType) => (
              <option key={workType} value={workType}>{checklistWorkTypeLabel(workType)}</option>
            ))}
          </select>
          <input name="name" placeholder="Template name" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input name="description" placeholder="Short operational description" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input name="sortOrder" type="number" defaultValue="0" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Create</button>
        </form>
      </AdminPanel>

      {templates.length === 0 ? (
        <EmptyState title="No checklist templates" description="Run the seed script or create templates manually to start generating operational checklists." />
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <AdminPanel key={template.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(template.workType)}>{checklistWorkTypeLabel(template.workType)}</StatusBadge>
                    <StatusBadge tone={statusTone(template.status)}>{statusLabel(template.status)}</StatusBadge>
                    <StatusBadge tone="neutral">{template._count.instances} instance(s)</StatusBadge>
                  </div>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">{template.name}</h2>
                  {template.description ? <p className="mt-1 text-sm text-slate-600">{template.description}</p> : null}
                </div>
                <p className="text-sm text-slate-500">Sort #{template.sortOrder}</p>
              </div>

              <div className="mt-4 grid gap-2">
                {template.items.length === 0 ? <p className="text-sm text-slate-600">No template items yet.</p> : null}
                {template.items.map((item) => (
                  <div key={item.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={item.required ? "warning" : "neutral"}>{item.required ? "Required" : "Optional"}</StatusBadge>
                      {item.customerVisibleMilestone ? <StatusBadge tone="success">Customer milestone</StatusBadge> : null}
                      {item.proofRequired ? <StatusBadge tone="ops">Proof required</StatusBadge> : null}
                      <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                    </div>
                    <p className="mt-2 font-semibold text-slate-950">{item.title}</p>
                    {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
                    <p className="mt-1 text-xs text-slate-500">Owner role: {item.defaultOwnerRole ?? "Unassigned"} · SLA: {item.dueOffsetHours ? `${item.dueOffsetHours}h` : "None"}</p>
                  </div>
                ))}
              </div>

              <form action={addChecklistTemplateItemAction} className="mt-5 grid gap-3 rounded-lg border border-dashed border-slate-300 p-3 lg:grid-cols-[1fr_1fr_160px_120px_90px]">
                <input type="hidden" name="templateId" value={template.id} />
                <input type="hidden" name="redirectTo" value="/admin/checklists" />
                <input name="title" placeholder="New step title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="description" placeholder="Helper text" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="defaultOwnerRole" placeholder="Owner role" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="dueOffsetHours" type="number" placeholder="SLA hrs" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="sortOrder" type="number" defaultValue={template.items.length * 10 + 10} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="required" defaultChecked /> Required
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="customerVisibleMilestone" /> Customer milestone
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" name="proofRequired" /> Proof required
                </label>
                <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 lg:col-start-5">Add step</button>
              </form>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
