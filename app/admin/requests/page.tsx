import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { updateOrderRequestStatusAction } from "@/lib/order-request-actions";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ status?: string; type?: string; q?: string }>;
};

export default async function AdminRequestsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const status = (params.status ?? "").trim();
  const type = (params.type ?? "").trim();
  const q = (params.q ?? "").trim();
  const requests = await prisma.orderRequest.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(type ? { requestType: type } : {}),
      ...(q
        ? {
            OR: [
              { reason: { contains: q, mode: "insensitive" } },
              { customerNote: { contains: q, mode: "insensitive" } },
              { order: { orderNumber: { contains: q, mode: "insensitive" } } },
              { order: { customerName: { contains: q, mode: "insensitive" } } },
              { order: { customerEmail: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: {
      order: { select: { id: true, orderNumber: true, customerName: true, customerEmail: true, status: true, paymentStatus: true, fulfillmentStatus: true } },
      orderItem: { select: { titleSnapshot: true, skuSnapshot: true } },
      createdBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Order Requests"
        description="Cancellation, return, and refund request queue. Decisions are mock/admin state only."
        tone="admin"
      />

      <AdminPanel>
        <form className="grid gap-3 lg:grid-cols-[1fr_180px_180px_100px]">
          <input name="q" defaultValue={q} placeholder="Order, customer, note, reason" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="type" defaultValue={type} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All request types</option>
            {["cancel", "return", "refund"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {["submitted", "under_review", "approved", "rejected", "closed"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {requests.length === 0 ? (
        <EmptyState title="No order requests" description={q || status || type ? "No request matches these filters." : "Customer cancellation, return, and refund requests will appear here."} />
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <AdminPanel key={request.id}>
              <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(request.requestType)}>{statusLabel(request.requestType)}</StatusBadge>
                    <StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">
                    <Link href={`/admin/orders/${request.order.id}`} className="hover:text-omd-ops">{request.order.orderNumber}</Link>
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{request.order.customerName} - {request.order.customerEmail}</p>
                  <p className="mt-3 text-sm text-slate-700">Reason: <strong>{request.reason}</strong></p>
                  {request.orderItem ? <p className="mt-1 text-sm text-slate-600">Item: {request.orderItem.titleSnapshot}</p> : <p className="mt-1 text-sm text-slate-600">Scope: Whole order</p>}
                  {request.customerNote ? <p className="mt-2 text-sm text-slate-600">Customer note: {request.customerNote}</p> : null}
                  {request.adminDecisionNote ? <p className="mt-2 text-sm text-slate-600">Admin note: {request.adminDecisionNote}</p> : null}
                  <Link href={`/admin/documents?ownerType=ORDER_REQUEST&q=${request.id}`} className="mt-2 inline-flex text-sm font-semibold text-omd-ops hover:text-omd-brown">
                    Open request documents
                  </Link>
                  <p className="mt-2 text-xs text-slate-500">Created {request.createdAt.toLocaleString("en-IN")} by {request.createdBy.name ?? request.createdBy.email ?? "Customer"}</p>
                </div>
                <RequestDecisionForm requestId={request.id} orderId={request.order.id} currentStatus={request.status} />
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestDecisionForm({ requestId, orderId, currentStatus }: { requestId: string; orderId: string; currentStatus: string }) {
  const disabled = ["rejected", "closed"].includes(currentStatus);

  return (
    <form action={updateOrderRequestStatusAction} className="grid h-fit gap-3 rounded-md border border-slate-200 bg-slate-50 p-4">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="redirectTo" value="/admin/requests" />
      <select name="status" defaultValue={currentStatus === "submitted" ? "under_review" : currentStatus} disabled={disabled} className="h-10 rounded-md border border-slate-300 px-3 text-sm disabled:bg-slate-100">
        <option value="under_review">Mark Under Review</option>
        <option value="approved">Approve Request</option>
        <option value="rejected">Reject Request</option>
        <option value="closed">Close Request</option>
      </select>
      <textarea name="adminDecisionNote" rows={3} placeholder="Admin decision note" disabled={disabled} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" />
      <button disabled={disabled} className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
        Save decision
      </button>
      <Link href={`/admin/orders/${orderId}`} className="text-sm font-semibold text-omd-ops hover:text-omd-brown">Open order</Link>
    </form>
  );
}
