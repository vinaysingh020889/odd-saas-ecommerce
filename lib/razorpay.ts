import { createHmac, timingSafeEqual } from "node:crypto";

export function razorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if ((process.env.RAZORPAY_MODE ?? "test") !== "test" || !keyId?.startsWith("rzp_test_") || !keySecret) {
    throw new Error("Razorpay test payments are not configured. Please contact support.");
  }
  return { keyId, keySecret };
}

export function verifyRazorpaySignature(body: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature) || !secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function amountInPaise(amount: unknown) {
  const numeric = Number(amount);
  const paise = Math.round(numeric * 100);
  if (!Number.isFinite(numeric) || !Number.isSafeInteger(paise) || paise <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }
  return paise;
}

export type RazorpayPayment = {
  id: string; order_id: string; amount: number; currency: string; status: string; captured: boolean;
};
export function assertCapturedPayment(payment: RazorpayPayment, orderId: string, amount: unknown, currency: string) {
  if (payment.order_id !== orderId || payment.amount !== amountInPaise(amount) || payment.currency !== currency) {
    throw new Error("Payment does not match this order.");
  }
  if (payment.status !== "captured" || payment.captured !== true) {
    throw new Error("Payment is awaiting confirmation. Please check payment status shortly.");
  }
}

export async function razorpayRequest<T>(path: string, body?: object): Promise<T> {
  const { keyId, keySecret } = razorpayConfig();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store", signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Razorpay could not complete this request. Please try again or contact support.");
  return response.json() as Promise<T>;
}
