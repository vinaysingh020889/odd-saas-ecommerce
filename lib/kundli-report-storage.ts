import { randomUUID } from "node:crypto";
import { Storage } from "@google-cloud/storage";
import { runtimeConfig } from "@/lib/env";

export const KUNDLI_REPORT_MIME_TYPE = "application/pdf";
export const KUNDLI_REPORT_MAX_BYTES = 10 * 1024 * 1024;
const PDF_SIGNATURE = Buffer.from("%PDF-", "ascii");

export type ValidatedKundliReport = {
  bytes: Buffer;
  fileName: string;
  mimeType: typeof KUNDLI_REPORT_MIME_TYPE;
  fileSize: number;
};

export type PrivateReportObjectMetadata = {
  contentType: string | null;
  size: number | null;
};

export interface KundliReportStorage {
  putObject(input: { key: string; body: Buffer }): Promise<void>;
  getMetadata(key: string): Promise<PrivateReportObjectMetadata>;
  createReadUrl(input: { key: string; fileName: string; expiresInSeconds: number }): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export class KundliReportValidationError extends Error {}

export function sanitizeKundliReportFileName(value: string) {
  const base = value.split(/[\\/]/).pop() ?? "kundli-report.pdf";
  const withoutExtension = base.replace(/\.pdf$/i, "");
  const safeBase = withoutExtension
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 100) || "kundli-report";
  return safeBase + ".pdf";
}

export async function validateKundliReportFile(value: FormDataEntryValue | null): Promise<ValidatedKundliReport> {
  if (!(value instanceof File)) throw new KundliReportValidationError("Select a PDF Kundli report to upload.");
  if (value.type !== KUNDLI_REPORT_MIME_TYPE) throw new KundliReportValidationError("Only PDF Kundli reports are accepted.");
  if (value.size < PDF_SIGNATURE.length) throw new KundliReportValidationError("The selected PDF is empty or invalid.");
  if (value.size > KUNDLI_REPORT_MAX_BYTES) throw new KundliReportValidationError("The Kundli report must not exceed 10 MB.");
  const bytes = Buffer.from(await value.arrayBuffer());
  if (!bytes.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
    throw new KundliReportValidationError("The selected file is not a valid PDF.");
  }
  return { bytes, fileName: sanitizeKundliReportFileName(value.name), mimeType: KUNDLI_REPORT_MIME_TYPE, fileSize: bytes.length };
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "unknown";
}

export function buildKundliReportObjectKey(input: { tenantId: string; orderId: string; version: number; objectId?: string }) {
  const objectId = safePathSegment(input.objectId ?? randomUUID());
  return `kundli-reports/${safePathSegment(input.tenantId)}/${safePathSegment(input.orderId)}/v${input.version}/${objectId}.pdf`;
}

export function kundliReportVersionFromStorageKey(key: string | null) {
  const match = key?.match(/\/v(\d+)\//);
  return match ? Number(match[1]) : null;
}

class GcsKundliReportStorage implements KundliReportStorage {
  private readonly storage: Storage;
  private readonly bucketName: string;
  private bucketSecurityCheck?: Promise<void>;

  constructor(projectId: string, bucketName: string) {
    this.storage = new Storage({ projectId });
    this.bucketName = bucketName;
  }

  private assertBucketSecurity() {
    this.bucketSecurityCheck ??= (async () => {
      const [metadata] = await this.storage.bucket(this.bucketName).getMetadata();
      const uniformAccess = metadata.iamConfiguration?.uniformBucketLevelAccess?.enabled === true;
      const publicAccessPrevention = metadata.iamConfiguration?.publicAccessPrevention === "enforced";
      if (!uniformAccess || !publicAccessPrevention) throw new Error("Kundli report storage security policy is not enforced.");
    })();
    return this.bucketSecurityCheck;
  }

  async putObject(input: { key: string; body: Buffer }) {
    await this.assertBucketSecurity();
    await this.storage.bucket(this.bucketName).file(input.key).save(input.body, {
      resumable: false,
      validation: "crc32c",
      metadata: { contentType: KUNDLI_REPORT_MIME_TYPE, cacheControl: "private, no-store" }
    });
  }

  async getMetadata(key: string) {
    await this.assertBucketSecurity();
    const [metadata] = await this.storage.bucket(this.bucketName).file(key).getMetadata();
    const size = typeof metadata.size === "string" ? Number(metadata.size) : null;
    return { contentType: metadata.contentType ?? null, size: Number.isFinite(size) ? size : null };
  }

  async createReadUrl(input: { key: string; fileName: string; expiresInSeconds: number }) {
    await this.assertBucketSecurity();
    const dispositionName = sanitizeKundliReportFileName(input.fileName).replace(/["\\]/g, "");
    const [url] = await this.storage.bucket(this.bucketName).file(input.key).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + input.expiresInSeconds * 1000,
      responseDisposition: `attachment; filename="${dispositionName}"`,
      responseType: KUNDLI_REPORT_MIME_TYPE
    });
    return url;
  }

  async deleteObject(key: string) {
    await this.assertBucketSecurity();
    await this.storage.bucket(this.bucketName).file(key).delete({ ignoreNotFound: true });
  }
}

let reportStorage: KundliReportStorage | null = null;

export function getKundliReportStorage(): KundliReportStorage {
  if (reportStorage) return reportStorage;
  if (runtimeConfig.storageDriver !== "gcs" || !runtimeConfig.gcsProjectId || !runtimeConfig.gcsPrivateBucket) {
    throw new Error("Private Kundli report storage is unavailable.");
  }
  reportStorage = new GcsKundliReportStorage(runtimeConfig.gcsProjectId, runtimeConfig.gcsPrivateBucket);
  return reportStorage;
}

export function setKundliReportStorageForTests(storage: KundliReportStorage | null) {
  if (process.env.NODE_ENV !== "test") throw new Error("Storage overrides are test-only.");
  reportStorage = storage;
}
