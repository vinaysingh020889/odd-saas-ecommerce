import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { saveServiceCapacityRuleAction } from "@/lib/service-booking-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";

function dateInputValue(value: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

type RuleFormProps = {
  services: Array<{ id: string; title: string; variants: Array<{ id: string; title: string | null; sku: string | null }> }>;
  rule?: {
    id: string;
    serviceId: string | null;
    variantId: string | null;
    locationText: string | null;
    specificDate: Date | null;
    startDate: Date | null;
    endDate: Date | null;
    dailyLimit: number | null;
    weeklyLimit: number | null;
    monthlyLimit: number | null;
    totalLimit: number | null;
    manualReviewFallback: boolean;
    active: boolean;
    notes: string | null;
  };
};

function RuleForm({ services, rule }: RuleFormProps) {
  return (
    <form action={saveServiceCapacityRuleAction} className="grid gap-3">
      {rule ? <input type="hidden" name="id" value={rule.id} /> : null}
      <input type="hidden" name="redirectTo" value="/admin/service-capacity-rules" />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Service
          <select name="serviceId" defaultValue={rule?.serviceId ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All services</option>
            {services.map((service) => <option key={service.id} value={service.id}>{service.title}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Variant / Package
          <select name="variantId" defaultValue={rule?.variantId ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">Any variant</option>
            {services.map((service) =>
              service.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {service.title} - {variant.title ?? variant.sku ?? "Default"}
                </option>
              ))
            )}
          </select>
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <input name="locationText" defaultValue={rule?.locationText ?? ""} placeholder="Location, optional" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input type="date" name="specificDate" defaultValue={dateInputValue(rule?.specificDate ?? null)} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input type="date" name="startDate" defaultValue={dateInputValue(rule?.startDate ?? null)} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input type="date" name="endDate" defaultValue={dateInputValue(rule?.endDate ?? null)} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <input type="number" min="1" name="dailyLimit" defaultValue={rule?.dailyLimit ?? ""} placeholder="Daily limit" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input type="number" min="1" name="weeklyLimit" defaultValue={rule?.weeklyLimit ?? ""} placeholder="Weekly limit" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input type="number" min="1" name="monthlyLimit" defaultValue={rule?.monthlyLimit ?? ""} placeholder="Monthly limit" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input type="number" min="1" name="totalLimit" defaultValue={rule?.totalLimit ?? ""} placeholder="Total limit" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      </div>
      <textarea name="notes" defaultValue={rule?.notes ?? ""} placeholder="Internal rule note" rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-700">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="active" defaultChecked={rule?.active ?? true} />
          Active
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" name="manualReviewFallback" defaultChecked={rule?.manualReviewFallback ?? true} />
          Manual review fallback
        </label>
        <button className="ml-auto rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          {rule ? "Update rule" : "Create rule"}
        </button>
      </div>
    </form>
  );
}

export default async function AdminServiceCapacityRulesPage() {
  const tenantId = await getOmdTenantId();
  const [services, rules] = await Promise.all([
    prisma.product.findMany({
      where: { tenantId, type: "SERVICE" },
      select: { id: true, title: true, variants: { where: { active: true }, select: { id: true, title: true, sku: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { title: "asc" }
    }),
    prisma.serviceCapacityRule.findMany({
      where: { tenantId },
      include: { service: { select: { title: true } }, variant: { select: { title: true, sku: true } } },
      orderBy: [{ active: "desc" }, { updatedAt: "desc" }]
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Service Capacity Rules"
        description="Limit service booking volume by service, package, date range and location. Full capacity moves bookings to queue, not hard rejection."
        tone="admin"
      />

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">New Capacity Rule</h2>
        <p className="mt-1 text-sm text-slate-600">Leave service blank to create a generic fallback rule. Use one date for a special day, or a range for seasonal limits.</p>
        <div className="mt-4">
          <RuleForm services={services} />
        </div>
      </AdminPanel>

      {rules.length === 0 ? (
        <EmptyState title="No capacity rules yet" description="Create a rule to start queueing bookings when a service reaches operational capacity." />
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <AdminPanel key={rule.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">{rule.service?.title ?? "All services"}</h2>
                    <StatusBadge tone={statusTone(rule.active ? "ACTIVE" : "INACTIVE")}>{statusLabel(rule.active ? "ACTIVE" : "INACTIVE")}</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{rule.variant?.title ?? rule.variant?.sku ?? "Any package"}{rule.locationText ? ` · ${rule.locationText}` : ""}</p>
                </div>
                <div className="grid gap-2 text-right text-xs text-slate-500">
                  <span>Updated {rule.updatedAt.toLocaleString("en-IN")}</span>
                  <span>{rule.manualReviewFallback ? "Manual fallback enabled" : "No manual fallback"}</span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <SummaryRow label="Daily" value={rule.dailyLimit ?? "-"} />
                <SummaryRow label="Weekly" value={rule.weeklyLimit ?? "-"} />
                <SummaryRow label="Monthly" value={rule.monthlyLimit ?? "-"} />
                <SummaryRow label="Total" value={rule.totalLimit ?? "-"} />
              </div>

              <details className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-omd-ops">Edit this rule</summary>
                <div className="mt-4">
                  <RuleForm services={services} rule={rule} />
                </div>
              </details>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
