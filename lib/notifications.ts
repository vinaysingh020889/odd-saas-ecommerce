import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type NotificationWriter = Pick<Prisma.TransactionClient, "notification" | "user"> | typeof prisma;

export type NotificationInput = {
  tenantId: string; recipientId: string; type: string; title: string; message: string; dedupeKey: string;
  destination?: string | null; sourceModule?: string | null; entityType?: string | null; entityId?: string | null; sourceEventId?: string | null;
};

export async function notifyUser(input: NotificationInput, writer: NotificationWriter = prisma) {
  const data = { ...input, type: input.type.slice(0, 80), title: input.title.slice(0, 180), message: input.message.slice(0, 600), dedupeKey: input.dedupeKey.slice(0, 240) };
  return writer.notification.upsert({
    where: { tenantId_recipientId_dedupeKey: { tenantId: input.tenantId, recipientId: input.recipientId, dedupeKey: data.dedupeKey } },
    create: data,
    update: { title: data.title, message: data.message, destination: data.destination, sourceEventId: data.sourceEventId, archivedAt: null }
  });
}

export async function notifyRoles(input: Omit<NotificationInput, "recipientId"> & { roles: string[]; excludeRecipientIds?: string[] }, writer: NotificationWriter = prisma) {
  const recipients = await writer.user.findMany({ where: { tenantId: input.tenantId, status: "ACTIVE", id: input.excludeRecipientIds?.length ? { notIn: input.excludeRecipientIds } : undefined, roles: { some: { role: { key: { in: input.roles } } } } }, select: { id: true } });
  const { roles: _roles, excludeRecipientIds: _excluded, ...notification } = input;
  await Promise.all(recipients.map(({ id }) => notifyUser({ ...notification, recipientId: id }, writer)));
  return recipients.length;
}
