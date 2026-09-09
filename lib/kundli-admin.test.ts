import { describe, expect, it } from "vitest";
import { countKundliQueueStates, matchesKundliQueueFilter, type KundliQueueItem } from "./kundli-admin";

function item(overrides: Partial<KundliQueueItem> = {}): KundliQueueItem {
  return {
    id: "order", orderNo: "K-1", applicantName: "Customer", applicantEmail: "customer@example.com", status: "ASSIGNED", paymentStatus: "CONFIRMED", assignmentState: "ASSIGNED",
    assignmentQueuePosition: null, promisedDeliveryAt: null, internalNote: null, package: { id: "package", name: "Package", practitionerSelectionMode: "INTERNAL_ASSIGNMENT" },
    requestedPractitionerProfile: null, assignment: null, deliveryRisk: null, conflict: false, nextAction: "Start review", ...overrides
  };
}

describe("Kundli queue operational filters", () => {
  it("uses assignment state, delivery risk, customer request, Guruji, package, and conflict fields", () => {
    const target = item({ assignmentState: "AWAITING_ASSIGNMENT", deliveryRisk: "OVERDUE", conflict: true, requestedPractitionerProfile: { id: "requested", displayName: "Requested" }, package: { id: "p2", name: "P2", practitionerSelectionMode: "CUSTOMER_SELECTS_GURUJI" }, assignment: { source: "ADMIN", priority: "HIGH", createdAt: new Date(), assignedUser: { id: "u", kundliPractitionerProfile: { id: "g", displayName: "Guruji" } } } });
    expect(matchesKundliQueueFilter(target, { state: "AWAITING_ASSIGNMENT", guruji: "g", packageId: "p2", customerSelected: true, conflict: true })).toBe(true);
    expect(matchesKundliQueueFilter(target, { guruji: "other" })).toBe(false);
    expect(matchesKundliQueueFilter(item({ status: "DETAILS_PENDING", assignmentState: "NOT_READY" }), { state: "DETAILS_PENDING" })).toBe(true);
    expect(matchesKundliQueueFilter(item({ status: "DETAILS_PENDING", assignmentState: "NOT_READY" }), { state: "AWAITING_ASSIGNMENT" })).toBe(false);
  });

  it("counts actual assignment states, statuses, risks, and conflicts", () => {
    const counts = countKundliQueueStates([item({ assignmentState: "AWAITING_ASSIGNMENT", conflict: true }), item({ id: "two", status: "IN_REVIEW", deliveryRisk: "DUE_SOON" }), item({ id: "three", status: "REPORT_READY", deliveryRisk: "OVERDUE" }), item({ id: "four", status: "DETAILS_PENDING", assignmentState: "NOT_READY" }), item({ id: "five", status: "SUBMITTED", assignmentState: "AWAITING_ASSIGNMENT" }), item({ id: "six", status: "COMPLETED", assignmentState: "COMPLETED" })]);
    expect(counts).toMatchObject({ detailsPending: 1, awaiting: 2, completed: 1, inReview: 1, reportReady: 1, dueSoon: 1, overdue: 1, conflicts: 1 });
  });
});
