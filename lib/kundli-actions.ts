"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { KundliDeliveryMode, KundliPackageStatus } from "@prisma/client";
import type { KundliOrderStatus, KundliReportStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole, requireOperationsAdminUser } from "@/lib/admin-auth";
import { requireCurrentUser } from "@/lib/auth/session";
import { trackKundliStarted } from "@/lib/customer-events";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function numberValue(formData: FormData, name: string) {
  const raw = text(formData, name);
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function dateValue(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) return null;
  const value = new Date(raw);
  return Number.isNaN(value.getTime()) ? null : value;
}

async function nextKundliOrderNo(client: Prisma.TransactionClient | typeof prisma, tenantId: string) {
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const count = await client.kundliOrder.count({
    where: { tenantId, orderNo: { startsWith: `KUNDLI-${datePart}` } }
  });

  return `KUNDLI-${datePart}-${String(count + 1).padStart(5, "0")}`;
}

async function addHistory(
  client: Prisma.TransactionClient,
  input: {
    tenantId: string;
    kundliOrderId: string;
    fromStatus?: KundliOrderStatus | null;
    toStatus: KundliOrderStatus;
    note?: string | null;
    actorLabel?: string | null;
    customerVisible?: boolean;
  }
) {
  await client.kundliStatusHistory.create({
    data: {
      tenantId: input.tenantId,
      kundliOrderId: input.kundliOrderId,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus,
      note: input.note ?? null,
      actorLabel: input.actorLabel ?? "System",
      customerVisible: input.customerVisible ?? true
    }
  });
}

export async function createKundliOrderAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const packageId = text(formData, "packageId");
  const applicantName = text(formData, "applicantName") || user.name || "";
  const applicantPhone = text(formData, "applicantPhone");
  const applicantEmail = text(formData, "applicantEmail") || user.email || "";

  if (!packageId || !applicantName || !applicantPhone || !applicantEmail) {
    throw new Error("Package, applicant name, phone, and email are required.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const selectedPackage = await tx.kundliPackage.findFirst({
      where: { id: packageId, tenantId, status: "ACTIVE" }
    });

    if (!selectedPackage) {
      throw new Error("Selected Kundli package is not available.");
    }

    const created = await tx.kundliOrder.create({
      data: {
        tenantId,
        userId: user.id,
        packageId: selectedPackage.id,
        status: "PAYMENT_PENDING",
        paymentStatus: "PENDING",
        totalAmount: selectedPackage.price,
        currency: selectedPackage.currency,
        applicantName,
        applicantPhone,
        applicantEmail,
        questionOrConcern: nullableText(formData, "questionOrConcern"),
        languagePreference: nullableText(formData, "languagePreference")
      }
    });

    await addHistory(tx, {
      tenantId,
      kundliOrderId: created.id,
      fromStatus: null,
      toStatus: "PAYMENT_PENDING",
      note: "Kundli request was saved. Please review and confirm the mock payment.",
      actorLabel: applicantName
    });

    return created;
  });

  await trackKundliStarted({
    entityId: order.id,
    sourcePath: "/kundli/apply",
    userId: user.id,
    metadata: {
      packageId,
      languagePreference: nullableText(formData, "languagePreference"),
      totalAmount: Number(order.totalAmount)
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/kundli");
  redirect(`/kundli/${order.id}/review`);
}


export async function updateKundliPackageAction(formData: FormData) {
  const admin = await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"]);
  const tenantId = await getOmdTenantId();
  const packageId = text(formData, "packageId");
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();
  const deliveryMode = text(formData, "deliveryMode");
  const status = text(formData, "status");
  const price = numberValue(formData, "price");
  const estimatedDeliveryDays = numberValue(formData, "estimatedDeliveryDays");
  const sortOrder = numberValue(formData, "sortOrder") ?? 0;
  const inclusionsJson = text(formData, "inclusions")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!packageId || !name || !slug || price === null || price < 0) {
    throw new Error("Package, name, slug and valid price are required.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error("Slug must use lowercase letters, numbers and hyphens only.");
  }

  if (!Object.values(KundliDeliveryMode).includes(deliveryMode as KundliDeliveryMode)) {
    throw new Error("Invalid Kundli delivery mode.");
  }

  if (!Object.values(KundliPackageStatus).includes(status as KundliPackageStatus)) {
    throw new Error("Invalid Kundli package status.");
  }

  const updated = await prisma.kundliPackage.update({
    where: { id: packageId, tenantId },
    data: {
      name,
      slug,
      description: nullableText(formData, "description"),
      deliveryMode: deliveryMode as KundliDeliveryMode,
      status: status as KundliPackageStatus,
      price,
      currency: text(formData, "currency") || "INR",
      estimatedDeliveryDays,
      inclusionsJson,
      sortOrder
    }
  });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: admin.id,
      action: "kundli_package_update",
      entity: "KundliPackage",
      entityId: updated.id,
      metadata: {
        name: updated.name,
        slug: updated.slug,
        status: updated.status,
        price: Number(updated.price)
      }
    }
  });

  revalidatePath("/kundli");
  revalidatePath("/kundli/apply");
  revalidatePath("/admin/kundli/packages");
}
export async function confirmKundliMockPaymentAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  let redirectTo: string | null = null;

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.kundliOrder.findFirst({
      where: { id: orderId, tenantId, userId: user.id },
      select: { id: true, orderNo: true, status: true, paymentStatus: true, package: { select: { status: true } } }
    });

    if (!existing) {
      throw new Error("Kundli order was not found.");
    }

    if (existing.paymentStatus === "CONFIRMED") {
      redirectTo =
        existing.status === "DETAILS_PENDING"
          ? `/kundli/${existing.orderNo ?? existing.id}/complete-details`
          : `/kundli/${existing.orderNo ?? existing.id}`;
      return existing;
    }

    if (existing.package.status !== "ACTIVE") {
      throw new Error("This Kundli package is no longer active. Please choose an available Kundli package.");
    }

    if (existing.status !== "PAYMENT_PENDING") {
      throw new Error("This Kundli order is not waiting for mock payment confirmation.");
    }

    const orderNo = existing.orderNo ?? (await nextKundliOrderNo(tx, tenantId));
    const updated = await tx.kundliOrder.update({
      where: { id: existing.id },
      data: {
        orderNo,
        status: "DETAILS_PENDING",
        paymentStatus: "CONFIRMED",
        mockPaymentReference: `MOCK-KUNDLI-${Date.now()}`
      }
    });

    await addHistory(tx, {
      tenantId,
      kundliOrderId: existing.id,
      fromStatus: existing.status,
      toStatus: "DETAILS_PENDING",
      note: "Mock payment confirmed. Please complete birth details for report preparation.",
      actorLabel: user.name ?? user.email ?? "Customer"
    });

    return updated;
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin/kundli");
  if (redirectTo) redirect(redirectTo);
  redirect(`/kundli/${order.orderNo}/complete-details`);
}

