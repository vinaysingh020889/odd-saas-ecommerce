import { describe, expect, it } from "vitest";
import { classifyMembershipClaim } from "./membership-claims";

describe("membership claim queue classification", () => {
  const now = new Date("2026-09-10T12:00:00Z");
  it("classifies new, overdue, fulfilled, cancelled, and exception claims", () => {
    expect(classifyMembershipClaim({ status: "RESERVED", createdAt: new Date("2026-09-10T10:00:00Z"), reservationExpiresAt: new Date("2026-09-10T13:00:00Z") }, now)).toBe("NEW");
    expect(classifyMembershipClaim({ status: "CONSUMED", createdAt: now, reservationExpiresAt: null, promisedDeliveryAt: new Date("2026-09-10T11:00:00Z") }, now)).toBe("OVERDUE");
    expect(classifyMembershipClaim({ status: "CONSUMED", createdAt: now, reservationExpiresAt: null, orderStatus: "COMPLETED" }, now)).toBe("FULFILLED");
    expect(classifyMembershipClaim({ status: "RELEASED", createdAt: now, reservationExpiresAt: null }, now)).toBe("CANCELLED");
    expect(classifyMembershipClaim({ status: "RESERVED", createdAt: now, reservationExpiresAt: new Date("2026-09-10T11:00:00Z") }, now)).toBe("EXCEPTION");
  });
});
