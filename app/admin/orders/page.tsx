import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; paymentStatus?: string; fulfillmentStatus?: string; dateFrom?: string; dateTo?: string }>;
};

function parseDate(value?: string, endOfDay = false) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const paymentStatus = (params.paymentStatus ?? "").trim();
  const fulfillmentStatus = (params.fulfillmentStatus ?? "").trim();
  const dateFrom = parseDate(params.dateFrom);
  const dateTo = parseDate(params.dateTo, true);
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(fulfillmentStatus ? { fulfillmentStatus } : {}),
      ...(dateFrom || dateTo ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } } : {}),
      ...(q
        ? {
            OR: [
              { orderNumber: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q, mode: "insensitive" } }
            ]
          }
        : {})
    },
    include: { _count: { select: { items: true, requests: true } } },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Orders"
        description="Search and triage orders across mock payment, fulfilment, and customer support states."
        tone="admin"
      />
      <AdminPanel>
        <form className="grid gap-3 xl:grid-cols-[1fr_170px_170px_170px_140px_140px_100px]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Order, customer, email, phone"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All order statuses</option>
            {["payment_pending", "confirmed", "processing", "ready_to_ship", "shipped", "delivered", "failed", "expired", "cancelled", "refunded"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <select name="paymentStatus" defaultValue={paymentStatus} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All payment statuses</option>
            {["not_started", "pending", "succeeded", "failed", "cancelled", "expired", "refunded"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <select name="fulfillmentStatus" defaultValue={fulfillmentStatus} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All fulfilment</option>
            {["unfulfilled", "processing", "ready_to_ship", "shipped", "delivered", "cancelled", "refunded"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <input name="dateFrom" type="date" defaultValue={params.dateFrom ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <input name="dateTo" type="date" defaultValue={params.dateTo ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>
      {orders.length === 0 ? (
        <EmptyState title="No orders found" description={q || status || paymentStatus || fulfillmentStatus ? "No order matches these filters. Clear search or choose a broader status to continue triage." : "Checkout order drafts will appear here after customers create carts and start checkout."} />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Fulfilment</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Requests</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-slate-950">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{order.customerName}</span>
                      <br />
                      {order.customerEmail}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                        <StatusBadge tone={statusTone(order.paymentStatus)}>Mock Payment {statusLabel(order.paymentStatus)}</StatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={statusTone(order.fulfillmentStatus)}>{statusLabel(order.fulfillmentStatus)}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{order._count.items}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {order._count.requests > 0 ? (
                        <Link href={`/admin/requests?q=${encodeURIComponent(order.orderNumber)}`} className="font-semibold text-omd-ops hover:text-omd-brown">
                          {order._count.requests}
                        </Link>
                      ) : (
                        "0"
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{formatMoney(order.totalAmount, order.currency)}</td>
                    <td className="px-4 py-3 text-slate-600">{order.createdAt.toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/orders/${order.id}`} className="font-semibold text-omd-ops hover:text-omd-brown">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
