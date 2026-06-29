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
