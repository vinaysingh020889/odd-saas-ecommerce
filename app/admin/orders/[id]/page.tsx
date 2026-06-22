import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";

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
    include: { items: true }
  });

  if (!order) notFound();

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
