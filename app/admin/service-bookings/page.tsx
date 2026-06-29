import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; paymentStatus?: string; capacityStatus?: string; priority?: string; date?: string; location?: string }>;
};

export default async function AdminServiceBookingsPage({ searchParams }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const paymentStatus = (params.paymentStatus ?? "").trim();
  const capacityStatus = (params.capacityStatus ?? "").trim();
  const priority = (params.priority ?? "").trim();
  const date = (params.date ?? "").trim();
  const location = (params.location ?? "").trim();
  const dateFilter = date ? new Date(date) : null;
  const nextDate = dateFilter ? new Date(dateFilter) : null;
  if (nextDate) nextDate.setDate(nextDate.getDate() + 1);

  const bookings = await prisma.serviceBooking.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(paymentStatus ? { paymentStatus } : {}),
      ...(capacityStatus ? { capacityStatus } : {}),
      ...(priority === "true" ? { queuePriority: true } : {}),
      ...(location ? { locationText: { contains: location, mode: "insensitive" } } : {}),
      ...(dateFilter && nextDate ? { preferredDate: { gte: dateFilter, lt: nextDate } } : {}),
      ...(q
        ? {
            OR: [
              { bookingNo: { contains: q, mode: "insensitive" } },
              { customerName: { contains: q, mode: "insensitive" } },
              { customerEmail: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q, mode: "insensitive" } },
              { service: { title: { contains: q, mode: "insensitive" } } }
            ]
          }
        : {})
    },
    include: {
      service: { select: { title: true, slug: true } },
      variant: { select: { title: true, sku: true } },
      slot: { select: { title: true, date: true, startTime: true } },
      capacityRule: { select: { id: true, dailyLimit: true, weeklyLimit: true, monthlyLimit: true, totalLimit: true } },
      _count: { select: { activities: true } }
    },
    orderBy: [{ queuePriority: "desc" }, { queueJoinedAt: "asc" }, { updatedAt: "desc" }, { createdAt: "desc" }],
    take: 100
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Service Bookings"
        description="Generic Puja/general service booking queue. Asthi and Kundli remain in their dedicated engines."
        tone="admin"
      />
      <AdminPanel>
        <form className="grid gap-3 lg:grid-cols-[1fr_160px_160px_160px_120px_140px_100px]">
          <input name="q" defaultValue={q} placeholder="Booking, service, customer, phone" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {["DRAFT", "QUEUED", "PAYMENT_PENDING", "SUBMITTED", "CONFIRMED", "SCHEDULED", "ASSIGNED", "IN_PROGRESS", "PROOF_PENDING", "PROOF_UPLOADED", "COMPLETED", "CANCELLED", "REFUNDED"].map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </select>
          <select name="paymentStatus" defaultValue={paymentStatus} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All payments</option>
            {["NOT_STARTED", "PENDING", "CONFIRMED", "FAILED", "REFUNDED"].map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </select>
          <select name="capacityStatus" defaultValue={capacityStatus} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All capacity</option>
            {["AVAILABLE", "HELD", "CONFIRMED", "QUEUED", "MANUAL_REVIEW", "OVERRIDE", "RELEASED"].map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </select>
          <select name="priority" defaultValue={priority} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">Any priority</option>
            <option value="true">Priority only</option>
          </select>
          <input type="date" name="date" defaultValue={date} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {bookings.length === 0 ? (
        <EmptyState title="No service bookings found" description={q || status || paymentStatus ? "No booking matches these filters." : "Generic Puja/general service bookings appear here after customers start a service booking."} />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Booking</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Queue</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="align-top">
                    <td className="px-4 py-3 font-semibold text-slate-950">{booking.bookingNo}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{booking.customerName}</span>
                      <br />
                      {booking.customerEmail}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{booking.service.title}</span>
                      <br />
                      {booking.variant?.title ?? booking.variant?.sku ?? "Default"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {booking.preferredDate?.toLocaleDateString("en-IN") ?? booking.slot?.date.toLocaleDateString("en-IN") ?? "Manual review"}
                      <br />
                      {booking.preferredTime ?? booking.slot?.startTime ?? "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <StatusBadge tone={statusTone(booking.status)}>{statusLabel(booking.status)}</StatusBadge>
                        <StatusBadge tone={statusTone(booking.paymentStatus)}>Mock {statusLabel(booking.paymentStatus)}</StatusBadge>
                        <StatusBadge tone={statusTone(booking.capacityStatus)}>{statusLabel(booking.capacityStatus)}</StatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {booking.status === "QUEUED" ? (
                        <div className="grid gap-1">
                          <span className="font-semibold text-slate-950">#{booking.queuePosition ?? "-"}</span>
                          {booking.queuePriority ? <StatusBadge tone="warning">Priority</StatusBadge> : null}
                          <span className="text-xs">{booking.queueReason ?? "Waiting for capacity"}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Not queued</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{formatMoney(booking.totalAmount, booking.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/service-bookings/${booking.bookingNo ?? booking.id}`} className="font-semibold text-omd-ops hover:text-slate-900">
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
