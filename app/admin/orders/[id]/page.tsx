import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { releaseReservedStockForOrderAction } from "@/lib/inventory-actions";
import { reservationSummaryFromMovements } from "@/lib/inventory";

type PageProps = { params: Promise<{ id: string }> };

function addressText(value: unknown) {
  const address = value as { addressLine?: string; city?: string; state?: string; pincode?: string; country?: string };
  return [address.addressLine, address.city, address.state, address.pincode, address.country].filter(Boolean).join(", ");
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const order = await prisma.order.findFirst({
    where: { id, tenantId },
    include: {
      items: true,
      inventoryMovements: {
        orderBy: { createdAt: "desc" },
        include: {
          variant: { select: { sku: true, title: true } }
        }
      }
    }
  });

  if (!order) notFound();
  const reservation = reservationSummaryFromMovements(order.inventoryMovements);

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Order</p>
        <h1 className="mt-3 text-3xl font-semibold">{order.orderNumber}</h1>
        <p className="mt-3 text-sm text-slate-600">Status {order.status} · Payment {order.paymentStatus}</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Customer</h2>
        <p className="mt-3 text-sm text-slate-600">{order.customerName} · {order.customerEmail} · {order.customerPhone}</p>
        <p className="mt-2 text-sm text-slate-600">{addressText(order.shippingAddressJson)}</p>
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Stock Reservation</h2>
            <p className="mt-2 text-sm text-slate-600">
              Reserved {reservation.reserved} - Released {reservation.released} - Active {reservation.activeReserved}
            </p>
          </div>
          {order.status === "payment_pending" && reservation.activeReserved > 0 ? (
            <form action={releaseReservedStockForOrderAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <button className="rounded-md border border-omd-ops px-3 py-2 text-sm font-semibold text-omd-ops hover:bg-slate-50">
                Release reserved stock
              </button>
            </form>
          ) : null}
        </div>
        <div className="mt-4 grid gap-2">
          {order.inventoryMovements.length === 0 ? (
            <p className="text-sm text-slate-600">No stock movements are linked to this order.</p>
          ) : null}
          {order.inventoryMovements.map((movement) => (
            <div key={movement.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">{movement.movementType}</span>
              {" - "}Qty {movement.quantity}
              {" - "}SKU {movement.variant.sku ?? movement.variant.title ?? "-"}
              {" - "}{movement.reason}
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        {order.items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-semibold">{item.titleSnapshot}</p>
                <p className="text-sm text-slate-600">SKU {item.skuSnapshot ?? "-"} · {item.itemType} · Qty {item.quantity}</p>
              </div>
              <p className="font-semibold">{formatMoney(item.lineTotal, order.currency)}</p>
            </div>
          </div>
        ))}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Total</h2>
        <p className="mt-2 text-2xl font-semibold">{formatMoney(order.totalAmount, order.currency)}</p>
      </section>
    </div>
  );
}
