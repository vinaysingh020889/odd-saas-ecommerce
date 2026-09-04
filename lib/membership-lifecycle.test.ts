import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { membershipRequestTransition } from "./membership-lifecycle";

describe("membership lifecycle safety", () => {
  it("allows open request transitions and treats an identical decision as idempotent", () => {
    expect(membershipRequestTransition({ status: "submitted" }, "under_review")).toBe("APPLY");
    expect(membershipRequestTransition({ status: "under_review" }, "approved")).toBe("APPLY");
    expect(membershipRequestTransition({ status: "approved" }, "approved")).toBe("NOOP");
  });

  it("prevents a terminal request from being changed to another decision", () => {
    expect(() => membershipRequestTransition({ status: "approved" }, "rejected")).toThrow(/already approved/);
    expect(() => membershipRequestTransition({ status: "rejected" }, "approved")).toThrow(/already rejected/);
    expect(() => membershipRequestTransition({ status: "closed" }, "under_review")).toThrow(/already closed/);
  });

  it("keeps authentication and authorization in the server-action boundary", () => {
    const source = readFileSync("lib/membership-actions.ts", "utf8");
    expect(source).toContain("await requireCurrentUser()");
    expect(source).toContain("await requireOperationsAdminUser()");
    expect(source).toContain("submitMembershipCancellationRequest");
    expect(source).toContain("submitMembershipPlanChangeRequest");
    expect(source).toContain("processMembershipRequest");
  });

  it("uses a stable mock reference supplied by the review form", () => {
    const actionSource = readFileSync("lib/membership-actions.ts", "utf8");
    const reviewSource = readFileSync("app/(public)/membership/[slug]/review/page.tsx", "utf8");
    expect(actionSource).toContain("activationReference");
    expect(actionSource).not.toContain("mockPaymentReference: `MOCK-MEMBER-${Date.now()}`");
    expect(reviewSource).toContain('name="activationReference"');
  });
});
