"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireAdminUser(); const tenantId = await getOmdTenantId();
  const notificationId = String(formData.get("notificationId") ?? ""); if (!notificationId) return;
  await prisma.notification.updateMany({ where: { id: notificationId, tenantId, recipientId: user.id }, data: { readAt: new Date() } });
  revalidatePath("/admin/notifications"); revalidatePath("/admin", "layout");
}

export async function markAllNotificationsReadAction() {
  const user = await requireAdminUser(); const tenantId = await getOmdTenantId();
  await prisma.notification.updateMany({ where: { tenantId, recipientId: user.id, readAt: null, archivedAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin/notifications"); revalidatePath("/admin", "layout");
}
