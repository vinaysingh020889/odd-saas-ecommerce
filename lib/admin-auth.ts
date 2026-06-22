import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"]);

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
