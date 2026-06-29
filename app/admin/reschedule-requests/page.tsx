import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireSupportAdminUser } from "@/lib/admin-auth";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { reviewRescheduleRequestAction } from "@/lib/reschedule-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { prisma } from "@/lib/prisma";
import { AdminPanel, EmptyState, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ status?: string; q?: string; date?: string }>;
};

export default async function AdminRescheduleRequestsPage({ searchParams }: PageProps) {
  await requireSupportAdminUser();
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const status = (params.status ?? "").trim();
  const q = (params.q ?? "").trim();
  const date = (params.date ?? "").trim();
  const dateFilter = date ? new Date(date) : null;
  const nextDate = dateFilter ? new Date(dateFilter) : null;
  if (nextDate) nextDate.setDate(nextDate.getDate() + 1);

  const where: Prisma.RescheduleRequestWhereInput = {
    tenantId,
    ...(status ? { status } : { status: { in: ["submitted", "under_review", "queued"] } }),
    ...(dateFilter && nextDate ? { requestedDate: { gte: dateFilter, lt: nextDate } } : {}),
    ...(q
      ? {
          OR: [
            { requestNo: { contains: q, mode: "insensitive" } },
            { serviceBooking: { bookingNo: { contains: q, mode: "insensitive" } } },
            { serviceBooking: { customerName: { contains: q, mode: "insensitive" } } },
            { serviceBooking: { customerEmail: { contains: q, mode: "insensitive" } } },
            { serviceBooking: { service: { title: { contains: q, mode: "insensitive" } } } }
          ]
        }
      : {})
  };

  const requests = await prisma.rescheduleRequest.findMany({
    where,
    include: {
      requestedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      serviceBooking: {
        include: {
          service: { select: { title: true, slug: true } },
          variant: { select: { title: true, sku: true } }
        }
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100
  });

  const counts = await prisma.rescheduleRequest.groupBy({
    by: ["status"],
    where: { tenantId },
    _count: { _all: true }
  });
  const countMap = new Map(counts.map((item) => [item.status, item._count._all]));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Reschedule Requests"
        description="Review service booking reschedule requests, recheck capacity, then approve, queue, or reject."
        tone="admin"
        actions={<StatusBadge tone={(countMap.get("submitted") ?? 0) ? "warning" : "success"}>{countMap.get("submitted") ?? 0} pending</StatusBadge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {["submitted", "under_review", "approved", "queued", "rejected"].map((item) => (
          <Link key={item} href={`/admin/reschedule-requests?status=${item}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-omd-ops">
            <p className="text-sm font-semibold text-slate-600">{statusLabel(item)}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{countMap.get(item) ?? 0}</p>
          </Link>
        ))}
      </section>

      <AdminPanel>
        <form className="grid gap-3 lg:grid-cols-[1fr_180px_180px_100px]">
          <input name="q" defaultValue={q} placeholder="Request, booking, service, customer" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">Open requests</option>
            {["submitted", "under_review", "approved", "queued", "priority_exception", "rejected", "closed"].map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </select>
          <input type="date" name="date" defaultValue={date} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {requests.length === 0 ? (
        <EmptyState title="No reschedule requests" description={q || status || date ? "No request matches these filters." : "Customer reschedule requests for service bookings will appear here."} />
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => {
            const booking = request.serviceBooking;
            const redirectTo = "/admin/reschedule-requests";
            return (
              <AdminPanel key={request.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge>
                      <StatusBadge tone={statusTone(request.capacityDecision)}>{statusLabel(request.capacityDecision)}</StatusBadge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold text-slate-950">{request.requestNo}</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {booking?.service.title ?? "Service booking"} for {booking?.customerName ?? request.requestedBy?.name ?? "Customer"}
                    </p>
                  </div>
                  {booking ? (
                    <Link href={`/admin/service-bookings/${booking.bookingNo ?? booking.id}`} className="text-sm font-semibold text-omd-ops hover:text-slate-950">Open booking</Link>
                  ) : null}
                </div>

                {booking ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <SummaryRow label="Booking" value={booking.bookingNo ?? booking.id} />
                    <SummaryRow label="Package" value={booking.variant?.title ?? booking.variant?.sku ?? "Default"} />
                    <SummaryRow label="Amount" value={formatMoney(booking.totalAmount, booking.currency)} />
                    <SummaryRow label="Current" value={`${request.currentDate?.toLocaleDateString("en-IN") ?? "Manual"} ${request.currentTime ?? ""}`} />
                    <SummaryRow label="Requested" value={`${request.requestedDate?.toLocaleDateString("en-IN") ?? "Manual"} ${request.requestedTime ?? ""}`} />
                    <SummaryRow label="Place" value={request.requestedLocation ?? request.currentLocation ?? "Manual review"} />
                  </div>
                ) : null}

                <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <p><span className="font-semibold">Capacity:</span> {request.capacityReason ?? "Not evaluated yet."}</p>
                  {request.customerReason ? <p className="mt-1"><span className="font-semibold">Customer reason:</span> {request.customerReason}</p> : null}
                </div>

                {["submitted", "under_review", "queued"].includes(request.status) ? (
                  <form action={reviewRescheduleRequestAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_160px_160px_150px_180px]">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input type="hidden" name="redirectTo" value={redirectTo} />
                    <input name="adminNote" placeholder="Internal note" className="h-10 rounded-md border border-slate-300 px-3 text-sm lg:col-span-2" />
                    <input name="customerVisibleNote" placeholder="Customer-visible note" className="h-10 rounded-md border border-slate-300 px-3 text-sm lg:col-span-2" />
                    <button name="action" value="approve" className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Approve</button>
                    <button name="action" value="queue" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">Approve to Queue</button>
                    <button name="action" value="reject" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Reject</button>
                    <button name="action" value="priority_exception" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-white">Priority Exception</button>
                  </form>
                ) : null}
              </AdminPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
