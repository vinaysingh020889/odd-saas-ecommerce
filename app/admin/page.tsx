import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { getVariantStockSummaries } from "@/lib/inventory";
import { getChecklistQueueStats } from "@/lib/checklists";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge } from "@/components/ui";

const adminLinks = [
  { href: "/admin/asthi", label: "Manage Asthi" },
  { href: "/admin/kundli", label: "Manage Kundli" },
  { href: "/admin/memberships", label: "Manage Memberships" },
  { href: "/admin/products", label: "Manage Products" },
  { href: "/admin/orders", label: "Manage Orders" },
  { href: "/admin/services", label: "Manage Services" }
];

function asthiNextAction(status: string, documentStatus: string) {
  if (status === "PAYMENT_PENDING") return "Confirm payment";
  if (status === "DETAILS_PENDING") return "Await details";
  if (status === "DOCUMENTS_UNDER_REVIEW" && documentStatus === "PENDING_UPLOAD") return "Await documents";
  if (status === "DOCUMENTS_UNDER_REVIEW") return "Review documents";
  if (status === "DOCUMENTS_VERIFIED") return "Schedule ritual";
  if (status === "RITUAL_SCHEDULED") return "Start ritual";
  if (status === "IN_PROGRESS") return "Upload proof";
  if (status === "PROOF_UPLOADED") return "Complete application";
  return "Review";
}

function kundliNextAction(status: string, paymentStatus: string) {
  if (paymentStatus !== "CONFIRMED") return "Confirm payment";
  if (status === "DETAILS_PENDING") return "Await birth details";
  if (status === "SUBMITTED") return "Assign astrologer";
  if (status === "ASSIGNED") return "Prepare report";
  if (status === "IN_REVIEW") return "Prepare report";
  if (status === "REPORT_READY") return "Deliver report";
  if (status === "CONSULTATION_SCHEDULED") return "Manage consultation";
  if (status === "DELIVERED") return "Complete order";
  return "Review";
}

function membershipNextAction(status: string, expiresAt: Date) {
  const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (status === "EXPIRED") return "Expired";
  if (status === "CANCELLED") return "Cancelled";
  if (daysLeft <= 15) return "Expiring soon";
  return "Active";
}

