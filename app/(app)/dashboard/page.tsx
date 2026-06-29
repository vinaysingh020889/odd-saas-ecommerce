import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { getActiveMembershipForUser, getComputedMembershipStatus } from "@/lib/membership";
import { buildAddressText } from "@/lib/checkout-maturity";
import { BreadcrumbHeader, Panel, PrimaryLink, SecondaryLink, StatusBadge } from "@/components/ui";

const quickActions = [
  { href: "/shop/category/festival-essentials", label: "Shop Festival Essentials", helper: "Seasonal products and kits" },
  { href: "/services", label: "Book Puja", helper: "Browse service placeholders" },
  { href: "/services/asthi-visarjan", label: "Asthi Visarjan", helper: "Start or track seva" },
  { href: "/kundli", label: "Kundli", helper: "Reports and matching" },
  { href: "/membership", label: "Membership", helper: "Plans and benefits" },
  { href: "/orders", label: "View Orders", helper: "Purchases and payments" },
  { href: "/addresses", label: "Addresses", helper: "Saved checkout delivery details" }
];

function asthiActionHref(application: { id: string; applicationNo: string | null; status: string }) {
  if (application.status === "PAYMENT_PENDING") return `/asthi/${application.id}/review`;
  if (application.status === "DETAILS_PENDING") return `/asthi/${application.applicationNo ?? application.id}/complete-details`;
  return `/asthi/${application.applicationNo ?? application.id}`;
}

function asthiNextAction(status: string) {
  if (status === "PAYMENT_PENDING") return "Review / confirm payment";
  if (status === "DETAILS_PENDING") return "Complete Asthi details";
  if (status === "DOCUMENTS_UNDER_REVIEW") return "Await document review";
  if (status === "DOCUMENTS_VERIFIED") return "Await ritual schedule";
  if (status === "RITUAL_SCHEDULED") return "Track ritual schedule";
  if (status === "IN_PROGRESS") return "Ritual in progress";
  if (status === "PROOF_UPLOADED") return "View proof notes";
  return "Track application";
}

function kundliActionHref(order: { id: string; orderNo: string | null; status: string }) {
  if (order.status === "PAYMENT_PENDING") return `/kundli/${order.id}/review`;
  if (order.status === "DETAILS_PENDING") return `/kundli/${order.orderNo ?? order.id}/complete-details`;
  return `/kundli/${order.orderNo ?? order.id}`;
}

function kundliNextAction(status: string) {
  if (status === "PAYMENT_PENDING") return "Review / confirm booking";
  if (status === "DETAILS_PENDING") return "Complete birth details";
  if (status === "SUBMITTED") return "Await guru assignment";
  if (status === "ASSIGNED") return "Assigned for review";
  if (status === "IN_REVIEW") return "Report being prepared";
  if (status === "REPORT_READY") return "Report ready";
  if (status === "CONSULTATION_SCHEDULED") return "Consultation scheduled";
  if (status === "DELIVERED") return "View report";
  return "Track Kundli";
}

function serviceBookingActionHref(booking: { id: string; status: string; paymentStatus: string }) {
  if (["PENDING", "FAILED", "NOT_STARTED"].includes(booking.paymentStatus)) return `/service-bookings/${booking.id}/review`;
  return `/service-bookings/${booking.id}`;
}

function serviceBookingNextAction(status: string, paymentStatus: string) {
  if (["PENDING", "FAILED", "NOT_STARTED"].includes(paymentStatus)) return "Pay now";
  if (status === "SUBMITTED") return "Await confirmation";
  if (status === "CONFIRMED") return "Await schedule";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "ASSIGNED") return "Assigned";
  if (status === "IN_PROGRESS") return "Service in progress";
  if (status === "PROOF_UPLOADED") return "View proof";
  return "Track booking";
}

