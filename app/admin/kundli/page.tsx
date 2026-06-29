import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

function adminNextAction(status: string, paymentStatus: string) {
  if (paymentStatus !== "CONFIRMED") return "Await mock payment";
  if (status === "DETAILS_PENDING") return "Await birth details";
  if (status === "SUBMITTED") return "Assign reviewer";
  if (status === "ASSIGNED") return "Start review";
  if (status === "IN_REVIEW") return "Upload report";
  if (status === "REPORT_READY") return "Deliver report";
  if (status === "CONSULTATION_SCHEDULED") return "Complete consultation";
  if (status === "DELIVERED") return "Close order";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  return "Review";
}

export default async function AdminKundliPage() {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const orders = await prisma.kundliOrder.findMany({
    where: { tenantId },
    include: {
      user: { select: { name: true, email: true } },
      package: { select: { name: true, deliveryMode: true } },
      _count: { select: { documents: true, statusHistory: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const counts = {
    paymentPending: orders.filter((item) => item.paymentStatus !== "CONFIRMED").length,
    detailsPending: orders.filter((item) => item.status === "DETAILS_PENDING").length,
    submitted: orders.filter((item) => item.status === "SUBMITTED").length,
    inReview: orders.filter((item) => item.status === "IN_REVIEW").length,
    ready: orders.filter((item) => item.status === "REPORT_READY").length
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Kundli Orders"
        description="Queue for mock payment, birth details, assignment, report review, consultation scheduling, and delivery placeholders."
        tone="admin"
      />

      <section className="grid gap-3 md:grid-cols-5">
        {[
          ["Payment Pending", counts.paymentPending],
          ["Details Pending", counts.detailsPending],
          ["Submitted", counts.submitted],
          ["In Review", counts.inReview],
          ["Report Ready", counts.ready]
        ].map(([label, value]) => (
          <AdminPanel key={label} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
          </AdminPanel>
        ))}
      </section>

      {orders.length === 0 ? (
        <EmptyState title="No Kundli orders" description="Kundli requests appear here after a customer starts the Kundli intake flow." />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Applicant</th>
                  <th className="px-4 py-3">Package</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Assigned</th>
                  <th className="px-4 py-3">Next Action</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orders.map((order) => (
                  <tr key={order.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/kundli/${order.orderNo ?? order.id}`} className="font-semibold text-omd-ops">
                        {order.orderNo ?? "Draft request"}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{order.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{order.applicantName}</span>
                      <br />
                      {order.applicantEmail}
                      <br />
                      {order.applicantPhone}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{order.package.name}</span>
                      <br />
                      {statusLabel(order.package.deliveryMode)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                        <StatusBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</StatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatMoney(order.totalAmount, order.currency)}</td>
                    <td className="px-4 py-3 text-slate-600">{order.assignedTo ?? "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{adminNextAction(order.status, order.paymentStatus)}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {order.createdAt.toLocaleString("en-IN")}
                      <p className="mt-1 text-xs text-slate-500">Updated {order.updatedAt.toLocaleString("en-IN")}</p>
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
