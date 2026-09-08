import { prisma } from "@/lib/prisma";
import { amountInPaise, assertCapturedPayment, razorpayConfig, razorpayRequest, type RazorpayPayment } from "@/lib/razorpay";
import { ensureOrderInventoryReserved, sellActiveReservations, activateMemberships, updateAsthiApplicationPayment } from "@/lib/mock-payment-provider";
import { invoiceNumberForOrder } from "@/lib/checkout-maturity";
import { projectCommerceOrder } from "@/lib/customer-account";
import { confirmWalletDebitForOrder, createPendingCashbackForOrder } from "@/lib/wallet";

const PROVIDER = "RAZORPAY_TEST";

export async function startRazorpayPayment(orderId: string, userId: string) {
  const { keyId } = razorpayConfig();
  const attempt = await prisma.$transaction(async (tx) => {
    // Serialize creation and capture on the same order, including concurrent browser tabs.
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findFirstOrThrow({ where: { id: orderId, userId } });
    if (["succeeded", "refunded"].includes(order.paymentStatus) || !["payment_pending", "failed", "expired"].includes(order.status)) {
      throw new Error("This order is not available for payment.");
    }
    if (order.currency !== "INR") throw new Error("This checkout currently supports INR payments only.");
    const amount = amountInPaise(order.totalAmount);
    const existing = await tx.paymentAttempt.findFirst({ where: { orderId, provider: PROVIDER, status: "pending" }, orderBy: { createdAt: "desc" } });
    if (existing) return existing;
    await ensureOrderInventoryReserved(tx, orderId, userId);
    const remote = await razorpayRequest<{ id: string; amount: number; currency: string }>("orders", {
      amount, currency: order.currency, receipt: order.id.slice(0, 40), notes: { orderId: order.id }
    });
    if (!remote.id?.startsWith("order_") || remote.amount !== amount || remote.currency !== order.currency) throw new Error("Unexpected payment order response.");
    const attemptNo = await tx.paymentAttempt.count({ where: { orderId } });
    const created = await tx.paymentAttempt.create({ data: {
      tenantId: order.tenantId, orderId, userId: order.userId, subjectType: "ORDER", subjectId: order.id, provider: PROVIDER, providerOrderId: remote.id,
      amount: order.totalAmount, currency: order.currency, status: "pending", attemptNo: attemptNo + 1,
      metadataJson: { mode: "test" }
    } });
    await tx.order.update({ where: { id: orderId }, data: { status: "payment_pending", paymentStatus: "pending" } });
    await tx.orderActivity.create({ data: { tenantId: order.tenantId, orderId, actorId: userId,
      type: "payment_attempt_started", message: "Razorpay test checkout started.", metadataJson: { paymentAttemptId: created.id } } });
    return created;
  }, { timeout: 25000 });
  return { key: keyId, order_id: attempt.providerOrderId, amount: amountInPaise(attempt.amount), currency: attempt.currency };
}

export async function confirmRazorpayPayment(paymentId: string, expectedOrderId?: string, userId?: string) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new Error("Invalid payment reference.");
  const payment = await razorpayRequest<RazorpayPayment>(`payments/${paymentId}`);
  if (payment.id !== paymentId) throw new Error("Payment reference mismatch.");
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { provider_providerOrderId: { provider: PROVIDER, providerOrderId: payment.order_id } }, include: { order: true }
  });
  if (!attempt || attempt.subjectType !== "ORDER" || !attempt.orderId || !attempt.order || (expectedOrderId && attempt.providerOrderId !== expectedOrderId) || (userId && attempt.userId !== userId)) {
    throw new Error("Payment was not found for this customer.");
  }
  assertCapturedPayment(payment, attempt.providerOrderId, attempt.amount, attempt.currency);
  const orderId = attempt.orderId;
  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    const event = await tx.paymentEvent.upsert({
      where: { provider_providerEventId: { provider: PROVIDER, providerEventId: `captured:${payment.id}` } },
      create: { tenantId: attempt.tenantId, paymentAttemptId: attempt.id, orderId: order.id, subjectType: "ORDER", subjectId: order.id, provider: PROVIDER,
        providerEventId: `captured:${payment.id}`, eventType: "payment.captured",
        payloadJson: { paymentId: payment.id, providerOrderId: payment.order_id, amount: payment.amount, currency: payment.currency } }, update: {}
    });
    if (event.processedAt) return;
    if (attempt.status !== "pending") throw new Error("This payment attempt is closed and requires support reconciliation.");
    // Never overwrite a cancellation/refund or fulfil the same order twice.
    if (["succeeded", "refunded"].includes(order.paymentStatus) || !["payment_pending", "failed", "expired"].includes(order.status)) {
      throw new Error("Payment requires reconciliation with support; the order was already paid or closed.");
    }
    await ensureOrderInventoryReserved(tx, order.id, order.userId);
    const soldQuantity = await sellActiveReservations(tx, order.id, order.userId);
    await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "succeeded", providerPaymentId: payment.id } });
    await tx.order.update({ where: { id: order.id }, data: { status: "confirmed", paymentStatus: "succeeded",
      invoiceNumber: order.invoiceNumber ?? invoiceNumberForOrder(order.orderNumber), invoiceDate: order.invoiceDate ?? new Date() } });
    await tx.orderActivity.create({ data: { tenantId: order.tenantId, orderId: order.id,
      type: "payment_succeeded", message: "Razorpay test payment verified. Your order is confirmed.", metadataJson: { paymentId: payment.id, soldQuantity } } });
    await confirmWalletDebitForOrder(order.id, tx);
    await createPendingCashbackForOrder(order.id, tx);
    await activateMemberships(tx, order.id);
    await updateAsthiApplicationPayment(tx, order.id, order.userId, "CONFIRMED", "DOCUMENTS_UNDER_REVIEW", "Payment confirmed. Document verification is next.");
    await tx.paymentEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  }, { timeout: 20000 });
  await projectCommerceOrder(orderId);
  return orderId;
}

export async function refreshRazorpayPayment(orderId: string, userId: string) {
  const order = await prisma.order.findFirstOrThrow({ where: { id: orderId, userId } });
  if (order.paymentStatus === "succeeded") return true;
  const attempt = await prisma.paymentAttempt.findFirst({ where: { orderId, provider: PROVIDER, status: "pending" }, orderBy: { createdAt: "desc" } });
  if (!attempt) return false;
  const result = await razorpayRequest<{ items: RazorpayPayment[] }>(`orders/${encodeURIComponent(attempt.providerOrderId)}/payments`);
  const captured = result.items.find((item) => item.status === "captured" && item.captured);
  if (!captured) return false;
  await confirmRazorpayPayment(captured.id, attempt.providerOrderId, userId);
  return true;
}
