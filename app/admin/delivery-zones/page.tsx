import { prisma } from "@/lib/prisma";
import { saveDeliveryZoneAction } from "@/lib/admin-actions";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function AdminDeliveryZonesPage() {
  const tenantId = await getOmdTenantId();
  const zones = await prisma.serviceablePincode.findMany({ where: { tenantId }, orderBy: [{ state: "asc" }, { city: "asc" }, { pincode: "asc" }] });

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Operations" title="Delivery Zones" description="Demo pincode serviceability shell. No courier API is connected." tone="admin" />
      <form action={saveDeliveryZoneAction} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[130px_1fr_1fr_120px_130px_1fr_auto]">
        <input name="pincode" required placeholder="221001" className="h-10 rounded-md border border-slate-300 px-3" />
        <input name="city" required placeholder="City" className="h-10 rounded-md border border-slate-300 px-3" />
        <input name="state" required placeholder="State" className="h-10 rounded-md border border-slate-300 px-3" />
        <input name="estimatedDays" type="number" placeholder="Days" className="h-10 rounded-md border border-slate-300 px-3" />
        <input name="shippingCharge" type="number" min="0" step="0.01" placeholder="Shipping" className="h-10 rounded-md border border-slate-300 px-3" />
        <label className="flex items-center gap-2 text-sm font-semibold"><input name="serviceable" type="checkbox" defaultChecked /> Serviceable</label>
        <button className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white">Save</button>
      </form>
      {zones.length === 0 ? <EmptyState title="No delivery zones" description="Add demo pincodes to power the product page delivery checker." /> : null}
      <div className="grid gap-3">
        {zones.map((zone) => (
          <div key={zone.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm">
            <div><strong>{zone.pincode}</strong> - {zone.city}, {zone.state} - {zone.estimatedDays ?? "-"} days - {formatMoney(zone.shippingCharge)}</div>
            <StatusBadge tone={zone.serviceable ? "success" : "error"}>{zone.serviceable ? "Serviceable" : "Not Serviceable"}</StatusBadge>
          </div>
        ))}
      </div>
    </div>
  );
}
