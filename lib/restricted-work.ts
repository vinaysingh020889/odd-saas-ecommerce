import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, hasAnyRole } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { recomputeChecklistProgress, writeChecklistActivity } from "@/lib/checklists";

export const restrictedWorkRoles = [
  "OPERATIONS_ADMIN",
  "SUPPORT_AGENT",
  "PRODUCT_MANAGER",
  "VENDOR",
  "RURAL_SUBADMIN",
  "PANDIT",
  "ASTROLOGER",
  "OPERATOR"
];

export const roleWorkTypeMap: Record<string, string[]> = {
  SUPER_ADMIN: ["ORDER", "SERVICE_BOOKING", "ASTHI_APPLICATION", "KUNDLI_ORDER", "ORDER_FULFILMENT"],
  OPERATIONS_ADMIN: ["ORDER", "SERVICE_BOOKING", "ASTHI_APPLICATION", "KUNDLI_ORDER", "ORDER_FULFILMENT"],
  SUPPORT_AGENT: ["ORDER", "SERVICE_BOOKING", "ASTHI_APPLICATION", "KUNDLI_ORDER", "ORDER_FULFILMENT"],
  PRODUCT_MANAGER: ["ORDER", "ORDER_FULFILMENT"],
  VENDOR: ["ORDER", "ORDER_FULFILMENT"],
  RURAL_SUBADMIN: ["ORDER", "ORDER_FULFILMENT", "SERVICE_BOOKING", "ASTHI_APPLICATION"],
  PANDIT: ["SERVICE_BOOKING", "ASTHI_APPLICATION"],
  ASTROLOGER: ["KUNDLI_ORDER"],
  OPERATOR: ["SERVICE_BOOKING", "ASTHI_APPLICATION", "KUNDLI_ORDER", "ORDER", "ORDER_FULFILMENT"]
};

export type RestrictedWorkUser = Awaited<ReturnType<typeof requireRestrictedWorkUser>>;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function redirectPath(formData: FormData, fallback: string) {
  const value = text(formData, "redirectTo");
  return value.startsWith("/") ? value : fallback;
}

export function isSuperAdmin(user: { roles: string[] }) {
  return user.roles.includes("SUPER_ADMIN");
}

export function isFullOperations(user: { roles: string[] }) {
  return hasAnyRole(user, ["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
}

export function permittedWorkTypesForRoles(roles: string[]) {
  return Array.from(new Set(roles.flatMap((role) => roleWorkTypeMap[role] ?? [])));
}

function roleMatch(assignedRole: string | null | undefined, roles: string[]) {
  if (!assignedRole) return false;
  const normalized = assignedRole.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
  return roles.some((role) => normalized.includes(role) || role.includes(normalized));
}

export function assignedWorkWhere(user: { id: string; roles: string[] }, tenantId: string): Prisma.AssignmentWhereInput {
  const permittedWorkTypes = permittedWorkTypesForRoles(user.roles);

  if (isFullOperations(user)) {
    return { tenantId, workType: { in: permittedWorkTypes.length ? permittedWorkTypes : undefined } };
  }

  return {
    tenantId,
    workType: { in: permittedWorkTypes },
    OR: [
      { assignedUserId: user.id },
      ...user.roles.map((role) => ({ assignedRole: { contains: role, mode: "insensitive" as const } })),
      ...user.roles.map((role) => ({ assignmentLabel: { contains: role.replaceAll("_", " "), mode: "insensitive" as const } }))
    ]
  };
}

export function checklistItemWhere(user: { id: string; roles: string[] }, tenantId: string): Prisma.ChecklistInstanceItemWhereInput {
  const relatedTypes = permittedWorkTypesForRoles(user.roles);
  const base: Prisma.ChecklistInstanceItemWhereInput = {
    tenantId,
    checklistInstance: { relatedType: { in: relatedTypes.map((type) => type === "ORDER" ? "ORDER_FULFILMENT" : type) } }
  };

  if (isFullOperations(user)) return base;

  return {
    ...base,
    OR: [
      { assignedUserId: user.id },
      ...user.roles.map((role) => ({ assignedRole: { contains: role, mode: "insensitive" as const } }))
    ]
  };
}

export async function requireRestrictedWorkUser() {
  const user = await requireAdminUser();
  if (!isSuperAdmin(user) && !user.roles.some((role) => restrictedWorkRoles.includes(role))) {
    redirect("/dashboard");
  }
  return user;
}

export async function canViewWorkItem(user: { id: string; roles: string[] }, tenantId: string, workType: string, workId: string) {
  if (isFullOperations(user)) return true;
  if (!permittedWorkTypesForRoles(user.roles).includes(workType)) return false;

  const assignment = await prisma.assignment.findFirst({
    where: {
      tenantId,
      workType,
      workId,
      OR: [
        { assignedUserId: user.id },
        ...user.roles.map((role) => ({ assignedRole: { contains: role, mode: "insensitive" as const } })),
        ...user.roles.map((role) => ({ assignmentLabel: { contains: role.replaceAll("_", " "), mode: "insensitive" as const } }))
      ]
    },
    select: { id: true }
  });

  return Boolean(assignment);
}

async function requireWorkAccess(workType: string, workId: string) {
  const [user, tenantId] = await Promise.all([requireRestrictedWorkUser(), getOmdTenantId()]);
  const allowed = await canViewWorkItem(user, tenantId, workType, workId);

  if (!allowed) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: "unauthorized_action_blocked",
        entity: workType,
        entityId: workId,
        metadata: { roles: user.roles }
      }
    });
    notFound();
  }

  return { user, tenantId };
}

