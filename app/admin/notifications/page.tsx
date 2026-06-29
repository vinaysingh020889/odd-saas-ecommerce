import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getVariantStockSummaries } from "@/lib/inventory";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type Alert = {
  key: string;
  title: string;
  description: string;
  href: string;
  tone: "neutral" | "success" | "warning" | "error" | "ops";
  group: string;
};

export default async function AdminNotificationsPage() {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    overdueAssignments,
    dueTodayAssignments,
    unassignedWork,
    pendingDocuments,
    pendingRequests,
    failedPayments,
    pendingPayments,
    variants,
    slots
  ] = await Promise.all([
    prisma.assignment.count({ where: { tenantId, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueAt: { lt: now } } }),
    prisma.assignment.count({ where: { tenantId, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueAt: { gte: now, lte: todayEnd } } }),
    prisma.assignment.count({ where: { tenantId, status: { notIn: ["COMPLETED", "CANCELLED"] }, assignedUserId: null, assignmentLabel: null } }),
    prisma.operationalDocument.count({ where: { tenantId, status: { in: ["UPLOADED", "UNDER_REVIEW", "REUPLOAD_REQUIRED"] } } }),
    prisma.orderRequest.count({ where: { tenantId, status: { in: ["submitted", "under_review"] } } }),
    prisma.order.count({ where: { tenantId, paymentStatus: "failed" } }),
    prisma.order.count({ where: { tenantId, paymentStatus: { in: ["not_started", "pending"] } } }),
    prisma.productVariant.findMany({ where: { product: { tenantId, status: "ACTIVE", type: { in: ["PHYSICAL", "KIT"] } } }, select: { id: true } }),
    prisma.serviceCapacitySlot.findMany({ where: { tenantId, status: "ACTIVE", date: { gte: now } }, select: { id: true, title: true, capacityTotal: true, capacityHeld: true, capacityConfirmed: true } })
  ]);

  const stock = await getVariantStockSummaries(variants.map((variant) => variant.id));
  const lowStock = [...stock.values()].filter((item) => item.status !== "IN_STOCK").length;
  const fullCapacity = slots.filter((slot) => slot.capacityHeld + slot.capacityConfirmed >= slot.capacityTotal).length;

  const alerts: Alert[] = [
    overdueAssignments ? { key: "overdue", title: "Overdue assignments", description: `${overdueAssignments} assignment(s) are past due.`, href: "/admin/queues?due=overdue", tone: "error", group: "Assignments" } : null,
    dueTodayAssignments ? { key: "due-today", title: "Assignments due today", description: `${dueTodayAssignments} assignment(s) need attention today.`, href: "/admin/queues?due=today", tone: "warning", group: "Assignments" } : null,
    unassignedWork ? { key: "unassigned", title: "Unassigned work", description: `${unassignedWork} assignment(s) need an owner.`, href: "/admin/queues?owner=unassigned", tone: "warning", group: "Assignments" } : null,
    pendingDocuments ? { key: "documents", title: "Pending document review", description: `${pendingDocuments} document(s) need review or customer follow-up.`, href: "/admin/documents?status=UNDER_REVIEW", tone: "warning", group: "Documents" } : null,
    pendingRequests ? { key: "requests", title: "Pending requests", description: `${pendingRequests} cancellation/return/refund request(s) are open.`, href: "/admin/requests", tone: "warning", group: "Requests" } : null,
    failedPayments ? { key: "failed-payments", title: "Failed mock payments", description: `${failedPayments} order(s) have failed mock payment status.`, href: "/admin/payments?status=failed", tone: "error", group: "Payments" } : null,
    pendingPayments ? { key: "pending-payments", title: "Pending mock payments", description: `${pendingPayments} order(s) are waiting for mock payment.`, href: "/admin/payments", tone: "warning", group: "Payments" } : null,
    lowStock ? { key: "low-stock", title: "Low or out of stock", description: `${lowStock} variant(s) need stock review.`, href: "/admin/inventory", tone: "error", group: "Inventory" } : null,
    fullCapacity ? { key: "capacity", title: "Capacity full", description: `${fullCapacity} active capacity slot(s) are full.`, href: "/admin/capacity", tone: "error", group: "Capacity" } : null
  ].filter(Boolean) as Alert[];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="System"
        title="Admin Notifications"
        description="Internal alert shell generated from live operational data. No email, WhatsApp or SMS is sent."
        tone="admin"
        actions={<StatusBadge tone={alerts.length ? "warning" : "success"}>{alerts.length} alert(s)</StatusBadge>}
      />

      {alerts.length === 0 ? (
        <EmptyState title="No active admin alerts" description="Operational alert cards will appear here when assignments, documents, payments, stock or capacity need attention." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((alert) => (
            <Link key={alert.key} href={alert.href} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-omd-ops">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{alert.group}</p>
                  <h2 className="mt-2 text-lg font-semibold text-slate-950">{alert.title}</h2>
                </div>
                <StatusBadge tone={alert.tone}>{statusLabel(alert.tone)}</StatusBadge>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{alert.description}</p>
            </Link>
          ))}
        </div>
      )}

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">Boundary</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Alerts are computed when this page loads. A future production version can persist notifications, assign owners, add acknowledgement states and connect outbound notification providers.
        </p>
      </AdminPanel>
    </div>
  );
}
