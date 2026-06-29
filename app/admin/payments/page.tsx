import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function AdminPaymentsPage({ searchParams }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN"]);
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const attempts = await prisma.paymentAttempt.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { providerOrderId: { contains: q, mode: "insensitive" } },
              { providerPaymentId: { contains: q, mode: "insensitive" } },
              { order: { orderNumber: { contains: q, mode: "insensitive" } } },
              { order: { customerName: { contains: q, mode: "insensitive" } } },
              { order: { customerEmail: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: {
      order: { select: { id: true, orderNumber: true, customerName: true, customerEmail: true, paymentStatus: true } },
      _count: { select: { events: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Finance"
        title="Mock Payments"
        description="Provider-style mock payment attempts and event counts. No real gateway settlement or refund integration exists here."
        tone="admin"
      />
      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_100px]">
          <input name="q" defaultValue={q} placeholder="Order, customer, provider id" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {["created", "pending", "succeeded", "failed", "cancelled", "expired", "refunded"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {attempts.length === 0 ? (
        <EmptyState title="No payment attempts" description={q || status ? "No mock payment attempt matches this filter. Clear search to review all payment activity." : "Mock payment attempts appear here after a customer starts payment from checkout or Buy Now."} />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {attempts.map((attempt) => (
                  <tr key={attempt.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{attempt.provider}</p>
                      <p className="mt-1 text-xs text-slate-500">{attempt.providerOrderId}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/orders/${attempt.order.id}`} className="font-semibold text-omd-ops hover:text-slate-900">
                        {attempt.order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{attempt.order.customerName}</span>
                      <br />
                      {attempt.order.customerEmail}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{formatMoney(attempt.amount, attempt.currency)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={statusTone(attempt.status)}>{statusLabel(attempt.status)}</StatusBadge></td>
                    <td className="px-4 py-3 text-slate-600">{attempt._count.events}</td>
                    <td className="px-4 py-3 text-slate-600">{attempt.createdAt.toLocaleDateString("en-IN")}</td>
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
