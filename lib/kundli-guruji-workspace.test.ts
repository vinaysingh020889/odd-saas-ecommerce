import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: "guru-one", name: "Guruji One", email: "one@example.com", roles: ["ASTROLOGER"] },
  requireAdminRole: vi.fn(),
  queue: vi.fn(),
  capacity: vi.fn(),
  profileFind: vi.fn(),
  orderFindMany: vi.fn(),
  reportFindMany: vi.fn(),
  assignmentFind: vi.fn(),
  transaction: vi.fn(),
  auditCreate: vi.fn(),
  storagePut: vi.fn(),
  storageDelete: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminRole: mocks.requireAdminRole }));
vi.mock("@/lib/catalog", () => ({ getOmdTenantId: vi.fn(async () => "tenant") }));
vi.mock("@/lib/kundli-assignment-engine", async (original) => ({
  ...(await original()),
  getKundliPractitionerQueue: mocks.queue,
  getKundliPractitionerCapacitySnapshot: mocks.capacity
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    kundliPractitionerProfile: { findFirst: mocks.profileFind },
    kundliOrder: { findMany: mocks.orderFindMany, findFirst: vi.fn() },
    operationalDocument: { findMany: mocks.reportFindMany },
    assignment: { findFirst: mocks.assignmentFind },
    checklistInstance: { findFirst: vi.fn() },
    auditLog: { create: mocks.auditCreate },
    $transaction: mocks.transaction
  }
}));
vi.mock("@/lib/kundli-report-storage", async (original) => ({
  ...(await original()),
  getKundliReportStorage: () => ({ putObject: mocks.storagePut, deleteObject: mocks.storageDelete })
}));

import {
  activePrimaryGurujiAssignmentWhere,
  addGurujiKundliReportAction,
  getGurujiKundliWorkDetail,
  getGurujiKundliWorkspace,
  updateGurujiKundliWorkAction
} from "./kundli-guruji-workspace";

function form(command: string, orderId = "order-one") {
  const data = new FormData();
  data.set("orderId", orderId);
  data.set("command", command);
  return data;
}

function reportForm(file: File) {
  const data = new FormData();
  data.set("orderId", "order-one");
  data.set("title", "Prepared report");
  data.set("reportFile", file);
  return data;
}

