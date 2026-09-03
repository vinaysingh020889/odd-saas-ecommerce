import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { closeKundliAssignmentsForLifecycle } from "@/lib/kundli-assignment-engine";
import { projectKundliOrder } from "@/lib/customer-account";
import { KUNDLI_REPORT_MIME_TYPE } from "@/lib/kundli-report-storage";

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
    const order = await tx.kundliOrder.findFirst({ where: { id: orderId, tenantId }, select: { id: true, orderNo: true, status: true } });
    if (!order) throw new Error("Kundli order was not found.");
    if (order.status !== "REPORT_READY") throw new Error("Only report-ready Kundli work can be delivered.");
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
    return order;
  });
  await projectKundliOrder(result.id);
  refresh(result.id, result.orderNo);
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
    return order;
  });
  await projectKundliOrder(result.id);
  refresh(result.id, result.orderNo);
}
