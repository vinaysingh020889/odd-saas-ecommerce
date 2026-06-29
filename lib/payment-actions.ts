"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createMockPaymentAttempt,
  expireMockPaymentAttempt,
  simulateMockPaymentCancel,
  simulateMockPaymentFailure,
  simulateMockPaymentSuccess
} from "@/lib/mock-payment-provider";
import { requireCurrentUser } from "@/lib/auth/session";
import { trackOrderCompleted } from "@/lib/customer-events";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function redirectPath(formData: FormData, fallback: string) {
  const value = text(formData, "redirectTo");
  return value.startsWith("/") ? value : fallback;
}

function revalidateOrderSurfaces(orderId: string) {
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/inventory");
  revalidatePath("/dashboard");
  revalidatePath("/admin/asthi");
}

export async function startMockPaymentAction(formData: FormData) {
  const user = await requireCurrentUser();
  const orderId = text(formData, "orderId");

  if (!orderId) {
    throw new Error("Order is required.");
  }

  await createMockPaymentAttempt(orderId, user);
  revalidateOrderSurfaces(orderId);
  redirect(redirectPath(formData, `/orders/${orderId}`));
}

export async function simulateMockPaymentSuccessAction(formData: FormData) {
  const user = await requireCurrentUser();
  const paymentAttemptId = text(formData, "paymentAttemptId");
  const orderId = text(formData, "orderId");

  if (!paymentAttemptId || !orderId) {
    throw new Error("Payment attempt and order are required.");
  }

  await simulateMockPaymentSuccess(paymentAttemptId, user);
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: user.id },
    select: { id: true, orderNumber: true, totalAmount: true, currency: true, items: { select: { productId: true, variantId: true, quantity: true, itemType: true, titleSnapshot: true } } }
  });
  if (order) {
    await trackOrderCompleted({
      entityId: order.id,
      entitySlug: order.orderNumber,
      sourcePath: `/orders/${order.id}`,
      userId: user.id,
      metadata: {
        orderNumber: order.orderNumber,
        total: Number(order.totalAmount),
        currency: order.currency,
        items: order.items
      }
    });
  }
  revalidateOrderSurfaces(orderId);
  redirect(redirectPath(formData, `/orders/${orderId}`));
}

export async function simulateMockPaymentFailureAction(formData: FormData) {
  const user = await requireCurrentUser();
  const paymentAttemptId = text(formData, "paymentAttemptId");
  const orderId = text(formData, "orderId");

  if (!paymentAttemptId || !orderId) {
    throw new Error("Payment attempt and order are required.");
  }

  await simulateMockPaymentFailure(paymentAttemptId, user);
  revalidateOrderSurfaces(orderId);
  redirect(redirectPath(formData, `/orders/${orderId}`));
}

export async function simulateMockPaymentCancelAction(formData: FormData) {
  const user = await requireCurrentUser();
  const paymentAttemptId = text(formData, "paymentAttemptId");
  const orderId = text(formData, "orderId");

  if (!paymentAttemptId || !orderId) {
    throw new Error("Payment attempt and order are required.");
  }

  await simulateMockPaymentCancel(paymentAttemptId, user);
  revalidateOrderSurfaces(orderId);
  redirect(redirectPath(formData, `/orders/${orderId}`));
}

export async function expireMockPaymentAttemptAction(formData: FormData) {
  const user = await requireCurrentUser();
  const paymentAttemptId = text(formData, "paymentAttemptId");
  const orderId = text(formData, "orderId");

  if (!paymentAttemptId || !orderId) {
    throw new Error("Payment attempt and order are required.");
  }

  await expireMockPaymentAttempt(paymentAttemptId, user);
  revalidateOrderSurfaces(orderId);
  redirect(redirectPath(formData, `/orders/${orderId}`));
}
