"use server";

import { revalidatePath } from "next/cache";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { attemptKundliAssignment, recalculateKundliDeliveryPromise, reassignKundliOrder } from "@/lib/kundli-assignment-engine";

function required(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function revalidateOrder(orderId: string) {
  revalidatePath("/admin/kundli");
  revalidatePath(`/admin/kundli/${orderId}`);
  revalidatePath(`/kundli/${orderId}`);
}

export async function recalculateKundliDeliveryPromiseAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const orderId = required(formData, "orderId");
  await recalculateKundliDeliveryPromise({ orderId, actorId: admin.id, reason: required(formData, "reason") });
  revalidateOrder(orderId);
}

export async function reassignKundliOrderAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const orderId = required(formData, "orderId");
  await reassignKundliOrder({
    orderId,
    practitionerProfileId: required(formData, "practitionerProfileId"),
    actorId: admin.id,
    reason: required(formData, "reason")
  });
  revalidateOrder(orderId);
}

export async function retryKundliAutomaticAssignmentAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const orderId = required(formData, "orderId");
  const result = await attemptKundliAssignment(orderId, {
    actorId: admin.id,
    source: "AUTO",
    reason: "Operations Admin retried automatic assignment."
  });
  revalidateOrder(orderId);
  void result;
}
