"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearAuthSession, setAuthSession } from "@/lib/auth/session";
import { mergeGuestCartToUser } from "@/lib/cart";
import { mergeAnonymousEventsToUserOnLogin } from "@/lib/customer-events";

export type AuthActionState = {
  error?: string;
  values?: { name?: string; email?: string };
  submissionId?: string;
};

function rejectedAuthState(error: string, values: { name?: string; email?: string }): AuthActionState {
  return { error, values, submissionId: Date.now().toString(36) };
}

async function settleLoginSideEffects(userId: string) {
  const work = Promise.allSettled([mergeGuestCartToUser(userId), mergeAnonymousEventsToUserOnLogin(userId)]);
  const timeout = new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 2500));
  const result = await Promise.race([work, timeout]);
  if (result === "timeout") console.warn(JSON.stringify({ level: "warning", event: "auth_side_effects_deferred", userId }));
}

function readField(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function safeRedirectPath(formData: FormData) {
  const redirectTo = readField(formData, "redirectTo");
  return redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/dashboard";
}

function validatePassword(password: string) {
  return password.length >= 8;
}

async function getOmdTenant() {
  return prisma.tenant.findUnique({
    where: { slug: "omdivyadarshan" }
  });
}

async function getCustomerRole(tenantId: string) {
  return prisma.role.findUnique({
    where: {
      tenantId_key: {
        tenantId,
        key: "CUSTOMER"
      }
    }
  });
}

export async function signupAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const name = readField(formData, "name");
  const email = readField(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !email || !password) {
    return rejectedAuthState("Name, email, and password are required.", { name, email });
  }

  if (!email.includes("@")) {
    return rejectedAuthState("Enter a valid email address.", { name, email });
  }

  if (!validatePassword(password)) {
    return rejectedAuthState("Password must be at least 8 characters.", { name, email });
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return rejectedAuthState("An account with this email already exists.", { name, email });
  }

  const tenant = await getOmdTenant();

  if (!tenant) {
    return rejectedAuthState("Tenant is not seeded yet. Run npm run prisma:seed.", { name, email });
  }

  const customerRole = await getCustomerRole(tenant.id);

  if (!customerRole) {
    return rejectedAuthState("Customer role is not seeded yet. Run npm run prisma:seed.", { name, email });
  }

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name,
      email,
      passwordHash: await hashPassword(password),
      verifiedEmail: false,
      roles: {
        create: {
          tenantId: tenant.id,
          roleId: customerRole.id
        }
      }
    }
  });

  await setAuthSession(user.id);
  await settleLoginSideEffects(user.id);
  redirect(safeRedirectPath(formData));
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = readField(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return rejectedAuthState("Email and password are required.", { email });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } }
  });

  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return rejectedAuthState("Invalid email or password.", { email });
  }

  if (user.status !== "ACTIVE") {
    return rejectedAuthState("This account is not active.", { email });
  }

  await setAuthSession(user.id);
  await settleLoginSideEffects(user.id);
  const requestedPath = safeRedirectPath(formData);
  const roleKeys = user.roles.map((item) => item.role.key);
  const restrictedAstrologer = roleKeys.includes("ASTROLOGER") && !roleKeys.some((role) => ["SUPER_ADMIN", "OPERATIONS_ADMIN"].includes(role));
  redirect(restrictedAstrologer && requestedPath === "/dashboard" ? "/admin/my-work" : requestedPath);
}

export async function logoutAction() {
  await clearAuthSession();
  redirect("/login");
}
