"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";

function text(formData: FormData, name: string) { return String(formData.get(name) ?? "").trim(); }
function optional(formData: FormData, name: string) { return text(formData, name) || null; }
function integer(formData: FormData, name: string, minimum = 0) {
  const value = Number(text(formData, name));
  if (!Number.isInteger(value) || value < minimum) throw new Error(`${name} must be an integer of at least ${minimum}.`);
  return value;
}
function list(formData: FormData, name: string) { return text(formData, name).split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean); }
function date(formData: FormData, name: string) {
  const value = new Date(text(formData, name));
  if (Number.isNaN(value.getTime())) throw new Error(`${name} must be a valid date.`);
  return value;
}
function refresh(profileId?: string) {
  revalidatePath("/admin/kundli/practitioners");
  if (profileId) revalidatePath(`/admin/kundli/practitioners?profile=${profileId}`);
  revalidatePath("/admin/kundli");
}

export async function saveKundliPractitionerProfileAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = optional(formData, "id");
  const userId = text(formData, "userId");
  const timezone = text(formData, "timezone") || "Asia/Kolkata";
  try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch { throw new Error("Timezone is invalid."); }
  const user = await prisma.user.findFirst({ where: { id: userId, tenantId, status: "ACTIVE", roles: { some: { role: { key: "ASTROLOGER" } } } }, select: { id: true } });
  if (!user) throw new Error("Guruji profiles can only be linked to an active ASTROLOGER user.");
  const data = {
    tenantId, userId,
    displayName: text(formData, "displayName"), photoUrl: optional(formData, "photoUrl"), experienceYears: integer(formData, "experienceYears"),
    bio: optional(formData, "bio"), specialties: list(formData, "specialties"), languages: list(formData, "languages"), credentialsAuthenticityText: optional(formData, "credentialsAuthenticityText"),
    active: formData.get("active") === "on", publicVisible: formData.get("publicVisible") === "on", acceptingWork: formData.get("acceptingWork") === "on",
    assignmentPriority: integer(formData, "assignmentPriority"), standardDeliveryBusinessDays: integer(formData, "standardDeliveryBusinessDays"), timezone,
    dailyActiveOrderLimit: integer(formData, "dailyActiveOrderLimit", 1), weeklyActiveOrderLimit: integer(formData, "weeklyActiveOrderLimit", 1), monthlyActiveOrderLimit: integer(formData, "monthlyActiveOrderLimit", 1)
  };
  if (!data.displayName) throw new Error("Display name is required.");
  const profile = await prisma.$transaction(async (tx) => {
    const saved = id ? await tx.kundliPractitionerProfile.update({ where: { id, tenantId }, data }) : await tx.kundliPractitionerProfile.create({ data });
    const packageIds = formData.getAll("packageIds").map(String);
    await tx.kundliPackagePractitioner.updateMany({ where: { tenantId, practitionerProfileId: saved.id }, data: { active: false } });
    for (const packageId of packageIds) await tx.kundliPackagePractitioner.upsert({ where: { packageId_practitionerProfileId: { packageId, practitionerProfileId: saved.id } }, update: { active: true }, create: { tenantId, packageId, practitionerProfileId: saved.id, active: true } });
    await tx.auditLog.create({ data: { tenantId, actorId: admin.id, action: id ? "kundli_practitioner_updated" : "kundli_practitioner_created", entity: "KundliPractitionerProfile", entityId: saved.id, metadata: { userId, packageIds } } });
    return saved;
  });
  refresh(profile.id);
  redirect(`/admin/kundli/practitioners?profile=${profile.id}`);
}

export async function saveKundliPractitionerLeaveAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = optional(formData, "id");
  const practitionerProfileId = text(formData, "practitionerProfileId");
  const startsAt = date(formData, "startsAt");
  const endsAt = date(formData, "endsAt");
  if (endsAt < startsAt) throw new Error("Leave end must be after its start.");
  const profile = await prisma.kundliPractitionerProfile.findFirst({ where: { id: practitionerProfileId, tenantId }, select: { id: true } });
  if (!profile) throw new Error("Guruji profile was not found.");
  const data = { tenantId, practitionerProfileId, startsAt, endsAt, reason: optional(formData, "reason"), active: formData.get("active") === "on" };
  const leave = id ? await prisma.kundliPractitionerUnavailability.update({ where: { id, tenantId }, data }) : await prisma.kundliPractitionerUnavailability.create({ data });
  await prisma.auditLog.create({ data: { tenantId, actorId: admin.id, action: id ? "kundli_practitioner_leave_updated" : "kundli_practitioner_leave_created", entity: "KundliPractitionerUnavailability", entityId: leave.id, metadata: { practitionerProfileId, startsAt, endsAt, active: data.active } } });
  refresh(practitionerProfileId);
  redirect(`/admin/kundli/practitioners?profile=${practitionerProfileId}`);
}

export async function deactivateKundliPractitionerLeaveAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const leave = await prisma.kundliPractitionerUnavailability.update({ where: { id, tenantId }, data: { active: false } });
  await prisma.auditLog.create({ data: { tenantId, actorId: admin.id, action: "kundli_practitioner_leave_deactivated", entity: "KundliPractitionerUnavailability", entityId: id, metadata: { practitionerProfileId: leave.practitionerProfileId } } });
  refresh(leave.practitionerProfileId);
}

export async function updateKundliPackageAssignmentModeAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const packageId = text(formData, "packageId");
  const mode = text(formData, "practitionerSelectionMode");
  if (mode !== "INTERNAL_ASSIGNMENT") {
    throw new Error("Customer Guruji selection is disabled. Kundli packages must use internal assignment.");
  }
  const item = await prisma.kundliPackage.update({ where: { id: packageId, tenantId }, data: { practitionerSelectionMode: "INTERNAL_ASSIGNMENT" } });
  await prisma.auditLog.create({ data: { tenantId, actorId: admin.id, action: "kundli_package_assignment_mode_updated", entity: "KundliPackage", entityId: item.id, metadata: { mode } } });
  refresh();
}

export async function updateKundliPackagePractitionerRestrictionAction(formData: FormData) {
  const admin = await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const packageId = text(formData, "packageId");
  const restrictToSelectedPractitioners = formData.get("restrictToSelectedPractitioners") === "on";
  if (restrictToSelectedPractitioners) {
    const eligibleCount = await prisma.kundliPackagePractitioner.count({ where: { tenantId, packageId, active: true } });
    if (eligibleCount === 0) throw new Error("Package restriction requires at least one selected eligible Guruji.");
  }
  const item = await prisma.kundliPackage.update({
    where: { id: packageId, tenantId },
    data: { restrictToSelectedPractitioners }
  });
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: admin.id,
      action: "kundli_package_practitioner_restriction_updated",
      entity: "KundliPackage",
      entityId: item.id,
      metadata: { restrictToSelectedPractitioners }
    }
  });
  refresh();
}
