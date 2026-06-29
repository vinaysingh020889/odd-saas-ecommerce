import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { confirmServiceBookingMockPaymentAction, failServiceBookingMockPaymentAction } from "@/lib/service-booking-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { Panel, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ServiceBookingReviewPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const { id } = await params;
  const booking = await prisma.serviceBooking.findFirst({
    where: { tenantId, userId: user.id, OR: [{ id }, { bookingNo: id }] },
    include: { service: true, variant: true, slot: true }
  });

  if (!booking) notFound();

  const canPay = booking.status !== "QUEUED" && !["CONFIRMED", "REFUNDED"].includes(booking.paymentStatus) && !["COMPLETED", "CANCELLED", "REFUNDED"].includes(booking.status);

  return (
    <div className="grid gap-6">
      <nav className="flex items-center gap-2 text-sm text-omd-muted">
        <Link href="/services" className="font-semibold text-omd-saffron hover:text-omd-brown">Services</Link>
        <span>/</span>
        <Link href={`/services/${booking.service.slug}`} className="font-semibold text-omd-saffron hover:text-omd-brown">{booking.service.title}</Link>
        <span>/</span>
        <span>Review</span>
      </nav>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
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
            <SummaryRow label="Preferred date" value={booking.preferredDate?.toLocaleDateString("en-IN") ?? "Manual review"} />
            <SummaryRow label="Preferred time" value={booking.preferredTime ?? "Manual review"} />
            <SummaryRow label="Place" value={booking.locationText ?? "Manual review"} />
            <SummaryRow label="Participants" value={booking.participantCount} />
            <SummaryRow label="Quantity" value={booking.quantity} />
          </div>
          {booking.specialInstructions ? <p className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm text-omd-muted">{booking.specialInstructions}</p> : null}
        </Panel>

        <Panel className="h-fit">
          <h2 className="text-xl font-semibold text-omd-brown">Payment Review</h2>
          <div className="mt-5 grid gap-3">
            <SummaryRow label="Service" value={booking.service.title} />
            <SummaryRow label="Package" value={booking.variant?.title ?? "Default"} />
            <SummaryRow label="Total" value={formatMoney(booking.totalAmount, booking.currency)} strong />
          </div>
          <p className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm leading-6 text-omd-muted">
            {booking.status === "QUEUED"
              ? "This booking is waitlisted because service capacity needs operations review. Payment opens after an admin promotes the booking."
              : "This is a mock/manual service booking payment shell. No Razorpay, PayPal, wallet, webhook or provider call is connected."}
          </p>
          {canPay ? (
            <div className="mt-5 grid gap-2">
              <form action={confirmServiceBookingMockPaymentAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <button className="w-full rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
                  Simulate Mock Payment Success
                </button>
              </form>
              <form action={failServiceBookingMockPaymentAction}>
                <input type="hidden" name="bookingId" value={booking.id} />
                <button className="w-full rounded-md border border-omd-sand px-4 py-3 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                  Simulate Failure / Release Hold
                </button>
              </form>
            </div>
          ) : (
            <Link href={`/service-bookings/${booking.id}`} className="mt-5 inline-flex w-full justify-center rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white">
              Track Booking
            </Link>
          )}
        </Panel>
      </section>
    </div>
  );
}
