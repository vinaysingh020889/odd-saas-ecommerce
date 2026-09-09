import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  itemUpdate: vi.fn(),
  orderFind: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireOperationsAdminUser: vi.fn(async () => ({ id: "admin" })) }));
vi.mock("@/lib/catalog", () => ({ getOmdTenantId: vi.fn(async () => "tenant") }));
vi.mock("@/lib/kundli-assignment-engine", () => ({ attemptKundliAssignment: vi.fn() }));
vi.mock("@/lib/checklists", () => ({
  checklistItemStatuses: ["pending", "in_progress", "completed", "skipped", "blocked"],
  checklistWorkTypes: [],
  isKundliAutomaticChecklistItem: vi.fn(() => false),
  recomputeChecklistProgress: vi.fn(),
  writeChecklistActivity: vi.fn()
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));

import { updateChecklistItemAction } from "./checklist-actions";

it("blocks Operations from verifying Kundli details before customer submission", async () => {
  const tx = {
    checklistInstanceItem: {
      findFirst: vi.fn(async () => ({
        id: "item",
        title: "Review birth details",
        status: "pending",
        checklistInstanceId: "checklist",
        checklistInstance: { relatedType: "KUNDLI_ORDER", relatedId: "order" }
      })),
      update: mocks.itemUpdate
    },
    kundliOrder: { findFirst: mocks.orderFind },
    auditLog: { create: vi.fn() }
  };
  mocks.orderFind.mockResolvedValue({ status: "DETAILS_PENDING" });
  mocks.transaction.mockImplementation(async (work) => work(tx));

  const data = new FormData();
  data.set("itemId", "item");
  data.set("status", "completed");

  await expect(updateChecklistItemAction(data)).rejects.toThrow("The customer must submit the Kundli details before Operations can verify them.");
  expect(mocks.itemUpdate).not.toHaveBeenCalled();
});
