export type AppEnv = "local" | "staging" | "production";

export type RuntimeConfig = {
  appEnv: AppEnv;
  appBaseUrl: string;
  wordpressBaseUrl: string;
  databaseUrl?: string;
  sessionSecret: string;
  razorpayMode: "test" | "live";
  paypalMode: "sandbox" | "live";
  storageDriver: "local" | "s3" | "gcs";
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

export const runtimeConfig: RuntimeConfig = {
  appEnv: (optionalEnv("APP_ENV") ?? "local") as AppEnv,
  appBaseUrl: optionalEnv("APP_BASE_URL") ?? "http://localhost:3000",
  wordpressBaseUrl: optionalEnv("WORDPRESS_BASE_URL") ?? "http://localhost:8080",
  databaseUrl: optionalEnv("DATABASE_URL"),
  sessionSecret: optionalEnv("SESSION_SECRET") ?? "phase-1-local-dev-session-secret",
  razorpayMode: (optionalEnv("RAZORPAY_MODE") ?? "test") as RuntimeConfig["razorpayMode"],
  paypalMode: (optionalEnv("PAYPAL_MODE") ?? "sandbox") as RuntimeConfig["paypalMode"],
  storageDriver: (optionalEnv("STORAGE_DRIVER") ?? "local") as RuntimeConfig["storageDriver"],
  walletEnabled: booleanEnv(optionalEnv("WALLET_ENABLED"), false),
  walletMode: (optionalEnv("WALLET_MODE") ?? "mock") as RuntimeConfig["walletMode"]
};
