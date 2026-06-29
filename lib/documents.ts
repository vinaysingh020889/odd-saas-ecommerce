import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

const sensitiveActions = ["APPROVED", "REJECTED", "REUPLOAD_REQUIRED", "VISIBILITY_CHANGED", "ARCHIVED"];

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function intValue(formData: FormData, name: string) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? value : null;
}

function redirectPath(formData: FormData, fallback: string) {
  const value = text(formData, "redirectTo");
  return value.startsWith("/") ? value : fallback;
}

function revalidateOwner(ownerType: string, ownerId: string) {
  revalidatePath("/admin/documents");
  revalidatePath("/admin/asthi");
  revalidatePath("/admin/kundli");
  revalidatePath("/admin/orders");
  if (ownerType === "ASTHI_APPLICATION") {
    revalidatePath(`/admin/asthi/${ownerId}`);
    revalidatePath(`/asthi/${ownerId}`);
  }
  if (ownerType === "KUNDLI_ORDER") {
    revalidatePath(`/admin/kundli/${ownerId}`);
    revalidatePath(`/kundli/${ownerId}`);
  }
  if (ownerType === "ORDER") {
    revalidatePath(`/admin/orders/${ownerId}`);
    revalidatePath(`/orders/${ownerId}`);
  }
  if (ownerType === "SERVICE_BOOKING") {
    revalidatePath(`/admin/service-bookings/${ownerId}`);
    revalidatePath(`/service-bookings/${ownerId}`);
  }
}

