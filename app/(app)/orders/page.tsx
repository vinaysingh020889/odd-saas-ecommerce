import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";

export default async function OrdersPage() {
  const user = await requireCurrentUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Customer app</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Orders</h1>
        <p className="mt-3 text-sm text-omd-muted">Payment-pending drafts and future order history will appear here.</p>
      </section>
      {orders.length === 0 ? (
        <section className="rounded-lg border border-omd-sand bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-omd-brown">No orders yet</h2>
          <p className="mt-3 text-sm text-omd-muted">Create a checkout draft from your cart.</p>
        </section>
      ) : (
        <section className="grid gap-4">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm hover:border-omd-gold">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-omd-saffron">{order.orderNumber}</p>
                  <h2 className="mt-2 text-xl font-semibold text-omd-brown">{order.status}</h2>
                  <p className="mt-1 text-sm text-omd-muted">{order._count.items} item(s) · payment {order.paymentStatus}</p>
                </div>
                <p className="text-lg font-semibold text-omd-brown">{formatMoney(order.totalAmount, order.currency)}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
