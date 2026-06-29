import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { getDocumentsForOwner } from "@/lib/documents";
import { getOrCreateChecklistForOwner } from "@/lib/checklists";
import { reviewRescheduleRequestAction } from "@/lib/reschedule-actions";
import { promoteQueuedServiceBookingAction, setServiceBookingQueuePriorityAction, updateServiceBookingAdminAction } from "@/lib/service-booking-actions";
import { serviceBookingPaymentStatuses, serviceBookingStatuses } from "@/lib/service-bookings";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminAssignmentPanel } from "@/components/admin-assignment-panel";
import { AdminChecklistPanel } from "@/components/admin-checklist-panel";
import { AdminDocumentPanel } from "@/components/admin-document-panel";
import { AdminPanel, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminServiceBookingDetailPage({ params }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const booking = await prisma.serviceBooking.findFirst({
    where: { tenantId, OR: [{ id }, { bookingNo: id }] },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      service: { select: { id: true, title: true, slug: true } },
      variant: { select: { title: true, sku: true } },
      slot: { include: { ledgers: { orderBy: { createdAt: "desc" }, take: 8 } } },
      rescheduleRequests: {
        include: {
          requestedBy: { select: { name: true, email: true } },
          reviewedBy: { select: { name: true, email: true } },
          activities: { orderBy: { createdAt: "desc" }, take: 5 }
        },
        orderBy: { createdAt: "desc" }
      },
      activities: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!booking) notFound();

  const [assignments, users, documents, checklist] = await Promise.all([
    prisma.assignment.findMany({
      where: { tenantId, workType: "SERVICE_BOOKING", workId: booking.id },
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.user.findMany({
      where: { tenantId, roles: { some: { role: { key: { in: ["ADMIN", "SUPER_ADMIN", "OPERATIONS_ADMIN"] } } } } },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    }),
    getDocumentsForOwner("SERVICE_BOOKING", booking.id, tenantId),
    getOrCreateChecklistForOwner({ tenantId, relatedType: "SERVICE_BOOKING", relatedId: booking.id })
  ]);
  const redirectTo = `/admin/service-bookings/${booking.bookingNo ?? booking.id}`;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Service Booking"
        title={booking.bookingNo ?? booking.id}
        description={`${booking.service.title} for ${booking.customerName}`}
        tone="admin"
        actions={<Link href="/admin/service-bookings" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Back to queue</Link>}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <AdminPanel>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={statusTone(booking.status)}>{statusLabel(booking.status)}</StatusBadge>
            <StatusBadge tone={statusTone(booking.paymentStatus)}>Mock Payment {statusLabel(booking.paymentStatus)}</StatusBadge>
            <StatusBadge tone={statusTone(booking.capacityStatus)}>{statusLabel(booking.capacityStatus)}</StatusBadge>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <SummaryRow label="Service" value={booking.service.title} />
            <SummaryRow label="Package" value={booking.variant?.title ?? booking.variant?.sku ?? "Default"} />
            <SummaryRow label="Customer" value={booking.customerName} />
            <SummaryRow label="Email" value={booking.customerEmail || booking.user.email || "-"} />
            <SummaryRow label="Phone" value={booking.customerPhone || booking.user.phone || "-"} />
            <SummaryRow label="Preferred date" value={booking.preferredDate?.toLocaleDateString("en-IN") ?? booking.slot?.date.toLocaleDateString("en-IN") ?? "Manual review"} />
            <SummaryRow label="Preferred time" value={booking.preferredTime ?? booking.slot?.startTime ?? "Manual review"} />
            <SummaryRow label="Place" value={booking.locationText ?? "Manual review"} />
            <SummaryRow label="Participants" value={booking.participantCount} />
            <SummaryRow label="Total" value={formatMoney(booking.totalAmount, booking.currency)} strong />
            {booking.status === "QUEUED" ? <SummaryRow label="Queue position" value={`#${booking.queuePosition ?? "-"}`} strong /> : null}
            {booking.queueReason ? <SummaryRow label="Queue reason" value={booking.queueReason} /> : null}
            {booking.queuePriority ? <SummaryRow label="Priority" value={booking.queuePriorityReason ?? "Priority override"} /> : null}
          </div>
          {booking.specialInstructions ? <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">{booking.specialInstructions}</p> : null}
        </AdminPanel>

        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Admin Action</h2>
          <form action={updateServiceBookingAdminAction} className="mt-4 grid gap-3">
            <input type="hidden" name="bookingId" value={booking.id} />
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <select name="status" defaultValue={booking.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              {serviceBookingStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <select name="paymentStatus" defaultValue={booking.paymentStatus} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              {serviceBookingPaymentStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
            </select>
            <textarea name="internalNote" rows={3} defaultValue={booking.internalNote ?? ""} placeholder="Internal note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <textarea name="customerVisibleNote" rows={3} defaultValue={booking.customerVisibleNote ?? ""} placeholder="Customer-visible note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
            <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save booking</button>
          </form>
        </AdminPanel>
      </section>

      {booking.status === "QUEUED" ? (
        <section className="grid gap-5 lg:grid-cols-2">
          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Queue Priority</h2>
            <p className="mt-1 text-sm text-slate-600">Priority changes queue order but does not confirm capacity by itself.</p>
            <form action={setServiceBookingQueuePriorityAction} className="mt-4 grid gap-3">
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input type="hidden" name="priority" value={booking.queuePriority ? "false" : "true"} />
              {!booking.queuePriority ? <textarea name="reason" rows={3} placeholder="Priority reason" className="rounded-md border border-slate-300 px-3 py-2 text-sm" /> : null}
              <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100">
                {booking.queuePriority ? "Remove priority" : "Add priority"}
              </button>
            </form>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold text-slate-950">Promote Queued Booking</h2>
            <p className="mt-1 text-sm text-slate-600">Promote only when capacity is available or operations approves a manual priority override.</p>
            <form action={promoteQueuedServiceBookingAction} className="mt-4 grid gap-3">
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <textarea name="note" rows={3} placeholder="Customer-visible promotion note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="override" value="true" />
                Promote with manual capacity override
              </label>
              <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Promote booking</button>
            </form>
          </AdminPanel>
        </section>
      ) : null}

      <AdminAssignmentPanel
        title="Service Assignment"
        helper="Assign pandit, operator, temple coordinator or support owner. Customer-visible notes appear on tracking."
        workType="SERVICE_BOOKING"
        workId={booking.id}
        redirectTo={redirectTo}
        defaultRole="Pandit / Operator"
        assignments={assignments}
        users={users}
      />

      <AdminChecklistPanel checklist={checklist} users={users} redirectTo={redirectTo} />

      <AdminDocumentPanel title="Service Documents / Proof" ownerType="SERVICE_BOOKING" ownerId={booking.id} redirectTo={redirectTo} documents={documents} />

      <AdminPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Reschedule Requests</h2>
            <p className="mt-1 text-sm text-slate-600">Approval rechecks capacity and only then changes the customer booking schedule.</p>
          </div>
          <Link href="/admin/reschedule-requests" className="text-sm font-semibold text-omd-ops hover:text-slate-950">Open queue</Link>
        </div>
        <div className="mt-4 grid gap-3">
          {booking.rescheduleRequests.length === 0 ? <p className="text-sm text-slate-600">No reschedule requests for this booking.</p> : null}
          {booking.rescheduleRequests.map((request) => (
            <div key={request.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge>
                  <span className="text-sm font-semibold text-slate-950">{request.requestNo}</span>
                </div>
                <span className="text-xs text-slate-500">{request.createdAt.toLocaleString("en-IN")}</span>
              </div>
              <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <SummaryRow label="Current" value={`${request.currentDate?.toLocaleDateString("en-IN") ?? "Manual"} ${request.currentTime ?? ""}`} />
                <SummaryRow label="Requested" value={`${request.requestedDate?.toLocaleDateString("en-IN") ?? "Manual"} ${request.requestedTime ?? ""}`} />
                <SummaryRow label="Current place" value={request.currentLocation ?? "Manual review"} />
                <SummaryRow label="Requested place" value={request.requestedLocation ?? "Manual review"} />
                <SummaryRow label="Capacity preview" value={`${statusLabel(request.capacityDecision)} - ${request.capacityReason ?? "Not checked"}`} />
                <SummaryRow label="Requested by" value={request.requestedBy?.name ?? request.requestedBy?.email ?? "Customer"} />
              </div>
              {request.customerReason ? <p className="mt-3 text-sm text-slate-700">Customer reason: {request.customerReason}</p> : null}
              {request.adminNote ? <p className="mt-2 text-sm text-slate-600">Admin note: {request.adminNote}</p> : null}
              {["submitted", "under_review", "queued"].includes(request.status) ? (
                <form action={reviewRescheduleRequestAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_170px_170px_170px_190px]">
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="redirectTo" value={redirectTo} />
                  <input name="adminNote" placeholder="Internal decision note" className="h-10 rounded-md border border-slate-300 px-3 text-sm lg:col-span-2" />
                  <input name="customerVisibleNote" placeholder="Customer-visible note" className="h-10 rounded-md border border-slate-300 px-3 text-sm lg:col-span-2" />
                  <button name="action" value="approve" className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">Approve</button>
                  <button name="action" value="queue" className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">Approve to Queue</button>
                  <button name="action" value="reject" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Reject</button>
                  <button name="action" value="priority_exception" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-white">Priority Exception</button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">Timeline</h2>
        <div className="mt-4 grid gap-3">
          {booking.activities.length === 0 ? <p className="text-sm text-slate-600">No activity yet.</p> : null}
          {booking.activities.map((activity) => (
            <div key={activity.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(activity.type)}>{statusLabel(activity.type)}</StatusBadge>
                {activity.customerVisible ? <StatusBadge tone="success">Customer Visible</StatusBadge> : <StatusBadge tone="neutral">Internal</StatusBadge>}
              </div>
              <p className="mt-2 text-slate-700">{activity.message}</p>
              <p className="mt-1 text-xs text-slate-500">{activity.createdAt.toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      </AdminPanel>

      {booking.slot ? (
        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Capacity Slot</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SummaryRow label="Slot" value={booking.slot.title} />
            <SummaryRow label="Date" value={booking.slot.date.toLocaleDateString("en-IN")} />
            <SummaryRow label="Capacity" value={`${booking.slot.capacityConfirmed}/${booking.slot.capacityTotal} confirmed`} />
          </div>
          <div className="mt-4 grid gap-2">
            {booking.slot.ledgers.map((ledger) => (
              <p key={ledger.id} className="text-sm text-slate-600">{statusLabel(ledger.movementType)} {ledger.quantity} - {ledger.reason}</p>
            ))}
          </div>
        </AdminPanel>
      ) : null}
    </div>
  );
}
