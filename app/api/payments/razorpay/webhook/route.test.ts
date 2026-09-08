import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ confirm: vi.fn(), confirmSubject: vi.fn(), lookup: vi.fn() }));
vi.mock("@/lib/razorpay-payments", () => ({ confirmRazorpayPayment: mocks.confirm }));
vi.mock("@/lib/razorpay-subject-payments", () => ({ confirmRazorpaySubjectPayment: mocks.confirmSubject, RAZORPAY_SUBJECT_TYPES: ["MEMBERSHIP", "KUNDLI", "ASTHI", "SERVICE_BOOKING"] }));
vi.mock("@/lib/prisma", () => ({ prisma: { paymentAttempt: { findUnique: mocks.lookup } } }));
import { POST } from "./route";
const payload = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_example", order_id: "order_example" } } } });
function request(body = payload, signature = createHmac("sha256", "webhook-test-secret").update(body).digest("hex")) {
 return new Request("http://localhost/api/payments/razorpay/webhook", { method: "POST", body, headers: { "x-razorpay-signature": signature } });
}
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "webhook-test-secret"); });
afterEach(() => vi.unstubAllEnvs());
describe("Razorpay webhook boundary", () => {
 it("rejects forged webhooks before database access", async () => {
   expect((await POST(request(payload, "0".repeat(64)))).status).toBe(401);
   expect(mocks.lookup).not.toHaveBeenCalled(); expect(mocks.confirm).not.toHaveBeenCalled();
 });
 it("ignores payments not belonging to this integration", async () => {
   mocks.lookup.mockResolvedValue(null);
   expect((await POST(request())).status).toBe(200); expect(mocks.confirm).not.toHaveBeenCalled();
 });
 it("routes shop captures through server-side provider verification", async () => {
   mocks.lookup.mockResolvedValue({ id: "attempt", subjectType: "ORDER" });
   expect((await POST(request())).status).toBe(200);
   expect(mocks.confirm).toHaveBeenCalledWith("pay_example", "order_example");
 });
 it("routes domain captures through generic provider verification", async () => {
   mocks.lookup.mockResolvedValue({ id: "attempt", subjectType: "MEMBERSHIP" });
   expect((await POST(request())).status).toBe(200);
   expect(mocks.confirmSubject).toHaveBeenCalledWith("pay_example", "order_example");
 });
 it("requests a provider retry after a reconciliation failure", async () => {
   mocks.lookup.mockResolvedValue({ id: "attempt", subjectType: "ORDER" }); mocks.confirm.mockRejectedValue(new Error("temporary failure"));
   const spy = vi.spyOn(console, "error").mockImplementation(() => {});
   try { expect((await POST(request())).status).toBe(503); } finally { spy.mockRestore(); }
 });
 it("fails closed when the webhook secret is missing", async () => {
   vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "");
   expect((await POST(request())).status).toBe(503); expect(mocks.confirm).not.toHaveBeenCalled();
 });
});
