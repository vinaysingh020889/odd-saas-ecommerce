import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildKundliReportObjectKey,
  getKundliReportStorage,
  validateKundliReportFile
} from "./kundli-report-storage";

const runSyntheticGcsUat = process.env.RUN_GCS_KUNDLI_UAT === "true";
const describeGcsUat = runSyntheticGcsUat ? describe : describe.skip;

describeGcsUat("KND-IMP-03 keyless GCS synthetic UAT", () => {
  it(
    "uploads, reads metadata, signs, downloads, expires, and deletes a synthetic PDF",
    async () => {
      expect(process.env.NODE_ENV).toBe("test");
      expect(process.env.STORAGE_DRIVER).toBe("gcs");
      expect(process.env.GCS_PROJECT_ID).toBe("teoram-5944f");
      expect(process.env.GCS_PRIVATE_BUCKET).toBe("teoram-5944f-omd-kundli-reports-uat");

      const syntheticPdf = Buffer.from(
        "%PDF-1.7\n% OMD KND-IMP-03 synthetic UAT only\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n",
        "ascii"
      );
      const validated = await validateKundliReportFile(
        new File([syntheticPdf], "synthetic-kundli-uat.pdf", { type: "application/pdf" })
      );
      const objectKey = buildKundliReportObjectKey({
        tenantId: "synthetic-uat-tenant",
        orderId: "synthetic-uat-order",
        version: 1,
        objectId: randomUUID()
      });
      const storage = getKundliReportStorage();
      let deleted = false;

      try {
        await storage.putObject({ key: objectKey, body: validated.bytes });

        const metadata = await storage.getMetadata(objectKey);
        expect(metadata).toEqual({
          contentType: "application/pdf",
          size: syntheticPdf.length
        });

        const signedUrl = await storage.createReadUrl({
          key: objectKey,
          fileName: validated.fileName,
          expiresInSeconds: 8
        });
        const parsedUrl = new URL(signedUrl);
        expect(parsedUrl.protocol).toBe("https:");
        expect(parsedUrl.hostname).toBe("storage.googleapis.com");
        expect(parsedUrl.searchParams.get("X-Goog-Expires") ?? parsedUrl.searchParams.get("x-goog-expires")).toBe("8");

        const liveResponse = await fetch(signedUrl, { redirect: "manual" });
        expect(liveResponse.status).toBe(200);
        expect(Buffer.from(await liveResponse.arrayBuffer())).toEqual(syntheticPdf);
        expect(liveResponse.headers.get("content-type")).toContain("application/pdf");
        expect(liveResponse.headers.get("content-disposition")).toContain("synthetic-kundli-uat.pdf");

        await new Promise((resolve) => setTimeout(resolve, 12_000));
        const expiredResponse = await fetch(signedUrl, { redirect: "manual" });
        expect([400, 403]).toContain(expiredResponse.status);

        await storage.deleteObject(objectKey);
        deleted = true;
        await expect(storage.getMetadata(objectKey)).rejects.toMatchObject({ code: 404 });
      } finally {
        if (!deleted) await storage.deleteObject(objectKey);
      }
    },
    45_000
  );
});
