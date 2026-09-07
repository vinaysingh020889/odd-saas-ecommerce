import type { Prisma, SystemEventSeverity } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type EventWriter = Pick<Prisma.TransactionClient, "systemEvent"> | typeof prisma;

export type SystemEventInput = {
  tenantId: string;
  severity: SystemEventSeverity;
  module: string;
  action: string;
  outcome: string;
  actorId?: string | null;
  actorRole?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  errorRef?: string | null;
  auditLogId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function recordSystemEvent(input: SystemEventInput, writer: EventWriter = prisma) {
  return writer.systemEvent.create({ data: {
    ...input,
    outcome: input.outcome.slice(0, 300),
    actorRole: input.actorRole?.slice(0, 80),
    errorRef: input.errorRef?.slice(0, 80)
  } });
}

export async function recordSystemEventBestEffort(input: SystemEventInput) {
  try {
    return await recordSystemEvent(input);
  } catch (error) {
    console.error(JSON.stringify({ level: "error", event: "system_event_write_failed", module: input.module, action: input.action, errorRef: input.errorRef, message: error instanceof Error ? error.message : String(error) }));
    return null;
  }
}
