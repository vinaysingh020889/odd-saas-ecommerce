import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { getCustomerVisibleDocuments } from "@/lib/documents";
import { getChecklistMilestones } from "@/lib/checklists";
import { getRequiredSamagri } from "@/lib/recommendations";
import { createServiceBookingRescheduleRequestAction } from "@/lib/reschedule-actions";
import { activeRescheduleRequestStatuses, isServiceBookingRescheduleEligible } from "@/lib/reschedule-requests";
import { trackCustomerEvent } from "@/lib/customer-events";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { CatalogCard } from "@/components/catalog-card";
import { CustomerChecklistMilestones } from "@/components/customer-checklist-milestones";
import { CustomerDocumentList } from "@/components/customer-document-list";
import { Panel, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
};

function nextAction(status: string, paymentStatus: string) {
  if (status === "QUEUED") return "Waiting for service capacity";
  if (paymentStatus === "PENDING" || paymentStatus === "FAILED" || paymentStatus === "NOT_STARTED") return "Pay now";
  if (status === "SUBMITTED") return "Await confirmation";
  if (status === "CONFIRMED") return "Await schedule";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "ASSIGNED") return "Assigned";
  if (status === "IN_PROGRESS") return "Service in progress";
  if (status === "PROOF_UPLOADED") return "View proof";
  if (status === "COMPLETED") return "Completed";
  return "Track booking";
}

