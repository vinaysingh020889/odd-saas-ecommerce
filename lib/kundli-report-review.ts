import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { closeKundliAssignmentsForLifecycle } from "@/lib/kundli-assignment-engine";
import { projectKundliOrder } from "@/lib/customer-account";
import { KUNDLI_REPORT_MIME_TYPE } from "@/lib/kundli-report-storage";
import { getKundliHumanVerificationStatus, syncKundliChecklistFromAuthoritativeState } from "@/lib/checklists";
import { notifyUser } from "@/lib/notifications";
import { recordSystemEvent } from "@/lib/system-events";
import type { RecoverableActionState } from "@/lib/action-state";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function refresh(orderId: string, orderNo: string | null) {
  revalidatePath("/admin/kundli");
  revalidatePath("/admin/kundli/" + (orderNo ?? orderId));
  revalidatePath("/kundli/" + (orderNo ?? orderId));
  revalidatePath("/dashboard");
}

export async function deliverKundliReportAction(formData: FormData) {
  "use server";
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const documentId = text(formData, "documentId");
  const deliveryNote = text(formData, "deliveryNote") || null;
  const deliveredAt = new Date();
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.kundliOrder.findFirst({ where: { id: orderId, tenantId }, select: { id: true, orderNo: true, status: true, userId: true } });
    if (!order) throw new Error("Kundli order was not found.");
    if (order.status !== "REPORT_READY") throw new Error("Only report-ready Kundli work can be delivered.");
    const verification = await getKundliHumanVerificationStatus(tx, tenantId, order.id);
    if (!verification.ready) throw new Error("Required customer birth-detail verification must be completed before report delivery.");
    const report = await tx.operationalDocument.findFirst({
      where: {
        id: documentId,
        tenantId,
        ownerType: "KUNDLI_ORDER",
        ownerId: order.id,
        documentType: "KUNDLI_REPORT",
        visibility: "INTERNAL_ONLY",
        status: "UPLOADED",
        fileUrl: null,
        storageKey: { not: null },
        mimeType: KUNDLI_REPORT_MIME_TYPE
      }
    });
    if (!report) throw new Error("An internal Kundli report belonging to this order is required for delivery.");
    const currentReport = await tx.operationalDocument.findFirst({
      where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: order.id, documentType: "KUNDLI_REPORT", visibility: "INTERNAL_ONLY", status: "UPLOADED", fileUrl: null, storageKey: { not: null }, mimeType: KUNDLI_REPORT_MIME_TYPE },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true }
    });
    if (currentReport?.id !== report.id) throw new Error("Only the current private report version can be delivered.");
    await tx.operationalDocument.updateMany({
      where: { tenantId, ownerType: "KUNDLI_ORDER", ownerId: order.id, documentType: "KUNDLI_REPORT", id: { not: report.id } },
      data: { visibility: "INTERNAL_ONLY" }
    });
    await tx.operationalDocument.update({
      where: { id: report.id },
      data: { visibility: "CUSTOMER_VISIBLE", status: "APPROVED", reviewedById: admin.id, reviewedAt: deliveredAt, rejectionReason: null }
    });
    await tx.documentActivity.createMany({ data: [
      { tenantId, documentId: report.id, action: "APPROVED", actorId: admin.id, note: deliveryNote },
      { tenantId, documentId: report.id, action: "DELIVERED_TO_CUSTOMER", actorId: admin.id, note: deliveryNote }
    ] });
    await tx.kundliOrder.update({
      where: { id: order.id },
      data: { status: "DELIVERED", reportStatus: "DELIVERED", reportUrl: null, customerNote: deliveryNote }
    });
    const timelineNote = "Report delivered on " + deliveredAt.toLocaleString("en-IN") + (deliveryNote ? ". " + deliveryNote : ".");
    await tx.kundliStatusHistory.create({ data: { tenantId, kundliOrderId: order.id, fromStatus: order.status, toStatus: "DELIVERED", note: timelineNote, actorLabel: admin.name ?? admin.email ?? "Admin", customerVisible: true } });
    await closeKundliAssignmentsForLifecycle(tx, { tenantId, orderId: order.id, status: "DELIVERED", actorId: admin.id, reason: "Approved report delivered to customer." });
    await tx.auditLog.createMany({ data: [
      { tenantId, actorId: admin.id, action: "kundli_report_approved", entity: "OperationalDocument", entityId: report.id, metadata: { orderId: order.id } },
      { tenantId, actorId: admin.id, action: "kundli_report_delivered", entity: "KundliOrder", entityId: order.id, metadata: { documentId: report.id, deliveredAt: deliveredAt.toISOString() } }
    ] });
    await syncKundliChecklistFromAuthoritativeState(tenantId, order.id, tx);
    const event = await recordSystemEvent({ tenantId, severity: "SUCCESS", module: "KUNDLI", action: "REPORT_DELIVERED", outcome: "SUCCESS", actorId: admin.id, actorRole: "OPERATIONS_ADMIN", entityType: "KundliOrder", entityId: order.id }, tx);
    await notifyUser({ tenantId, recipientId: order.userId, type: "KUNDLI_REPORT_DELIVERED", title: "Your Kundli report is ready", message: "Your approved Kundli report is now available securely in your account.", destination: `/kundli/${order.orderNo ?? order.id}`, sourceModule: "KUNDLI", entityType: "KundliOrder", entityId: order.id, sourceEventId: event.id, dedupeKey: `kundli:${order.id}:report-delivered` }, tx);
    return order;
  });
  await projectKundliOrder(result.id);
  refresh(result.id, result.orderNo);
}

