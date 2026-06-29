"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AsthiApplicationStatus, AsthiDocumentStatus, AsthiDocumentType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { requireCurrentUser } from "@/lib/auth/session";
import { trackAsthiStarted } from "@/lib/customer-events";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function dateValue(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

function selectedIds(formData: FormData, name: string) {
  return formData.getAll(name).map((value) => String(value)).filter(Boolean);
}

async function nextApplicationNo(client: Prisma.TransactionClient | typeof prisma, tenantId: string) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const count = await client.asthiApplication.count({
    where: {
      tenantId,
      applicationNo: { startsWith: `ASTHI-${datePart}` }
    }
  });

  return `ASTHI-${datePart}-${String(count + 1).padStart(5, "0")}`;
}

async function addHistory(
  client: Prisma.TransactionClient,
  input: {
    tenantId: string;
    applicationId: string;
    fromStatus?: AsthiApplicationStatus | null;
    toStatus: AsthiApplicationStatus;
    note?: string | null;
    actorLabel?: string | null;
    customerVisible?: boolean;
  }
) {
  await client.asthiStatusHistory.create({
    data: {
      tenantId: input.tenantId,
      applicationId: input.applicationId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      note: input.note ?? null,
      actorLabel: input.actorLabel ?? "System",
      customerVisible: input.customerVisible ?? true
    }
  });

  await client.asthiActivity.create({
    data: {
      tenantId: input.tenantId,
      applicationId: input.applicationId,
      type: input.toStatus,
      message: input.note ?? `Application moved to ${input.toStatus}.`,
      customerVisible: input.customerVisible ?? true,
      metadataJson: {
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus,
        actorLabel: input.actorLabel ?? "System"
      }
    }
  });
}

async function findOwnedApplication(identifier: string, userId: string) {
  return prisma.asthiApplication.findFirst({
    where: {
      userId,
      OR: [{ id: identifier }, { applicationNo: identifier }]
    },
    include: { location: true, package: true, documents: true, statusHistory: { orderBy: { createdAt: "desc" } } }
  });
}