export async function completeKundliDetailsAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const identifier = text(formData, "orderIdentifier");
  const birthName = text(formData, "birthName");
  const dateOfBirth = dateValue(formData, "dateOfBirth");
  const timeOfBirth = text(formData, "timeOfBirth");
  const placeOfBirth = text(formData, "placeOfBirth");

  if (!identifier || !birthName || !dateOfBirth || !timeOfBirth || !placeOfBirth) {
    throw new Error("Birth name, date, time, and place are required.");
  }

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.kundliOrder.findFirst({
      where: { tenantId, userId: user.id, OR: [{ id: identifier }, { orderNo: identifier }] },
      include: { package: { select: { deliveryMode: true } } }
    });

    if (!existing) {
      throw new Error("Kundli order was not found.");
    }

    if (existing.paymentStatus !== "CONFIRMED") {
      throw new Error("Please confirm mock payment before submitting Kundli details.");
    }

    if (!existing.orderNo) {
      throw new Error("Kundli order number is missing. Please return to review and confirm mock payment again.");
    }

    if (["ASSIGNED", "IN_REVIEW", "REPORT_READY", "CONSULTATION_SCHEDULED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"].includes(existing.status)) {
      throw new Error("This Kundli order can no longer be edited by the customer.");
    }

    if (existing.package.deliveryMode === "MATCHMAKING") {
      const partnerName = text(formData, "partnerName");
      const partnerDateOfBirth = dateValue(formData, "partnerDateOfBirth");
      const partnerTimeOfBirth = text(formData, "partnerTimeOfBirth");
      const partnerPlaceOfBirth = text(formData, "partnerPlaceOfBirth");

      if (!partnerName || !partnerDateOfBirth || !partnerTimeOfBirth || !partnerPlaceOfBirth) {
        throw new Error("Partner birth details are required for Kundli matching.");
      }
    }

    const updated = await tx.kundliOrder.update({
      where: { id: existing.id },
      data: {
        status: "SUBMITTED",
        birthName,
        gender: nullableText(formData, "gender"),
        dateOfBirth,
        timeOfBirth,
        placeOfBirth,
        languagePreference: nullableText(formData, "languagePreference") ?? existing.languagePreference,
        customerNote: nullableText(formData, "customerNote"),
        partnerName: nullableText(formData, "partnerName"),
        partnerDateOfBirth: dateValue(formData, "partnerDateOfBirth"),
        partnerTimeOfBirth: nullableText(formData, "partnerTimeOfBirth"),
        partnerPlaceOfBirth: nullableText(formData, "partnerPlaceOfBirth")
      }
    });

    const existingDocument = await tx.kundliDocument.findFirst({
      where: { kundliOrderId: existing.id, type: "EXISTING_KUNDLI" },
      select: { id: true }
    });
    const filename = nullableText(formData, "existingKundliFilename");
    const fileUrl = nullableText(formData, "existingKundliUrl");

    if (filename || fileUrl || existingDocument) {
      const data = {
        tenantId,
        kundliOrderId: existing.id,
        type: "EXISTING_KUNDLI" as const,
        status: filename || fileUrl ? ("PENDING_REVIEW" as const) : ("PENDING_UPLOAD" as const),
        filename,
        fileUrl
      };

      if (existingDocument) await tx.kundliDocument.update({ where: { id: existingDocument.id }, data });
      else await tx.kundliDocument.create({ data });
    }

    if (existing.status !== "SUBMITTED") {
      await addHistory(tx, {
        tenantId,
        kundliOrderId: existing.id,
        fromStatus: existing.status,
        toStatus: "SUBMITTED",
        note: "Birth details were submitted for Kundli preparation.",
        actorLabel: user.name ?? user.email ?? "Customer"
      });
    }

    return updated;
  });

  revalidatePath(`/kundli/${order.orderNo ?? order.id}`);
  revalidatePath("/admin/kundli");
  redirect(`/kundli/${order.orderNo ?? order.id}`);
}

