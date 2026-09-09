import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Kundli customer tracking ownership", () => {
  it("queries by the authenticated owner, uses the safe assignment projection, and hides report links until delivered", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
    expect(source).toContain("where: { userId: user.id");
    expect(source).toContain("getKundliCustomerAssignmentProjection(order)");
    expect(source).not.toContain("order.assignedTo");
    expect(source).toContain("customerAssignment.isQueued && customerAssignment.queuePosition !== null");
    expect(source).toContain("filterReleasedKundliCustomerDocuments");
    expect(source).toContain('["DELIVERED", "COMPLETED"].includes(order.status)');
    expect(source).toContain("Report under review");
    expect(source).toContain('label="Payment"');
    expect(source).toContain("Verified in Razorpay Test Mode");
    const milestoneSource = readFileSync("components/customer-checklist-milestones.tsx", "utf8");
    expect(milestoneSource).toContain("checklistItemStatusLabel(milestone.status)");
  });
});
