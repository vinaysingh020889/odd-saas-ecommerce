import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { RuntimeConfig } from "./env";
import { assessPhase1LaunchReadiness } from "./launch-readiness";

function config(overrides: Partial<RuntimeConfig> = {}): RuntimeConfig {
  return {
    appEnv: "local",
    appBaseUrl: "http://localhost:3000",
    wordpressBaseUrl: "http://localhost:8080",
    databaseUrl: "postgresql://synthetic.invalid/uat",
    sessionSecret: "phase-1-local-dev-session-secret",
    phase1UatMode: true,
    razorpayMode: "test",
    paypalMode: "sandbox",
    storageDriver: "local",
    kundliReportSignedUrlTtlSeconds: 600,
    walletEnabled: false,
    walletMode: "mock",
    ...overrides
  };
}

describe("Gate 6 launch readiness certification", () => {
  it("accepts the controlled local synthetic UAT boundary", () => {
    const report = assessPhase1LaunchReadiness(config(), "local-uat");
    expect(report.eligible).toBe(true);
    expect(report.counts.blocker).toBe(0);
    expect(report.checks.find((item) => item.code === "asthi-handoff")?.severity).toBe("warning");
  });

  it("accepts hosted synthetic UAT only with HTTPS, strong sessions, and private GCS configuration", () => {
    const report = assessPhase1LaunchReadiness(config({
      appEnv: "staging",
      appBaseUrl: "https://uat.example.invalid",
      sessionSecret: "synthetic-strong-session-secret-1234567890",
      storageDriver: "gcs",
      gcsProjectId: "synthetic-uat-project",
      gcsPrivateBucket: "synthetic-private-bucket",
      releaseId: "phase1-uat-rc3",
      releaseSha: "1234567abcdef"
    }), "hosted-uat");
    expect(report.eligible).toBe(true);
    expect(report.counts.blocker).toBe(0);
  });

  it("blocks hosted UAT with weak session, HTTP URL, or missing private storage", () => {
    const report = assessPhase1LaunchReadiness(config({ appEnv: "staging" }), "hosted-uat");
    expect(report.eligible).toBe(false);
    expect(report.checks.filter((item) => item.severity === "blocker").map((item) => item.code)).toEqual(
      expect.arrayContaining(["session-secret", "app-url", "private-storage", "release-metadata"])
    );
  });

  it("refuses production certification while payments are mock and the Asthi URL is absent", () => {
    const report = assessPhase1LaunchReadiness(config({
      appEnv: "production",
      appBaseUrl: "https://app.example.invalid",
      sessionSecret: "synthetic-strong-session-secret-1234567890",
      storageDriver: "gcs",
      gcsProjectId: "synthetic-production-project",
      gcsPrivateBucket: "synthetic-production-bucket",
      releaseId: "production",
      releaseSha: "1234567abcdef"
    }), "production");
    expect(report.eligible).toBe(false);
    expect(report.checks.filter((item) => item.severity === "blocker").map((item) => item.code)).toEqual(
      expect.arrayContaining(["asthi-handoff", "payment-mode"])
    );
  });

  it("publishes a non-sensitive database-backed health endpoint", () => {
    const route = readFileSync(new URL("../app/api/health/route.ts", import.meta.url), "utf8");
    expect(route).toContain("SELECT 1");
    expect(route).toContain('"Cache-Control": "no-store"');
    expect(route).not.toContain("databaseUrl");
    expect(route).not.toContain("sessionSecret");
    expect(route).toContain("runtimeConfig.releaseId");
    expect(route).toContain("runtimeConfig.releaseSha");
  });

  it("prevents known-password synthetic seeds from reaching production or unapproved hosted UAT", () => {
    const seed = readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8");
    expect(seed).toContain('seedAppEnv === "production"');
    expect(seed).toContain('process.env.ALLOW_SYNTHETIC_SEED !== "true"');
    expect(seed).toContain("SYNTHETIC_UAT_PASSWORD");
    expect(seed).toContain("seededPassword(demoUser.password)");
  });

  it("provides a reproducible local certification command and rollback runbook", () => {
    const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const certification = readFileSync(new URL("../scripts/phase1-local-certify.mjs", import.meta.url), "utf8");
    const runbook = readFileSync(new URL("../docs/OMDivyaDarshan_Phase1_UAT_Operations_Rollback_Runbook.md", import.meta.url), "utf8");
    expect(packageJson).toContain('"phase1:certify": "node scripts/phase1-local-certify.mjs"');
    expect(certification).toContain("RUN_MEMBERSHIP_UAT");
    expect(certification).toContain("RUN_FESTIVAL_COMMERCE_UAT");
    expect(certification).toContain("RUN_PHASE1_ROLE_UAT");
    expect(runbook).toContain("Database rollback");
    expect(runbook).toContain("Gate 6.5 release-candidate freeze");
  });
});
