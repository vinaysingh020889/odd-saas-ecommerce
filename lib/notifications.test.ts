import { describe, expect, it, vi } from "vitest";
import { notifyRoles, notifyUser } from "@/lib/notifications";

describe("persisted notifications", () => {
  it("deduplicates within tenant and recipient without resetting read state", async () => {
    const upsert = vi.fn(async (args) => args);
    const writer = { notification: { upsert }, user: { findMany: vi.fn() } } as never;
    await notifyUser({ tenantId: "tenant-a", recipientId: "user-a", type: "TEST", title: "Title", message: "Message", dedupeKey: "event-1" }, writer);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId_recipientId_dedupeKey: { tenantId: "tenant-a", recipientId: "user-a", dedupeKey: "event-1" } } }));
    expect(upsert.mock.calls[0][0].update).not.toHaveProperty("readAt");
  });

  it("resolves role recipients inside the supplied tenant only", async () => {
    const findMany = vi.fn(async () => [{ id: "ops-a" }]);
    const upsert = vi.fn(async (args) => args);
    const writer = { user: { findMany }, notification: { upsert } } as never;
    await notifyRoles({ tenantId: "tenant-a", roles: ["OPERATIONS_ADMIN"], type: "TEST", title: "Title", message: "Message", dedupeKey: "role-event" }, writer);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: "tenant-a" }) }));
    expect(upsert.mock.calls[0][0].create.recipientId).toBe("ops-a");
  });
});
