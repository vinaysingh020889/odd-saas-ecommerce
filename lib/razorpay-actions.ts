"use server";
import { revalidatePath } from "next/cache";
import { requireCommerceMembership } from "@/lib/commerce-membership-gate";
import { requireCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { startRazorpayPayment, confirmRazorpayPayment, refreshRazorpayPayment } from "@/lib/razorpay-payments";
import { confirmRazorpaySubjectPayment, refreshRazorpaySubjectPayment, startRazorpaySubjectPayment, type RazorpaySubjectType } from "@/lib/razorpay-subject-payments";
import { razorpayConfig, verifyRazorpaySignature } from "@/lib/razorpay";

export type RazorpayCheckoutSubject = "ORDER" | RazorpaySubjectType;

function refresh(type: RazorpayCheckoutSubject, id: string) {
  const paths = type === "ORDER" ? ["/orders", `/orders/${id}`, "/admin/orders", `/admin/orders/${id}`, "/admin/inventory", "/dashboard"]
    : type === "MEMBERSHIP" ? ["/membership", "/dashboard", "/admin/memberships", "/admin/payments"]
    : type === "KUNDLI" ? ["/kundli", `/kundli/${id}`, "/admin/kundli", "/admin/payments", "/dashboard"]
    : type === "ASTHI" ? ["/services/asthi-visarjan", `/asthi/${id}`, "/admin/asthi", "/admin/payments", "/dashboard"]
    : ["/services", `/service-bookings/${id}`, "/admin/service-bookings", "/admin/payments", "/dashboard"];
  for (const path of paths) revalidatePath(path);
}

export async function beginRazorpayCheckout(subjectId: string, subjectType: RazorpayCheckoutSubject = "ORDER") {
  try {
    if (subjectType === "ORDER") {
      const { user } = await requireCommerceMembership(`/orders/${encodeURIComponent(subjectId)}`);
      return { checkout: await startRazorpayPayment(subjectId, user.id) };
    }
    const user = await requireCurrentUser();
    return { checkout: await startRazorpaySubjectPayment(subjectType, subjectId, user.id) };
  } catch {
    return { error: subjectType === "ORDER" ? "Unable to start payment. Check your membership and try again. If this continues, contact support." : "Unable to start this payment. Review the booking status and try again, or contact support." };
  }
}

export async function verifyRazorpayCheckout(input: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const user = await requireCurrentUser();
  try {
    const { keySecret } = razorpayConfig();
    if (!verifyRazorpaySignature(`${input.razorpay_order_id}|${input.razorpay_payment_id}`, input.razorpay_signature, keySecret)) {
      return { error: "Payment verification failed. Please check payment status before trying again." };
    }
    const attempt = await prisma.paymentAttempt.findUnique({ where: { provider_providerOrderId: { provider: "RAZORPAY_TEST", providerOrderId: input.razorpay_order_id } }, select: { subjectType: true, subjectId: true, userId: true } });
    if (!attempt || attempt.userId !== user.id) return { error: "Payment was not found for this account." };
    if (attempt.subjectType === "ORDER") await confirmRazorpayPayment(input.razorpay_payment_id, input.razorpay_order_id, user.id);
    else await confirmRazorpaySubjectPayment(input.razorpay_payment_id, input.razorpay_order_id, user.id);
    refresh(attempt.subjectType as RazorpayCheckoutSubject, attempt.subjectId);
    return { confirmed: true };
  } catch {
    return { error: "Payment is not confirmed yet. Use Check payment status before paying again." };
  }
}

export async function checkRazorpayCheckout(subjectId: string, subjectType: RazorpayCheckoutSubject = "ORDER") {
  const user = await requireCurrentUser();
  try {
    const confirmed = subjectType === "ORDER" ? await refreshRazorpayPayment(subjectId, user.id) : await refreshRazorpaySubjectPayment(subjectType, subjectId, user.id);
    refresh(subjectType, subjectId);
    return { confirmed };
  } catch {
    return { error: "Unable to check payment right now. Please retry shortly or contact support." };
  }
}
