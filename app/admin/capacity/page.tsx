import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { getRemainingCapacity, recordCapacityMovementAction, saveCapacitySlotAction } from "@/lib/service-capacity";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ serviceType?: string; status?: string; date?: string; slotId?: string }>;
};

const serviceTypes = ["ASTHI", "PUJA", "KUNDLI", "GENERAL_SERVICE", "CONSULTATION"];
const statuses = ["ACTIVE", "INACTIVE", "FULL", "CANCELLED"];

function dateValue(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function AdminCapacityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const filterDate = dateValue(params.date);
  const slots = await prisma.serviceCapacitySlot.findMany({
    where: {
      tenantId,
      ...(params.serviceType ? { serviceType: params.serviceType } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(filterDate ? { date: filterDate } : {})
    },
    include: { ledgers: { orderBy: { createdAt: "desc" } } },
    orderBy: [{ date: "asc" }, { serviceType: "asc" }, { title: "asc" }]
  });
  const selectedSlot = slots.find((slot) => slot.id === params.slotId) ?? slots[0] ?? null;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Service Capacity"
        description="Manual capacity shell for Asthi, Puja, Kundli, consultation and future services. No external calendar is connected."
        tone="admin"
      />

      <AdminPanel>
        <form className="grid gap-3 lg:grid-cols-[1fr_180px_180px_160px_100px]">
          <input name="date" type="date" defaultValue={params.date ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="serviceType" defaultValue={params.serviceType ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All service types</option>
            {serviceTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
          </select>
          <select name="status" defaultValue={params.status ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
          </select>
          <select name="slotId" defaultValue={selectedSlot?.id ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">Select slot ledger</option>
            {slots.map((slot) => <option key={slot.id} value={slot.id}>{slot.title}</option>)}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      <section className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-4">
          {slots.length === 0 ? <EmptyState title="No capacity slots" description="Create service capacity slots for ritual dates, consultations, reports or operations workload." /> : null}
          {slots.map((slot) => {
            const remaining = getRemainingCapacity(slot);
            return (
              <AdminPanel key={slot.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(slot.serviceType)}>{statusLabel(slot.serviceType)}</StatusBadge>
                      <StatusBadge tone={statusTone(slot.status)}>{statusLabel(slot.status)}</StatusBadge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-950">{slot.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {slot.date.toLocaleDateString("en-IN")} {slot.startTime ? `- ${slot.startTime}` : ""}{slot.endTime ? ` to ${slot.endTime}` : ""}
                    </p>
                    {slot.notes ? <p className="mt-2 text-sm text-slate-600">{slot.notes}</p> : null}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <Metric label="Total" value={slot.capacityTotal} />
                    <Metric label="Held" value={slot.capacityHeld} />
                    <Metric label="Confirmed" value={slot.capacityConfirmed} />
                    <Metric label="Remaining" value={remaining} />
                  </div>
                </div>
                <form action={recordCapacityMovementAction} className="mt-4 grid gap-2 md:grid-cols-[140px_90px_170px_1fr_auto]">
                  <input type="hidden" name="slotId" value={slot.id} />
                  <input type="hidden" name="redirectTo" value={`/admin/capacity?slotId=${slot.id}`} />
                  <select name="movementType" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                    {["HOLD", "CONFIRM", "RELEASE", "CANCEL", "ADJUSTMENT"].map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
                  </select>
                  <input name="quantity" type="number" min="1" defaultValue="1" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                  <select name="sourceType" defaultValue="ADMIN" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                    {["ADMIN", "ASTHI_APPLICATION", "KUNDLI_ORDER", "ORDER_ITEM", "SERVICE_BOOKING"].map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
                  </select>
                  <input name="reason" placeholder="Reason" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                  <button className="rounded-md border border-omd-ops px-3 py-2 text-sm font-semibold text-omd-ops hover:bg-slate-50">Record</button>
                </form>
              </AdminPanel>
            );
          })}
        </div>

        <div className="grid h-fit gap-5 xl:sticky xl:top-20">
          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Create / Edit Slot</h2>
            <form action={saveCapacitySlotAction} className="mt-4 grid gap-3">
              {selectedSlot ? <input type="hidden" name="id" value={selectedSlot.id} /> : null}
              <select name="serviceType" defaultValue={selectedSlot?.serviceType ?? "GENERAL_SERVICE"} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                {serviceTypes.map((type) => <option key={type} value={type}>{statusLabel(type)}</option>)}
              </select>
              <input name="title" required defaultValue={selectedSlot?.title ?? ""} placeholder="Slot title" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input name="date" required type="date" defaultValue={selectedSlot ? dateInput(selectedSlot.date) : ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="startTime" defaultValue={selectedSlot?.startTime ?? ""} placeholder="Start time" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="endTime" defaultValue={selectedSlot?.endTime ?? ""} placeholder="End time" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              </div>
              <input name="capacityTotal" required type="number" min="0" defaultValue={selectedSlot?.capacityTotal ?? 10} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <select name="status" defaultValue={selectedSlot?.status ?? "ACTIVE"} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                {statuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
              </select>
              <textarea name="notes" defaultValue={selectedSlot?.notes ?? ""} rows={3} placeholder="Internal notes" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save slot</button>
            </form>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Selected Ledger</h2>
            <div className="mt-4 grid gap-2">
              {!selectedSlot ? <p className="text-sm text-slate-600">Select a slot to inspect movements.</p> : null}
              {selectedSlot?.ledgers.length === 0 ? <p className="text-sm text-slate-600">No capacity movement yet.</p> : null}
              {selectedSlot?.ledgers.map((ledger) => (
                <div key={ledger.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="font-semibold text-slate-950">{statusLabel(ledger.movementType)} - Qty {ledger.quantity}</p>
                  <p className="mt-1 text-slate-600">{ledger.reason}</p>
                  <p className="mt-1 text-xs text-slate-500">{statusLabel(ledger.sourceType)} {ledger.sourceId ? `- ${ledger.sourceId}` : ""} - {ledger.createdAt.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="font-semibold text-slate-950">{value}</p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}
