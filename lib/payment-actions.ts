"use server";

export async function startMockPaymentAction(_formData: FormData) {
  throw new Error("Simulated payments are no longer available. Refresh your order and use Razorpay checkout.");
}

export async function simulateMockPaymentSuccessAction(_formData: FormData) {
  throw new Error("Simulated payments are no longer available. Refresh your order and use Razorpay checkout.");
}

export async function simulateMockPaymentFailureAction(_formData: FormData) {
  throw new Error("Simulated payments are no longer available. Refresh your order and use Razorpay checkout.");
}

export async function simulateMockPaymentCancelAction(_formData: FormData) {
  throw new Error("Simulated payments are no longer available. Refresh your order and use Razorpay checkout.");
}

export async function expireMockPaymentAttemptAction(_formData: FormData) {
  throw new Error("Simulated payments are no longer available. Refresh your order and use Razorpay checkout.");
}
