import { describe, expect, it } from "vitest";
import { filterReleasedKundliCustomerDocuments } from "./kundli-customer-report";

describe("customer Kundli report visibility", () => {
  const internalReport = { id: "internal", documentType: "KUNDLI_REPORT", status: "UPLOADED", visibility: "INTERNAL_ONLY", fileUrl: null, storageKey: "kundli-reports/t/o/v1/a.pdf", mimeType: "application/pdf" };
  const approvedReport = { id: "approved", documentType: "KUNDLI_REPORT", status: "APPROVED", visibility: "CUSTOMER_VISIBLE", fileUrl: null, storageKey: "kundli-reports/t/o/v2/b.pdf", mimeType: "application/pdf", description: "Internal Guruji note", rejectionReason: "Internal correction" };
  const legacyReport = { id: "legacy", documentType: "KUNDLI_REPORT", status: "APPROVED", visibility: "CUSTOMER_VISIBLE", fileUrl: "https://example.test/report.pdf", storageKey: null, mimeType: "application/pdf" };
  const supporting = { id: "support", documentType: "SUPPORTING_DOCUMENT", status: "APPROVED", visibility: "CUSTOMER_VISIBLE", fileUrl: null, storageKey: null, mimeType: null };

  it("keeps Guruji reports invisible before admin delivery", () => {
    expect(filterReleasedKundliCustomerDocuments("REPORT_READY", [internalReport, approvedReport, legacyReport, supporting])).toEqual([supporting]);
  });

  it("shows only an approved report after delivery", () => {
    const visible = filterReleasedKundliCustomerDocuments("DELIVERED", [internalReport, approvedReport, legacyReport, supporting]);
    expect(visible.map((item) => item.id)).toEqual(["approved", "support"]);
    expect(visible[0]).toMatchObject({ description: null, rejectionReason: null, storageKey: null, fileUrl: null, downloadHref: "/kundli/reports/approved/download" });
  });
});
