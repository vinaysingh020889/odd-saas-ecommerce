import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { BreadcrumbHeader, EmptyState, PrimaryLink, StatusBadge } from "@/components/ui";

export default async function OrdersPage() {
  const user = await requireCurrentUser();
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader items={[{ label: "Account", href: "/dashboard" }, { label: "Orders" }]} />
      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Create a checkout draft from your cart to see it here."
          actions={<PrimaryLink href="/shop">Start shopping</PrimaryLink>}
        />
      ) : (
        <section className="grid gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/orders/${order.id}`}
              className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm transition hover:border-omd-gold hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-omd-saffron">{order.orderNumber}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                    <StatusBadge tone={statusTone(order.paymentStatus)}>Payment {statusLabel(order.paymentStatus)}</StatusBadge>
                  </div>
                  <p className="mt-2 text-sm text-omd-muted">
                    {order._count.items} item(s)
                    {["payment_pending", "failed", "expired"].includes(order.status) && order.paymentStatus !== "succeeded"
                      ? " - Payment retry available"
                      : ""}
                  </p>
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