export async function getRestrictedWorkSummary() {
  const user = await requireRestrictedWorkUser();
  const tenantId = await getOmdTenantId();
  const assignmentWhere = assignedWorkWhere(user, tenantId);
  const checklistWhere = checklistItemWhere(user, tenantId);

  const [assignments, checklistItems, recentNotes] = await Promise.all([
    prisma.assignment.findMany({
      where: assignmentWhere,
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
      take: 80
    }),
    prisma.checklistInstanceItem.findMany({
      where: checklistWhere,
      include: { checklistInstance: true, assignedUser: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { updatedAt: "desc" }],
      take: 80
    }),
    prisma.customerNote.findMany({
      where: {
        tenantId,
        ...(user.roles.includes("SUPPORT_AGENT") || isFullOperations(user) ? {} : { createdById: user.id })
      },
      include: { customer: { select: { name: true, email: true, phone: true } }, createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 12
    })
  ]);

  return { user, tenantId, assignments, checklistItems, recentNotes };
}

export async function getRestrictedWorkDetail(workType: string, workId: string) {
  const { user, tenantId } = await requireWorkAccess(workType, workId);
  const normalizedChecklistType = workType === "ORDER" ? "ORDER_FULFILMENT" : workType;

  const [assignments, checklist, documents] = await Promise.all([
    prisma.assignment.findMany({
      where: { tenantId, workType, workId },
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }]
    }),
    prisma.checklistInstance.findFirst({
      where: { tenantId, relatedType: normalizedChecklistType, relatedId: workId },
      include: {
        items: { include: { assignedUser: { select: { name: true, email: true } } }, orderBy: { sortOrder: "asc" } },
        activities: { orderBy: { createdAt: "desc" }, take: 8 }
      }
    }),
    prisma.operationalDocument.findMany({
      where: { tenantId, ownerType: workType, ownerId: workId, status: { not: "ARCHIVED" } },
      orderBy: [{ visibility: "desc" }, { updatedAt: "desc" }]
    })
  ]);

  let detail: unknown = null;
  if (workType === "ORDER") {
    detail = await prisma.order.findFirst({ where: { id: workId, tenantId }, include: { items: true, activities: { orderBy: { createdAt: "desc" }, take: 8 } } });
  } else if (workType === "SERVICE_BOOKING") {
    detail = await prisma.serviceBooking.findFirst({ where: { id: workId, tenantId }, include: { service: true, variant: true, activities: { orderBy: { createdAt: "desc" }, take: 8 } } });
  } else if (workType === "ASTHI_APPLICATION") {
    detail = await prisma.asthiApplication.findFirst({ where: { id: workId, tenantId }, include: { location: true, package: true, activities: { orderBy: { createdAt: "desc" }, take: 8 } } });
  } else if (workType === "KUNDLI_ORDER") {
    detail = await prisma.kundliOrder.findFirst({ where: { id: workId, tenantId }, include: { package: true, statusHistory: { orderBy: { createdAt: "desc" }, take: 8 } } });
  }

  if (!detail) notFound();

  await prisma.auditLog.create({
    data: { tenantId, actorId: user.id, action: "restricted_work_viewed", entity: workType, entityId: workId, metadata: { roles: user.roles } }
  });

  return { user, tenantId, assignments, checklist, documents, detail };
}

function revalidateRestrictedWork(workType: string, workId: string, redirectTo?: string | null) {
  revalidatePath("/admin/my-work");
  revalidatePath("/admin/vendor-workbench");
  revalidatePath("/admin/assigned-service-work");
  revalidatePath("/admin/support-workbench");
  revalidatePath(`/admin/my-work/${workType}/${workId}`);
  if (redirectTo) revalidatePath(redirectTo);
}

