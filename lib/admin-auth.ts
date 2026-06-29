import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

const ADMIN_ROLES = new Set([
  "SUPER_ADMIN",
  "OPERATIONS_ADMIN",
  "SUPPORT_AGENT",
  "PRODUCT_MANAGER",
  "VENDOR",
  "RURAL_SUBADMIN",
  "PANDIT",
  "ASTROLOGER",
  "OPERATOR"
]);

const FULL_ADMIN_ROLES = new Set(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
const CATALOG_ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"];
const SUPPORT_ADMIN_ROLES = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"];

export async function requireAdminUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!user.roles.some((role) => ADMIN_ROLES.has(role))) {
    redirect("/dashboard");
  }

  return user;
}

export function isAdminRole(role: string) {
  return ADMIN_ROLES.has(role);
}

export function isFullAdminRole(role: string) {
  return FULL_ADMIN_ROLES.has(role);
}

export function hasAnyRole(user: { roles: string[] }, roles: Iterable<string>) {
  const allowed = new Set(roles);
  return user.roles.some((role) => allowed.has(role));
}

export async function requireFullAdminUser() {
  const user = await requireAdminUser();

  if (!user.roles.some((role) => FULL_ADMIN_ROLES.has(role))) {
    redirect("/admin/my-work");
  }

  return user;
}

export async function requireAdminRole(roles: string[]) {
  const user = await requireAdminUser();

  if (!hasAnyRole(user, roles)) {
    redirect("/admin/my-work");
  }

  return user;
}

export async function requireCatalogAdminUser() {
  return requireAdminRole(CATALOG_ADMIN_ROLES);
}

export async function requireOperationsAdminUser() {
  return requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
}

export async function requireSupportAdminUser() {
  return requireAdminRole(SUPPORT_ADMIN_ROLES);
}