export async function getDocumentsForOwner(ownerType: string, ownerId: string, tenantId?: string) {
  const resolvedTenantId = tenantId ?? (await getOmdTenantId());
  return prisma.operationalDocument.findMany({
    where: { tenantId: resolvedTenantId, ownerType, ownerId },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      reviewedBy: { select: { name: true, email: true } },
      activities: { include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" } }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });
}

export async function getCustomerVisibleDocuments(ownerType: string, ownerId: string, tenantId?: string) {
  const resolvedTenantId = tenantId ?? (await getOmdTenantId());
  return prisma.operationalDocument.findMany({
    where: {
      tenantId: resolvedTenantId,
      ownerType,
      ownerId,
      visibility: "CUSTOMER_VISIBLE",
      status: { not: "ARCHIVED" }
    },
    orderBy: [{ documentType: "asc" }, { createdAt: "desc" }]
  });
}

export async function writeDocumentActivity(
  input: { tenantId: string; documentId: string; action: string; actorId?: string | null; note?: string | null },
  client: PrismaExecutor = prisma
) {
  return client.documentActivity.create({ data: input });
}

async function writeOwnerActivity(
  tx: Prisma.TransactionClient,
  document: { id: string; tenantId: string; ownerType: string; ownerId: string; title: string; documentType: string; visibility: string },
  actorId: string,
  action: string,
  note?: string | null
) {
  const message = `${document.title} document ${action.toLowerCase().replaceAll("_", " ")}.`;

  if (document.ownerType === "ASTHI_APPLICATION") {
    await tx.asthiActivity.create({
      data: {
        tenantId: document.tenantId,
        applicationId: document.ownerId,
        actorId,
        type: `document_${action.toLowerCase()}`,
        message: note ? `${message} ${note}` : message,
        customerVisible: document.visibility === "CUSTOMER_VISIBLE",
        metadataJson: { documentId: document.id, documentType: document.documentType }
      }
    });
  }

  if (document.ownerType === "KUNDLI_ORDER") {
    const order = await tx.kundliOrder.findUnique({ where: { id: document.ownerId }, select: { status: true } });
    if (order) {
      await tx.kundliStatusHistory.create({
        data: {
          tenantId: document.tenantId,
          kundliOrderId: document.ownerId,
          fromStatus: order.status,
          toStatus: order.status,
          note: note ? `${message} ${note}` : message,
          actorLabel: "Admin",
          customerVisible: document.visibility === "CUSTOMER_VISIBLE"
        }
      });
    }
  }

  if (document.ownerType === "ORDER") {
    await tx.orderActivity.create({
      data: {
        tenantId: document.tenantId,
        orderId: document.ownerId,
        actorId,
        type: `document_${action.toLowerCase()}`,
        message: note ? `${message} ${note}` : message,
        metadataJson: { documentId: document.id, documentType: document.documentType }
      }
    });
  }

  if (document.ownerType === "SERVICE_BOOKING") {
    await tx.serviceBookingActivity.create({
      data: {
        tenantId: document.tenantId,
        serviceBookingId: document.ownerId,
        actorId,
        type: `document_${action.toLowerCase()}`,
        message: note ? `${message} ${note}` : message,
        customerVisible: document.visibility === "CUSTOMER_VISIBLE",
        metadataJson: { documentId: document.id, documentType: document.documentType }
      }
    });
  }

  if (sensitiveActions.includes(action)) {
    await tx.auditLog.create({
      data: {
        tenantId: document.tenantId,
        actorId,
        action: `document_${action.toLowerCase()}`,
        entity: "OperationalDocument",
        entityId: document.id,
        metadata: {
          ownerType: document.ownerType,
          ownerId: document.ownerId,
          documentType: document.documentType,
          title: document.title,
          note
        }
      }
    });
  }
}

export async function createDocumentPlaceholder(data: Prisma.OperationalDocumentUncheckedCreateInput, client: PrismaExecutor = prisma) {
  return client.operationalDocument.create({ data });
}

export async function addDocumentUrlOrStorageKey(
  id: string,
  data: Pick<Prisma.OperationalDocumentUncheckedUpdateInput, "fileName" | "fileUrl" | "storageKey" | "mimeType" | "fileSize" | "uploadedById">,
  client: PrismaExecutor = prisma
) {
  return client.operationalDocument.update({ where: { id }, data: { ...data, status: "UPLOADED" } });
}

export async function updateDocumentStatus(
  id: string,
  status: string,
  data: Pick<Prisma.OperationalDocumentUncheckedUpdateInput, "reviewedById" | "reviewedAt" | "rejectionReason"> = {},
  client: PrismaExecutor = prisma
) {
  return client.operationalDocument.update({ where: { id }, data: { ...data, status } });
}

export async function updateDocumentVisibility(id: string, visibility: string, client: PrismaExecutor = prisma) {
  return client.operationalDocument.update({ where: { id }, data: { visibility } });
}

export async function saveOperationalDocumentAction(formData: FormData) {
  "use server";

  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const ownerType = text(formData, "ownerType");
  const ownerId = text(formData, "ownerId");
  const documentType = text(formData, "documentType") || "OTHER";
  const title = text(formData, "title") || documentType.replaceAll("_", " ");
  const action = id ? "UPLOADED" : "REQUESTED";

  if (!ownerType || !ownerId) throw new Error("Document owner is required.");

  await prisma.$transaction(async (tx) => {
    const document = id
      ? await addDocumentUrlOrStorageKey(
          id,
          {
            fileName: nullableText(formData, "fileName"),
            fileUrl: nullableText(formData, "fileUrl"),
            storageKey: nullableText(formData, "storageKey"),
            mimeType: nullableText(formData, "mimeType"),
            fileSize: intValue(formData, "fileSize"),
            uploadedById: admin.id
          },
          tx
        )
      : await createDocumentPlaceholder(
          {
            tenantId,
            ownerType,
            ownerId,
            documentType,
            title,
            description: nullableText(formData, "description"),
            fileName: nullableText(formData, "fileName"),
            fileUrl: nullableText(formData, "fileUrl"),
            storageKey: nullableText(formData, "storageKey"),
            mimeType: nullableText(formData, "mimeType"),
            fileSize: intValue(formData, "fileSize"),
            visibility: text(formData, "visibility") || "INTERNAL_ONLY",
            status: nullableText(formData, "fileUrl") || nullableText(formData, "storageKey") ? "UPLOADED" : "REQUESTED",
            uploadedById: nullableText(formData, "fileUrl") || nullableText(formData, "storageKey") ? admin.id : null
          },
          tx
        );

    await writeDocumentActivity({ tenantId, documentId: document.id, action, actorId: admin.id, note: nullableText(formData, "note") }, tx);
    await writeOwnerActivity(tx, document, admin.id, action, nullableText(formData, "note"));
  });

  revalidateOwner(ownerType, ownerId);
  redirect(redirectPath(formData, "/admin/documents"));
}

export async function updateOperationalDocumentStatusAction(formData: FormData) {
  "use server";

  const admin = await requireOperationsAdminUser();
  const id = text(formData, "id");
  const status = text(formData, "status");
  const note = nullableText(formData, "note");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.operationalDocument.findUniqueOrThrow({ where: { id } });
    const document = await updateDocumentStatus(
      id,
      status,
      {
        reviewedById: admin.id,
        reviewedAt: new Date(),
        rejectionReason: status === "REJECTED" || status === "REUPLOAD_REQUIRED" ? note : null
      },
      tx
    );
    await writeDocumentActivity({ tenantId: document.tenantId, documentId: document.id, action: status, actorId: admin.id, note }, tx);
    await writeOwnerActivity(tx, document, admin.id, status, note);
    revalidateOwner(existing.ownerType, existing.ownerId);
  });

  redirect(redirectPath(formData, "/admin/documents"));
}

export async function updateOperationalDocumentVisibilityAction(formData: FormData) {
  "use server";

  const admin = await requireOperationsAdminUser();
  const id = text(formData, "id");
  const visibility = text(formData, "visibility") || "INTERNAL_ONLY";
  const note = nullableText(formData, "note");

  await prisma.$transaction(async (tx) => {
    const document = await updateDocumentVisibility(id, visibility, tx);
    await writeDocumentActivity({ tenantId: document.tenantId, documentId: document.id, action: "VISIBILITY_CHANGED", actorId: admin.id, note }, tx);
    await writeOwnerActivity(tx, document, admin.id, "VISIBILITY_CHANGED", note);
    revalidateOwner(document.ownerType, document.ownerId);
  });

  redirect(redirectPath(formData, "/admin/documents"));
}
