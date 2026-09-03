import { prisma } from "@/lib/prisma";
import { runtimeConfig } from "@/lib/env";
import {
  getKundliReportStorage,
  KUNDLI_REPORT_MIME_TYPE,
  type KundliReportStorage
} from "@/lib/kundli-report-storage";

export class KundliReportAccessDeniedError extends Error {}
export class KundliReportUnavailableError extends Error {}

const secureReportWhere = {
  ownerType: "KUNDLI_ORDER",
  documentType: "KUNDLI_REPORT",
  storageKey: { not: null },
  fileUrl: null,
  mimeType: KUNDLI_REPORT_MIME_TYPE
} as const;

function signedUrlTtlSeconds() {
  return Math.min(runtimeConfig.kundliReportSignedUrlTtlSeconds, 600);
}

async function signVerifiedReport(
  report: { id: string; storageKey: string | null; fileName: string | null; fileSize: number | null },
  storage: KundliReportStorage
) {
  if (!report.storageKey) throw new KundliReportUnavailableError("The Kundli report is unavailable.");
  try {
    const metadata = await storage.getMetadata(report.storageKey);
    if (
      metadata.contentType !== KUNDLI_REPORT_MIME_TYPE
      || (report.fileSize !== null && metadata.size !== report.fileSize)
    ) {
      throw new KundliReportUnavailableError("The Kundli report is unavailable.");
    }
    return await storage.createReadUrl({
      key: report.storageKey,
      fileName: report.fileName ?? "kundli-report.pdf",
      expiresInSeconds: signedUrlTtlSeconds()
    });
  } catch (error) {
    if (error instanceof KundliReportUnavailableError) throw error;
    throw new KundliReportUnavailableError("The Kundli report is temporarily unavailable.");
  }
}

export async function createCustomerKundliReportDownload(
  input: { documentId: string; userId: string },
  storage = getKundliReportStorage()
) {
  const report = await prisma.operationalDocument.findFirst({
    where: {
      id: input.documentId,
      ...secureReportWhere,
      status: "APPROVED",
      visibility: "CUSTOMER_VISIBLE"
    },
    select: { id: true, tenantId: true, ownerId: true, storageKey: true, fileName: true, fileSize: true }
  });
  if (!report) throw new KundliReportAccessDeniedError("Kundli report not found.");

  const order = await prisma.kundliOrder.findFirst({
    where: {
      id: report.ownerId,
      tenantId: report.tenantId,
      userId: input.userId,
      status: { in: ["DELIVERED", "COMPLETED"] },
      reportStatus: "DELIVERED"
    },
    select: { id: true }
  });
  if (!order) throw new KundliReportAccessDeniedError("Kundli report not found.");

  const current = await prisma.operationalDocument.findFirst({
    where: {
      tenantId: report.tenantId,
      ownerId: order.id,
      ...secureReportWhere,
      status: "APPROVED",
      visibility: "CUSTOMER_VISIBLE"
    },
    orderBy: [{ reviewedAt: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: { id: true }
  });
  if (current?.id !== report.id) throw new KundliReportAccessDeniedError("Kundli report not found.");

  const url = await signVerifiedReport(report, storage);
  await prisma.auditLog.create({
    data: {
      tenantId: report.tenantId,
      actorId: input.userId,
      action: "kundli_report_customer_download_authorized",
      entity: "OperationalDocument",
      entityId: report.id,
      metadata: { orderId: order.id, expiresInSeconds: signedUrlTtlSeconds() }
    }
  });
  return url;
}

export async function createAdminKundliReportDownload(
  input: { documentId: string; adminId: string },
  storage = getKundliReportStorage()
) {
  const report = await prisma.operationalDocument.findFirst({
    where: { id: input.documentId, ...secureReportWhere, status: { notIn: ["UPLOAD_FAILED", "ARCHIVED"] } },
    select: { id: true, tenantId: true, ownerId: true, storageKey: true, fileName: true, fileSize: true }
  });
  if (!report) throw new KundliReportAccessDeniedError("Kundli report not found.");
  const url = await signVerifiedReport(report, storage);
  await prisma.auditLog.create({
    data: {
      tenantId: report.tenantId,
      actorId: input.adminId,
      action: "kundli_report_admin_download_authorized",
      entity: "OperationalDocument",
      entityId: report.id,
      metadata: { orderId: report.ownerId, expiresInSeconds: signedUrlTtlSeconds() }
    }
  });
  return url;
}

export async function createGurujiKundliReportDownload(
  input: { documentId: string; gurujiId: string },
  storage = getKundliReportStorage()
) {
  const report = await prisma.operationalDocument.findFirst({
    where: {
      id: input.documentId,
      ...secureReportWhere,
      uploadedById: input.gurujiId,
      status: { notIn: ["UPLOAD_FAILED", "ARCHIVED"] }
    },
    select: { id: true, tenantId: true, ownerId: true, storageKey: true, fileName: true, fileSize: true }
  });
  if (!report) throw new KundliReportAccessDeniedError("Kundli report not found.");
  const assignment = await prisma.assignment.findFirst({
    where: {
      tenantId: report.tenantId,
      workType: "KUNDLI_ORDER",
      workId: report.ownerId,
      assignedUserId: input.gurujiId,
      assignedRole: "ASTROLOGER",
      isPrimary: true,
      endedAt: null,
      status: { notIn: ["COMPLETED", "CANCELLED"] }
    },
    select: { id: true }
  });
  if (!assignment) throw new KundliReportAccessDeniedError("Kundli report not found.");
  const url = await signVerifiedReport(report, storage);
  await prisma.auditLog.create({
    data: {
      tenantId: report.tenantId,
      actorId: input.gurujiId,
      action: "kundli_report_guruji_download_authorized",
      entity: "OperationalDocument",
      entityId: report.id,
      metadata: { orderId: report.ownerId, assignmentId: assignment.id, expiresInSeconds: signedUrlTtlSeconds() }
    }
  });
  return url;
}
