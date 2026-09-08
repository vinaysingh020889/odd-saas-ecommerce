import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { amountInPaise, assertCapturedPayment, razorpayConfig, verifyRazorpaySignature } from "./razorpay";

afterEach(() => vi.unstubAllEnvs());
describe("Razorpay payment verification", () => {
  const payment = { id: "pay_example", order_id: "order_example", amount: 50010, currency: "INR", status: "captured", captured: true };
  it("converts fractional rupees and rejects invalid payment amounts", () => {
    expect(amountInPaise("500.10")).toBe(50010);
    for (const value of [0, -1, NaN, Infinity, "bad"]) expect(() => amountInPaise(value)).toThrow();
  });
  it("verifies signatures over the exact callback or webhook body", () => {
    const body = "order_example|pay_example";
    const signature = createHmac("sha256", "test-secret").update(body).digest("hex");
    expect(verifyRazorpaySignature(body, signature, "test-secret")).toBe(true);
    expect(verifyRazorpaySignature(body + "tampered", signature, "test-secret")).toBe(false);
    expect(verifyRazorpaySignature(body, "invalid", "test-secret")).toBe(false);
    expect(verifyRazorpaySignature(body, signature, "wrong-secret")).toBe(false);
  });
  it("accepts only captured payments matching the stored amount, currency and order", () => {
    expect(() => assertCapturedPayment(payment, "order_example", 500.10, "INR")).not.toThrow();
    for (const patch of [{ order_id: "order_other" }, { amount: 1 }, { currency: "USD" }, { status: "authorized", captured: false }]) {
      expect(() => assertCapturedPayment({ ...payment, ...patch }, "order_example", 500.10, "INR")).toThrow();
    }
  });
  it("fails closed when live keys or incomplete credentials are configured", () => {
    vi.stubEnv("RAZORPAY_MODE", "live"); vi.stubEnv("RAZORPAY_KEY_ID", "rzp_live_example"); vi.stubEnv("RAZORPAY_KEY_SECRET", "example");
    expect(() => razorpayConfig()).toThrow();
    vi.stubEnv("RAZORPAY_MODE", "test"); vi.stubEnv("RAZORPAY_KEY_ID", "rzp_test_example");
    expect(razorpayConfig().keyId).toBe("rzp_test_example");
    vi.stubEnv("RAZORPAY_KEY_SECRET", ""); expect(() => razorpayConfig()).toThrow();
  });
});