export async function updateRestrictedAssignmentAction(formData: FormData) {
  "use server";

  const assignmentId = text(formData, "assignmentId");
  const status = text(formData, "status");
  const internalNote = nullableText(formData, "internalNote");
  const customerVisibleNote = nullableText(formData, "customerVisibleNote");
  const allowedStatuses = new Set(["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

  if (!allowedStatuses.has(status)) throw new Error("Unsupported assignment status.");

  const user = await requireRestrictedWorkUser();
  const tenantId = await getOmdTenantId();
  const assignment = await prisma.assignment.findFirst({ where: { id: assignmentId, tenantId } });
  if (!assignment || !(await canViewWorkItem(user, tenantId, assignment.workType, assignment.workId))) notFound();

  await prisma.$transaction(async (tx) => {
    const updated = await tx.assignment.update({
      where: { id: assignment.id },
      data: { status, internalNote, customerVisibleNote, updatedById: user.id }
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: "assigned_work_updated",
        entity: "Assignment",
        entityId: assignment.id,
        metadata: { workType: assignment.workType, workId: assignment.workId, previousStatus: assignment.status, status }
      }
    });
    if (updated.workType === "ORDER") {
      await tx.orderActivity.create({ data: { tenantId, orderId: updated.workId, actorId: user.id, type: "assigned_work_updated", message: internalNote ?? `Assigned work moved to ${status}.` } });
    }
    if (updated.workType === "SERVICE_BOOKING") {
      await tx.serviceBookingActivity.create({ data: { tenantId, serviceBookingId: updated.workId, actorId: user.id, type: "assigned_work_updated", message: internalNote ?? `Assigned work moved to ${status}.`, customerVisible: Boolean(customerVisibleNote) } });
    }
    if (updated.workType === "ASTHI_APPLICATION") {
      await tx.asthiActivity.create({ data: { tenantId, applicationId: updated.workId, actorId: user.id, type: "assigned_work_updated", message: internalNote ?? `Assigned work moved to ${status}.`, customerVisible: Boolean(customerVisibleNote) } });
    }
    if (updated.workType === "KUNDLI_ORDER") {
      const order = await tx.kundliOrder.findUnique({ where: { id: updated.workId }, select: { status: true } });
      if (order) await tx.kundliStatusHistory.create({ data: { tenantId, kundliOrderId: updated.workId, fromStatus: order.status, toStatus: order.status, note: internalNote ?? `Assigned work moved to ${status}.`, actorLabel: user.name ?? user.email ?? "Assigned user", customerVisible: Boolean(customerVisibleNote) } });
    }
  });

  revalidateRestrictedWork(assignment.workType, assignment.workId, nullableText(formData, "redirectTo"));
  redirect(redirectPath(formData, "/admin/my-work"));
}

export async function updateRestrictedChecklistItemAction(formData: FormData) {
  "use server";

  const itemId = text(formData, "itemId");
  const status = text(formData, "status");
  const note = nullableText(formData, "note");
  const allowedStatuses = new Set(["pending", "in_progress", "completed", "blocked"]);

  if (!allowedStatuses.has(status)) throw new Error("Unsupported checklist item status.");

  const user = await requireRestrictedWorkUser();
  const tenantId = await getOmdTenantId();
  const item = await prisma.checklistInstanceItem.findFirst({ where: { id: itemId, tenantId }, include: { checklistInstance: true } });
  if (!item) notFound();
  const relatedType = item.checklistInstance.relatedType === "ORDER_FULFILMENT" ? "ORDER" : item.checklistInstance.relatedType;
  const assignedToUser = item.assignedUserId === user.id || roleMatch(item.assignedRole, user.roles);
  if (!isFullOperations(user) && (!assignedToUser || !(await canViewWorkItem(user, tenantId, relatedType, item.checklistInstance.relatedId)))) notFound();

  await prisma.$transaction(async (tx) => {
    await tx.checklistInstanceItem.update({
      where: { id: item.id },
      data: {
        status,
        internalNote: note,
        blockedReason: status === "blocked" ? note ?? "Blocked by assigned user" : null,
        completedById: status === "completed" ? user.id : null,
        completedAt: status === "completed" ? new Date() : null
      }
    });
    await writeChecklistActivity(tx, {
      tenantId,
      checklistInstanceId: item.checklistInstanceId,
      itemId: item.id,
      action: status === "blocked" ? "assigned_checklist_item_blocked" : status === "completed" ? "assigned_checklist_item_completed" : "assigned_checklist_item_updated",
      actorId: user.id,
      note,
      metadataJson: { title: item.title, previousStatus: item.status, status }
    });
    await recomputeChecklistProgress(item.checklistInstanceId, tx);
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: status === "blocked" ? "assigned_checklist_item_blocked" : status === "completed" ? "assigned_checklist_item_completed" : "assigned_checklist_item_updated",
        entity: "ChecklistInstanceItem",
        entityId: item.id,
        metadata: { relatedType: item.checklistInstance.relatedType, relatedId: item.checklistInstance.relatedId, title: item.title, status }
      }
    });
  });

  revalidateRestrictedWork(relatedType, item.checklistInstance.relatedId, nullableText(formData, "redirectTo"));
  redirect(redirectPath(formData, "/admin/my-work"));
}

