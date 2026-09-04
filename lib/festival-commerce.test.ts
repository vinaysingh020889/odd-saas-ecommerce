import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isCurrentlyActive } from "./merchandising";

describe("selected festival commerce safety", () => {
  it("publishes only active or scheduled campaigns inside their date window", () => {
    const now = new Date("2026-09-04T12:00:00Z");
    expect(isCurrentlyActive({ status: "ACTIVE", startDate: new Date("2026-09-01"), endDate: new Date("2026-09-10") }, now)).toBe(true);
    expect(isCurrentlyActive({ status: "DRAFT" }, now)).toBe(false);
    expect(isCurrentlyActive({ status: "ACTIVE", startDate: new Date("2026-09-05") }, now)).toBe(false);
    expect(isCurrentlyActive({ status: "ACTIVE", endDate: new Date("2026-09-03") }, now)).toBe(false);
  });

  it("filters inactive linked catalog records from public festival queries", () => {
    const source = readFileSync("lib/merchandising.ts", "utf8");
    expect(source).toContain('where: { product: { status: "ACTIVE" } }');
    expect(source).toContain('where: { category: { status: "ACTIVE" } }');
    expect(source).toContain('where: { service: { status: "ACTIVE" } }');
  });

  it("keeps fulfilment transitions behind operations-admin authorization", () => {
    const actions = readFileSync("lib/admin-order-actions.ts", "utf8");
    const page = readFileSync("app/admin/orders/[id]/page.tsx", "utf8");
    expect(actions).toContain("await requireOperationsAdminUser()");
    for (const action of ["markOrderProcessingAction", "markOrderReadyToShipAction", "markOrderShippedAction", "markOrderDeliveredAction"]) {
      expect(actions).toContain(`export async function ${action}`);
      expect(page).toContain(`action={${action}}`);
    }
  });
});
