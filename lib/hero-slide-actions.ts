"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { HeroSlideLinkType, HeroSlideOverlay, HeroSlideTextAlign, HeroSlideTheme, Prisma } from "@prisma/client";
import { requireHeroSlideAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { heroSlideLinkTypes, heroSlideOverlays, heroSlideTextAligns, heroSlideThemes } from "@/lib/hero-slides";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function nullableText(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function intValue(formData: FormData, key: string) {
  const value = Number(text(formData, key) || 0);
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

function enumValue<T extends string>(formData: FormData, key: string, values: readonly T[], fallback: T): T {
  const value = text(formData, key);
  return values.includes(value as T) ? (value as T) : fallback;
}

function validateWindow(startsAt: Date | null, endsAt: Date | null) {
  if (startsAt && Number.isNaN(startsAt.getTime())) throw new Error("Start date is invalid.");
  if (endsAt && Number.isNaN(endsAt.getTime())) throw new Error("End date is invalid.");
  if (startsAt && endsAt && endsAt < startsAt) throw new Error("End date cannot be earlier than start date.");
}

function slideData(formData: FormData): Prisma.HeroSlideUncheckedCreateInput | Prisma.HeroSlideUncheckedUpdateInput {
  const title = text(formData, "title");
  const desktopImageUrl = text(formData, "desktopImageUrl");
  const primaryCtaLabel = text(formData, "primaryCtaLabel");
  const primaryCtaUrl = nullableText(formData, "primaryCtaUrl");
  const secondaryCtaLabel = nullableText(formData, "secondaryCtaLabel");
  const secondaryCtaUrl = nullableText(formData, "secondaryCtaUrl");
  const linkType = enumValue<HeroSlideLinkType>(formData, "linkType", heroSlideLinkTypes, "CUSTOM");
  const startsAt = dateValue(formData, "startsAt");
  const endsAt = dateValue(formData, "endsAt");

  if (!title) throw new Error("Hero slide title is required.");
  if (!desktopImageUrl) throw new Error("Desktop image URL is required.");
  if (!primaryCtaLabel) throw new Error("Primary CTA label is required.");
  if (linkType === "CUSTOM" && !primaryCtaUrl) throw new Error("Primary CTA URL is required for custom links.");
  if (secondaryCtaLabel && !secondaryCtaUrl) throw new Error("Secondary CTA URL is required when a secondary label is provided.");
  validateWindow(startsAt, endsAt);

  return {
    title,
    subtitle: nullableText(formData, "subtitle"),
    eyebrow: nullableText(formData, "eyebrow"),
    badgeText: nullableText(formData, "badgeText"),
    desktopImageUrl,
    mobileImageUrl: nullableText(formData, "mobileImageUrl"),
    imageAlt: nullableText(formData, "imageAlt"),
    primaryCtaLabel,
    primaryCtaUrl,
    secondaryCtaLabel,
    secondaryCtaUrl,
    linkType,
    linkedProductId: nullableText(formData, "linkedProductId"),
    linkedServiceId: nullableText(formData, "linkedServiceId"),
    linkedFestivalId: nullableText(formData, "linkedFestivalId"),
    linkedOfferId: nullableText(formData, "linkedOfferId"),
    linkedMembershipId: nullableText(formData, "linkedMembershipId"),
    themeVariant: enumValue<HeroSlideTheme>(formData, "themeVariant", heroSlideThemes, "DARK_OVERLAY"),
    textAlign: enumValue<HeroSlideTextAlign>(formData, "textAlign", heroSlideTextAligns, "LEFT"),
    overlayStrength: enumValue<HeroSlideOverlay>(formData, "overlayStrength", heroSlideOverlays, "MEDIUM"),
    isActive: checked(formData, "isActive"),
    startsAt,
    endsAt,
    sortOrder: intValue(formData, "sortOrder")
  };
}

function revalidateHeroSlides(id?: string) {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/api/public/homepage");
  revalidatePath("/admin/hero-slides");
  if (id) revalidatePath(`/admin/hero-slides/${id}/edit`);
}

export async function createHeroSlideAction(formData: FormData) {
  const admin = await requireHeroSlideAdminUser();
  const tenantId = await getOmdTenantId();
  const data = slideData(formData) as Prisma.HeroSlideUncheckedCreateInput;
  const slide = await prisma.heroSlide.create({ data: { ...data, tenantId, createdById: admin.id, updatedById: admin.id } });
  await prisma.auditLog.create({ data: { tenantId, actorId: admin.id, action: "hero_slide_created", entity: "HeroSlide", entityId: slide.id, metadata: { title: slide.title } } });
  revalidateHeroSlides(slide.id);
  redirect("/admin/hero-slides");
}

export async function updateHeroSlideAction(id: string, formData: FormData) {
  const admin = await requireHeroSlideAdminUser();
  const tenantId = await getOmdTenantId();
  const existing = await prisma.heroSlide.findFirst({ where: { id, tenantId } });
  if (!existing) redirect("/admin/hero-slides");
  const data = slideData(formData) as Prisma.HeroSlideUncheckedUpdateInput;
  const slide = await prisma.heroSlide.update({ where: { id }, data: { ...data, updatedById: admin.id } });
  await prisma.auditLog.create({ data: { tenantId, actorId: admin.id, action: "hero_slide_updated", entity: "HeroSlide", entityId: slide.id, metadata: { title: slide.title } } });
  revalidateHeroSlides(slide.id);
  redirect("/admin/hero-slides");
}

export async function deleteHeroSlideAction(id: string) {
  const admin = await requireHeroSlideAdminUser();
  const tenantId = await getOmdTenantId();
  const existing = await prisma.heroSlide.findFirst({ where: { id, tenantId } });
  if (!existing) redirect("/admin/hero-slides");
  await prisma.heroSlide.delete({ where: { id } });
  await prisma.auditLog.create({ data: { tenantId, actorId: admin.id, action: "hero_slide_deleted", entity: "HeroSlide", entityId: id, metadata: { title: existing.title } } });
  revalidateHeroSlides(id);
  redirect("/admin/hero-slides");
}

export async function toggleHeroSlideStatusAction(id: string) {
  const admin = await requireHeroSlideAdminUser();
  const tenantId = await getOmdTenantId();
  const existing = await prisma.heroSlide.findFirst({ where: { id, tenantId } });
  if (!existing) redirect("/admin/hero-slides");
  const slide = await prisma.heroSlide.update({ where: { id }, data: { isActive: !existing.isActive, updatedById: admin.id } });
  await prisma.auditLog.create({ data: { tenantId, actorId: admin.id, action: "hero_slide_status_toggled", entity: "HeroSlide", entityId: id, metadata: { isActive: slide.isActive } } });
  revalidateHeroSlides(id);
  redirect("/admin/hero-slides");
}
