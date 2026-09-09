import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Prisma, KundliOrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { getKundliDeliveryRisk, getKundliPractitionerCapacitySnapshot, getKundliPractitionerQueue } from "@/lib/kundli-assignment-engine";
import { isKundliAutomaticChecklistItem, recomputeChecklistProgress, syncKundliChecklistFromAuthoritativeState, writeChecklistActivity } from "@/lib/checklists";
import {
  buildKundliReportObjectKey,
  getKundliReportStorage,
  KUNDLI_REPORT_MIME_TYPE,
  validateKundliReportFile
} from "@/lib/kundli-report-storage";
import type { RecoverableActionState } from "@/lib/action-state";
import { notifyRoles } from "@/lib/notifications";
import { recordSystemEvent, recordSystemEventBestEffort } from "@/lib/system-events";

type WorkspaceUser = { id: string; name: string | null; email: string | null; roles: string[] };
type Tx = Prisma.TransactionClient;

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function activePrimaryGurujiAssignmentWhere(input: { tenantId: string; userId: string; orderId?: string }): Prisma.AssignmentWhereInput {
  return {
    tenantId: input.tenantId,
    workType: "KUNDLI_ORDER",
    ...(input.orderId ? { workId: input.orderId } : {}),
    assignedUserId: input.userId,
    assignedRole: "ASTROLOGER",
    isPrimary: true,
    endedAt: null,
    status: { notIn: ["COMPLETED", "CANCELLED"] }
  };
}

export function readableGurujiAssignmentWhere(input: { tenantId: string; userId: string; orderId: string }): Prisma.AssignmentWhereInput {
  return {
    tenantId: input.tenantId,
    workType: "KUNDLI_ORDER",
    workId: input.orderId,
    assignedUserId: input.userId,
    assignedRole: "ASTROLOGER",
    OR: [
      { isPrimary: true, endedAt: null, status: { notIn: ["COMPLETED", "CANCELLED"] } },
      { status: "COMPLETED" }
    ]
  };
}
export function gurujiNextAction(status: KundliOrderStatus, hasReport: boolean) {
  if (status === "ASSIGNED") return "Start report work";
  if (status === "IN_REVIEW" && !hasReport) return "Add prepared report";
  if (status === "IN_REVIEW") return "Mark report ready for admin review";
  if (status === "REPORT_READY") return "Await admin review and delivery";
  return "Review assigned work";
}

async function requireGurujiWorkspaceUser() {
  return requireAdminRole(["ASTROLOGER"]) as Promise<WorkspaceUser>;
}

async function getProfile(user: WorkspaceUser, tenantId: string) {
  const profile = await prisma.kundliPractitionerProfile.findFirst({
    where: { tenantId, userId: user.id, user: { status: "ACTIVE", roles: { some: { role: { key: "ASTROLOGER" } } } } },
    include: { unavailability: { where: { active: true, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } } }
  });
  if (!profile) notFound();
  return profile;
}

export async function getGurujiKundliWorkspace() {
  const user = await requireGurujiWorkspaceUser();
  const tenantId = await getOmdTenantId();
  const profile = await getProfile(user, tenantId);
  const [orderedAssignments, completedAssignments, capacity] = await Promise.all([
    getKundliPractitionerQueue({ tenantId, practitionerUserId: user.id }),
    prisma.assignment.findMany({ where: { tenantId, workType: "KUNDLI_ORDER", assignedUserId: user.id, assignedRole: "ASTROLOGER", status: "COMPLETED" }, orderBy: { endedAt: "desc" }, take: 50 }),
    getKundliPractitionerCapacitySnapshot({ userId: user.id, timezone: profile.timezone })
  ]);
  const orders = await prisma.kundliOrder.findMany({
    where: { tenantId, id: { in: [...new Set([...orderedAssignments, ...completedAssignments].map((item) => item.workId))] } },
    select: {
      id: true, orderNo: true, applicantName: true, languagePreference: true, status: true, promisedDeliveryAt: true,
      package: { select: { name: true } }
    }
  });
  const reportOrders = await prisma.operationalDocument.findMany({
    where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: { in: orders.map((item) => item.id) }, documentType: "KUNDLI_REPORT", uploadedById: user.id, status: "UPLOADED", fileUrl: null, storageKey: { not: null }, mimeType: KUNDLI_REPORT_MIME_TYPE },
    select: { ownerId: true }
  });
  const reportOrderIds = new Set(reportOrders.map((item) => item.ownerId));
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const queue = orderedAssignments.flatMap((assignment) => {
    const order = orderById.get(assignment.workId);
    if (!order) return [];
    const deliveryRisk = order.promisedDeliveryAt ? getKundliDeliveryRisk(order.promisedDeliveryAt) : null;
    return [{ assignment, order, deliveryRisk, nextAction: gurujiNextAction(order.status, reportOrderIds.has(order.id)) }];
  });
  const history = completedAssignments.flatMap((assignment) => {
    const order = orderById.get(assignment.workId);
    return order ? [{ assignment, order }] : [];
  });
  const count = (predicate: (item: (typeof queue)[number]) => boolean) => queue.filter(predicate).length;
  return {
    user, profile, queue, history, capacity,
    counts: {
      assigned: count((item) => item.order.status === "ASSIGNED"),
      inReview: count((item) => item.order.status === "IN_REVIEW"),
      reportReady: count((item) => item.order.status === "REPORT_READY"),
      dueSoon: count((item) => item.deliveryRisk === "DUE_SOON"),
      overdue: count((item) => item.deliveryRisk === "OVERDUE")
    }
  };
}

