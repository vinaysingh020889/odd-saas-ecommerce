export const TAG_TYPES = [
  "FESTIVAL",
  "PUJA",
  "RITUAL",
  "DEITY",
  "TEMPLE",
  "PLACE",
  "TITHI",
  "OCCASION",
  "PRODUCT_USE",
  "SERVICE_TYPE",
  "BENEFIT_INTENT",
  "CONTENT_TOPIC",
  "MATERIAL_ATTRIBUTE"
] as const;

export const TAG_TARGET_TYPES = [
  "PRODUCT",
  "PRODUCT_VARIANT",
  "CATEGORY",
  "SERVICE",
  "ASTHI_PACKAGE",
  "ASTHI_LOCATION",
  "KUNDLI_PACKAGE",
  "MEMBERSHIP_PLAN",
  "FESTIVAL_CAMPAIGN",
  "PROMOTION_PLACEMENT"
] as const;

export function slugifyTag(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function tagTypeLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function parseAliasLines(value: string) {
  return [...new Set(value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))];
}