export async function addRestrictedPlaceholderAction(formData: FormData) {
  "use server";

  const workType = text(formData, "workType");
  const workId = text(formData, "workId");
  const title = text(formData, "title") || "Work proof placeholder";
  const note = nullableText(formData, "note");
  const fileUrl = nullableText(formData, "fileUrl");
  const { user, tenantId } = await requireWorkAccess(workType, workId);
  const isVendorDispatch = hasAnyRole(user, ["VENDOR", "RURAL_SUBADMIN"]) && workType === "ORDER";
  const isAstrologerReport = user.roles.includes("ASTROLOGER") && workType === "KUNDLI_ORDER";
  const action = isVendorDispatch ? "vendor_dispatch_updated" : isAstrologerReport ? "astrologer_report_placeholder_added" : "pandit_proof_placeholder_added";

  await prisma.$transaction(async (tx) => {
    const document = await tx.operationalDocument.create({
      data: {
        tenantId,
        ownerType: workType,
        ownerId: workId,
        documentType: isVendorDispatch ? "DISPATCH_PROOF" : isAstrologerReport ? "KUNDLI_REPORT" : "PROOF_PLACEHOLDER",
        title,
        description: note,
        fileUrl,
        visibility: "CUSTOMER_VISIBLE",
        status: fileUrl ? "UPLOADED" : "REQUESTED",
        uploadedById: fileUrl ? user.id : null
      }
    });
    await tx.documentActivity.create({ data: { tenantId, documentId: document.id, action, actorId: user.id, note } });
    await tx.auditLog.create({ data: { tenantId, actorId: user.id, action, entity: "OperationalDocument", entityId: document.id, metadata: { workType, workId, title } } });

    if (workType === "ORDER") {
      await tx.order.update({ where: { id: workId }, data: { fulfillmentNote: note ?? undefined, trackingNumber: nullableText(formData, "trackingNumber") ?? undefined, courierName: nullableText(formData, "courierName") ?? undefined } });
      await tx.orderActivity.create({ data: { tenantId, orderId: workId, actorId: user.id, type: action, message: note ?? "Dispatch/proof placeholder updated." } });
    }
    if (workType === "ASTHI_APPLICATION") {
      await tx.asthiApplication.update({ where: { id: workId }, data: { proofNote: note ?? undefined, proofUrl: fileUrl ?? undefined, proofStatus: fileUrl ? "uploaded" : "requested" } });
      await tx.asthiActivity.create({ data: { tenantId, applicationId: workId, actorId: user.id, type: action, message: note ?? "Proof placeholder updated.", customerVisible: true } });
    }
    if (workType === "KUNDLI_ORDER") {
      await tx.kundliOrder.update({ where: { id: workId }, data: { reportNote: note ?? undefined, reportUrl: fileUrl ?? undefined, reportStatus: fileUrl ? "UPLOADED" : undefined } });
    }
  });

  revalidateRestrictedWork(workType, workId, nullableText(formData, "redirectTo"));
  redirect(redirectPath(formData, "/admin/my-work"));
}

export async function addSupportNoteAction(formData: FormData) {
  "use server";

  const user = await requireRestrictedWorkUser();
  if (!hasAnyRole(user, ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"])) redirect("/admin/my-work");
  const tenantId = await getOmdTenantId();
  const customerId = text(formData, "customerId");
  const note = text(formData, "note");
  if (!customerId || !note) throw new Error("Customer and note are required.");

  const customer = await prisma.user.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
  if (!customer) notFound();

  const created = await prisma.customerNote.create({
    data: { tenantId, customerId, createdById: user.id, category: text(formData, "category") || "SUPPORT", note }
  });
  await prisma.auditLog.create({
    data: { tenantId, actorId: user.id, action: "support_note_added", entity: "CustomerNote", entityId: created.id, metadata: { customerId } }
  });
  revalidatePath("/admin/my-work");
  revalidatePath("/admin/support-workbench");
  redirect(redirectPath(formData, "/admin/support-workbench"));
}