export async function getGurujiKundliWorkDetail(orderId: string) {
  const user = await requireGurujiWorkspaceUser();
  const tenantId = await getOmdTenantId();
  const assignment = await prisma.assignment.findFirst({ where: readableGurujiAssignmentWhere({ tenantId, userId: user.id, orderId }), orderBy: { createdAt: "desc" } });
  if (!assignment) notFound();
  const [order, checklist, reports] = await Promise.all([
    prisma.kundliOrder.findFirst({
      where: { id: orderId, tenantId },
      select: {
        id: true, orderNo: true, status: true, reportStatus: true, applicantName: true, applicantPhone: true, applicantEmail: true,
        birthName: true, gender: true, dateOfBirth: true, timeOfBirth: true, placeOfBirth: true, languagePreference: true,
        partnerName: true, partnerDateOfBirth: true, partnerTimeOfBirth: true, partnerPlaceOfBirth: true,
        questionOrConcern: true, promisedDeliveryAt: true, consultationDate: true, consultationMode: true,
        package: { select: { name: true, deliveryMode: true, inclusionsJson: true } },
        documents: { where: { status: "APPROVED" }, select: { id: true, type: true, filename: true, fileUrl: true, status: true }, orderBy: { createdAt: "asc" } }
      }
    }),
    prisma.checklistInstance.findFirst({
      where: { tenantId, relatedType: "KUNDLI_ORDER", relatedId: orderId },
      select: {
        id: true, status: true, progressPercent: true, requiredPendingCount: true,
        items: { select: { id: true, title: true, description: true, required: true, status: true, dueAt: true, assignedUserId: true, assignedRole: true, internalNote: true, blockedReason: true, sortOrder: true }, orderBy: { sortOrder: "asc" } }
      }
    }),
    prisma.operationalDocument.findMany({
      where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: orderId, documentType: "KUNDLI_REPORT", uploadedById: user.id, status: { not: "ARCHIVED" } },
      select: { id: true, title: true, description: true, fileName: true, fileUrl: true, storageKey: true, mimeType: true, fileSize: true, status: true, visibility: true, rejectionReason: true, createdAt: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }]
    })
  ]);
  if (!order) notFound();
  await prisma.auditLog.create({ data: { tenantId, actorId: user.id, action: "guruji_kundli_work_viewed", entity: "KundliOrder", entityId: order.id } });
  return { user, assignment, order, checklist, reports, deliveryRisk: order.promisedDeliveryAt ? getKundliDeliveryRisk(order.promisedDeliveryAt) : null };
}

async function requireOwnedAssignment(tx: Tx, tenantId: string, userId: string, orderId: string) {
  const assignment = await tx.assignment.findFirst({ where: activePrimaryGurujiAssignmentWhere({ tenantId, userId, orderId }) });
  if (!assignment) throw new Error("Only the current active primary Guruji assignment owner can update this Kundli work.");
  return assignment;
}

function refresh(orderId: string) {
  revalidatePath("/admin/my-work");
  revalidatePath("/admin/my-work/KUNDLI_ORDER/" + orderId);
  revalidatePath("/admin/kundli/" + orderId);
}

