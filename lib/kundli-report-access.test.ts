import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KundliReportStorage } from "./kundli-report-storage";

const mocks = vi.hoisted(() => ({
  reportFind: vi.fn(),
  orderFind: vi.fn(),
  assignmentFind: vi.fn(),
  auditCreate: vi.fn()
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    operationalDocument: { findFirst: mocks.reportFind },
    kundliOrder: { findFirst: mocks.orderFind },
    assignment: { findFirst: mocks.assignmentFind },
    auditLog: { create: mocks.auditCreate }
  }
}));

import {
  createCustomerKundliReportDownload,
  createGurujiKundliReportDownload
} from "./kundli-report-access";

const storage: KundliReportStorage = {
  putObject: vi.fn(),
  getMetadata: vi.fn(async () => ({ contentType: "application/pdf", size: 12 })),
  createReadUrl: vi.fn(async () => "https://storage.test/temporary-signature"),
  deleteObject: vi.fn()
};

const report = {
  id: "report-v2",
  tenantId: "tenant",
  ownerId: "order",
  storageKey: "kundli-reports/tenant/order/v2/opaque.pdf",
  fileName: "report.pdf",
  fileSize: 12
};

describe("Kundli report download authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auditCreate.mockResolvedValue({});
  });

  it("issues a ten-minute URL only to the owning customer for the current approved report", async () => {
    mocks.reportFind.mockResolvedValueOnce(report).mockResolvedValueOnce({ id: report.id });
    mocks.orderFind.mockResolvedValue({ id: "order" });
    await expect(createCustomerKundliReportDownload({ documentId: report.id, userId: "owner" }, storage)).resolves.toContain("temporary-signature");
    expect(storage.createReadUrl).toHaveBeenCalledWith(expect.objectContaining({ expiresInSeconds: 600 }));
    expect(mocks.orderFind).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "owner", status: { in: ["DELIVERED", "COMPLETED"] }, reportStatus: "DELIVERED" }) }));
    expect(mocks.auditCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "kundli_report_customer_download_authorized", metadata: { orderId: "order", expiresInSeconds: 600 } }) }));
    expect(JSON.stringify(mocks.auditCreate.mock.calls)).not.toContain("temporary-signature");
    expect(JSON.stringify(mocks.auditCreate.mock.calls)).not.toContain("storageKey");
  });

  it("denies another customer, an unapproved/legacy report, and a non-current version", async () => {
    mocks.reportFind.mockResolvedValueOnce(report);
    mocks.orderFind.mockResolvedValue(null);
    await expect(createCustomerKundliReportDownload({ documentId: report.id, userId: "other" }, storage)).rejects.toThrow(/not found/i);
    mocks.reportFind.mockResolvedValueOnce(null);
    await expect(createCustomerKundliReportDownload({ documentId: "legacy", userId: "owner" }, storage)).rejects.toThrow(/not found/i);
    mocks.reportFind.mockResolvedValueOnce(report).mockResolvedValueOnce({ id: "newer-report" });
    mocks.orderFind.mockResolvedValueOnce({ id: "order" });
    await expect(createCustomerKundliReportDownload({ documentId: report.id, userId: "owner" }, storage)).rejects.toThrow(/not found/i);
  });

  it("denies a former Guruji after reassignment and allows only an active primary owner", async () => {
    mocks.reportFind.mockResolvedValue(report);
    mocks.assignmentFind.mockResolvedValueOnce(null);
    await expect(createGurujiKundliReportDownload({ documentId: report.id, gurujiId: "former" }, storage)).rejects.toThrow(/not found/i);
    mocks.assignmentFind.mockResolvedValueOnce({ id: "assignment" });
    await expect(createGurujiKundliReportDownload({ documentId: report.id, gurujiId: "current" }, storage)).resolves.toContain("temporary-signature");
    expect(mocks.assignmentFind).toHaveBeenLastCalledWith(expect.objectContaining({ where: expect.objectContaining({ assignedUserId: "current", isPrimary: true, endedAt: null }) }));
  });
});
