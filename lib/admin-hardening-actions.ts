"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole, requireSupportAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requireSuperAdmin(roles: string[]) {
  if (!roles.includes("SUPER_ADMIN")) {
    throw new Error("Only Super Admin can perform this admin hardening action.");
  }
}

export async function assignUserRoleAction(formData: FormData) {
  const admin = await requireAdminRole(["SUPER_ADMIN"]);
  requireSuperAdmin(admin.roles);
  const tenantId = await getOmdTenantId();
  const userId = text(formData, "userId");
  const roleId = text(formData, "roleId");
  const redirectTo = text(formData, "redirectTo") || "/admin/roles";

  const [targetUser, role] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: { roles: { include: { role: true } } }
    }),
    prisma.role.findFirst({ where: { id: roleId, tenantId } })
  ]);

  if (!targetUser || !role) redirect(redirectTo);

  const beforeRoles = targetUser.roles.map((item) => item.role.key).sort();
  const existing = targetUser.roles.some((item) => item.roleId === role.id);

  if (!existing) {
    await prisma.userRole.create({ data: { tenantId, userId: targetUser.id, roleId: role.id } });
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "admin_role_assigned",
        entity: "User",
        entityId: targetUser.id,
        metadata: {
          assignedRole: role.key,
          before: beforeRoles,
          after: [...beforeRoles, role.key].sort()
        }
      }
    });
  }

  revalidatePath("/admin/roles");
  redirect(redirectTo);
}

export async function removeUserRoleAction(formData: FormData) {
  const admin = await requireAdminRole(["SUPER_ADMIN"]);
  requireSuperAdmin(admin.roles);
  const tenantId = await getOmdTenantId();
  const userRoleId = text(formData, "userRoleId");
  const redirectTo = text(formData, "redirectTo") || "/admin/roles";

  const userRole = await prisma.userRole.findFirst({
    where: { id: userRoleId, tenantId },
    include: {
      user: { include: { roles: { include: { role: true } } } },
      role: true
    }
  });

  if (!userRole) redirect(redirectTo);

  const beforeRoles = userRole.user.roles.map((item) => item.role.key).sort();
  const superAdminCount = await prisma.userRole.count({
    where: { tenantId, role: { key: "SUPER_ADMIN" } }
  });

  if (userRole.role.key === "SUPER_ADMIN" && superAdminCount <= 1) {
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "admin_role_removal_blocked",
        entity: "User",
        entityId: userRole.userId,
        metadata: { attemptedRole: "SUPER_ADMIN", reason: "last_super_admin_protected", before: beforeRoles }
      }
    });
    redirect(redirectTo);
  }

  await prisma.userRole.delete({ where: { id: userRole.id } });
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: admin.id,
      action: "admin_role_removed",
      entity: "User",
      entityId: userRole.userId,
      metadata: {
        removedRole: userRole.role.key,
        before: beforeRoles,
        after: beforeRoles.filter((role) => role !== userRole.role.key)
      }
    }
  });

  revalidatePath("/admin/roles");
  redirect(redirectTo);
}

export async function createCustomerNoteAction(formData: FormData) {
  const admin = await requireSupportAdminUser();
  const tenantId = await getOmdTenantId();
  const customerId = text(formData, "customerId");
  const note = text(formData, "note");
  const category = text(formData, "category") || "GENERAL";
  const redirectTo = text(formData, "redirectTo") || `/admin/customers/${customerId}`;

  if (!note) redirect(redirectTo);

  const customer = await prisma.user.findFirst({ where: { id: customerId, tenantId }, select: { id: true } });
  if (!customer) redirect(redirectTo);

  const created = await prisma.customerNote.create({
    data: {
      tenantId,
      customerId,
      createdById: admin.id,
      note,
      category
    }
  });

  await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: admin.id,
        action: "customer_internal_note_created",
        entity: "User",
        entityId: customerId,
        metadata: { customerId, customerNoteId: created.id, category }
      }
    });

  revalidatePath(`/admin/customers/${customerId}`);
  redirect(redirectTo);
}