export async function updateGurujiKundliWorkAction(formData: FormData) {
  "use server";
  const user = await requireGurujiWorkspaceUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const command = text(formData, "command");
  const note = text(formData, "note");
  if (!["START", "NOTE", "REPORT_IN_PROGRESS", "REPORT_READY"].includes(command)) throw new Error("Guruji cannot set this Kundli status.");
  await prisma.$transaction(async (tx) => {
    const assignment = await requireOwnedAssignment(tx, tenantId, user.id, orderId);
    const order = await tx.kundliOrder.findUniqueOrThrow({ where: { id: orderId } });
    let nextStatus = order.status;
    let reportStatus = order.reportStatus;
    let action = "guruji_kundli_note_added";
    if (command === "START") {
      if (order.status !== "ASSIGNED") throw new Error("Only newly assigned Kundli work can be started.");
      nextStatus = "IN_REVIEW"; reportStatus = "IN_PROGRESS"; action = "guruji_kundli_work_started";
    } else if (command === "REPORT_IN_PROGRESS") {
      if (order.status !== "IN_REVIEW") throw new Error("Start the assigned work before preparing the report.");
      reportStatus = "IN_PROGRESS"; action = "guruji_kundli_report_in_progress";
    } else if (command === "REPORT_READY") {
      if (!["IN_REVIEW", "REPORT_READY"].includes(order.status)) throw new Error("Only Kundli work in review can be marked report ready.");
      const report = await tx.operationalDocument.findFirst({ where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: orderId, documentType: "KUNDLI_REPORT", uploadedById: user.id, status: "UPLOADED", fileUrl: null, storageKey: { not: null }, mimeType: KUNDLI_REPORT_MIME_TYPE }, select: { id: true } });
      if (!report) throw new Error("An attached internal Kundli report is required before marking report ready.");
      if (order.status === "REPORT_READY") return;
      nextStatus = "REPORT_READY"; reportStatus = "UPLOADED"; action = "guruji_kundli_report_ready_for_admin_review";
    } else if (!note) throw new Error("A work note is required.");
    await tx.assignment.updateMany({ where: { id: assignment.id, isPrimary: true, endedAt: null, assignedUserId: user.id }, data: { status: command === "START" ? "IN_PROGRESS" : assignment.status, internalNote: note || assignment.internalNote, updatedById: user.id } });
    await tx.kundliOrder.update({ where: { id: orderId }, data: { status: nextStatus, reportStatus } });
    await tx.kundliStatusHistory.create({ data: { tenantId, kundliOrderId: orderId, fromStatus: order.status, toStatus: nextStatus, note: note || action.replaceAll("_", " "), actorLabel: user.name ?? user.email ?? "Guruji", customerVisible: false } });
    await tx.auditLog.create({ data: { tenantId, actorId: user.id, action, entity: "KundliOrder", entityId: orderId, metadata: { assignmentId: assignment.id, previousStatus: order.status, status: nextStatus } } });
    if (command === "REPORT_READY") {
      const event = await recordSystemEvent({ tenantId, severity: "SUCCESS", module: "KUNDLI", action: "REPORT_SUBMITTED", outcome: "SUCCESS", actorId: user.id, actorRole: "ASTROLOGER", entityType: "KundliOrder", entityId: orderId }, tx);
      await notifyRoles({ tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: "KUNDLI_REPORT_READY", title: "Kundli report ready for review", message: "A Guruji submitted a Kundli report for approval.", destination: `/admin/kundli/${orderId}`, sourceModule: "KUNDLI", entityType: "KundliOrder", entityId: orderId, sourceEventId: event.id, dedupeKey: `kundli:${orderId}:report-ready` }, tx);
    }
  });
  refresh(orderId);
}

