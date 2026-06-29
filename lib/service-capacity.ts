import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";

type PrismaExecutor = Prisma.TransactionClient | typeof prisma;

const assignmentStatuses = ["ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const assignmentPriorities = ["LOW", "NORMAL", "HIGH", "URGENT"];
const capacityMovements = ["HOLD", "CONFIRM", "RELEASE", "CANCEL", "ADJUSTMENT"];

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function intValue(formData: FormData, name: string, fallback = 0) {
  const value = Number(text(formData, name));
  return Number.isFinite(value) ? value : fallback;
}

function dateValue(formData: FormData, name: string) {
  const value = text(formData, name);
  return value ? new Date(value) : null;
}

function redirectPath(formData: FormData, fallback: string) {
  const value = text(formData, "redirectTo");
  return value.startsWith("/") ? value : fallback;
}

function revalidateOps(workId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/capacity");
  revalidatePath("/admin/assignments");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/asthi");
  revalidatePath("/admin/kundli");
  if (workId) {
    revalidatePath(`/admin/orders/${workId}`);
    revalidatePath(`/orders/${workId}`);
  }
}

export async function getCapacitySlots(filters?: { serviceType?: string; status?: string; date?: Date }) {
  const tenantId = await getOmdTenantId();
  return prisma.serviceCapacitySlot.findMany({
    where: {
      tenantId,
      ...(filters?.serviceType ? { serviceType: filters.serviceType } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.date ? { date: filters.date } : {})
    },
    include: { ledgers: { orderBy: { createdAt: "desc" }, take: 8 } },
    orderBy: [{ date: "asc" }, { serviceType: "asc" }, { title: "asc" }]
  });
}

export function getRemainingCapacity(slot: { capacityTotal: number; capacityHeld: number; capacityConfirmed: number }) {
  return Math.max(0, slot.capacityTotal - slot.capacityHeld - slot.capacityConfirmed);
}

export async function createCapacitySlot(data: Prisma.ServiceCapacitySlotUncheckedCreateInput, client: PrismaExecutor = prisma) {
  return client.serviceCapacitySlot.create({ data });
}

export async function updateCapacitySlot(id: string, data: Prisma.ServiceCapacitySlotUncheckedUpdateInput, client: PrismaExecutor = prisma) {
  return client.serviceCapacitySlot.update({ where: { id }, data });
}

export async function writeCapacityLedger(
  input: {
    tenantId: string;
    slotId: string;
    movementType: string;
    quantity: number;
    sourceType: string;
    sourceId?: string | null;
    reason: string;
    actorId?: string | null;
  },
  client: PrismaExecutor = prisma
) {
  return client.serviceCapacityLedger.create({ data: input });
}

async function moveCapacity(
  movementType: string,
  slotId: string,
  quantity: number,
  sourceType: string,
  sourceId: string | null,
  reason: string,
  actorId: string,
  client: Prisma.TransactionClient
) {
  if (!capacityMovements.includes(movementType)) throw new Error("Unsupported capacity movement.");
  if (quantity <= 0) throw new Error("Capacity quantity must be greater than zero.");

  const slot = await client.serviceCapacitySlot.findUniqueOrThrow({ where: { id: slotId } });
  const remaining = getRemainingCapacity(slot);

  if ((movementType === "HOLD" || movementType === "CONFIRM") && remaining < quantity) {
    throw new Error(`Only ${remaining} capacity remains for this slot.`);
  }

  const update =
    movementType === "HOLD"
      ? { capacityHeld: { increment: quantity } }
      : movementType === "CONFIRM"
        ? { capacityConfirmed: { increment: quantity } }
        : movementType === "RELEASE"
          ? { capacityHeld: { decrement: Math.min(quantity, slot.capacityHeld) }, capacityReleased: { increment: quantity } }
          : movementType === "CANCEL"
            ? { capacityConfirmed: { decrement: Math.min(quantity, slot.capacityConfirmed) }, capacityReleased: { increment: quantity } }
            : {};

  const updatedSlot = await client.serviceCapacitySlot.update({ where: { id: slot.id }, data: update });
  await writeCapacityLedger({ tenantId: slot.tenantId, slotId, movementType, quantity, sourceType, sourceId, reason, actorId }, client);

  if (getRemainingCapacity(updatedSlot) <= 0 && updatedSlot.status === "ACTIVE") {
    await client.serviceCapacitySlot.update({ where: { id: slot.id }, data: { status: "FULL" } });
  }

  return updatedSlot;
}

export async function holdCapacity(input: { slotId: string; quantity: number; sourceType: string; sourceId?: string | null; reason: string; actorId: string }, client: Prisma.TransactionClient) {
  return moveCapacity("HOLD", input.slotId, input.quantity, input.sourceType, input.sourceId ?? null, input.reason, input.actorId, client);
}

export async function confirmCapacity(input: { slotId: string; quantity: number; sourceType: string; sourceId?: string | null; reason: string; actorId: string }, client: Prisma.TransactionClient) {
  return moveCapacity("CONFIRM", input.slotId, input.quantity, input.sourceType, input.sourceId ?? null, input.reason, input.actorId, client);
}

export async function releaseCapacity(input: { slotId: string; quantity: number; sourceType: string; sourceId?: string | null; reason: string; actorId: string }, client: Prisma.TransactionClient) {
  return moveCapacity("RELEASE", input.slotId, input.quantity, input.sourceType, input.sourceId ?? null, input.reason, input.actorId, client);
}

export async function cancelCapacity(input: { slotId: string; quantity: number; sourceType: string; sourceId?: string | null; reason: string; actorId: string }, client: Prisma.TransactionClient) {
  return moveCapacity("CANCEL", input.slotId, input.quantity, input.sourceType, input.sourceId ?? null, input.reason, input.actorId, client);
}

async function writeAssignmentContext(
  tx: Prisma.TransactionClient,
  assignment: {
    id: string;
    tenantId: string;
    workType: string;
    workId: string;
    status: string;
    assignmentLabel: string | null;
    assignedRole: string | null;
    customerVisibleNote: string | null;
  },
  actorId: string,
  message: string,
  audit = true
) {
  if (assignment.workType === "ORDER") {
    await tx.orderActivity.create({
      data: {
        tenantId: assignment.tenantId,
        orderId: assignment.workId,
        actorId,
        type: "assignment_updated",
        message,
        metadataJson: { assignmentId: assignment.id, status: assignment.status, label: assignment.assignmentLabel }
      }
    });
  }

  if (assignment.workType === "ASTHI_APPLICATION") {
    await tx.asthiActivity.create({
      data: {
        tenantId: assignment.tenantId,
        applicationId: assignment.workId,
        actorId,
        type: "assignment_updated",
        message,
        customerVisible: Boolean(assignment.customerVisibleNote),
        metadataJson: { assignmentId: assignment.id, status: assignment.status, label: assignment.assignmentLabel }
      }
    });
  }

  if (assignment.workType === "KUNDLI_ORDER") {
    const order = await tx.kundliOrder.findUnique({ where: { id: assignment.workId }, select: { status: true } });
    if (order) {
      await tx.kundliStatusHistory.create({
        data: {
          tenantId: assignment.tenantId,
          kundliOrderId: assignment.workId,
          fromStatus: order.status,
          toStatus: order.status,
          note: message,
          actorLabel: "Admin",
          customerVisible: Boolean(assignment.customerVisibleNote)
        }
      });
    }
  }

  if (assignment.workType === "SERVICE_BOOKING") {
    await tx.serviceBookingActivity.create({
      data: {
        tenantId: assignment.tenantId,
        serviceBookingId: assignment.workId,
        actorId,
        type: "assignment_updated",
        message,
        customerVisible: Boolean(assignment.customerVisibleNote),
        metadataJson: { assignmentId: assignment.id, status: assignment.status, label: assignment.assignmentLabel }
      }
    });
  }

  if (audit) {
    await tx.auditLog.create({
      data: {
        tenantId: assignment.tenantId,
        actorId,
        action: "assignment_updated",
        entity: "Assignment",
        entityId: assignment.id,
        metadata: {
          workType: assignment.workType,
          workId: assignment.workId,
          status: assignment.status,
          assignmentLabel: assignment.assignmentLabel,
          assignedRole: assignment.assignedRole,
          message
        }
      }
    });
  }
}

export async function saveCapacitySlotAction(formData: FormData) {
  "use server";

  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const date = dateValue(formData, "date");
  const title = text(formData, "title");

  if (!date || !title) throw new Error("Slot title and date are required.");

  const data = {
    tenantId,
    serviceType: text(formData, "serviceType") || "GENERAL_SERVICE",
    serviceId: nullableText(formData, "serviceId"),
    productId: nullableText(formData, "productId"),
    packageId: nullableText(formData, "packageId"),
    locationId: nullableText(formData, "locationId"),
    title,
    date,
    startTime: nullableText(formData, "startTime"),
    endTime: nullableText(formData, "endTime"),
    capacityTotal: Math.max(0, intValue(formData, "capacityTotal")),
    status: text(formData, "status") || "ACTIVE",
    notes: nullableText(formData, "notes")
  };

  await prisma.$transaction(async (tx) => {
    const slot = id ? await updateCapacitySlot(id, data, tx) : await createCapacitySlot(data, tx);
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: id ? "capacity_slot_updated" : "capacity_slot_created",
        entity: "ServiceCapacitySlot",
        entityId: slot.id,
        metadata: { title: slot.title, serviceType: slot.serviceType, date: slot.date.toISOString() }
      }
    });
  });

  revalidateOps();
  redirect(redirectPath(formData, "/admin/capacity"));
}

