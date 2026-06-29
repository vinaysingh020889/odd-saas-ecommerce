import Link from "next/link";
import type { InventoryMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { getVariantStockSummaries } from "@/lib/inventory";
import { createStockAdjustmentAction } from "@/lib/inventory-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; movementType?: string; variantId?: string }>;
};

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value) : "-";
}

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const requestedMovementType = (params.movementType ?? "").trim();
  const requestedVariantId = (params.variantId ?? "").trim();
  const movementTypes: InventoryMovementType[] = ["initial", "adjustment", "reserved", "released", "sold", "returned", "damaged"];
  const movementType = movementTypes.includes(requestedMovementType as InventoryMovementType)
    ? (requestedMovementType as InventoryMovementType)
    : "";
  const variants = await prisma.productVariant.findMany({
    where: {
      product: {
        tenantId,
        type: "PHYSICAL"
      },
      ...(q
        ? {
            OR: [
              { sku: { contains: q, mode: "insensitive" } },
              { title: { contains: q, mode: "insensitive" } },
              { product: { title: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          type: true
        }
      }
    },
    orderBy: [{ product: { title: "asc" } }, { createdAt: "asc" }]
  });
  const stockByVariant = await getVariantStockSummaries(variants.map((variant) => variant.id));
  const visibleVariants = status
    ? variants.filter((variant) => stockByVariant.get(variant.id)?.status === status)
    : variants;
  const selectedVariant = visibleVariants.find((variant) => variant.id === requestedVariantId) ?? visibleVariants[0] ?? null;
  const movements = await prisma.inventoryLedger.findMany({
    where: {
      tenantId,
      ...(selectedVariant ? { variantId: selectedVariant.id } : { variantId: "__none__" }),
      ...(movementType ? { movementType } : {})
    },
    include: {
      actor: { select: { name: true, email: true } },
      order: { select: { id: true, orderNumber: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 80
  });
  const selectedStock = selectedVariant ? stockByVariant.get(selectedVariant.id) : null;

  function hrefForVariant(variantId: string) {
    const urlParams = new URLSearchParams();
    if (q) urlParams.set("q", q);
    if (status) urlParams.set("status", status);
    if (movementType) urlParams.set("movementType", movementType);
    urlParams.set("variantId", variantId);
    return `/admin/inventory?${urlParams.toString()}`;
  }

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Inventory"
        title="Inventory Ledger"
        description="Physical stock is tracked through ledger movements. Cart does not reduce stock; checkout reserves stock for payment-pending orders."
        tone="admin"
      />

      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_100px]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search product, SKU, variant"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All stock states</option>
            {["LOW_STOCK", "OUT_OF_STOCK", "IN_STOCK"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <select name="movementType" defaultValue={movementType} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All movements</option>
            {["initial", "adjustment", "reserved", "released", "sold", "returned", "damaged"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        {visibleVariants.length === 0 ? (
          <EmptyState title="No inventory records found" description={q || status ? "No physical SKU matches these filters. Try another search or stock state." : "Physical product variants appear here once catalog SKUs are stocked."} />
        ) : null}
        <div className="grid gap-3">
          {visibleVariants.map((variant) => {
            const stock = stockByVariant.get(variant.id);
            const selected = selectedVariant?.id === variant.id;

            return (
              <Link
                key={variant.id}
                href={hrefForVariant(variant.id)}
                className={`rounded-lg border bg-white p-4 shadow-sm transition hover:border-omd-ops ${
                  selected ? "border-omd-ops ring-2 ring-blue-100" : "border-slate-200"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">{variant.product.type}</p>
                    <h2 className="mt-1 text-base font-semibold text-slate-950">{variant.product.title}</h2>
                    <p className="mt-1 text-sm text-slate-600">{variant.title ?? "Default"} - SKU {variant.sku ?? "-"}</p>
                  </div>
                  <StatusBadge tone={statusTone(stock?.status)}>{statusLabel(stock?.status ?? "OUT_OF_STOCK")}</StatusBadge>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Available</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{stock?.available ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Reserved</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{stock?.currentReserved ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Low stock at</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">{variant.lowStockThreshold}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Last movement</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{formatDate(stock?.lastMovementDate ?? null)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <aside className="h-fit lg:sticky lg:top-20">
          {selectedVariant ? (
            <AdminPanel>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Selected SKU</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedVariant.product.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{selectedVariant.title ?? "Default"} - SKU {selectedVariant.sku ?? "-"}</p>
                </div>
                <Link href={`/admin/products/${selectedVariant.product.id}/edit`} className="text-sm font-semibold text-omd-ops">
                  Edit product
                </Link>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Available</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedStock?.available ?? 0}</p>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Reserved</p>
                  <p className="mt-1 text-2xl font-semibold">{selectedStock?.currentReserved ?? 0}</p>
                </div>
              </div>

              <form action={createStockAdjustmentAction} className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <input type="hidden" name="variantId" value={selectedVariant.id} />
                <h3 className="text-sm font-semibold text-slate-950">Adjust Stock</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600">Use positive values to add stock and negative values to reduce available stock.</p>
                <input
                  name="quantity"
                  type="number"
                  step="1"
                  required
                  placeholder="Quantity"
                  className="mt-4 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
                <input
                  name="reason"
                  required
                  placeholder="Reason"
                  className="mt-3 h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
                />
                <button className="mt-4 w-full rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
                  Save adjustment
                </button>
              </form>

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-950">Ledger</h3>
                <div className="mt-3 grid max-h-[520px] gap-2 overflow-y-auto pr-1">
                  {movements.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-slate-600">
                      No inventory movements match this filter yet. Reservations, releases, sales, or adjustments will appear here.
                    </div>
                  ) : null}
                  {movements.map((movement) => (
                    <div key={movement.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-slate-950">{statusLabel(movement.movementType)}</span>
                        <span className="font-semibold text-slate-950">{movement.quantity}</span>
                      </div>
                      <p className="mt-1 text-slate-600">{movement.reason}</p>
                      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
                        <span>{movement.actor?.name ?? movement.actor?.email ?? "System"}</span>
                        <span>{formatDate(movement.createdAt)}</span>
                      </div>
                      {movement.order ? (
                        <Link href={`/admin/orders/${movement.order.id}`} className="mt-2 inline-flex text-xs font-semibold text-omd-ops">
                          {movement.order.orderNumber}
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </AdminPanel>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
