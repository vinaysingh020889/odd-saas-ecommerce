import type { RuntimeConfig } from "./env";

export type Phase1LaunchTarget = "local-uat" | "hosted-uat" | "production";
export type ReadinessSeverity = "pass" | "warning" | "blocker";

export type ReadinessCheck = {
  code: string;
  severity: ReadinessSeverity;
  message: string;
};

const LOCAL_SESSION_FALLBACK = "phase-1-local-dev-session-secret";

function validUrl(value: string, requireHttps: boolean) {
  try {
    const url = new URL(value);
    return requireHttps ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function check(code: string, condition: boolean, passMessage: string, failureMessage: string, severity: Exclude<ReadinessSeverity, "pass">): ReadinessCheck {
  return condition
    ? { code, severity: "pass", message: passMessage }
    : { code, severity, message: failureMessage };
}

export function assessPhase1LaunchReadiness(config: RuntimeConfig, target: Phase1LaunchTarget) {
  const hosted = target !== "local-uat";
  const production = target === "production";
  const strongSessionSecret = config.sessionSecret.length >= 32
    && config.sessionSecret !== LOCAL_SESSION_FALLBACK
    && !config.sessionSecret.toLowerCase().includes("replace-with");
  const gcsReady = config.storageDriver === "gcs" && Boolean(config.gcsProjectId && config.gcsPrivateBucket);
  const releaseMetadataReady = Boolean(config.releaseId && config.releaseSha && /^[0-9a-f]{7,40}$/i.test(config.releaseSha));

  const checks: ReadinessCheck[] = [
    check("phase1-scope", config.phase1UatMode, "Phase-1 surface lock is enabled.", "PHASE1_UAT_MODE must remain enabled for this release line.", "blocker"),
    check("database", Boolean(config.databaseUrl), "Database connection is configured.", "DATABASE_URL is required.", "blocker"),
    check(
      "session-secret",
      hosted ? strongSessionSecret : Boolean(config.sessionSecret),
      hosted ? "A non-placeholder session secret of at least 32 characters is configured." : "A local session secret is available.",
      hosted ? "Hosted environments require a non-placeholder SESSION_SECRET of at least 32 characters." : "A session secret is required.",
      hosted ? "blocker" : "warning"
    ),
    check(
      "app-url",
      validUrl(config.appBaseUrl, hosted),
      hosted ? "The application base URL uses HTTPS." : "The local application URL is valid.",
      hosted ? "Hosted APP_BASE_URL must be a valid HTTPS URL." : "APP_BASE_URL must be a valid HTTP(S) URL.",
      "blocker"
    ),
    check(
      "private-storage",
      hosted ? gcsReady : true,
      hosted ? "Private GCS storage configuration is present." : "Private storage is validated separately for synthetic local UAT.",
      "Hosted UAT requires STORAGE_DRIVER=gcs with project and private bucket configuration.",
      "blocker"
    ),
    check(
      "release-metadata",
      hosted ? releaseMetadataReady : true,
      hosted ? "Release ID and Git SHA are configured." : "Release metadata is required only for hosted candidates.",
      "Hosted UAT requires RELEASE_ID and a valid RELEASE_SHA.",
      "blocker"
    ),
    check(
      "asthi-handoff",
      Boolean(config.asthiApplicationUrl),
      "The client Asthi application handoff is configured.",
      production ? "Production requires the approved Asthi application URL." : "Asthi application URL remains a client-owned input; the UI shows a safe pending state.",
      production ? "blocker" : "warning"
    ),
    check(
      "payment-mode",
      !production,
      "Mock/manual payment mode is explicitly limited to synthetic UAT.",
      "Production cannot be certified while the repository uses the mock payment lifecycle.",
      "blocker"
    ),
    check("wallet-boundary", !config.walletEnabled, "Wallet is disabled for Phase-1.", "Wallet must remain disabled unless separately certified.", "blocker")
  ];

  return {
    target,
    eligible: checks.every((item) => item.severity !== "blocker"),
    checks,
    counts: {
      pass: checks.filter((item) => item.severity === "pass").length,
      warning: checks.filter((item) => item.severity === "warning").length,
      blocker: checks.filter((item) => item.severity === "blocker").length
    }
  };
}