export default async function AdminPage() {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const tenantId = await getOmdTenantId();
  const physicalVariants = await prisma.productVariant.findMany({
    where: { product: { tenantId, type: "PHYSICAL" } },
    select: { id: true }
  });
  const stockByVariant = await getVariantStockSummaries(physicalVariants.map((variant) => variant.id));
  const lowOrOutStock = [...stockByVariant.values()].filter((stock) => stock.status !== "IN_STOCK").length;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date();
  soon.setDate(soon.getDate() + 15);

  const [
    productOrdersPending,
    paymentPending,
    paymentFailed,
    paidAwaitingProcessing,
    asthiNeedsAction,
    kundliNeedsAction,
    activeMemberships,
    expiringMemberships,
    reschedulePending,
    checklistStats,
    kitsWithoutComponents,
    recentAsthi,
    recentKundli,
    recentMemberships,
    recentOrders
  ] = await Promise.all([
    prisma.order.count({ where: { tenantId, status: { in: ["draft", "confirmed", "processing"] } } }),
    prisma.order.count({ where: { tenantId, paymentStatus: { in: ["not_started", "pending"] } } }),
    prisma.order.count({ where: { tenantId, paymentStatus: "failed" } }),
    prisma.order.count({ where: { tenantId, paymentStatus: "succeeded", fulfillmentStatus: "unfulfilled" } }),
    prisma.asthiApplication.count({
      where: { tenantId, status: { in: ["PAYMENT_PENDING", "DETAILS_PENDING", "DOCUMENTS_UNDER_REVIEW", "DOCUMENTS_VERIFIED", "RITUAL_SCHEDULED", "IN_PROGRESS", "PROOF_UPLOADED"] } }
    }),
    prisma.kundliOrder.count({
      where: { tenantId, status: { in: ["PAYMENT_PENDING", "DETAILS_PENDING", "SUBMITTED", "ASSIGNED", "IN_REVIEW", "REPORT_READY", "CONSULTATION_SCHEDULED", "DELIVERED"] } }
    }),
    prisma.userMembership.count({ where: { tenantId, status: "ACTIVE", expiresAt: { gt: new Date() } } }),
    prisma.userMembership.count({ where: { tenantId, status: "ACTIVE", expiresAt: { gt: new Date(), lte: soon } } }),
    prisma.rescheduleRequest.count({ where: { tenantId, status: { in: ["submitted", "under_review", "queued"] } } }),
    getChecklistQueueStats(tenantId),
    prisma.product.count({ where: { tenantId, type: "KIT", kitComponents: { none: {} } } }),
    prisma.asthiApplication.findMany({
      where: { tenantId },
      include: {
        user: { select: { name: true, email: true } },
        package: { select: { name: true } },
        location: { select: { name: true, city: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.kundliOrder.findMany({
      where: { tenantId },
      include: {
        user: { select: { name: true, email: true } },
        package: { select: { name: true, deliveryMode: true } }
      },
      orderBy: { updatedAt: "desc" },
      take: 5
    }),
    prisma.userMembership.findMany({
      where: { tenantId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, status: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.order.findMany({
      where: { tenantId },
      select: { id: true, orderNumber: true, customerName: true, paymentStatus: true, fulfillmentStatus: true, status: true, totalAmount: true, currency: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5
    })
  ]);

  const cards = [
    { label: "Asthi Needing Action", value: asthiNeedsAction, href: "/admin/asthi", tone: asthiNeedsAction ? "warning" : "neutral" },
    { label: "Kundli Needing Action", value: kundliNeedsAction, href: "/admin/kundli", tone: kundliNeedsAction ? "warning" : "neutral" },
    { label: "Active Memberships", value: activeMemberships, href: "/admin/memberships", tone: "success" },
    { label: "Membership Attention", value: expiringMemberships, href: "/admin/memberships?status=ACTIVE", tone: expiringMemberships ? "warning" : "neutral" },
    { label: "Product Orders Pending", value: productOrdersPending, href: "/admin/orders", tone: productOrdersPending ? "warning" : "neutral" },
    { label: "Payment Pending", value: paymentPending, href: "/admin/payments", tone: paymentPending ? "warning" : "neutral" },
    { label: "Payment Failed", value: paymentFailed, href: "/admin/payments?status=failed", tone: paymentFailed ? "error" : "neutral" },
    { label: "Paid Awaiting Processing", value: paidAwaitingProcessing, href: "/admin/orders?paymentStatus=succeeded", tone: paidAwaitingProcessing ? "warning" : "neutral" },
    { label: "Reschedule Requests", value: reschedulePending, href: "/admin/reschedule-requests", tone: reschedulePending ? "warning" : "neutral" },
    { label: "Checklist Pending", value: checklistStats.pending, href: "/admin/queues", tone: checklistStats.pending ? "warning" : "neutral" },
    { label: "Checklist Overdue", value: checklistStats.overdue, href: "/admin/queues", tone: checklistStats.overdue ? "error" : "neutral" },
    { label: "Checklist Blocked", value: checklistStats.blocked, href: "/admin/queues", tone: checklistStats.blocked ? "error" : "neutral" },
    { label: "Low / Out Stock", value: lowOrOutStock, href: "/admin/inventory?status=LOW_STOCK", tone: lowOrOutStock ? "error" : "neutral" },
    { label: "Kits Missing Components", value: kitsWithoutComponents, href: "/admin/products", tone: kitsWithoutComponents ? "error" : "neutral" }
  ] satisfies Array<{ label: string; value: number; href: string; tone: "neutral" | "success" | "warning" | "error" | "ops" }>;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Admin Operations Overview"
        description="Queue-first control center for Asthi, Kundli, memberships, product orders, payments, fulfilment, and catalog attention."
        tone="admin"
        actions={<StatusBadge tone="ops">Queue-first</StatusBadge>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-omd-ops">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-slate-600">{card.label}</p>
              <StatusBadge tone={card.tone}>{card.value}</StatusBadge>
            </div>
            <p className="mt-3 text-3xl font-semibold text-slate-950">{card.value}</p>
          </Link>
        ))}
      </section>

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">Quick Admin Links</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops">
              {link.label}
            </Link>
          ))}
        </div>
      </AdminPanel>

      <section className="grid gap-5 xl:grid-cols-2">
        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Asthi Recent Queue</h2>
          <div className="mt-4 grid gap-3">
            {recentAsthi.map((application) => (
              <Link key={application.id} href={`/admin/asthi/${application.applicationNo ?? application.id}`} className="rounded-md border border-slate-200 p-3 hover:border-omd-ops">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{application.applicationNo ?? "Draft application"}</p>
                    <p className="mt-1 text-sm text-slate-600">{application.applicantName} - {application.package?.name ?? "Asthi Seva"}</p>
                  </div>
                  <StatusBadge tone={statusTone(application.status)}>{statusLabel(application.status)}</StatusBadge>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{asthiNextAction(application.status, application.documentStatus)}</p>
              </Link>
            ))}
            {recentAsthi.length === 0 ? <p className="text-sm text-slate-600">No Asthi applications yet.</p> : null}
          </div>
        </AdminPanel>

        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Kundli Recent Queue</h2>
          <div className="mt-4 grid gap-3">
            {recentKundli.map((order) => (
              <Link key={order.id} href={`/admin/kundli/${order.orderNo ?? order.id}`} className="rounded-md border border-slate-200 p-3 hover:border-omd-ops">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{order.orderNo ?? "Draft Kundli"}</p>
                    <p className="mt-1 text-sm text-slate-600">{order.applicantName} - {order.package.name}</p>
                  </div>
                  <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{kundliNextAction(order.status, order.paymentStatus)}</p>
              </Link>
            ))}
            {recentKundli.length === 0 ? <p className="text-sm text-slate-600">No Kundli orders yet.</p> : null}
          </div>
        </AdminPanel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Recent Membership Activations</h2>
          <div className="mt-4 grid gap-3">
            {recentMemberships.map((membership) => (
              <Link key={membership.id} href={`/admin/customers/${membership.user.id}`} className="rounded-md border border-slate-200 p-3 hover:border-omd-ops">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{membership.user.name ?? membership.user.email ?? "Customer"}</p>
                    <p className="mt-1 text-sm text-slate-600">{membership.plan.name} - expires {membership.expiresAt.toLocaleDateString("en-IN")}</p>
                  </div>
                  <StatusBadge tone={statusTone(membership.status)}>{membershipNextAction(membership.status, membership.expiresAt)}</StatusBadge>
                </div>
                {membership.plan.status !== "ACTIVE" ? <p className="mt-2 text-xs font-semibold text-omd-error">Plan inactive warning</p> : null}
              </Link>
            ))}
            {recentMemberships.length === 0 ? <p className="text-sm text-slate-600">No membership activations yet.</p> : null}
          </div>
        </AdminPanel>

        <AdminPanel>
          <h2 className="text-lg font-semibold text-slate-950">Existing Orders Queue</h2>
          <div className="mt-4 grid gap-3">
            {recentOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="rounded-md border border-slate-200 p-3 hover:border-omd-ops">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{order.orderNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{order.customerName} - {order.createdAt.toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</StatusBadge>
                    <StatusBadge tone={statusTone(order.fulfillmentStatus)}>{statusLabel(order.fulfillmentStatus)}</StatusBadge>
                  </div>
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-950">{formatMoney(order.totalAmount, order.currency)}</p>
              </Link>
            ))}
            {recentOrders.length === 0 ? <p className="text-sm text-slate-600">No order drafts yet.</p> : null}
          </div>
        </AdminPanel>
      </section>
    </div>
  );
}