export async function recordCapacityMovementAction(formData: FormData) {
  "use server";

  const admin = await requireOperationsAdminUser();
  const movementType = text(formData, "movementType") || "HOLD";
  const slotId = text(formData, "slotId");
  const quantity = Math.max(1, intValue(formData, "quantity", 1));
  const sourceType = text(formData, "sourceType") || "ADMIN";
  const sourceId = nullableText(formData, "sourceId");
  const reason = text(formData, "reason") || "Manual admin capacity movement.";

  await prisma.$transaction(async (tx) => {
    if (movementType === "HOLD") await holdCapacity({ slotId, quantity, sourceType, sourceId, reason, actorId: admin.id }, tx);
    else if (movementType === "CONFIRM") await confirmCapacity({ slotId, quantity, sourceType, sourceId, reason, actorId: admin.id }, tx);
    else if (movementType === "RELEASE") await releaseCapacity({ slotId, quantity, sourceType, sourceId, reason, actorId: admin.id }, tx);
    else await moveCapacity(movementType, slotId, quantity, sourceType, sourceId, reason, admin.id, tx);
  });

  revalidateOps();
  redirect(redirectPath(formData, `/admin/capacity?slotId=${slotId}`));
}

export async function saveAssignmentAction(formData: FormData) {
  "use server";

  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const workType = text(formData, "workType") || "GENERAL_TASK";
  const workId = text(formData, "workId");
  const status = text(formData, "status") || "ASSIGNED";
  const priority = text(formData, "priority") || "NORMAL";
  const dueAt = dateValue(formData, "dueAt");

  if (!workId) throw new Error("Work ID is required for assignment.");
  if (!assignmentStatuses.includes(status)) throw new Error("Unsupported assignment status.");
  if (!assignmentPriorities.includes(priority)) throw new Error("Unsupported assignment priority.");

  await prisma.$transaction(async (tx) => {
    const data = {
      tenantId,
      workType,
      workId,
      assignedRole: nullableText(formData, "assignedRole"),
      assignedUserId: nullableText(formData, "assignedUserId"),
      assignmentLabel: nullableText(formData, "assignmentLabel"),
      status,
      priority,
      dueAt,
      internalNote: nullableText(formData, "internalNote"),
      customerVisibleNote: nullableText(formData, "customerVisibleNote"),
      updatedById: admin.id
    };
    const assignment = id
      ? await tx.assignment.update({ where: { id }, data })
      : await tx.assignment.create({ data: { ...data, createdById: admin.id } });

    await writeAssignmentContext(
      tx,
      assignment,
      admin.id,
      `${assignment.workType.replaceAll("_", " ")} assigned to ${assignment.assignmentLabel ?? assignment.assignedRole ?? "operations"}.`
    );
  });

  revalidateOps(workId);
  redirect(redirectPath(formData, "/admin/assignments"));
}

export async function updateAssignmentStatusAction(formData: FormData) {
  "use server";

  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const status = text(formData, "status");

  if (!assignmentStatuses.includes(status)) throw new Error("Unsupported assignment status.");

  let workId = "";
  await prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.update({
      where: { id },
      data: {
        status,
        priority: text(formData, "priority") || undefined,
        internalNote: nullableText(formData, "internalNote"),
        customerVisibleNote: nullableText(formData, "customerVisibleNote"),
        updatedById: admin.id
      }
    });
    workId = assignment.workId;
    if (assignment.tenantId !== tenantId) throw new Error("Assignment was not found for this tenant.");
    await writeAssignmentContext(tx, assignment, admin.id, `Assignment moved to ${status.replaceAll("_", " ")}.`);
  });

  revalidateOps(workId);
  redirect(redirectPath(formData, "/admin/assignments"));
}
