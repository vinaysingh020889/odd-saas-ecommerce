import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { getVariantStockSummaries } from "@/lib/inventory";
import { createStockAdjustmentAction } from "@/lib/inventory-actions";

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value) : "-";
}

export default async function AdminInventoryPage() {
  const tenantId = await getOmdTenantId();
  const variants = await prisma.productVariant.findMany({
    where: {
      product: {
        tenantId,
        type: "PHYSICAL"
      }
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
  const movements = await prisma.inventoryLedger.findMany({
    where: {
      tenantId,
      variantId: { in: variants.map((variant) => variant.id) }
    },
    include: {
      actor: { select: { name: true, email: true } },
      order: { select: { id: true, orderNumber: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 80
  });
  const movementsByVariant = new Map<string, typeof movements>();

  for (const movement of movements) {
    movementsByVariant.set(movement.variantId, [...(movementsByVariant.get(movement.variantId) ?? []), movement]);
  }

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Inventory</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Inventory Ledger</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Physical stock is tracked through ledger movements. Cart does not reduce stock; checkout reserves stock for payment-pending orders.
        </p>
      </section>

      <section className="grid gap-5">
        {variants.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
            No physical product variants are available for inventory tracking yet.
          </div>
        ) : null}
        {variants.map((variant) => {
          const stock = stockByVariant.get(variant.id);
          const variantMovements = movementsByVariant.get(variant.id) ?? [];

          return (
            <article key={variant.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">{variant.product.type}</p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-950">{variant.product.title}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {variant.title ?? "Default"} - SKU {variant.sku ?? "-"} - Metadata {variant.stockStatus}
                      </p>
                    </div>
                    <Link href={`/admin/products/${variant.product.id}/edit`} className="text-sm font-semibold text-omd-ops">
                      Edit variant
                    </Link>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Available</p>
                      <p className="mt-1 text-2xl font-semibold">{stock?.available ?? 0}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Reserved</p>
                      <p className="mt-1 text-2xl font-semibold">{stock?.currentReserved ?? 0}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Status</p>
                      <p className="mt-1 font-semibold">{stock?.status ?? "OUT_OF_STOCK"}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">Last movement</p>
                      <p className="mt-1 text-sm font-semibold">{formatDate(stock?.lastMovementDate ?? null)}</p>
                    </div>
                  </div>

                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="py-2 pr-4">Type</th>
                          <th className="py-2 pr-4">Qty</th>
                          <th className="py-2 pr-4">Reason</th>
                          <th className="py-2 pr-4">Actor</th>
                          <th className="py-2 pr-4">Order</th>
                          <th className="py-2 pr-4">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variantMovements.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-3 text-slate-500">No movements yet.</td>
                          </tr>
                        ) : null}
                        {variantMovements.map((movement) => (
                          <tr key={movement.id} className="border-t border-slate-100">
                            <td className="py-2 pr-4 font-semibold">{movement.movementType}</td>
                            <td className="py-2 pr-4">{movement.quantity}</td>
                            <td className="py-2 pr-4">{movement.reason}</td>
                            <td className="py-2 pr-4">{movement.actor?.name ?? movement.actor?.email ?? "-"}</td>
                            <td className="py-2 pr-4">
                              {movement.order ? (
                                <Link href={`/admin/orders/${movement.order.id}`} className="font-semibold text-omd-ops">
                                  {movement.order.orderNumber}
                                </Link>
                              ) : "-"}
                            </td>
                            <td className="py-2 pr-4">{formatDate(movement.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <form action={createStockAdjustmentAction} className="h-fit rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <input type="hidden" name="variantId" value={variant.id} />
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
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
