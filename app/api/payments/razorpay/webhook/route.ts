import { verifyRazorpaySignature } from "@/lib/razorpay";
import { confirmRazorpayPayment } from "@/lib/razorpay-payments";
import { confirmRazorpaySubjectPayment, RAZORPAY_SUBJECT_TYPES } from "@/lib/razorpay-subject-payments";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!secret) return Response.json({ error: "Webhook not configured" }, { status: 503 });
  const body = await request.text();
  if (body.length > 262144) return Response.json({ error: "Payload too large" }, { status: 413 });
  if (!verifyRazorpaySignature(body, request.headers.get("x-razorpay-signature") ?? "", secret)) {
    return Response.json({ error: "Invalid signature" }, { status: 401 });
  }
  let payload;
  try { payload = JSON.parse(body); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!["payment.captured", "order.paid"].includes(payload.event)) return Response.json({ received: true });
  const payment = payload.payload?.payment?.entity;
  if (!payment?.id || !payment?.order_id) return Response.json({ error: "Missing payment" }, { status: 400 });
  try {
    const tracked = await prisma.paymentAttempt.findUnique({ where: { provider_providerOrderId: { provider: "RAZORPAY_TEST", providerOrderId: payment.order_id } }, select: { id: true, subjectType: true } });
    if (!tracked) return Response.json({ received: true, ignored: true });
    if (tracked.subjectType === "ORDER") await confirmRazorpayPayment(payment.id, payment.order_id);
    else if (RAZORPAY_SUBJECT_TYPES.includes(tracked.subjectType as (typeof RAZORPAY_SUBJECT_TYPES)[number])) await confirmRazorpaySubjectPayment(payment.id, payment.order_id);
    else return Response.json({ received: true, ignored: true });
    return Response.json({ received: true });
  } catch {
    // A non-2xx response lets Razorpay retry. Never log the raw payment payload or secrets.
    console.error("Razorpay webhook reconciliation failed; retry required.");
    return Response.json({ error: "Payment reconciliation pending" }, { status: 503 });
  }
}
