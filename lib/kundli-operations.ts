import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Executor = Prisma.TransactionClient | typeof prisma;

export async function getEligibleKundliPractitioners(
  input: { tenantId: string; packageId: string; activeOnly?: boolean },
  client: Executor = prisma
) {
  const activeOnly = input.activeOnly ?? true;
  return client.kundliPractitionerProfile.findMany({
    where: {
      tenantId: input.tenantId,
      ...(activeOnly ? { active: true, acceptingWork: true } : {}),
      packageEligibility: { some: { packageId: input.packageId, active: true } },
      user: { status: "ACTIVE", roles: { some: { role: { key: "ASTROLOGER" } } } }
    },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: [{ assignmentPriority: "asc" }, { displayName: "asc" }]
  });
}

export async function getCurrentPrimaryKundliAssignment(
  input: { tenantId: string; kundliOrderId: string },
  client: Executor = prisma
) {
  const assignments = await client.assignment.findMany({
    where: {
      tenantId: input.tenantId,
      workType: "KUNDLI_ORDER",
      workId: input.kundliOrderId,
      isPrimary: true,
      endedAt: null,
      status: { notIn: ["COMPLETED", "CANCELLED"] }
    },
    include: {
      assignedUser: {
        select: { id: true, name: true, email: true, kundliPractitionerProfile: true }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 2
  });
  if (assignments.length > 1) throw new Error("Multiple active primary Kundli assignments found.");
  return assignments[0] ?? null;
}

export async function getKundliPractitionerCapacityConfiguration(
  input: { tenantId: string; practitionerProfileId: string },
  client: Executor = prisma
) {
  return client.kundliPractitionerProfile.findFirst({
    where: {
      id: input.practitionerProfileId,
      tenantId: input.tenantId,
      user: { status: "ACTIVE", roles: { some: { role: { key: "ASTROLOGER" } } } }
    },
    select: {
      id: true,
      userId: true,
      active: true,
      acceptingWork: true,
      assignmentPriority: true,
      standardDeliveryBusinessDays: true,
      timezone: true,
      dailyActiveOrderLimit: true,
      weeklyActiveOrderLimit: true,
      monthlyActiveOrderLimit: true
    }
  });
}

export async function getKundliPractitionerAvailability(
  input: { tenantId: string; practitionerProfileId: string; startsAt: Date; endsAt?: Date },
  client: Executor = prisma
) {
  const endsAt = input.endsAt ?? input.startsAt;
  const profile = await client.kundliPractitionerProfile.findFirst({
    where: {
      id: input.practitionerProfileId,
      tenantId: input.tenantId,
      user: { status: "ACTIVE", roles: { some: { role: { key: "ASTROLOGER" } } } }
    },
    select: { id: true, active: true, acceptingWork: true, timezone: true }
  });
  if (!profile) return null;
  const unavailableRanges = await client.kundliPractitionerUnavailability.findMany({
    where: {
      tenantId: input.tenantId,
      practitionerProfileId: input.practitionerProfileId,
      active: true,
      startsAt: { lte: endsAt },
      endsAt: { gte: input.startsAt }
    },
    orderBy: { startsAt: "asc" }
  });
  return {
    profile,
    unavailableRanges,
    available: profile.active && profile.acceptingWork && unavailableRanges.length === 0
  };
}
