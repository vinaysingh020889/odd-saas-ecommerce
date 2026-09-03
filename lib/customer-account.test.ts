import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { customerAccountEntryHref, summarizeCustomerAccountEntries } from "./customer-account";

function entry(actionType: string, amounts: { gross?: number; paid?: number; refunded?: number } = {}, entityId = "source-1") {
  return {
    actionType,
    relatedEntityType: "ORDER",
    relatedEntityId: entityId,
    sourceId: entityId,
    grossAmount: amounts.gross ?? 0,
    paidAmount: amounts.paid ?? 0,
    refundedAmount: amounts.refunded ?? 0
  };
}

describe("customer account financial truth", () => {
  it("counts a successful payment once while ignoring pending and failed attempts", () => {
    const summary = summarizeCustomerAccountEntries([
      entry("PAYMENT_PENDING", { gross: 1200 }),
      entry("PAYMENT_SUCCEEDED", { paid: 1200 }),
      entry("PAYMENT_FAILED", { gross: 1200 })
    ]);
    expect(summary).toEqual({ totalPaid: 1200, totalRefunded: 0, netSpent: 1200, pendingAmount: 0 });
  });

  it("subtracts only completed refunds", () => {
    const summary = summarizeCustomerAccountEntries([
      entry("PAYMENT_SUCCEEDED", { paid: 2000 }),
      entry("REFUND_REQUESTED", { refunded: 2000 }),
      entry("REFUND_COMPLETED", { refunded: 2000 })
    ]);
    expect(summary).toEqual({ totalPaid: 2000, totalRefunded: 2000, netSpent: 0, pendingAmount: 0 });
  });

  it("keeps cancellation and return activity visible without false money", () => {
    const summary = summarizeCustomerAccountEntries([entry("CANCEL_SUBMITTED"), entry("RETURN_APPROVED")]);
    expect(summary).toEqual({ totalPaid: 0, totalRefunded: 0, netSpent: 0, pendingAmount: 0 });
  });

  it("counts complimentary membership as zero and paid membership once", () => {
    const summary = summarizeCustomerAccountEntries([
      entry("MEMBERSHIP_ACTIVATED", { paid: 0 }, "free"),
      entry("MEMBERSHIP_ACTIVATED", { paid: 999 }, "premium"),
      entry("MEMBERSHIP_UPGRADED", { paid: 1999 }, "divya")
    ]);
    expect(summary.totalPaid).toBe(2998);
  });

  it("maps product, kit, service, Kundli, Asthi, and membership sources to safe routes", () => {
    expect(customerAccountEntryHref({ relatedEntityType: "ORDER", relatedEntityId: "o1", sourceType: "ORDER", sourceId: "o1" })).toBe("/orders/o1");
    expect(customerAccountEntryHref({ relatedEntityType: "SERVICE_BOOKING", relatedEntityId: "s1", sourceType: "SERVICE_BOOKING", sourceId: "s1" })).toBe("/service-bookings/s1");
    expect(customerAccountEntryHref({ relatedEntityType: "KUNDLI_ORDER", relatedEntityId: "k1", sourceType: "KUNDLI_ORDER", sourceId: "k1" })).toBe("/kundli/k1");
    expect(customerAccountEntryHref({ relatedEntityType: "ASTHI_APPLICATION", relatedEntityId: "a1", sourceType: "ASTHI_APPLICATION", sourceId: "a1" })).toBe("/asthi/a1");
    expect(customerAccountEntryHref({ relatedEntityType: "MEMBERSHIP_PLAN", relatedEntityId: "m1", sourceType: "USER_MEMBERSHIP", sourceId: "m1" })).toBe("/membership");
  });
});

describe("customer account security and idempotency wiring", () => {
  it("owner-restricts the customer statement query", () => {
    const page = readFileSync("app/(app)/account/activity/page.tsx", "utf8");
    expect(page).toContain("requireCurrentUser()");
    expect(page).toContain("userId: user.id");
    expect(page).not.toContain("searchParams: Promise<{ customerId");
  });

  it("keeps ASTROLOGER outside the admin customer statement role gate", () => {
    const page = readFileSync("app/admin/customers/[id]/page.tsx", "utf8");
    expect(page).toContain('requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"])');
    expect(page).not.toContain('"ASTROLOGER"');
  });

  it("uses a tenant-scoped unique idempotency key and create-only projection", () => {
    const schema = readFileSync("prisma/schema.prisma", "utf8");
    const source = readFileSync("lib/customer-account.ts", "utf8");
    expect(schema).toContain("@@unique([tenantId, idempotencyKey])");
    expect(source).toContain("customerAccountEntry.create");
    expect(source).not.toContain("customerAccountEntry.update");
  });

  it("keeps Kundli and Asthi projections free of private operational fields", () => {
    const source = readFileSync("lib/customer-account.ts", "utf8");
    expect(source).not.toContain("dateOfBirth");
    expect(source).not.toContain("timeOfBirth");
    expect(source).not.toContain("assignedTo");
    expect(source).not.toContain("internalNote");
    expect(source).not.toContain("reportUrl");
    expect(source).not.toContain("proofUrl");
  });

  it("provides an idempotent source-data-only backfill", () => {
    const source = readFileSync("lib/customer-account.ts", "utf8");
    expect(source).toContain("backfillCustomerAccountEntries");
    expect(source).toContain("appendCustomerAccountEntry");
    expect(source).not.toContain("order.update(");
    expect(source).not.toContain("kundliOrder.update(");
    expect(source).not.toContain("asthiApplication.update(");
  });
});