export default async function DashboardPage() {
  const user = await requireCurrentUser();
  const [pendingPayment, recentOrders, activeMembership, latestMembership, activeAsthiApplications, activeKundliOrders, activeServiceBookings, defaultAddress] = await Promise.all([
    prisma.order.findFirst({
      where: {
        userId: user.id,
        paymentStatus: { in: ["not_started", "pending", "failed", "cancelled", "expired"] },
        status: { not: "cancelled" }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 3
    }),
    getActiveMembershipForUser(user.id),
    prisma.userMembership.findFirst({
      where: { userId: user.id },
      include: {
        plan: {
          include: {
            benefits: {
              where: { active: true },
              orderBy: [{ sortOrder: "asc" }, { title: "asc" }]
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.asthiApplication.findMany({
      where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
      include: {
        package: { select: { name: true } },
        location: { select: { name: true, city: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 3
    }),
    prisma.kundliOrder.findMany({
      where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
      include: { package: { select: { name: true, deliveryMode: true } } },
      orderBy: { updatedAt: "desc" },
      take: 3
    }),
    prisma.serviceBooking.findMany({
      where: { userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
      include: {
        service: { select: { title: true } },
        variant: { select: { title: true, sku: true } },
        rescheduleRequests: {
          where: { status: { in: ["submitted", "under_review", "queued"] } },
          orderBy: { createdAt: "desc" },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 3
    }),
    prisma.customerAddress.findFirst({
      where: { userId: user.id, isDefault: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);
  const computedLatestMembershipStatus = getComputedMembershipStatus(latestMembership);
  const hasActiveServices = activeAsthiApplications.length > 0 || activeKundliOrders.length > 0 || activeServiceBookings.length > 0;
  const recommendations = [
    !activeMembership
      ? { title: "Become a member for festival benefits", description: "Membership benefits are visible across festival, Kundli, support and future service flows.", href: "/membership", cta: "View Membership" }
      : activeKundliOrders.length === 0
        ? { title: "Use your Kundli benefits when enabled", description: "Kundli membership benefits are preview-only today and will be consumed in a later pass.", href: "/kundli", cta: "Explore Kundli" }
        : null,
    activeAsthiApplications.find((item) => item.status === "DETAILS_PENDING")
      ? { title: "Complete Asthi details", description: "Your Asthi payment is confirmed. Add family and document placeholder details to move forward.", href: asthiActionHref(activeAsthiApplications.find((item) => item.status === "DETAILS_PENDING")!), cta: "Complete Details" }
      : null,
    activeKundliOrders.find((item) => item.status === "DETAILS_PENDING")
      ? { title: "Complete Kundli birth details", description: "Your Kundli mock payment is confirmed. Birth details are needed before review starts.", href: kundliActionHref(activeKundliOrders.find((item) => item.status === "DETAILS_PENDING")!), cta: "Complete Details" }
      : null,
    !hasActiveServices
      ? { title: "Explore Puja services", description: "Browse guided service placeholders and spiritual offerings when you are ready.", href: "/services", cta: "View Services" }
      : { title: "Shop Festival Essentials", description: "Keep your puja and festival essentials ready while services progress.", href: "/shop/category/festival-essentials", cta: "Shop Now" }
  ].filter((item): item is { title: string; description: string; href: string; cta: string } => Boolean(item));

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Account" }]}
        actions={<StatusBadge tone="success">Signed in as {user.name || user.email || "Customer"}</StatusBadge>}
      />

      <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Customer Control Center</p>
            <h1 className="mt-2 text-2xl font-semibold text-omd-brown md:text-3xl">Namaste, {user.name || user.email || "Devotee"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-omd-muted">
              Track your shopping, membership, Asthi seva, and Kundli requests from one calm workspace.
            </p>
          </div>
          {activeMembership ? (
            <StatusBadge tone="success">{activeMembership.plan.name} active</StatusBadge>
          ) : (
            <StatusBadge tone="warning">No active membership</StatusBadge>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        {quickActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-lg border border-omd-sand bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-omd-gold hover:shadow-md"
          >
            <p className="font-semibold text-omd-brown">{action.label}</p>
            <p className="mt-1 text-xs leading-5 text-omd-muted">{action.helper}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-omd-brown">Active Membership</h2>
            {activeMembership ? <StatusBadge tone={statusTone(activeMembership.status)}>{statusLabel(activeMembership.status)}</StatusBadge> : null}
          </div>
          {activeMembership ? (
            <div className="mt-4">
              <p className="font-semibold text-omd-brown">{activeMembership.plan.name}</p>
              <p className="mt-2 text-sm text-omd-muted">Active until {activeMembership.expiresAt.toLocaleDateString("en-IN")}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-omd-saffron">
                {activeMembership.usages.length} recent benefit usage record(s)
              </p>
              <ul className="mt-3 grid gap-1 text-xs text-omd-muted">
                {activeMembership.plan.benefits.slice(0, 4).map((benefit) => (
                  <li key={benefit.id}>- {benefit.title}</li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                <SecondaryLink href="/membership">Benefits & Usage</SecondaryLink>
                <PrimaryLink href={`/membership/${activeMembership.plan.slug}/review`}>Renew</PrimaryLink>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              {latestMembership ? (
                <>
                  <StatusBadge tone={statusTone(computedLatestMembershipStatus)}>{statusLabel(computedLatestMembershipStatus)}</StatusBadge>
                  <p className="mt-3 font-semibold text-omd-brown">{latestMembership.plan.name}</p>
                  <p className="mt-2 text-sm leading-6 text-omd-muted">Expired on {latestMembership.expiresAt.toLocaleDateString("en-IN")}. Renew or choose another plan.</p>
                </>
              ) : (
                <p className="text-sm leading-6 text-omd-muted">No active membership yet.</p>
              )}
              <div className="mt-4">
                <PrimaryLink href="/membership">{latestMembership ? "Renew Membership" : "Become a Member"}</PrimaryLink>
              </div>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-omd-brown">Asthi Applications</h2>
            <StatusBadge tone={activeAsthiApplications.length ? "warning" : "neutral"}>{activeAsthiApplications.length} active</StatusBadge>
          </div>
          <div className="mt-4 grid gap-3">
            {activeAsthiApplications.map((application) => (
              <div key={application.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-omd-brown">{application.applicationNo ?? "Booking in progress"}</p>
                  <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-omd-muted">{application.package?.name ?? "Asthi Seva"} - {statusLabel(application.paymentStatus)}</p>
                <p className="mt-1 text-xs text-omd-muted">{asthiNextAction(application.status)}</p>
                <div className="mt-3">
                  <SecondaryLink href={asthiActionHref(application)}>{application.status === "PAYMENT_PENDING" ? "Review Payment" : application.status === "DETAILS_PENDING" ? "Complete Details" : "Track"}</SecondaryLink>
                </div>
              </div>
            ))}
            {activeAsthiApplications.length === 0 ? <p className="text-sm leading-6 text-omd-muted">No active Asthi application. Start only when your family needs guided assistance.</p> : null}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-omd-brown">Kundli Orders</h2>
            <StatusBadge tone={activeKundliOrders.length ? "warning" : "neutral"}>{activeKundliOrders.length} active</StatusBadge>
          </div>
          <div className="mt-4 grid gap-3">
            {activeKundliOrders.map((order) => (
              <div key={order.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-omd-brown">{order.orderNo ?? "Request in progress"}</p>
                  <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-omd-muted">{order.package.name} - {statusLabel(order.paymentStatus)}</p>
                <p className="mt-1 text-xs text-omd-muted">{kundliNextAction(order.status)}</p>
                <div className="mt-3">
                  <SecondaryLink href={kundliActionHref(order)}>{order.status === "PAYMENT_PENDING" ? "Review Payment" : order.status === "DETAILS_PENDING" ? "Complete Details" : "Track"}</SecondaryLink>
                </div>
              </div>
            ))}
            {activeKundliOrders.length === 0 ? <p className="text-sm leading-6 text-omd-muted">No active Kundli request. Start a report, matching, or consultation when ready.</p> : null}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-omd-brown">Puja / Service Bookings</h2>
            <StatusBadge tone={activeServiceBookings.length ? "warning" : "neutral"}>{activeServiceBookings.length} active</StatusBadge>
          </div>
          <div className="mt-4 grid gap-3">
            {activeServiceBookings.map((booking) => (
              <div key={booking.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-omd-brown">{booking.bookingNo ?? "Service booking"}</p>
                  <StatusBadge tone={statusTone(booking.status)}>{statusLabel(booking.status)}</StatusBadge>
                </div>
                <p className="mt-1 text-sm text-omd-muted">{booking.service.title} - {statusLabel(booking.paymentStatus)}</p>
                <p className="mt-1 text-xs text-omd-muted">{serviceBookingNextAction(booking.status, booking.paymentStatus)}</p>
                {booking.rescheduleRequests[0] ? (
                  <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                    Reschedule {statusLabel(booking.rescheduleRequests[0].status)}
                  </p>
                ) : null}
                <div className="mt-3">
                  <SecondaryLink href={serviceBookingActionHref(booking)}>
                    {["PENDING", "FAILED", "NOT_STARTED"].includes(booking.paymentStatus) ? "Pay Now" : "Track"}
                  </SecondaryLink>
                </div>
              </div>
            ))}
            {activeServiceBookings.length === 0 ? <p className="text-sm leading-6 text-omd-muted">No active Puja/general service booking. Browse services when ready.</p> : null}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-omd-brown">Orders / Shopping Summary</h2>
            {pendingPayment ? <StatusBadge tone={statusTone(pendingPayment.paymentStatus)}>{statusLabel(pendingPayment.paymentStatus)}</StatusBadge> : null}
          </div>
          {pendingPayment ? (
            <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3">
              <p className="font-semibold text-omd-brown">{pendingPayment.orderNumber}</p>
              <p className="mt-1 text-sm text-omd-muted">{formatMoney(pendingPayment.totalAmount, pendingPayment.currency)}</p>
              <div className="mt-3">
                <PrimaryLink href={`/orders/${pendingPayment.id}?pay=1`}>Continue Payment</PrimaryLink>
              </div>
            </div>
          ) : null}
          <div className="mt-4 grid gap-3">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/orders/${order.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-omd-sand p-3 hover:border-omd-gold">
                <div>
                  <p className="font-semibold text-omd-brown">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-omd-muted">{statusLabel(order.status)} - {order.createdAt.toLocaleDateString("en-IN")}</p>
                </div>
                <span className="font-semibold text-omd-brown">{formatMoney(order.totalAmount, order.currency)}</span>
              </Link>
            ))}
            {recentOrders.length === 0 ? <p className="text-sm leading-6 text-omd-muted">Your product and service orders will appear here after checkout.</p> : null}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-omd-brown">Default Address</h2>
            <SecondaryLink href="/addresses">{defaultAddress ? "Manage" : "Add"}</SecondaryLink>
          </div>
          {defaultAddress ? (
            <div className="mt-4 rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
              <p className="font-semibold text-omd-brown">{defaultAddress.fullName}</p>
              <p className="mt-1 text-sm text-omd-muted">{defaultAddress.phone}</p>
              <p className="mt-2 text-sm leading-6 text-omd-muted">{buildAddressText(defaultAddress)}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-6 text-omd-muted">Add one delivery address to speed up checkout.</p>
          )}
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold text-omd-brown">Recommended Next Steps</h2>
          <div className="mt-4 grid gap-3">
            {recommendations.slice(0, 3).map((item) => (
              <div key={item.title} className="rounded-md border border-omd-sand bg-white p-3">
                <p className="font-semibold text-omd-brown">{item.title}</p>
                <p className="mt-1 text-sm leading-6 text-omd-muted">{item.description}</p>
                <div className="mt-3">
                  <SecondaryLink href={item.href}>{item.cta}</SecondaryLink>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}
