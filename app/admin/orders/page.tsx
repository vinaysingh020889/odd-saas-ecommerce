import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";

export default async function AdminOrdersPage() {
  const tenantId = await getOmdTenantId();
  const orders = await prisma.order.findMany({
    where: { tenantId },
    include: { _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Operations</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Orders</h1>
        <p className="mt-3 text-sm text-slate-600">Read-only visibility for payment-pending order drafts. Fulfilment and payment actions are deferred.</p>
      </section>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-3 font-semibold text-omd-ops"><Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                <td className="px-4 py-3 text-slate-600">{order.customerName}<br />{order.customerEmail}</td>
                <td className="px-4 py-3 text-slate-600">{order.status}</td>
                <td className="px-4 py-3 text-slate-600">{order.paymentStatus}</td>
                <td className="px-4 py-3 text-slate-600">{order._count.items}</td>
                <td className="px-4 py-3 text-slate-600">{formatMoney(order.totalAmount, order.currency)}</td>
                <td className="px-4 py-3 text-slate-600">{order.createdAt.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