export async function addGurujiKundliReportAction(formData: FormData) {
  "use server";
  const user = await requireGurujiWorkspaceUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const title = (text(formData, "title") || "Prepared Kundli report").slice(0, 160);
  const note = text(formData, "note").slice(0, 2000) || null;
  const reportFile = await validateKundliReportFile(formData.get("reportFile"));
  const preflight = await prisma.$transaction(async (tx) => {
    const assignment = await requireOwnedAssignment(tx, tenantId, user.id, orderId);
    const order = await tx.kundliOrder.findUniqueOrThrow({ where: { id: orderId } });
    if (!["ASSIGNED", "IN_REVIEW"].includes(order.status)) throw new Error("Reports can only be prepared for active assigned Kundli work.");
    const versionCount = await tx.operationalDocument.count({
      where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: orderId, documentType: "KUNDLI_REPORT", fileUrl: null, storageKey: { not: null }, mimeType: KUNDLI_REPORT_MIME_TYPE }
    });
    return { assignmentId: assignment.id, orderStatus: order.status, version: versionCount + 1 };
  });
  const storageKey = buildKundliReportObjectKey({ tenantId, orderId, version: preflight.version });
  const storage = getKundliReportStorage();
  try {
    await storage.putObject({ key: storageKey, body: reportFile.bytes });
  } catch {
    throw new Error("The private report upload could not be completed. Please try again.");
  }
  try {
    await prisma.$transaction(async (tx) => {
      const assignment = await requireOwnedAssignment(tx, tenantId, user.id, orderId);
      const order = await tx.kundliOrder.findUniqueOrThrow({ where: { id: orderId } });
      if (!["ASSIGNED", "IN_REVIEW"].includes(order.status)) throw new Error("Reports can only be prepared for active assigned Kundli work.");
      const previous = await tx.operationalDocument.findMany({
        where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: orderId, documentType: "KUNDLI_REPORT", fileUrl: null, storageKey: { not: null }, mimeType: KUNDLI_REPORT_MIME_TYPE, status: "UPLOADED" },
        select: { id: true }
      });
      if (previous.length > 0) {
        await tx.operationalDocument.updateMany({ where: { id: { in: previous.map((item) => item.id) } }, data: { status: "SUPERSEDED", visibility: "INTERNAL_ONLY" } });
        await tx.documentActivity.createMany({ data: previous.map((item) => ({ tenantId, documentId: item.id, action: "SUPERSEDED_BY_NEW_VERSION", actorId: user.id })) });
      }
      const document = await tx.operationalDocument.create({
        data: {
          tenantId,
          ownerType: "KUNDLI_ORDER",
          ownerId: orderId,
          documentType: "KUNDLI_REPORT",
          title,
          description: note,
          fileName: reportFile.fileName,
          fileUrl: null,
          storageKey,
          mimeType: reportFile.mimeType,
          fileSize: reportFile.fileSize,
          visibility: "INTERNAL_ONLY",
          status: "UPLOADED",
          uploadedById: user.id
        }
      });
      const isReplacement = preflight.version > 1;
      await tx.documentActivity.create({ data: { tenantId, documentId: document.id, action: isReplacement ? "GURUJI_REPORT_REPLACEMENT_UPLOADED" : "GURUJI_REPORT_UPLOADED", actorId: user.id, note } });
      await tx.kundliOrder.update({ where: { id: orderId }, data: { reportStatus: "IN_PROGRESS", reportUrl: null } });
      await tx.kundliStatusHistory.create({ data: { tenantId, kundliOrderId: orderId, fromStatus: order.status, toStatus: order.status, note: `Guruji added private report version ${preflight.version} for admin review.`, actorLabel: user.name ?? user.email ?? "Guruji", customerVisible: false } });
      await tx.auditLog.create({ data: { tenantId, actorId: user.id, action: isReplacement ? "guruji_kundli_report_replacement_uploaded" : "guruji_kundli_report_uploaded", entity: "OperationalDocument", entityId: document.id, metadata: { orderId, assignmentId: assignment.id, version: preflight.version, fileSize: reportFile.fileSize, mimeType: reportFile.mimeType, visibility: "INTERNAL_ONLY" } } });
      const event = await recordSystemEvent({ tenantId, severity: "SUCCESS", module: "KUNDLI", action: isReplacement ? "REPORT_REPLACED" : "REPORT_UPLOADED", outcome: "SUCCESS", actorId: user.id, actorRole: "ASTROLOGER", entityType: "OperationalDocument", entityId: document.id, metadata: { orderId, version: preflight.version } }, tx);
      await notifyRoles({ tenantId, roles: ["SUPER_ADMIN", "OPERATIONS_ADMIN"], type: isReplacement ? "KUNDLI_REPORT_REPLACED" : "KUNDLI_REPORT_UPLOADED", title: isReplacement ? "Replacement Kundli report uploaded" : "Kundli report uploaded", message: "A private Kundli report is available for operations review.", destination: `/admin/kundli/${orderId}`, sourceModule: "KUNDLI", entityType: "KundliOrder", entityId: orderId, sourceEventId: event.id, dedupeKey: `kundli:${orderId}:report-version:${preflight.version}` }, tx);
      await syncKundliChecklistFromAuthoritativeState(tenantId, orderId, tx);
    });
  } catch (error) {
    try { await storage.deleteObject(storageKey); } catch {}
    throw error;
  }
  refresh(orderId);
}

