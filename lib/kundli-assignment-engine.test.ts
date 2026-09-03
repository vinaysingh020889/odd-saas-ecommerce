import { describe, expect, it } from "vitest";
import {
  assertOneActivePrimaryAssignment,
  assignmentConsumesKundliCapacity,
  calculateKundliPromisedDeliveryAt,
  candidateHasCapacity,
  evaluateKundliCandidatePool,
  KUNDLI_ASSIGNMENT_BLOCKING_MESSAGES,
  getKundliDeliveryRisk,
  preserveKundliDeliveryPromise,
  selectCustomerRequestedCandidate,
  selectInternalAssignmentCandidate,
  type PractitionerCandidate
} from "./kundli-assignment-engine";

function candidate(overrides: Partial<PractitionerCandidate> & Pick<PractitionerCandidate, "id">): PractitionerCandidate {
  return {
    userId: `user-${overrides.id}`,
    displayName: overrides.id,
    assignmentPriority: 10,
    standardDeliveryBusinessDays: 3,
    timezone: "UTC",
    dailyActiveOrderLimit: 5,
    weeklyActiveOrderLimit: 20,
    monthlyActiveOrderLimit: 60,
    capacity: { daily: 0, weekly: 0, monthly: 0, active: 0 },
    unavailable: false,
    ...overrides
  };
}

describe("Kundli candidate selection", () => {
  it("assigns the highest-priority active Guruji when package restriction is disabled", () => {
    const dev = candidate({ id: "dev", displayName: "Guruji Dev Sharma", assignmentPriority: 10, active: true, acceptingWork: true, eligibleForPackage: false });
    const other = candidate({ id: "other", assignmentPriority: 20, active: true, acceptingWork: true, eligibleForPackage: true });
    const evaluation = evaluateKundliCandidatePool([other, dev], false);
    expect(evaluation.blockingCode).toBeNull();
    expect(selectInternalAssignmentCandidate(evaluation.candidates)?.id).toBe("dev");
  });

  it("uses only explicitly linked Guruji when package restriction is enabled", () => {
    const selected = candidate({ id: "selected", assignmentPriority: 20, active: true, acceptingWork: true, eligibleForPackage: true });
    const unlinked = candidate({ id: "unlinked", assignmentPriority: 1, active: true, acceptingWork: true, eligibleForPackage: false });
    const evaluation = evaluateKundliCandidatePool([unlinked, selected], true);
    expect(selectInternalAssignmentCandidate(evaluation.candidates)?.id).toBe("selected");
  });

  it("returns the exact configuration error for an empty enabled restriction", () => {
    const evaluation = evaluateKundliCandidatePool([candidate({ id: "unlinked", active: true, acceptingWork: true, eligibleForPackage: false })], true);
    expect(evaluation.blockingCode).toBe("PACKAGE_RESTRICTION_EMPTY");
    expect(KUNDLI_ASSIGNMENT_BLOCKING_MESSAGES[evaluation.blockingCode!]).toBe("Package restriction has no eligible Guruji.");
  });

  it("distinguishes unavailable and daily, weekly, and monthly capacity blockers", () => {
    const base = { active: true, acceptingWork: true, eligibleForPackage: true };
    expect(evaluateKundliCandidatePool([candidate({ id: "away", ...base, unavailable: true })], false).blockingCode).toBe("ALL_ELIGIBLE_UNAVAILABLE");
    expect(evaluateKundliCandidatePool([candidate({ id: "daily", ...base, dailyActiveOrderLimit: 1, capacity: { daily: 1, weekly: 1, monthly: 1, active: 1 } })], false).blockingCode).toBe("DAILY_CAPACITY_FULL");
    expect(evaluateKundliCandidatePool([candidate({ id: "weekly", ...base, dailyActiveOrderLimit: 5, weeklyActiveOrderLimit: 1, capacity: { daily: 0, weekly: 1, monthly: 1, active: 1 } })], false).blockingCode).toBe("WEEKLY_CAPACITY_FULL");
    expect(evaluateKundliCandidatePool([candidate({ id: "monthly", ...base, dailyActiveOrderLimit: 5, weeklyActiveOrderLimit: 5, monthlyActiveOrderLimit: 1, capacity: { daily: 0, weekly: 0, monthly: 1, active: 1 } })], false).blockingCode).toBe("MONTHLY_CAPACITY_FULL");
  });

  it("chooses priority, then lowest workload, then stable id", () => {
    expect(selectInternalAssignmentCandidate([
      candidate({ id: "z", assignmentPriority: 20 }),
      candidate({ id: "b", capacity: { daily: 1, weekly: 1, monthly: 1, active: 1 } }),
      candidate({ id: "a", capacity: { daily: 1, weekly: 1, monthly: 1, active: 1 } })
    ])?.id).toBe("a");
    expect(selectInternalAssignmentCandidate([candidate({ id: "busy", capacity: { daily: 2, weekly: 2, monthly: 2, active: 2 } }), candidate({ id: "free" })])?.id).toBe("free");
  });

  it("accepts a customer-selected Guruji only when eligible, available, and within capacity", () => {
    const eligible = candidate({ id: "selected" });
    expect(selectCustomerRequestedCandidate([eligible], "selected")?.id).toBe("selected");
    expect(selectCustomerRequestedCandidate([eligible], "missing")).toBeNull();
  });

  it("keeps unavailable or full selected Guruji unselected", () => {
    expect(selectCustomerRequestedCandidate([candidate({ id: "leave", unavailable: true })], "leave")).toBeNull();
    expect(selectCustomerRequestedCandidate([candidate({ id: "full", capacity: { daily: 5, weekly: 5, monthly: 5, active: 5 } })], "full")).toBeNull();
  });

  it("returns no internal candidate when every Guruji is at capacity", () => {
    const full = candidate({ id: "full", capacity: { daily: 5, weekly: 20, monthly: 60, active: 5 } });
    expect(candidateHasCapacity(full)).toBe(false);
    expect(selectInternalAssignmentCandidate([full])).toBeNull();
  });
});

