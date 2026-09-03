export type AppEnv = "local" | "staging" | "production";

export type RuntimeConfig = {
  appEnv: AppEnv;
  appBaseUrl: string;
  wordpressBaseUrl: string;
  databaseUrl?: string;
  sessionSecret: string;
  phase1UatMode: boolean;
  razorpayMode: "test" | "live";
  paypalMode: "sandbox" | "live";
  storageDriver: "local" | "s3" | "gcs";
  gcsProjectId?: string;
  gcsPrivateBucket?: string;
  kundliReportSignedUrlTtlSeconds: number;
  walletEnabled: boolean;
  walletMode: "mock" | "live";
};

function optionalEnv(name: string) {
  return process.env[name]?.trim();
}

function booleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback;
  }

  return value.toLowerCase() === "true";
}

function positiveIntegerEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const runtimeConfig: RuntimeConfig = {
  appEnv: (optionalEnv("APP_ENV") ?? "local") as AppEnv,
  appBaseUrl: optionalEnv("APP_BASE_URL") ?? "http://localhost:3000",
  wordpressBaseUrl: optionalEnv("WORDPRESS_BASE_URL") ?? "http://localhost:8080",
  databaseUrl: optionalEnv("DATABASE_URL"),
  sessionSecret: optionalEnv("SESSION_SECRET") ?? "phase-1-local-dev-session-secret",
  phase1UatMode: booleanEnv(optionalEnv("PHASE1_UAT_MODE"), false),
  razorpayMode: (optionalEnv("RAZORPAY_MODE") ?? "test") as RuntimeConfig["razorpayMode"],
  paypalMode: (optionalEnv("PAYPAL_MODE") ?? "sandbox") as RuntimeConfig["paypalMode"],
  storageDriver: (optionalEnv("STORAGE_DRIVER") ?? "local") as RuntimeConfig["storageDriver"],
  gcsProjectId: optionalEnv("GCS_PROJECT_ID"),
  gcsPrivateBucket: optionalEnv("GCS_PRIVATE_BUCKET"),
  kundliReportSignedUrlTtlSeconds: positiveIntegerEnv(optionalEnv("KUNDLI_REPORT_SIGNED_URL_TTL_SECONDS"), 600),
  walletEnabled: booleanEnv(optionalEnv("WALLET_ENABLED"), false),
  walletMode: (optionalEnv("WALLET_MODE") ?? "mock") as RuntimeConfig["walletMode"]
};