function actionErrorReference() {
  return `KND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function safeActionMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const allowed = [
    "Select a PDF Kundli report to upload.", "Only PDF Kundli reports are accepted.",
    "The selected PDF is empty or invalid.", "The Kundli report must not exceed 10 MB.",
    "The selected file is not a valid PDF.", "The private report upload could not be completed. Please try again.",
    "An attached internal Kundli report is required before marking report ready.",
    "Only Kundli work in review can be marked report ready.", "Only newly assigned Kundli work can be started.",
    "Start the assigned work before preparing the report.", "A work note is required."
  ];
  return allowed.includes(message) ? message : "The request could not be completed. Please try again.";
}

async function recoverableGurujiAction(operation: string, action: () => Promise<void>, successMessage: string): Promise<RecoverableActionState> {
  try {
    await action();
    return { status: "success", message: successMessage };
  } catch (error) {
    const errorRef = actionErrorReference();
    console.error(JSON.stringify({ level: "error", event: "guruji_action_failed", operation, errorRef, message: error instanceof Error ? error.message : String(error) }));
    try {
      const user = await requireGurujiWorkspaceUser(); const tenantId = await getOmdTenantId();
      await recordSystemEventBestEffort({ tenantId, severity: "ERROR", module: "KUNDLI", action: operation.toUpperCase(), outcome: "FAILED", actorId: user.id, actorRole: "ASTROLOGER", errorRef });
    } catch {}
    return { status: "error", message: safeActionMessage(error), errorRef };
  }
}

export async function updateGurujiKundliWorkRecoverableAction(_state: RecoverableActionState, formData: FormData) {
  "use server";
  return recoverableGurujiAction("kundli_work_update", () => updateGurujiKundliWorkAction(formData), "Kundli work updated.");
}

export async function addGurujiKundliReportRecoverableAction(_state: RecoverableActionState, formData: FormData) {
  "use server";
  return recoverableGurujiAction("kundli_report_upload", () => addGurujiKundliReportAction(formData), "Private report uploaded successfully.");
}

export async function updateGurujiKundliChecklistItemAction(formData: FormData) {
  "use server";
  const user = await requireGurujiWorkspaceUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const itemId = text(formData, "itemId");
  const status = text(formData, "status");
  const note = text(formData, "note") || null;
  if (!["pending", "in_progress", "blocked", "completed"].includes(status)) throw new Error("Unsupported checklist status.");
  await prisma.$transaction(async (tx) => {
    await requireOwnedAssignment(tx, tenantId, user.id, orderId);
    const item = await tx.checklistInstanceItem.findFirst({ where: { id: itemId, tenantId, checklistInstance: { relatedType: "KUNDLI_ORDER", relatedId: orderId } }, include: { checklistInstance: true } });
    if (!item) throw new Error("Checklist item was not found for this assigned Kundli.");
    if (isKundliAutomaticChecklistItem(item.title)) throw new Error("This checklist item is controlled by the Kundli workflow.");
    if (item.assignedUserId && item.assignedUserId !== user.id) throw new Error("This checklist item is assigned to another user.");
    if (!item.assignedUserId && item.assignedRole && !item.assignedRole.toUpperCase().includes("ASTROLOGER")) throw new Error("This checklist item is not assigned to the Guruji role.");
    await tx.checklistInstanceItem.update({ where: { id: item.id }, data: { status, internalNote: note, blockedReason: status === "blocked" ? note ?? "Blocked by Guruji" : null, completedById: status === "completed" ? user.id : null, completedAt: status === "completed" ? new Date() : null } });
    await writeChecklistActivity(tx, { tenantId, checklistInstanceId: item.checklistInstanceId, itemId: item.id, action: "guruji_checklist_item_" + status, actorId: user.id, note, metadataJson: { orderId, previousStatus: item.status, status } });
    await recomputeChecklistProgress(item.checklistInstanceId, tx);
    await tx.auditLog.create({ data: { tenantId, actorId: user.id, action: "guruji_kundli_checklist_" + status, entity: "ChecklistInstanceItem", entityId: item.id, metadata: { orderId } } });
  });
  refresh(orderId);
}