export async function deliverKundliReportRecoverableAction(_state: RecoverableActionState, formData: FormData): Promise<RecoverableActionState> {
  "use server";
  try {
    await deliverKundliReportAction(formData);
    return { status: "success", message: "The report was approved and delivered to the customer." };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const expected = [
      "Required customer birth-detail verification must be completed before report delivery.",
      "Only report-ready Kundli work can be delivered.",
      "An internal Kundli report belonging to this order is required for delivery.",
      "Only the current private report version can be delivered."
    ];
    if (expected.includes(message)) return { status: "error", message };
    const errorRef = "KDR-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    console.error(JSON.stringify({ level: "error", event: "kundli_report_delivery_failed", errorRef, message }));
    return { status: "error", message: "The report could not be delivered. Please retry once.", errorRef };
  }
}

export async function returnKundliReportForCorrectionAction(formData: FormData) {
  "use server";
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const documentId = text(formData, "documentId");
  const reason = text(formData, "reason");
  if (!reason) throw new Error("An internal correction reason is required.");
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.kundliOrder.findFirst({ where: { id: orderId, tenantId }, select: { id: true, orderNo: true, status: true } });
    if (!order) throw new Error("Kundli order was not found.");
    if (order.status !== "REPORT_READY") throw new Error("Only a report awaiting review can be returned for correction.");
    const report = await tx.operationalDocument.findFirst({ where: { id: documentId, tenantId, ownerType: "KUNDLI_ORDER", ownerId: order.id, documentType: "KUNDLI_REPORT", visibility: "INTERNAL_ONLY", status: "UPLOADED", fileUrl: null, storageKey: { not: null }, mimeType: KUNDLI_REPORT_MIME_TYPE } });
    if (!report) throw new Error("The internal report does not belong to this Kundli order.");
    await tx.operationalDocument.update({ where: { id: report.id }, data: { status: "REUPLOAD_REQUIRED", rejectionReason: reason, reviewedById: admin.id, reviewedAt: new Date(), visibility: "INTERNAL_ONLY" } });
    await tx.documentActivity.create({ data: { tenantId, documentId: report.id, action: "RETURNED_FOR_CORRECTION", actorId: admin.id, note: reason } });
    await tx.kundliOrder.update({ where: { id: order.id }, data: { status: "IN_REVIEW", reportStatus: "IN_PROGRESS", reportUrl: null } });
    await tx.assignment.updateMany({ where: { tenantId, workType: "KUNDLI_ORDER", workId: order.id, isPrimary: true, endedAt: null }, data: { status: "IN_PROGRESS", internalNote: "Admin correction requested: " + reason, updatedById: admin.id } });
    await tx.kundliStatusHistory.create({ data: { tenantId, kundliOrderId: order.id, fromStatus: order.status, toStatus: "IN_REVIEW", note: "Report returned to Guruji for correction: " + reason, actorLabel: admin.name ?? admin.email ?? "Admin", customerVisible: false } });
    await tx.auditLog.create({ data: { tenantId, actorId: admin.id, action: "kundli_report_returned_for_correction", entity: "KundliOrder", entityId: order.id, metadata: { documentId: report.id, reason } } });
    const assignment = await tx.assignment.findFirst({ where: { tenantId, workType: "KUNDLI_ORDER", workId: order.id, isPrimary: true, endedAt: null }, select: { assignedUserId: true, id: true } });
    const event = await recordSystemEvent({ tenantId, severity: "WARNING", module: "KUNDLI", action: "REPORT_CORRECTION_REQUESTED", outcome: "ACTION_REQUIRED", actorId: admin.id, actorRole: "OPERATIONS_ADMIN", entityType: "KundliOrder", entityId: order.id }, tx);
    if (assignment?.assignedUserId) await notifyUser({ tenantId, recipientId: assignment.assignedUserId, type: "KUNDLI_CORRECTION_REQUIRED", title: "Kundli report correction required", message: reason, destination: `/admin/my-work/KUNDLI_ORDER/${order.id}`, sourceModule: "KUNDLI", entityType: "KundliOrder", entityId: order.id, sourceEventId: event.id, dedupeKey: `kundli:${order.id}:correction:${report.id}:${report.reviewedAt?.getTime() ?? "new"}` }, tx);
    return order;
  });
  await projectKundliOrder(result.id);
  refresh(result.id, result.orderNo);
}
