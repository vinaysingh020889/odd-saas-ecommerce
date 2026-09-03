import { describe, expect, it } from "vitest";
import {
  buildKundliReportObjectKey,
  KUNDLI_REPORT_MAX_BYTES,
  sanitizeKundliReportFileName,
  validateKundliReportFile
} from "./kundli-report-storage";

describe("private Kundli report file boundary", () => {
  it("accepts a declared PDF with a PDF file signature and sanitizes its name", async () => {
    const file = new File([Buffer.from("%PDF-1.7\nreport")], "../../Birth Report (final).PDF", { type: "application/pdf" });
    await expect(validateKundliReportFile(file)).resolves.toMatchObject({
      fileName: "Birth-Report-final.pdf",
      mimeType: "application/pdf",
      fileSize: 15
    });
  });

  it("rejects a spoofed MIME type, invalid signature, and files over 10 MB", async () => {
    await expect(validateKundliReportFile(new File(["%PDF-1.7"], "report.pdf", { type: "text/plain" }))).rejects.toThrow(/Only PDF/);
    await expect(validateKundliReportFile(new File(["not-a-pdf"], "report.pdf", { type: "application/pdf" }))).rejects.toThrow(/not a valid PDF/);
    const oversized = new File([Buffer.alloc(KUNDLI_REPORT_MAX_BYTES + 1)], "report.pdf", { type: "application/pdf" });
    await expect(validateKundliReportFile(oversized)).rejects.toThrow(/10 MB/);
  });

  it("uses opaque server-generated, tenant/order/version-scoped object keys", () => {
    const key = buildKundliReportObjectKey({ tenantId: "tenant/one", orderId: "order:one", version: 2, objectId: "opaque-id" });
    expect(key).toBe("kundli-reports/tenant_one/order_one/v2/opaque-id.pdf");
    expect(key).not.toContain("Birth Report");
    expect(sanitizeKundliReportFileName("..\\secret/name?.pdf")).toBe("name.pdf");
  });
});
