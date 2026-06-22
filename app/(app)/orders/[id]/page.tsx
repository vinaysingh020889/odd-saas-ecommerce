import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function addressText(value: unknown) {
  const address = value as { addressLine?: string; city?: string; state?: string; pincode?: string; country?: string };
  return [address.addressLine, address.city, address.state, address.pincode, address.country].filter(Boolean).join(", ");
}

export default async function OrderPage({ params }: OrderPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true }
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg border border-omd-gold bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Order</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">{order.orderNumber}</h1>
        <p className="mt-3 text-sm text-omd-muted">
          Status: {order.status} · Payment: {order.paymentStatus}
        </p>
        <p className="mt-3 text-sm font-semibold text-omd-brown">Payment gateway will be connected in the next phase.</p>
      </section>

      <section className="rounded-lg border border-omd-sand bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-omd-brown">Customer Details</h2>
        <p className="mt-3 text-sm text-omd-muted">{order.customerName} · {order.customerEmail} · {order.customerPhone}</p>
        <p className="mt-2 text-sm text-omd-muted">{addressText(order.shippingAddressJson)}</p>
      </section>

      <section className="grid gap-4">
        {order.items.map((item) => (
          <article key={item.id} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{item.itemType}</p>
                <h2 className="mt-2 text-lg font-semibold text-omd-brown">{item.titleSnapshot}</h2>
                <p className="mt-1 text-sm text-omd-muted">SKU {item.skuSnapshot ?? "-"} · Qty {item.quantity} · Unit {formatMoney(item.unitPrice, order.currency)}</p>
              </div>
              <p className="font-semibold text-omd-brown">{formatMoney(item.lineTotal, order.currency)}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-lg border border-omd-sand bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-omd-brown">Totals</h2>
        <div className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatMoney(order.subtotalAmount, order.currency)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>{formatMoney(order.discountAmount, order.currency)}</span></div>
          <div className="flex justify-between"><span>Shipping</span><span>{formatMoney(order.shippingAmount, order.currency)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatMoney(order.taxAmount, order.currency)}</span></div>
          <div className="flex justify-between border-t border-omd-sand pt-3 font-semibold"><span>Total</span><span>{formatMoney(order.totalAmount, order.currency)}</span></div>
        </div>
      </section>
    </div>
  );
}