describe("Kundli assignment invariants and lifecycle", () => {
  it("treats repeated orchestration as idempotent through the one-primary invariant", () => {
    const assignment = { isPrimary: true, endedAt: null, status: "ASSIGNED" };
    expect(assertOneActivePrimaryAssignment([assignment])).toBe(assignment);
  });

  it("rejects more than one active primary assignment", () => {
    expect(() => assertOneActivePrimaryAssignment([
      { isPrimary: true, endedAt: null, status: "ASSIGNED" },
      { isPrimary: true, endedAt: null, status: "IN_PROGRESS" }
    ])).toThrow(/Multiple active primary/);
  });

  it("releases capacity for delivered, completed, cancelled, refunded, ended, and superseded work", () => {
    const active = { isPrimary: true, endedAt: null, status: "ASSIGNED" };
    expect(assignmentConsumesKundliCapacity(active, "IN_REVIEW")).toBe(true);
    for (const status of ["DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"] as const) expect(assignmentConsumesKundliCapacity(active, status)).toBe(false);
    expect(assignmentConsumesKundliCapacity({ ...active, endedAt: new Date() }, "IN_REVIEW")).toBe(false);
    expect(assignmentConsumesKundliCapacity({ ...active, isPrimary: false }, "IN_REVIEW")).toBe(false);
  });

  it("does not silently replace an existing delivery promise", () => {
    const existing = new Date("2026-08-01T00:00:00.000Z");
    expect(preserveKundliDeliveryPromise(existing, new Date("2026-09-01T00:00:00.000Z"))).toBe(existing);
  });
});

describe("Kundli delivery calculation", () => {
  it("counts Monday through Saturday and skips Sunday", () => {
    const saturday = new Date("2026-07-25T10:00:00.000Z");
    const promise = calculateKundliPromisedDeliveryAt({ assignedAt: saturday, timezone: "UTC", businessDays: 1, unavailability: [] });
    expect(promise.toISOString()).toBe("2026-07-27T23:59:59.000Z");
  });

  it("skips an unavailable working date", () => {
    const promise = calculateKundliPromisedDeliveryAt({
      assignedAt: new Date("2026-07-25T10:00:00.000Z"),
      timezone: "UTC",
      businessDays: 1,
      unavailability: [{ startsAt: new Date("2026-07-27T00:00:00.000Z"), endsAt: new Date("2026-07-27T23:59:59.999Z") }]
    });
    expect(promise.toISOString()).toBe("2026-07-28T23:59:59.000Z");
  });

  it("classifies on-track, due-soon, and overdue promises", () => {
    const now = new Date("2026-07-20T00:00:00.000Z");
    expect(getKundliDeliveryRisk(new Date("2026-07-22T00:00:00.000Z"), now)).toBe("ON_TRACK");
    expect(getKundliDeliveryRisk(new Date("2026-07-20T12:00:00.000Z"), now)).toBe("DUE_SOON");
    expect(getKundliDeliveryRisk(new Date("2026-07-19T23:59:59.000Z"), now)).toBe("OVERDUE");
  });
});
