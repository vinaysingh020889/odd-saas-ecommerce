import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { updateKundliPackageAction } from "@/lib/kundli-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

const deliveryModes = ["DIGITAL_REPORT", "HANDMADE_REPORT", "CONSULTATION", "MATCHMAKING", "REPORT_AND_CONSULTATION"] as const;
const packageStatuses = ["ACTIVE", "INACTIVE"] as const;

function inclusionsText(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).join("\n") : "";
}

export default async function AdminKundliPackagesPage() {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"]);
  const tenantId = await getOmdTenantId();
  const packages = await prisma.kundliPackage.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Kundli CMS"
        title="Kundli Packages"
        description="Edit the package cards shown on the public Kundli page. Inactive packages are hidden from customers."
        tone="admin"
        actions={
          <Link href="/admin/kundli" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">
            View orders
          </Link>
        }
      />

      {packages.length === 0 ? (
        <EmptyState title="No Kundli packages" description="Seed Kundli packages first, then they can be edited here." />
      ) : (
        <div className="grid gap-4">
          {packages.map((item) => (
            <AdminPanel key={item.id} className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">{item.name}</h2>
                    <StatusBadge tone={statusTone(item.status)}>{statusLabel(item.status)}</StatusBadge>
                    <StatusBadge tone="neutral">{statusLabel(item.deliveryMode)}</StatusBadge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatMoney(item.price, item.currency)} | {item.estimatedDeliveryDays ?? 0} day estimate | /kundli/apply?package={item.slug}
                  </p>
                </div>
              </div>

              <form action={updateKundliPackageAction} className="grid gap-3 rounded-md border border-dashed border-slate-300 p-3">
                <input type="hidden" name="packageId" value={item.id} />
                <div className="grid gap-3 md:grid-cols-[1fr_1fr_150px_130px]">
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                    <input name="name" defaultValue={item.name} required className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Slug
                    <input name="slug" defaultValue={item.slug} required className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Price
                    <input name="price" type="number" min="0" step="0.01" defaultValue={String(item.price)} required className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Currency
                    <input name="currency" defaultValue={item.currency} required className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950" />
                  </label>
                </div>

                <textarea name="description" defaultValue={item.description ?? ""} placeholder="Package description" className="min-h-20 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950" />

                <div className="grid gap-3 md:grid-cols-[220px_150px_150px_120px]">
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Delivery Mode
                    <select name="deliveryMode" defaultValue={item.deliveryMode} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950">
                      {deliveryModes.map((mode) => (
                        <option key={mode} value={mode}>
                          {statusLabel(mode)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                    <select name="status" defaultValue={item.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950">
                      {packageStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estimate Days
                    <input name="estimatedDeliveryDays" type="number" min="0" defaultValue={item.estimatedDeliveryDays ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950" />
                  </label>
                  <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Sort
                    <input name="sortOrder" type="number" defaultValue={item.sortOrder} className="h-10 rounded-md border border-slate-300 px-3 text-sm font-normal normal-case tracking-normal text-slate-950" />
                  </label>
                </div>

                <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Inclusions
                  <textarea name="inclusions" defaultValue={inclusionsText(item.inclusionsJson)} placeholder="One inclusion per line" className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case tracking-normal text-slate-950" />
                </label>

                <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">Save package</button>
              </form>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