describe("Guruji Kundli workspace security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminRole.mockResolvedValue(mocks.user);
    mocks.capacity.mockResolvedValue({ active: 2, daily: 2, weekly: 2, monthly: 2 });
    mocks.profileFind.mockResolvedValue({
      id: "profile-one", userId: "guru-one", displayName: "Guruji One", acceptingWork: true, timezone: "UTC",
      dailyActiveOrderLimit: 5, weeklyActiveOrderLimit: 20, monthlyActiveOrderLimit: 60, unavailability: []
    });
    mocks.reportFindMany.mockResolvedValue([]);
    mocks.auditCreate.mockResolvedValue({});
  });

  it("scopes ownership to the exact current active primary assigned user", () => {
    expect(activePrimaryGurujiAssignmentWhere({ tenantId: "tenant", userId: "guru-one", orderId: "order-one" })).toMatchObject({
      tenantId: "tenant", workType: "KUNDLI_ORDER", workId: "order-one", assignedUserId: "guru-one", assignedRole: "ASTROLOGER", isPrimary: true, endedAt: null
    });
    expect(activePrimaryGurujiAssignmentWhere({ tenantId: "tenant", userId: "guru-two", orderId: "order-one" })).toMatchObject({ assignedUserId: "guru-two" });
  });

  it("prevents a second Guruji or an ended/superseded owner from updating another order", async () => {
    const tx = { assignment: { findFirst: vi.fn(async () => null) } };
    mocks.transaction.mockImplementation(async (work) => work(tx));
    await expect(updateGurujiKundliWorkAction(form("START", "order-owned-by-other"))).rejects.toThrow(/current active primary/);
    expect(tx.assignment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ assignedUserId: "guru-one", isPrimary: true, endedAt: null }) }));
  });

  it("prevents one Guruji from reading another Guruji's order", async () => {
    mocks.assignmentFind.mockResolvedValue(null);
    await expect(getGurujiKundliWorkDetail("order-owned-by-other")).rejects.toThrow("NOT_FOUND");
    expect(mocks.assignmentFind).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ workId: "order-owned-by-other", assignedUserId: "guru-one", isPrimary: true, endedAt: null }) }));
  });

  it("rejects DELIVERED and COMPLETED commands before any write", async () => {
    await expect(updateGurujiKundliWorkAction(form("DELIVERED"))).rejects.toThrow(/cannot set this Kundli status/);
    await expect(updateGurujiKundliWorkAction(form("COMPLETED"))).rejects.toThrow(/cannot set this Kundli status/);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("requires an attached internal report before report ready", async () => {
    const tx = {
      assignment: { findFirst: vi.fn(async () => ({ id: "assignment", status: "IN_PROGRESS", internalNote: null })) },
      kundliOrder: { findUniqueOrThrow: vi.fn(async () => ({ id: "order-one", status: "IN_REVIEW", reportStatus: "IN_PROGRESS" })) },
      operationalDocument: { findFirst: vi.fn(async () => null) }
    };
    mocks.transaction.mockImplementation(async (work) => work(tx));
    await expect(updateGurujiKundliWorkAction(form("REPORT_READY"))).rejects.toThrow(/attached internal Kundli report is required/);
  });

  it("uploads an opaque private PDF version and supersedes the prior current upload", async () => {
    const tx = {
      assignment: { findFirst: vi.fn(async () => ({ id: "assignment", status: "IN_PROGRESS", internalNote: null })) },
      kundliOrder: {
        findUniqueOrThrow: vi.fn(async () => ({ id: "order-one", status: "IN_REVIEW", reportStatus: "IN_PROGRESS" })),
        update: vi.fn(async () => ({}))
      },
      operationalDocument: {
        count: vi.fn(async () => 1),
        findMany: vi.fn(async () => [{ id: "report-v1" }]),
        updateMany: vi.fn(async () => ({ count: 1 })),
        create: vi.fn(async (args) => ({ id: "report-v2", ...args.data }))
      },
      documentActivity: { create: vi.fn(async () => ({})), createMany: vi.fn(async () => ({ count: 1 })) },
      kundliStatusHistory: { create: vi.fn(async () => ({})) },
      auditLog: { create: vi.fn(async () => ({})) }
    };
    mocks.transaction.mockImplementation(async (work) => work(tx));
    mocks.storagePut.mockResolvedValue(undefined);
    const file = new File([Buffer.from("%PDF-1.7\nsecure")], "../kundli final.pdf", { type: "application/pdf" });
    await addGurujiKundliReportAction(reportForm(file));
    expect(mocks.storagePut).toHaveBeenCalledWith(expect.objectContaining({ key: expect.stringMatching(/^kundli-reports\/tenant\/order-one\/v2\/[a-zA-Z0-9_-]+\.pdf$/) }));
    expect(tx.operationalDocument.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fileName: "kundli-final.pdf", fileUrl: null, mimeType: "application/pdf", visibility: "INTERNAL_ONLY", status: "UPLOADED" }) }));
    expect(tx.operationalDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: "SUPERSEDED", visibility: "INTERNAL_ONLY" } }));
    expect(tx.documentActivity.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "GURUJI_REPORT_REPLACEMENT_UPLOADED" }) }));
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "guruji_kundli_report_replacement_uploaded", metadata: expect.objectContaining({ version: 2 }) }) }));
  });

  it("rejects spoofed PDFs before storage and re-checks active ownership before persistence", async () => {
    const spoofed = new File(["not-pdf"], "report.pdf", { type: "application/pdf" });
    await expect(addGurujiKundliReportAction(reportForm(spoofed))).rejects.toThrow(/not a valid PDF/);
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("preserves engine queue order and derives due-risk counts from those assignments", async () => {
    mocks.queue.mockResolvedValue([
      { id: "urgent", workId: "overdue", createdAt: new Date("2026-07-19T00:00:00Z"), priority: "URGENT" },
      { id: "normal", workId: "due-soon", createdAt: new Date("2026-07-20T00:00:00Z"), priority: "NORMAL" }
    ]);
    mocks.orderFindMany.mockResolvedValue([
      { id: "due-soon", orderNo: "K-2", applicantName: "Two", languagePreference: "Hindi", status: "IN_REVIEW", promisedDeliveryAt: new Date(Date.now() + 60 * 60 * 1000), package: { name: "P2" } },
      { id: "overdue", orderNo: "K-1", applicantName: "One", languagePreference: "English", status: "ASSIGNED", promisedDeliveryAt: new Date(Date.now() - 60 * 1000), package: { name: "P1" } }
    ]);
    const workspace = await getGurujiKundliWorkspace();
    expect(workspace.queue.map((item) => item.order.id)).toEqual(["overdue", "due-soon"]);
    expect(workspace.counts).toMatchObject({ assigned: 1, inReview: 1, dueSoon: 1, overdue: 1 });
  });
});
