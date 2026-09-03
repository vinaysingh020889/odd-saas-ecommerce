import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireOperationsAdminUser: vi.fn(), reassign: vi.fn(), attempt: vi.fn(), prismaTransaction: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireOperationsAdminUser: mocks.requireOperationsAdminUser }));
vi.mock("@/lib/catalog", () => ({ getOmdTenantId: vi.fn(async () => "tenant") }));
vi.mock("@/lib/kundli-assignment-engine", async (original) => ({ ...(await original()), attemptKundliAssignment: mocks.attempt, reassignKundliOrder: mocks.reassign, recalculateKundliDeliveryPromise: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.prismaTransaction } }));

import { reassignKundliOrderAction, retryKundliAutomaticAssignmentAction } from "./kundli-assignment-actions";
import { saveKundliPractitionerProfileAction, updateKundliPackageAssignmentModeAction } from "./kundli-practitioner-actions";
import { saveAssignmentAction } from "./service-capacity";

describe("Kundli admin authorization and legacy safety", () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it("blocks unauthorized practitioner settings and reassignment actions", async () => {
    mocks.requireOperationsAdminUser.mockRejectedValue(new Error("unauthorized"));
    await expect(saveKundliPractitionerProfileAction(new FormData())).rejects.toThrow("unauthorized");
    await expect(reassignKundliOrderAction(new FormData())).rejects.toThrow("unauthorized");
    expect(mocks.reassign).not.toHaveBeenCalled();
  });
  it("requires a reassignment reason before calling the engine", async () => {
    mocks.requireOperationsAdminUser.mockResolvedValue({ id: "admin" });
    const data = new FormData(); data.set("orderId", "order"); data.set("practitionerProfileId", "profile");
    await expect(reassignKundliOrderAction(data)).rejects.toThrow(/reason is required/);
    expect(mocks.reassign).not.toHaveBeenCalled();
  });
  it("prevents the generic assignment action from creating Kundli assignments", async () => {
    mocks.requireOperationsAdminUser.mockResolvedValue({ id: "admin" });
    const data = new FormData(); data.set("workType", "KUNDLI_ORDER"); data.set("workId", "order");
    await expect(saveAssignmentAction(data)).rejects.toThrow(/Kundli assignment engine/);
    expect(mocks.prismaTransaction).not.toHaveBeenCalled();
  });
  it("prevents an admin from enabling customer Guruji selection", async () => {
    mocks.requireOperationsAdminUser.mockResolvedValue({ id: "admin" });
    const data = new FormData();
    data.set("packageId", "package");
    data.set("practitionerSelectionMode", "CUSTOMER_SELECTS_GURUJI");
    await expect(updateKundliPackageAssignmentModeAction(data)).rejects.toThrow(/selection is disabled/);
    expect(mocks.prismaTransaction).not.toHaveBeenCalled();
  });
  it("retries an awaiting order through the automatic assignment engine", async () => {
    mocks.requireOperationsAdminUser.mockResolvedValue({ id: "admin" });
    mocks.attempt.mockResolvedValue({ outcome: "ASSIGNED", practitionerProfileId: "dev" });
    const data = new FormData();
    data.set("orderId", "awaiting-order");
    await retryKundliAutomaticAssignmentAction(data);
    expect(mocks.attempt).toHaveBeenCalledWith("awaiting-order", expect.objectContaining({ actorId: "admin", source: "AUTO" }));
  });
});
