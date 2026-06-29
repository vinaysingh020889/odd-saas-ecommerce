"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { checklistItemStatuses, checklistWorkTypes, recomputeChecklistProgress, writeChecklistActivity } from "@/lib/checklists";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function intValue(formData: FormData, name: string, fallback = 0) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? Math.floor(value) : fallback;
}

function revalidateChecklistPaths(redirectTo?: string | null) {
  revalidatePath("/admin");
  revalidatePath("/admin/queues");
  revalidatePath("/admin/checklists");
  if (redirectTo) revalidatePath(redirectTo);
}

export async function createChecklistTemplateAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const workType = text(formData, "workType");
  const name = text(formData, "name");
  const description = nullableText(formData, "description");
  const sortOrder = intValue(formData, "sortOrder");

  if (!checklistWorkTypes.includes(workType as (typeof checklistWorkTypes)[number])) {
    throw new Error("Unsupported checklist work type.");
  }
  if (!name) throw new Error("Checklist template name is required.");

  await prisma.$transaction(async (tx) => {
    const template = await tx.checklistTemplate.create({
      data: { tenantId, workType, name, description, sortOrder }
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "checklist_template_created",
        entity: "ChecklistTemplate",
        entityId: template.id,
        metadata: { workType, name }
      }
    });
  });

  revalidateChecklistPaths();
}

export async function addChecklistTemplateItemAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const templateId = text(formData, "templateId");
  const title = text(formData, "title");
  const description = nullableText(formData, "description");
  const redirectTo = nullableText(formData, "redirectTo");

  if (!title) throw new Error("Checklist item title is required.");

  await prisma.$transaction(async (tx) => {
    const template = await tx.checklistTemplate.findFirst({ where: { id: templateId, tenantId } });
    if (!template) throw new Error("Checklist template not found.");

    const item = await tx.checklistTemplateItem.create({
      data: {
        tenantId,
        templateId,
        title,
        description,
        required: formData.get("required") === "on",
        defaultOwnerRole: nullableText(formData, "defaultOwnerRole"),
        customerVisibleMilestone: formData.get("customerVisibleMilestone") === "on",
        proofRequired: formData.get("proofRequired") === "on",
        dueOffsetHours: nullableText(formData, "dueOffsetHours") ? intValue(formData, "dueOffsetHours") : null,
        sortOrder: intValue(formData, "sortOrder")
      }
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "checklist_template_updated",
        entity: "ChecklistTemplate",
        entityId: templateId,
        metadata: { addedItemId: item.id, title }
      }
    });
  });

  revalidateChecklistPaths(redirectTo);
}

export async function updateChecklistItemAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const itemId = text(formData, "itemId");
  const nextStatus = text(formData, "status");
  const redirectTo = nullableText(formData, "redirectTo");
  const internalNote = nullableText(formData, "internalNote");
  const customerVisibleNote = nullableText(formData, "customerVisibleNote");
  const assignedUserId = nullableText(formData, "assignedUserId");
  const assignedRole = nullableText(formData, "assignedRole");
  const skippedReason = nullableText(formData, "skippedReason");
  const blockedReason = nullableText(formData, "blockedReason");

  if (!checklistItemStatuses.includes(nextStatus as (typeof checklistItemStatuses)[number])) {
    throw new Error("Unsupported checklist item status.");
  }

  await prisma.$transaction(async (tx) => {
    const item = await tx.checklistInstanceItem.findFirst({
      where: { id: itemId, tenantId },
      include: { checklistInstance: true }
    });
    if (!item) throw new Error("Checklist item not found.");

    const data: Record<string, unknown> = {
      status: nextStatus,
      assignedUserId,
      assignedRole,
      internalNote,
      customerVisibleNote
    };

    if (nextStatus === "completed") {
      data.completedById = admin.id;
      data.completedAt = new Date();
      data.skippedReason = null;
      data.blockedReason = null;
    } else {
      data.completedById = null;
      data.completedAt = null;
      if (nextStatus === "skipped") data.skippedReason = skippedReason ?? "Skipped by admin";
      if (nextStatus === "blocked") data.blockedReason = blockedReason ?? "Blocked by admin";
      if (nextStatus !== "skipped") data.skippedReason = null;
      if (nextStatus !== "blocked") data.blockedReason = null;
    }

    await tx.checklistInstanceItem.update({ where: { id: item.id }, data });
    await writeChecklistActivity(tx, {
      tenantId,
      checklistInstanceId: item.checklistInstanceId,
      itemId: item.id,
      action: `checklist_item_${nextStatus}`,
      actorId: admin.id,
      note: internalNote ?? customerVisibleNote ?? skippedReason ?? blockedReason ?? null,
      metadataJson: { title: item.title, previousStatus: item.status, nextStatus }
    });
    await recomputeChecklistProgress(item.checklistInstanceId, tx);

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: `checklist_item_${nextStatus}`,
        entity: "ChecklistInstanceItem",
        entityId: item.id,
        metadata: {
          relatedType: item.checklistInstance.relatedType,
          relatedId: item.checklistInstance.relatedId,
          title: item.title,
          previousStatus: item.status,
          nextStatus
        }
      }
    });
  });

  revalidateChecklistPaths(redirectTo);
}