export async function createAsthiApplicationAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const locationId = text(formData, "locationId");
  const packageId = text(formData, "packageId");
  const serviceMode = text(formData, "serviceMode") || "REMOTE_ASSISTED";
  const applicantName = text(formData, "applicantName") || user.name || "";
  const applicantPhone = text(formData, "applicantPhone");
  const applicantEmail = text(formData, "applicantEmail") || user.email || "";
  const termsAccepted = formData.get("termsAccepted") === "on";

  if (!locationId || !packageId || !applicantName || !applicantPhone || !applicantEmail || !termsAccepted) {
    throw new Error("Location, package, applicant contact, and terms acknowledgement are required.");
  }

  const application = await prisma.$transaction(async (tx) => {
    const [location, selectedPackage, addOns] = await Promise.all([
      tx.asthiLocation.findFirst({ where: { id: locationId, tenantId, active: true } }),
      tx.asthiPackage.findFirst({ where: { id: packageId, tenantId, active: true } }),
      tx.asthiAddOn.findMany({ where: { tenantId, active: true, id: { in: selectedIds(formData, "addOnIds") } }, orderBy: { sortOrder: "asc" } })
    ]);

    if (!location || !selectedPackage) {
      throw new Error("Selected Asthi location or package is not available.");
    }

    const addOnSnapshot = addOns.map((addOn) => ({
      id: addOn.id,
      name: addOn.name,
      slug: addOn.slug,
      price: Number(addOn.price)
    }));
    const totalAmount = Number(selectedPackage.price) + addOnSnapshot.reduce((sum, addOn) => sum + addOn.price, 0);

    const created = await tx.asthiApplication.create({
      data: {
        tenantId,
        userId: user.id,
        locationId: location.id,
        packageId: selectedPackage.id,
        serviceMode: serviceMode as "REMOTE_ASSISTED" | "FAMILY_PRESENT" | "INTERNATIONAL",
        selectedAddOnsJson: addOnSnapshot,
        totalAmount,
        currency: selectedPackage.currency,
        preferredLocation: `${location.name}, ${location.city}`,
        preferredDate: dateValue(formData, "preferredDate"),
        applicantName,
        applicantPhone,
        applicantEmail,
        country: nullableText(formData, "country"),
        city: nullableText(formData, "city"),
        termsAccepted,
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
        documentStatus: "PENDING_UPLOAD"
      }
    });

    await addHistory(tx, {
      tenantId,
      applicationId: created.id,
      fromStatus: null,
      toStatus: "PAYMENT_PENDING",
      note: "Booking details were saved. Please review and confirm the mock payment.",
      actorLabel: applicantName
    });

    return created;
  });

  await trackAsthiStarted({
    entityId: application.id,
    sourcePath: "/asthi/apply",
    userId: user.id,
    metadata: {
      locationId,
      packageId,
      serviceMode,
      applicantCity: nullableText(formData, "city"),
      totalAmount: Number(application.totalAmount)
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/asthi");
  redirect(`/asthi/${application.id}/review`);
}

export async function confirmAsthiMockPaymentAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const applicationId = text(formData, "applicationId");
  let redirectTo: string | null = null;

  const application = await prisma.$transaction(async (tx) => {
    const existing = await tx.asthiApplication.findFirst({
      where: { id: applicationId, tenantId, userId: user.id },
      select: { id: true, applicationNo: true, status: true, paymentStatus: true }
    });

    if (!existing) {
      throw new Error("Asthi application was not found.");
    }

    if (existing.paymentStatus === "CONFIRMED") {
      redirectTo =
        existing.status === "DETAILS_PENDING"
          ? `/asthi/${existing.applicationNo ?? existing.id}/complete-details`
          : `/asthi/${existing.applicationNo ?? existing.id}`;
      return existing;
    }

    if (existing.status !== "PAYMENT_PENDING") {
      throw new Error("This Asthi application is not waiting for mock payment confirmation.");
    }

    const applicationNo = existing.applicationNo ?? (await nextApplicationNo(tx, tenantId));
    const updated = await tx.asthiApplication.update({
      where: { id: existing.id },
      data: {
        applicationNo,
        status: "DETAILS_PENDING",
        paymentStatus: "CONFIRMED",
        mockPaymentReference: `MOCK-ASTHI-${Date.now()}`
      }
    });

    await addHistory(tx, {
      tenantId,
      applicationId: existing.id,
      fromStatus: existing.status,
      toStatus: "DETAILS_PENDING",
      note: "Mock payment confirmed. Please complete ritual and family details.",
      actorLabel: user.name ?? user.email ?? "Customer"
    });

    return updated;
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/asthi");
  if (redirectTo) redirect(redirectTo);
  redirect(`/asthi/${application.applicationNo}/complete-details`);
}

export async function completeAsthiDetailsAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const identifier = text(formData, "applicationIdentifier");
  const deceasedName = text(formData, "deceasedName");
  const relation = text(formData, "relation");

  if (!identifier || !deceasedName || !relation) {
    throw new Error("Application, deceased name, and relation are required.");
  }

  const application = await prisma.$transaction(async (tx) => {
    const existing = await tx.asthiApplication.findFirst({
      where: { tenantId, userId: user.id, OR: [{ id: identifier }, { applicationNo: identifier }] },
      select: { id: true, applicationNo: true, status: true, paymentStatus: true }
    });

    if (!existing) {
      throw new Error("Asthi application was not found.");
    }

    if (existing.paymentStatus !== "CONFIRMED") {
      throw new Error("Please confirm mock payment before submitting Asthi details.");
    }

    if (["DOCUMENTS_VERIFIED", "RITUAL_SCHEDULED", "IN_PROGRESS", "PROOF_UPLOADED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(existing.status)) {
      throw new Error("This Asthi application can no longer be edited by the customer.");
    }

    const documentInputs: Array<{ type: AsthiDocumentType; filename: string | null; fileUrl: string | null }> = [
      { type: "DEATH_CERTIFICATE", filename: nullableText(formData, "deathCertificateFilename"), fileUrl: nullableText(formData, "deathCertificateUrl") },
      { type: "APPLICANT_ID", filename: nullableText(formData, "applicantIdFilename"), fileUrl: nullableText(formData, "applicantIdUrl") },
      { type: "RELATION_PROOF", filename: nullableText(formData, "relationProofFilename"), fileUrl: nullableText(formData, "relationProofUrl") },
      { type: "OTHER", filename: nullableText(formData, "otherDocumentFilename"), fileUrl: nullableText(formData, "otherDocumentUrl") }
    ];
    const hasDeathCertificate = Boolean(documentInputs.find((item) => item.type === "DEATH_CERTIFICATE" && (item.filename || item.fileUrl)));
    const hasApplicantId = Boolean(documentInputs.find((item) => item.type === "APPLICANT_ID" && (item.filename || item.fileUrl)));
    const documentStatus = hasDeathCertificate && hasApplicantId ? "PENDING_REVIEW" : "PENDING_UPLOAD";

    const updated = await tx.asthiApplication.update({
      where: { id: existing.id },
      data: {
        deceasedName,
        dateOfDeath: dateValue(formData, "dateOfDeath"),
        gotra: nullableText(formData, "gotra"),
        relation,
        relationToDeceased: relation,
        familyDetails: nullableText(formData, "familyDetails"),
        specialInstructions: nullableText(formData, "specialInstructions"),
        status: "DOCUMENTS_UNDER_REVIEW",
        documentStatus
      }
    });

    for (const document of documentInputs) {
      if (!document.filename && !document.fileUrl && document.type !== "DEATH_CERTIFICATE" && document.type !== "APPLICANT_ID") continue;

      const status: AsthiDocumentStatus = document.filename || document.fileUrl ? "PENDING_REVIEW" : "PENDING_UPLOAD";
      const existingDocument = await tx.asthiDocument.findFirst({
        where: { applicationId: existing.id, type: document.type },
        select: { id: true }
      });
      const data = {
        tenantId,
        applicationId: existing.id,
        type: document.type,
        documentType: document.type,
        status,
        filename: document.filename,
        fileName: document.filename,
        fileUrl: document.fileUrl,
        storagePath: document.fileUrl
      };

      if (existingDocument) await tx.asthiDocument.update({ where: { id: existingDocument.id }, data });
      else await tx.asthiDocument.create({ data });
    }

    await addHistory(tx, {
      tenantId,
      applicationId: existing.id,
      fromStatus: existing.status,
      toStatus: "DOCUMENTS_UNDER_REVIEW",
      note:
        documentStatus === "PENDING_REVIEW"
          ? "Full details and document placeholders were submitted for review."
          : "Family details were saved. Required document placeholders are still pending upload.",
      actorLabel: user.name ?? user.email ?? "Customer"
    });

    return updated;
  });

  revalidatePath(`/asthi/${application.applicationNo ?? application.id}`);
  revalidatePath("/admin/asthi");
  redirect(`/asthi/${application.applicationNo ?? application.id}`);
}

export async function updateAsthiAdminAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const applicationId = text(formData, "applicationId");
  const status = text(formData, "status") as AsthiApplicationStatus;
  const note = nullableText(formData, "note");

  if (!applicationId || !status) {
    throw new Error("Application and status are required.");
  }

  const allowedTransitions: Record<AsthiApplicationStatus, AsthiApplicationStatus[]> = {
    DRAFT: ["PAYMENT_PENDING", "CANCELLED"],
    PAYMENT_PENDING: ["PAYMENT_PENDING", "DETAILS_PENDING", "CANCELLED"],
    DETAILS_PENDING: ["DETAILS_PENDING", "DOCUMENTS_UNDER_REVIEW", "CANCELLED"],
    SUBMITTED: ["SUBMITTED", "DOCUMENTS_UNDER_REVIEW", "CANCELLED"],
    DOCUMENTS_UNDER_REVIEW: ["DOCUMENTS_UNDER_REVIEW", "DETAILS_PENDING", "DOCUMENTS_VERIFIED", "CANCELLED"],
    DOCUMENTS_VERIFIED: ["DOCUMENTS_VERIFIED", "RITUAL_SCHEDULED", "CANCELLED"],
    RITUAL_SCHEDULED: ["RITUAL_SCHEDULED", "IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS: ["IN_PROGRESS", "PROOF_UPLOADED", "CANCELLED"],
    PROOF_UPLOADED: ["PROOF_UPLOADED", "COMPLETED"],
    COMPLETED: ["COMPLETED"],
    CANCELLED: ["CANCELLED", "REFUNDED"],
    REFUNDED: ["REFUNDED"]
  };

  const application = await prisma.$transaction(async (tx) => {
    const existing = await tx.asthiApplication.findFirst({
      where: { id: applicationId, tenantId },
      select: { id: true, applicationNo: true, status: true }
    });

    if (!existing) {
      throw new Error("Asthi application was not found.");
    }

    if (!allowedTransitions[existing.status].includes(status)) {
      throw new Error(`Invalid Asthi status transition from ${existing.status} to ${status}.`);
    }

    const updated = await tx.asthiApplication.update({
      where: { id: existing.id },
      data: {
        status,
        documentStatus: status === "DOCUMENTS_VERIFIED" ? "APPROVED" : undefined,
        scheduledDate: dateValue(formData, "scheduledDate") ?? undefined,
        assignedTo: nullableText(formData, "assignedTo") ?? undefined,
        proofUrl: nullableText(formData, "proofUrl") ?? undefined,
        proofNote: nullableText(formData, "proofNote") ?? undefined,
        certificateNote: nullableText(formData, "certificateNote") ?? undefined,
        prasadDispatchNote: nullableText(formData, "prasadDispatchNote") ?? undefined,
        internalNote: nullableText(formData, "internalNote") ?? undefined,
        proofStatus: status === "PROOF_UPLOADED" || status === "COMPLETED" ? "available" : undefined
      }
    });

    if (status === "DOCUMENTS_VERIFIED") {
      await tx.asthiDocument.updateMany({
        where: { applicationId: existing.id, status: "PENDING_REVIEW" },
        data: { status: "APPROVED", reviewedById: admin.id }
      });
    }

    await addHistory(tx, {
      tenantId,
      applicationId: existing.id,
      fromStatus: existing.status,
      toStatus: status,
      note,
      actorLabel: admin.name ?? admin.email ?? "Admin",
      customerVisible: formData.get("customerVisible") === "on"
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "asthi_application_update",
        entity: "AsthiApplication",
        entityId: existing.id,
        metadata: {
          fromStatus: existing.status,
          toStatus: status,
          note,
          applicationNo: existing.applicationNo
        }
      }
    });

    return updated;
  });

  revalidatePath("/admin/asthi");
  revalidatePath(`/admin/asthi/${application.applicationNo ?? application.id}`);
  revalidatePath(`/asthi/${application.applicationNo ?? application.id}`);
  redirect(`/admin/asthi/${application.applicationNo ?? application.id}`);
}

export async function getOwnedAsthiApplication(identifier: string, userId: string) {
  return findOwnedApplication(identifier, userId);
}
