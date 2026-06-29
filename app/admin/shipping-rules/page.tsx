import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default async function AdminShippingRulesPage() {
  const tenantId = await getOmdTenantId();
  const zones = await prisma.serviceablePincode.findMany({
    where: { tenantId },
    orderBy: [{ state: "asc" }, { city: "asc" }, { pincode: "asc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Shipping Rules"
        description="Manual shipping shell powered by delivery zones. No courier API is connected."
        tone="admin"
        actions={
          <Link href="/admin/delivery-zones" className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
            Manage delivery zones
          </Link>
        }
      />

      {zones.length === 0 ? (
        <EmptyState title="No shipping rules" description="Add delivery zones to estimate serviceability, delivery days, and manual shipping charge at checkout." />
      ) : null}

      <AdminPanel>
        <div className="grid gap-3">
          {zones.map((zone) => (
            <div key={zone.id} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm md:grid-cols-[1fr_auto_auto_auto] md:items-center">
              <div>
                <p className="font-semibold text-slate-950">{zone.pincode} - {zone.city}, {zone.state}</p>
                <p className="mt-1 text-slate-600">{zone.note ?? "Manual checkout shipping rule."}</p>
              </div>
              <span>{zone.estimatedDays ? `${zone.estimatedDays} day(s)` : "Manual estimate"}</span>
              <strong>{formatMoney(zone.shippingCharge)}</strong>
              <StatusBadge tone={zone.serviceable ? "success" : "error"}>{zone.serviceable ? "Serviceable" : "Not Serviceable"}</StatusBadge>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
