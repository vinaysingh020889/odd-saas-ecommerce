import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getChecklistQueueStats } from "@/lib/checklists";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ status?: string; priority?: string; owner?: string; due?: string }>;
};

function ownerLabel(assignment: { assignedUser?: { name: string | null; email: string | null } | null; assignmentLabel: string | null }) {
  return assignment.assignedUser?.name ?? assignment.assignedUser?.email ?? assignment.assignmentLabel ?? "Unassigned";
}

function dueWhere(due: string, now: Date, todayEnd: Date): Prisma.AssignmentWhereInput {
  if (due === "overdue") return { dueAt: { lt: now } };
  if (due === "today") return { dueAt: { gte: now, lte: todayEnd } };
  if (due === "none") return { dueAt: null };
  return {};
}

export default async function AdminQueuesPage({ searchParams }: PageProps) {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const status = (params.status ?? "").trim();
  const priority = (params.priority ?? "").trim();
  const owner = (params.owner ?? "").trim();
  const due = (params.due ?? "").trim();
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const assignmentWhere: Prisma.AssignmentWhereInput = {
    tenantId,
    ...(status ? { status } : { status: { notIn: ["COMPLETED", "CANCELLED"] } }),
    ...(priority ? { priority } : {}),
    ...(owner === "unassigned" ? { assignedUserId: null, assignmentLabel: null } : {}),
    ...(owner && owner !== "unassigned" ? { OR: [{ assignedUserId: owner }, { assignedRole: owner }, { assignmentLabel: { contains: owner, mode: "insensitive" } }] } : {}),
    ...dueWhere(due, now, todayEnd)
  };

  const [
    assignments,
    overdueAssignments,
    dueTodayAssignments,
    unassignedAssignments,
    asthiQueue,
    kundliQueue,
    serviceBookingQueue,
    queuedServiceBookings,
    orderQueue,
    requestQueue,
    rescheduleQueue,
    documentQueue,
    checklistStats,
    users
  ] = await Promise.all([
    prisma.assignment.findMany({
      where: assignmentWhere,
      include: {
        assignedUser: { select: { name: true, email: true } },
        createdBy: { select: { name: true, email: true } }
      },
      orderBy: [{ dueAt: "asc" }, { priority: "desc" }, { updatedAt: "desc" }],
      take: 80
    }),
    prisma.assignment.count({ where: { tenantId, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueAt: { lt: now } } }),
    prisma.assignment.count({ where: { tenantId, status: { notIn: ["COMPLETED", "CANCELLED"] }, dueAt: { gte: now, lte: todayEnd } } }),
    prisma.assignment.count({ where: { tenantId, status: { notIn: ["COMPLETED", "CANCELLED"] }, assignedUserId: null, assignmentLabel: null } }),
    prisma.asthiApplication.count({ where: { tenantId, status: { in: ["DETAILS_PENDING", "DOCUMENTS_UNDER_REVIEW", "DOCUMENTS_VERIFIED", "RITUAL_SCHEDULED", "IN_PROGRESS", "PROOF_UPLOADED"] } } }),
    prisma.kundliOrder.count({ where: { tenantId, status: { in: ["DETAILS_PENDING", "SUBMITTED", "ASSIGNED", "IN_REVIEW", "REPORT_READY", "CONSULTATION_SCHEDULED", "DELIVERED"] } } }),
    prisma.serviceBooking.count({ where: { tenantId, status: { in: ["QUEUED", "PAYMENT_PENDING", "SUBMITTED", "CONFIRMED", "SCHEDULED", "ASSIGNED", "IN_PROGRESS", "PROOF_PENDING", "PROOF_UPLOADED"] } } }),
    prisma.serviceBooking.count({ where: { tenantId, status: "QUEUED" } }),
    prisma.order.count({ where: { tenantId, status: { in: ["confirmed", "processing"] } } }),
    prisma.orderRequest.count({ where: { tenantId, status: { in: ["submitted", "under_review"] } } }),
    prisma.rescheduleRequest.count({ where: { tenantId, status: { in: ["submitted", "under_review", "queued"] } } }),
    prisma.operationalDocument.count({ where: { tenantId, status: { in: ["UPLOADED", "UNDER_REVIEW", "REUPLOAD_REQUIRED"] } } }),
    getChecklistQueueStats(tenantId),
    prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } })
  ]);

  const cards = [
    { label: "Overdue", value: overdueAssignments, href: "/admin/queues?due=overdue", tone: overdueAssignments ? "error" : "neutral" },
    { label: "Due Today", value: dueTodayAssignments, href: "/admin/queues?due=today", tone: dueTodayAssignments ? "warning" : "neutral" },
    { label: "Unassigned", value: unassignedAssignments, href: "/admin/queues?owner=unassigned", tone: unassignedAssignments ? "warning" : "neutral" },
    { label: "Asthi", value: asthiQueue, href: "/admin/asthi", tone: asthiQueue ? "warning" : "neutral" },
    { label: "Kundli", value: kundliQueue, href: "/admin/kundli", tone: kundliQueue ? "warning" : "neutral" },
    { label: "Service Bookings", value: serviceBookingQueue, href: "/admin/service-bookings", tone: serviceBookingQueue ? "warning" : "neutral" },
    { label: "Service Queue", value: queuedServiceBookings, href: "/admin/service-bookings?status=QUEUED", tone: queuedServiceBookings ? "warning" : "neutral" },
    { label: "Orders", value: orderQueue, href: "/admin/orders", tone: orderQueue ? "warning" : "neutral" },
    { label: "Requests", value: requestQueue, href: "/admin/requests", tone: requestQueue ? "warning" : "neutral" },
    { label: "Reschedules", value: rescheduleQueue, href: "/admin/reschedule-requests", tone: rescheduleQueue ? "warning" : "neutral" },
    { label: "Documents", value: documentQueue, href: "/admin/documents", tone: documentQueue ? "warning" : "neutral" },
    { label: "Checklist Pending", value: checklistStats.pending, href: "/admin/checklists", tone: checklistStats.pending ? "warning" : "neutral" },
    { label: "Checklist Overdue", value: checklistStats.overdue, href: "/admin/queues?due=overdue", tone: checklistStats.overdue ? "error" : "neutral" },
    { label: "Checklist Blocked", value: checklistStats.blocked, href: "/admin/checklists", tone: checklistStats.blocked ? "error" : "neutral" },
    { label: "Required Checklist Waiting", value: checklistStats.waitingRequired, href: "/admin/checklists", tone: checklistStats.waitingRequired ? "warning" : "neutral" }
  ] satisfies Array<{ label: string; value: number; href: string; tone: "neutral" | "success" | "warning" | "error" | "ops" }>;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Operations"
        title="Admin Queues & SLA"
        description="Unified operational attention view for assignments, Asthi, Kundli, orders, requests and documents."
        tone="admin"
        actions={<StatusBadge tone={overdueAssignments ? "error" : "success"}>{overdueAssignments ? `${overdueAssignments} overdue` : "No overdue assignments"}</StatusBadge>}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-omd-ops">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-600">{card.label}</p>
              <StatusBadge tone={card.tone}>{card.value}</StatusBadge>
            </div>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{card.value}</p>
          </Link>
        ))}
      </section>

      <AdminPanel>
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_100px]">
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">Open statuses</option>
            {["ASSIGNED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <select name="priority" defaultValue={priority} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All priorities</option>
            {["LOW", "NORMAL", "HIGH", "URGENT"].map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <select name="owner" defaultValue={owner} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All owners</option>
            <option value="unassigned">Unassigned</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email ?? user.id}</option>)}
          </select>
          <select name="due" defaultValue={due} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="none">No due date</option>
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {assignments.length === 0 ? (
        <EmptyState title="No assignments match" description="Adjust filters or create operational assignments from Asthi, Kundli, order, request or general task surfaces." />
      ) : (
        <div className="grid gap-3">
          {assignments.map((assignment) => (
            <AdminPanel key={assignment.id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={statusTone(assignment.workType)}>{statusLabel(assignment.workType)}</StatusBadge>
                    <StatusBadge tone={statusTone(assignment.status)}>{statusLabel(assignment.status)}</StatusBadge>
                    <StatusBadge tone={statusTone(assignment.priority)}>{statusLabel(assignment.priority)}</StatusBadge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-950">{assignment.assignmentLabel ?? assignment.assignedRole ?? assignment.workType}</h2>
                  <p className="mt-1 text-sm text-slate-600">Owner: {ownerLabel(assignment)}</p>
                  <p className="mt-1 text-sm text-slate-600">Due: {assignment.dueAt ? assignment.dueAt.toLocaleString("en-IN") : "Not set"}</p>
                  {assignment.internalNote ? <p className="mt-2 text-sm text-slate-600">{assignment.internalNote}</p> : null}
                </div>
                <Link href="/admin/assignments" className="text-sm font-semibold text-omd-ops hover:text-slate-950">Manage assignments</Link>
              </div>
            </AdminPanel>
          ))}
        </div>
      )}
    </div>
  );
}