export default async function ServiceBookingTrackingPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const { id } = await params;
  const booking = await prisma.serviceBooking.findFirst({
    where: { tenantId, userId: user.id, OR: [{ id }, { bookingNo: id }] },
    include: {
      service: true,
      variant: true,
      slot: true,
      rescheduleRequests: { include: { activities: { orderBy: { createdAt: "desc" }, take: 5 } }, orderBy: { createdAt: "desc" } },
      activities: { where: { customerVisible: true }, orderBy: { createdAt: "desc" } }
    }
  });

  if (!booking) notFound();

  const [documents, checklistMilestones, requiredSamagri, assignments, futureSlots] = await Promise.all([
    getCustomerVisibleDocuments("SERVICE_BOOKING", booking.id, tenantId),
    getChecklistMilestones(tenantId, "SERVICE_BOOKING", booking.id),
    getRequiredSamagri({ tenantId, serviceId: booking.serviceId, limit: 4 }),
    prisma.assignment.findMany({
      where: { tenantId, workType: "SERVICE_BOOKING", workId: booking.id, customerVisibleNote: { not: null } },
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.serviceCapacitySlot.findMany({
      where: {
        tenantId,
        status: { in: ["ACTIVE", "HELD"] },
        date: { gte: new Date() },
        OR: [{ serviceId: booking.serviceId }, { serviceId: null }]
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      take: 20
    })
  ]);
  const activeRescheduleRequest = booking.rescheduleRequests.find((request) => activeRescheduleRequestStatuses.includes(request.status as never));
  const canRequestReschedule = !activeRescheduleRequest && isServiceBookingRescheduleEligible(booking.status, booking.paymentStatus);

  await trackCustomerEvent({
    tenantId,
    userId: user.id,
    eventType: "SERVICE_BOOKING_TRACKING_VIEWED",
    entityType: "SERVICE_BOOKING",
    entityId: booking.id,
    entitySlug: booking.bookingNo ?? booking.id,
    metadata: { status: booking.status, paymentStatus: booking.paymentStatus },
    recompute: false
  });

  return (
    <div className="grid gap-6">
      <nav className="flex items-center gap-2 text-sm text-omd-muted">
        <Link href="/dashboard" className="font-semibold text-omd-saffron hover:text-omd-brown">Dashboard</Link>
        <span>/</span>
        <span>{booking.bookingNo}</span>
      </nav>

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Panel>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={statusTone(booking.status)}>{statusLabel(booking.status)}</StatusBadge>
            <StatusBadge tone={statusTone(booking.paymentStatus)}>Mock Payment {statusLabel(booking.paymentStatus)}</StatusBadge>
            <StatusBadge tone={statusTone(booking.capacityStatus)}>{statusLabel(booking.capacityStatus)}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold text-omd-brown">{booking.service.title}</h1>
          <p className="mt-2 text-sm text-omd-muted">{booking.bookingNo}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <SummaryRow label="Package" value={booking.variant?.title ?? booking.variant?.sku ?? "Default"} />
            <SummaryRow label="Date" value={booking.preferredDate?.toLocaleDateString("en-IN") ?? booking.slot?.date.toLocaleDateString("en-IN") ?? "Manual review"} />
            <SummaryRow label="Time" value={booking.preferredTime ?? booking.slot?.startTime ?? "Manual review"} />
            <SummaryRow label="Place" value={booking.locationText ?? "Manual review"} />
            <SummaryRow label="Total" value={formatMoney(booking.totalAmount, booking.currency)} strong />
            <SummaryRow label="Next action" value={nextAction(booking.status, booking.paymentStatus)} />
            {booking.status === "QUEUED" ? <SummaryRow label="Queue position" value={`#${booking.queuePosition ?? "-"}`} strong /> : null}
          </div>
          {booking.status === "QUEUED" ? (
            <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Your booking is waitlisted.</p>
              <p className="mt-1">{booking.queueReason ?? "Operations will review the next available service capacity and update this booking."}</p>
            </div>
          ) : null}
          {booking.customerVisibleNote ? <p className="mt-5 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-omd-ops">{booking.customerVisibleNote}</p> : null}
          {booking.status !== "QUEUED" && ["PENDING", "FAILED", "NOT_STARTED"].includes(booking.paymentStatus) ? (
            <Link href={`/service-bookings/${booking.id}/review`} className="mt-5 inline-flex rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
              Continue Mock Payment
            </Link>
          ) : null}
        </Panel>

        <Panel className="h-fit">
          <h2 className="text-xl font-semibold text-omd-brown">Assigned Support</h2>
          <div className="mt-4 grid gap-3">
            {assignments.length === 0 ? <p className="text-sm text-omd-muted">Assignment details will appear here when operations shares them.</p> : null}
            {assignments.map((assignment) => (
              <div key={assignment.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                <p className="font-semibold text-omd-brown">{assignment.assignmentLabel ?? assignment.assignedRole ?? "Operations"}</p>
                <p className="mt-1 text-omd-muted">{assignment.customerVisibleNote}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <CustomerDocumentList title="Service Documents / Proof" documents={documents} />

      <CustomerChecklistMilestones title="Service Milestones" milestones={checklistMilestones} />

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-omd-brown">Reschedule Request</h2>
            <p className="mt-1 text-sm text-omd-muted">Requests are reviewed by operations before your booking date, time, slot, or place changes.</p>
          </div>
          {activeRescheduleRequest ? <StatusBadge tone={statusTone(activeRescheduleRequest.status)}>{statusLabel(activeRescheduleRequest.status)}</StatusBadge> : null}
        </div>

        {activeRescheduleRequest ? (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">{activeRescheduleRequest.requestNo} is under review</p>
            <p className="mt-1">
              Requested: {activeRescheduleRequest.requestedDate?.toLocaleDateString("en-IN") ?? "Date unchanged"}
              {activeRescheduleRequest.requestedTime ? `, ${activeRescheduleRequest.requestedTime}` : ""}
              {activeRescheduleRequest.requestedLocation ? `, ${activeRescheduleRequest.requestedLocation}` : ""}
            </p>
            {activeRescheduleRequest.customerVisibleNote ? <p className="mt-2">{activeRescheduleRequest.customerVisibleNote}</p> : null}
          </div>
        ) : null}

        {canRequestReschedule ? (
          <form action={createServiceBookingRescheduleRequestAction} className="mt-5 grid gap-3 rounded-md border border-omd-sand bg-omd-ivory/30 p-4 md:grid-cols-2">
            <input type="hidden" name="bookingId" value={booking.id} />
            <label className="grid gap-1 text-sm font-semibold text-omd-brown">
              Preferred date
              <input name="requestedDate" type="date" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-omd-brown">
              Preferred time
              <input name="requestedTime" placeholder="Morning / 10:30 AM" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-omd-brown md:col-span-2">
              Available slot
              <select name="requestedSlotId" defaultValue="" className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal">
                <option value="">No fixed slot / manual review</option>
                {futureSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.title} - {slot.date.toLocaleDateString("en-IN")} {slot.startTime ?? ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-omd-brown md:col-span-2">
              Preferred place
              <input name="requestedLocation" defaultValue={booking.locationText ?? ""} className="h-11 rounded-md border border-omd-sand px-3 text-sm font-normal" />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-omd-brown md:col-span-2">
              Reason
              <textarea name="customerReason" rows={3} placeholder="Tell operations why this booking needs to move." className="rounded-md border border-omd-sand px-3 py-2 text-sm font-normal" />
            </label>
            <button className="rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron md:col-span-2">
              Submit Reschedule Request
            </button>
          </form>
        ) : null}

        {!activeRescheduleRequest && !canRequestReschedule ? (
          <p className="mt-4 rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm text-omd-muted">Reschedule is not available for this booking status.</p>
        ) : null}

        {booking.rescheduleRequests.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {booking.rescheduleRequests.slice(0, 4).map((request) => (
              <div key={request.id} className="rounded-md border border-omd-sand p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-omd-brown">{request.requestNo}</p>
                  <StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge>
                </div>
                <p className="mt-1 text-omd-muted">
                  Requested {request.requestedDate?.toLocaleDateString("en-IN") ?? "same date"} {request.requestedTime ?? ""} {request.requestedLocation ?? ""}
                </p>
                {request.customerVisibleNote ? <p className="mt-1 text-omd-muted">{request.customerVisibleNote}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel>
        <h2 className="text-xl font-semibold text-omd-brown">Timeline</h2>
        <div className="mt-4 grid gap-3">
          {booking.activities.map((activity) => (
            <div key={activity.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
              <p className="font-semibold text-omd-brown">{statusLabel(activity.type)}</p>
              <p className="mt-1 text-omd-muted">{activity.message}</p>
              <p className="mt-1 text-xs text-omd-muted">{activity.createdAt.toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      </Panel>

      {requiredSamagri.length ? (
        <Panel>
          <h2 className="text-xl font-semibold text-omd-brown">Useful Samagri</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {requiredSamagri.map((recommendation) => <CatalogCard key={recommendation.item.id} item={recommendation.item} stock={recommendation.stock} />)}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