export async function updateKundliAdminAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const status = text(formData, "status") as KundliOrderStatus;
  const note = nullableText(formData, "note");

  if (!orderId || !status) {
    throw new Error("Kundli order and status are required.");
  }

  const allowedTransitions: Record<KundliOrderStatus, KundliOrderStatus[]> = {
    DRAFT: ["PAYMENT_PENDING", "CANCELLED"],
    PAYMENT_PENDING: ["PAYMENT_PENDING", "DETAILS_PENDING", "CANCELLED"],
    DETAILS_PENDING: ["DETAILS_PENDING", "SUBMITTED", "CANCELLED"],
    SUBMITTED: ["SUBMITTED", "ASSIGNED", "IN_REVIEW", "CANCELLED"],
    ASSIGNED: ["ASSIGNED", "IN_REVIEW", "CONSULTATION_SCHEDULED", "CANCELLED"],
    IN_REVIEW: ["IN_REVIEW", "REPORT_READY", "CONSULTATION_SCHEDULED", "CANCELLED"],
    REPORT_READY: ["REPORT_READY", "DELIVERED"],
    CONSULTATION_SCHEDULED: ["CONSULTATION_SCHEDULED", "REPORT_READY", "DELIVERED", "CANCELLED"],
    DELIVERED: ["DELIVERED", "COMPLETED"],
    COMPLETED: ["COMPLETED"],
    CANCELLED: ["CANCELLED", "REFUNDED"],
    REFUNDED: ["REFUNDED"]
  };

  const order = await prisma.$transaction(async (tx) => {
    const existing = await tx.kundliOrder.findFirst({
      where: { id: orderId, tenantId },
      select: { id: true, orderNo: true, status: true }
    });

    if (!existing) {
      throw new Error("Kundli order was not found.");
    }

    if (!allowedTransitions[existing.status].includes(status)) {
      throw new Error(`Invalid Kundli status transition from ${existing.status} to ${status}.`);
    }

    const reportUrl = nullableText(formData, "reportUrl");
    let reportStatus: KundliReportStatus | undefined;
    if (status === "IN_REVIEW") reportStatus = "IN_PROGRESS";
    if (status === "REPORT_READY" || reportUrl) reportStatus = "UPLOADED";
    if (status === "DELIVERED" || status === "COMPLETED") reportStatus = "DELIVERED";

    const updated = await tx.kundliOrder.update({
      where: { id: existing.id },
      data: {
        status,
        assignedTo: nullableText(formData, "assignedTo") ?? undefined,
        consultationDate: dateValue(formData, "consultationDate") ?? undefined,
        consultationMode: nullableText(formData, "consultationMode") ?? undefined,
        reportStatus,
        reportUrl: reportUrl ?? undefined,
        reportNote: nullableText(formData, "reportNote") ?? undefined,
        internalNote: nullableText(formData, "internalNote") ?? undefined,
        customerNote: nullableText(formData, "customerNote") ?? undefined
      }
    });

    await addHistory(tx, {
      tenantId,
      kundliOrderId: existing.id,
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
        action: "kundli_order_update",
        entity: "KundliOrder",
        entityId: existing.id,
        metadata: {
          fromStatus: existing.status,
          toStatus: status,
          orderNo: existing.orderNo,
          note
        }
      }
    });

    return updated;
  });

  revalidatePath("/admin/kundli");
  revalidatePath(`/admin/kundli/${order.orderNo ?? order.id}`);
  revalidatePath(`/kundli/${order.orderNo ?? order.id}`);
  redirect(`/admin/kundli/${order.orderNo ?? order.id}`);
}


