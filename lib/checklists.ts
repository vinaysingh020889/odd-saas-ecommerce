import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const checklistWorkTypes = [
  "ASTHI_APPLICATION",
  "SERVICE_BOOKING",
  "KUNDLI_ORDER",
  "ORDER_FULFILMENT",
  "DOCUMENT_REVIEW",
  "PROOF_DELIVERY",
  "SUPPORT_CASE",
  "GENERAL"
] as const;

export const checklistItemStatuses = ["pending", "in_progress", "completed", "skipped", "blocked"] as const;

export type ChecklistWorkType = (typeof checklistWorkTypes)[number];
export type ChecklistItemStatus = (typeof checklistItemStatuses)[number];

type Tx = Prisma.TransactionClient;

const checklistItemStatusLabels: Record<string, string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
  skipped: "Skipped",
  blocked: "Blocked"
};

export function checklistItemStatusLabel(status: string) {
  return checklistItemStatusLabels[status.toLowerCase()] ?? status;
}

export function checklistWorkTypeLabel(workType: string) {
  return workType
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function checklistOwnerHref(relatedType: string, relatedId: string) {
  if (relatedType === "SERVICE_BOOKING") return `/admin/service-bookings/${relatedId}`;
  if (relatedType === "ASTHI_APPLICATION") return `/admin/asthi/${relatedId}`;
  if (relatedType === "KUNDLI_ORDER") return `/admin/kundli/${relatedId}`;
  if (relatedType === "ORDER_FULFILMENT") return `/admin/orders/${relatedId}`;
  if (relatedType === "DOCUMENT_REVIEW") return "/admin/documents";
  return "/admin/queues";
}

export async function recomputeChecklistProgress(checklistInstanceId: string, tx: Tx = prisma) {
  const items = await tx.checklistInstanceItem.findMany({
    where: { checklistInstanceId },
    select: { required: true, status: true, dueAt: true }
  });
  const actionable = items.filter((item) => item.status !== "skipped");
  const done = actionable.filter((item) => item.status === "completed").length;
  const total = actionable.length;
  const now = new Date();
  const requiredPendingCount = items.filter((item) => item.required && !["completed", "skipped"].includes(item.status)).length;
  const overdueCount = items.filter((item) => item.dueAt && item.dueAt < now && !["completed", "skipped"].includes(item.status)).length;
  const blockedCount = items.filter((item) => item.status === "blocked").length;
  const progressPercent = total ? Math.round((done / total) * 100) : 0;
  const status = blockedCount ? "BLOCKED" : requiredPendingCount ? "OPEN" : progressPercent >= 100 ? "COMPLETED" : "OPEN";

  return tx.checklistInstance.update({
    where: { id: checklistInstanceId },
    data: { progressPercent, requiredPendingCount, overdueCount, blockedCount, status }
  });
}

const KUNDLI_AUTOMATIC_CHECKLIST_TITLES = {
  payment: "Confirm payment",
  assignment: "Assign astrologer",
  upload: "Upload report URL/document placeholder",
  delivered: "Mark delivered",
  closed: "Close order",
  partner: "Check partner details if matching"
} as const;

export function isKundliAutomaticChecklistItem(title: string) {
  const automaticTitles: string[] = [
    KUNDLI_AUTOMATIC_CHECKLIST_TITLES.payment,
    KUNDLI_AUTOMATIC_CHECKLIST_TITLES.assignment,
    KUNDLI_AUTOMATIC_CHECKLIST_TITLES.upload,
    KUNDLI_AUTOMATIC_CHECKLIST_TITLES.delivered,
    KUNDLI_AUTOMATIC_CHECKLIST_TITLES.closed
  ];
  return automaticTitles.includes(title);
}

export async function getKundliHumanVerificationStatus(tx: Tx, tenantId: string, orderId: string) {
  const order = await tx.kundliOrder.findFirst({ where: { id: orderId, tenantId }, select: { package: { select: { deliveryMode: true } } } });
  if (!order) return { ready: false, birthVerified: false, partnerVerified: false };
  const items = await tx.checklistInstanceItem.findMany({
    where: { tenantId, checklistInstance: { relatedType: "KUNDLI_ORDER", relatedId: orderId }, title: { in: ["Review birth details", KUNDLI_AUTOMATIC_CHECKLIST_TITLES.partner] } },
    select: { title: true, status: true }
  });
  const birthVerified = items.some((item) => item.title === "Review birth details" && item.status === "completed");
  const partnerVerified = order.package.deliveryMode !== "MATCHMAKING" || items.some((item) => item.title === KUNDLI_AUTOMATIC_CHECKLIST_TITLES.partner && item.status === "completed");
  return { ready: birthVerified && partnerVerified, birthVerified, partnerVerified };
}

export async function syncKundliChecklistFromAuthoritativeState(tenantId: string, orderId: string, tx: Tx = prisma) {
  const [order, instance, activeAssignment, currentReport] = await Promise.all([
    tx.kundliOrder.findFirst({ where: { id: orderId, tenantId }, select: { status: true, paymentStatus: true, reportStatus: true, package: { select: { deliveryMode: true } } } }),
    tx.checklistInstance.findFirst({ where: { tenantId, relatedType: "KUNDLI_ORDER", relatedId: orderId }, select: { id: true } }),
    tx.assignment.findFirst({ where: { tenantId, workType: "KUNDLI_ORDER", workId: orderId, isPrimary: true }, select: { id: true } }),
    tx.operationalDocument.findFirst({ where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: orderId, documentType: "KUNDLI_REPORT", storageKey: { not: null }, fileUrl: null, mimeType: "application/pdf", status: { in: ["UPLOADED", "APPROVED"] } }, select: { id: true } })
  ]);
  if (!order || !instance) return null;
  const desired = new Map<string, { status: string; skippedReason?: string | null }>([
    [KUNDLI_AUTOMATIC_CHECKLIST_TITLES.payment, { status: order.paymentStatus === "CONFIRMED" ? "completed" : "pending" }],
    [KUNDLI_AUTOMATIC_CHECKLIST_TITLES.assignment, { status: activeAssignment ? "completed" : "pending" }],
    [KUNDLI_AUTOMATIC_CHECKLIST_TITLES.upload, { status: currentReport ? "completed" : "pending" }],
    [KUNDLI_AUTOMATIC_CHECKLIST_TITLES.delivered, { status: ["DELIVERED", "COMPLETED"].includes(order.status) && order.reportStatus === "DELIVERED" ? "completed" : "pending" }],
    [KUNDLI_AUTOMATIC_CHECKLIST_TITLES.closed, { status: order.status === "COMPLETED" ? "completed" : "pending" }]
  ]);
  if (order.package.deliveryMode !== "MATCHMAKING") desired.set(KUNDLI_AUTOMATIC_CHECKLIST_TITLES.partner, { status: "skipped", skippedReason: "Not required for this Kundli package." });
  const items = await tx.checklistInstanceItem.findMany({ where: { checklistInstanceId: instance.id, title: { in: [...desired.keys()] } }, select: { id: true, title: true, status: true, skippedReason: true } });
  for (const item of items) {
    const target = desired.get(item.title);
    if (!target || (item.status === target.status && item.skippedReason === (target.skippedReason ?? null))) continue;
    await tx.checklistInstanceItem.update({ where: { id: item.id }, data: { status: target.status, completedAt: target.status === "completed" ? new Date() : null, completedById: null, skippedReason: target.skippedReason ?? null, blockedReason: null } });
    await writeChecklistActivity(tx, { tenantId, checklistInstanceId: instance.id, itemId: item.id, action: `system_synced_${target.status}`, note: "Synchronized from authoritative Kundli state." });
  }
  return recomputeChecklistProgress(instance.id, tx);
}

