"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { clearAuthSession, setAuthSession } from "@/lib/auth/session";
import { mergeGuestCartToUser } from "@/lib/cart";
import { mergeAnonymousEventsToUserOnLogin } from "@/lib/customer-events";

export type AuthActionState = {
  error?: string;
};

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
    return { error: "Name, email, and password are required." };
  }

  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  if (!validatePassword(password)) {
    return { error: "Password must be at least 8 characters." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return { error: "An account with this email already exists." };
  }

  const tenant = await getOmdTenant();

  if (!tenant) {
    return { error: "Tenant is not seeded yet. Run npm run prisma:seed." };
  }

  const customerRole = await getCustomerRole(tenant.id);

  if (!customerRole) {
    return { error: "Customer role is not seeded yet. Run npm run prisma:seed." };
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

  await mergeGuestCartToUser(user.id);
  await mergeAnonymousEventsToUserOnLogin(user.id);
  await setAuthSession(user.id);
  redirect(safeRedirectPath(formData));
}

export async function loginAction(
  _previousState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = readField(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Invalid email or password." };
  }

  if (user.status !== "ACTIVE") {
    return { error: "This account is not active." };
  }

  await mergeGuestCartToUser(user.id);
  await mergeAnonymousEventsToUserOnLogin(user.id);
  await setAuthSession(user.id);
  redirect(safeRedirectPath(formData));
}

export async function logoutAction() {
  await clearAuthSession();
  redirect("/login");
}
