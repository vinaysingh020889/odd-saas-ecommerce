import { runtimeConfig } from "./env";

export function normalizePublicHttpUrl(value: string | undefined | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getAsthiApplicationHandoff(config: Pick<typeof runtimeConfig, "phase1UatMode" | "asthiApplicationUrl"> = runtimeConfig) {
  const configuredUrl = normalizePublicHttpUrl(config.asthiApplicationUrl);
  if (configuredUrl) return configuredUrl;
  return config.phase1UatMode ? null : "/asthi/apply";
}

export function isPhase1PublicHandoffHref(href: string | null | undefined) {
  if (!href) return false;
  const path = href.split("?")[0].split("#")[0];
  return path === "/shop"
    || path.startsWith("/product/")
    || path.startsWith("/festivals/")
    || path === "/membership"
    || path.startsWith("/membership/")
    || path === "/kundli"
    || path.startsWith("/kundli/")
    || path === "/services/asthi-visarjan";
}