export async function writeChecklistActivity(
  tx: Tx,
  input: {
    tenantId: string;
    checklistInstanceId: string;
    itemId?: string | null;
    action: string;
    actorId?: string | null;
    note?: string | null;
    metadataJson?: Prisma.InputJsonValue;
  }
) {
  return tx.checklistActivity.create({
    data: {
      tenantId: input.tenantId,
      checklistInstanceId: input.checklistInstanceId,
      itemId: input.itemId ?? null,
      action: input.action,
      actorId: input.actorId ?? null,
      note: input.note ?? null,
      metadataJson: input.metadataJson
    }
  });
}

export async function getOrCreateChecklistForOwner(input: {
  tenantId: string;
  relatedType: string;
  relatedId: string;
  createdById?: string | null;
}) {
  const template = await prisma.checklistTemplate.findFirst({
    where: { tenantId: input.tenantId, workType: input.relatedType, status: "ACTIVE" },
    include: { items: { where: { status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });

  if (!template) {
    return null;
  }

  const existing = await prisma.checklistInstance.findFirst({
    where: {
      tenantId: input.tenantId,
      relatedType: input.relatedType,
      relatedId: input.relatedId,
      templateId: template.id
    },
    include: {
      template: true,
      items: {
        include: {
          assignedUser: { select: { id: true, name: true, email: true } },
          completedBy: { select: { name: true, email: true } }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      activities: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 12
      }
    }
  });

  if (existing) return existing;

  const now = new Date();
  const created = await prisma.$transaction(async (tx) => {
    const instance = await tx.checklistInstance.create({
      data: {
        tenantId: input.tenantId,
        relatedType: input.relatedType,
        relatedId: input.relatedId,
        templateId: template.id,
        createdById: input.createdById ?? null,
        createdBySystem: !input.createdById
      }
    });

    if (template.items.length) {
      await tx.checklistInstanceItem.createMany({
        data: template.items.map((item) => {
          const dueAt = item.dueOffsetHours === null ? null : new Date(now.getTime() + item.dueOffsetHours * 60 * 60 * 1000);

          return {
            tenantId: input.tenantId,
            checklistInstanceId: instance.id,
            title: item.title,
            description: item.description,
            required: item.required,
            assignedRole: item.defaultOwnerRole,
            dueAt,
            customerVisibleMilestone: item.customerVisibleMilestone,
            proofRequired: item.proofRequired,
            sortOrder: item.sortOrder
          };
        })
      });
    }

    await writeChecklistActivity(tx, {
      tenantId: input.tenantId,
      checklistInstanceId: instance.id,
      action: "checklist_instance_created",
      actorId: input.createdById ?? null,
      note: `Checklist created from template: ${template.name}`
    });
    await recomputeChecklistProgress(instance.id, tx);

    return instance;
  });

  return prisma.checklistInstance.findUnique({
    where: { id: created.id },
    include: {
      template: true,
      items: {
        include: {
          assignedUser: { select: { id: true, name: true, email: true } },
          completedBy: { select: { name: true, email: true } }
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      },
      activities: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 12
      }
    }
  });
}

export async function getChecklistMilestones(tenantId: string, relatedType: string, relatedId: string) {
  return prisma.checklistInstanceItem.findMany({
    where: {
      tenantId,
      customerVisibleMilestone: true,
      checklistInstance: { relatedType, relatedId }
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      customerVisibleNote: true,
      completedAt: true,
      dueAt: true
    }
  });
}

export async function getChecklistQueueStats(tenantId: string) {
  const now = new Date();
  const [pending, overdue, blocked, waitingRequired] = await Promise.all([
    prisma.checklistInstanceItem.count({ where: { tenantId, status: { in: ["pending", "in_progress"] } } }),
    prisma.checklistInstanceItem.count({ where: { tenantId, dueAt: { lt: now }, status: { notIn: ["completed", "skipped"] } } }),
    prisma.checklistInstanceItem.count({ where: { tenantId, status: "blocked" } }),
    prisma.checklistInstance.count({ where: { tenantId, requiredPendingCount: { gt: 0 } } })
  ]);

  return { pending, overdue, blocked, waitingRequired };
}

export async function workflowHasRequiredChecklistOpen(tenantId: string, relatedType: string, relatedId: string) {
  const instance = await prisma.checklistInstance.findFirst({
    where: { tenantId, relatedType, relatedId },
    select: { requiredPendingCount: true, blockedCount: true, progressPercent: true }
  });

  return {
    hasOpenRequired: Boolean(instance && instance.requiredPendingCount > 0),
    requiredPendingCount: instance?.requiredPendingCount ?? 0,
    blockedCount: instance?.blockedCount ?? 0,
    progressPercent: instance?.progressPercent ?? 0
  };
}
