import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  transaction: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireOperationsAdminUser: mocks.requireAdmin }));
vi.mock("@/lib/catalog", () => ({ getOmdTenantId: vi.fn(async () => "tenant") }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/customer-account", () => ({ projectKundliOrder: vi.fn(async () => 1) }));

import { deliverKundliReportAction, returnKundliReportForCorrectionAction } from "./kundli-report-review";

function data(extra: Record<string, string> = {}) {
  const form = new FormData();
  form.set("orderId", "order");
  form.set("documentId", "report");
  for (const [key, value] of Object.entries(extra)) form.set(key, value);
  return form;
}

function transactionFixture(report: Record<string, unknown> | null = { id: "report", fileUrl: null, storageKey: "kundli-reports/tenant/order/v1/opaque.pdf", mimeType: "application/pdf" }) {
  return {
    kundliOrder: {
      findFirst: vi.fn(async () => ({ id: "order", orderNo: "K-1", status: "REPORT_READY" })),
      update: vi.fn(async (args) => args.data)
    },
    operationalDocument: {
      findFirst: vi.fn(async () => report),
      updateMany: vi.fn(async () => ({ count: 1 })),
      update: vi.fn(async (args) => args.data)
    },
    documentActivity: { create: vi.fn(async (args) => args.data), createMany: vi.fn(async () => ({ count: 2 })) },
    kundliStatusHistory: { create: vi.fn(async (args) => args.data) },
    assignment: { updateMany: vi.fn(async () => ({ count: 1 })) },
    auditLog: { create: vi.fn(async (args) => args.data), createMany: vi.fn(async () => ({ count: 2 })) }
  };
}

describe("Kundli report review actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin", name: "Operations Admin", email: "ops@example.com" });
  });

  it("allows only an authorized operations admin to deliver", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("unauthorized"));
    await expect(deliverKundliReportAction(data())).rejects.toThrow("unauthorized");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires an internal report belonging to the same Kundli order", async () => {
    const tx = transactionFixture(null);
    mocks.transaction.mockImplementation(async (work) => work(tx));
    await expect(deliverKundliReportAction(data())).rejects.toThrow(/belonging to this order is required/);
    expect(tx.operationalDocument.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "report", ownerId: "order", visibility: "INTERNAL_ONLY" }) }));
    expect(tx.kundliOrder.update).not.toHaveBeenCalled();
  });

  it("delivers only the approved report, closes capacity, and writes customer timeline and audit records", async () => {
    const tx = transactionFixture();
    mocks.transaction.mockImplementation(async (work) => work(tx));
    await deliverKundliReportAction(data({ deliveryNote: "Your report is ready." }));
    expect(tx.operationalDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ownerId: "order", documentType: "KUNDLI_REPORT", id: { not: "report" } }), data: { visibility: "INTERNAL_ONLY" } }));
    expect(tx.operationalDocument.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "report" }, data: expect.objectContaining({ visibility: "CUSTOMER_VISIBLE", status: "APPROVED" }) }));
    expect(tx.kundliOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DELIVERED", reportStatus: "DELIVERED" }) }));
    expect(tx.assignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ endedAt: expect.any(Date), status: "COMPLETED" }) }));
    expect(tx.kundliStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toStatus: "DELIVERED", customerVisible: true, note: expect.stringContaining("Your report is ready.") }) }));
    expect(tx.auditLog.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.arrayContaining([
      expect.objectContaining({ action: "kundli_report_approved", entityId: "report" }),
      expect.objectContaining({ action: "kundli_report_delivered", metadata: expect.objectContaining({ documentId: "report" }) })
    ]) }));
  });

  it("returns work to IN_REVIEW without ending or releasing the active assignment", async () => {
    const tx = transactionFixture();
    mocks.transaction.mockImplementation(async (work) => work(tx));
    await returnKundliReportForCorrectionAction(data({ reason: "Correct the chart calculation." }));
    expect(tx.kundliOrder.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "IN_REVIEW", reportStatus: "IN_PROGRESS" }) }));
    expect(tx.assignment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "IN_PROGRESS", internalNote: expect.stringContaining("Correct the chart calculation.") }) }));
    const correctionCall = tx.assignment.updateMany.mock.calls.at(0) as unknown as [{ data: Record<string, unknown> }];
    expect(correctionCall[0].data).not.toHaveProperty("endedAt");
    expect(tx.operationalDocument.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "REUPLOAD_REQUIRED", visibility: "INTERNAL_ONLY" }) }));
    expect(tx.kundliStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ toStatus: "IN_REVIEW", customerVisible: false }) }));
  });
});
