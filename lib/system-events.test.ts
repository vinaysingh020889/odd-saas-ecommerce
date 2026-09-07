import { describe, expect, it, vi } from "vitest";
import { recordSystemEvent } from "@/lib/system-events";

describe("system events", () => {
  it("persists tenant context and bounds operator-facing strings", async () => {
    const create = vi.fn(async (args) => args);
    const writer = { systemEvent: { create } } as never;
    await recordSystemEvent({ tenantId: "tenant-a", severity: "ERROR", module: "KUNDLI", action: "UPLOAD", outcome: "x".repeat(500), actorRole: "r".repeat(100), errorRef: "e".repeat(100) }, writer);
    const data = create.mock.calls[0][0].data;
    expect(data.tenantId).toBe("tenant-a");
    expect(data.outcome).toHaveLength(300);
    expect(data.actorRole).toHaveLength(80);
    expect(data.errorRef).toHaveLength(80);
  });
});
