import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";

export type PublicHeroSlide = Awaited<ReturnType<typeof getActiveHeroSlides>>[number];

export const heroSlideLinkTypes = ["CUSTOM", "PRODUCT", "SERVICE", "FESTIVAL", "OFFER", "MEMBERSHIP", "ASTHI", "KUNDLI"] as const;
export const heroSlideThemes = ["DARK_OVERLAY", "LIGHT_OVERLAY", "CREAM_CARD", "SAFFRON_GOLD"] as const;
export const heroSlideTextAligns = ["LEFT", "CENTER", "RIGHT"] as const;
export const heroSlideOverlays = ["NONE", "LIGHT", "MEDIUM", "STRONG"] as const;

export function fallbackHeroSlide() {
  return {
    id: "fallback-hero",
    title: "Sacred Products. Meaningful Devotion.",
    subtitle: "Curated puja samagri, kits, spiritual items, seva services and memberships for a more connected spiritual journey.",
    eyebrow: "OMDivyaDarshan Store",
    badgeText: "Premium Devotional Store",
    desktopImageUrl: "https://images.unsplash.com/photo-1604608672516-8e6c6ed88492?auto=format&fit=crop&w=1800&q=80",
    mobileImageUrl: null,
    imageAlt: "Puja samagri arranged for worship",
    primaryCtaLabel: "Shop Now",
    primaryCtaUrl: "/shop",
    secondaryCtaLabel: "Explore Services",
    secondaryCtaUrl: "/services",
    linkType: "CUSTOM",
    themeVariant: "DARK_OVERLAY",
    textAlign: "LEFT",
    overlayStrength: "MEDIUM",
    sortOrder: 0,
    resolvedHref: "/shop"
  };
}

export async function resolveHeroSlideHref(slide: {
  linkType: string;
  primaryCtaUrl: string | null;
  linkedProductId?: string | null;
  linkedServiceId?: string | null;
  linkedFestivalId?: string | null;
  linkedOfferId?: string | null;
  linkedMembershipId?: string | null;
}) {
  if (slide.linkType === "ASTHI") return "/services/asthi-visarjan";
  if (slide.linkType === "KUNDLI") return "/kundli";
  if (slide.linkType === "MEMBERSHIP") {
    if (slide.linkedMembershipId) {
      const plan = await prisma.membershipPlan.findFirst({ where: { id: slide.linkedMembershipId }, select: { slug: true } });
      if (plan) return `/membership/${plan.slug}/review`;
    }
    return slide.primaryCtaUrl || "/membership";
  }
  if (slide.linkType === "PRODUCT" && slide.linkedProductId) {
    const product = await prisma.product.findFirst({ where: { id: slide.linkedProductId }, select: { slug: true } });
    if (product) return `/product/${product.slug}`;
  }
  if (slide.linkType === "SERVICE" && slide.linkedServiceId) {
    const service = await prisma.product.findFirst({ where: { id: slide.linkedServiceId }, select: { slug: true } });
    if (service) return `/services/${service.slug}`;
  }
  if (slide.linkType === "FESTIVAL" && slide.linkedFestivalId) {
    const festival = await prisma.festivalCampaign.findFirst({ where: { id: slide.linkedFestivalId }, select: { slug: true } });
    if (festival) return `/festivals/${festival.slug}`;
  }
  if (slide.linkType === "OFFER" && slide.linkedOfferId) {
    const offer = await prisma.offerRule.findFirst({ where: { id: slide.linkedOfferId }, select: { code: true } });
    if (offer?.code) return `/shop?offer=${encodeURIComponent(offer.code)}`;
  }
  return slide.primaryCtaUrl || "/shop";
}

async function withResolvedHref<T extends { primaryCtaUrl: string | null; linkType: string }>(slide: T) {
  return { ...slide, resolvedHref: await resolveHeroSlideHref(slide) };
}

export async function getActiveHeroSlides() {
  const tenantId = await getOmdTenantId();
  const now = new Date();
  const slides = await prisma.heroSlide.findMany({
    where: {
      tenantId,
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }]
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: 5
  });

  return Promise.all(slides.map(withResolvedHref));
}

export async function getAdminHeroSlides(filter?: string) {
  const tenantId = await getOmdTenantId();
  const now = new Date();
  const where = {
    tenantId,
    ...(filter === "active" ? { isActive: true } : {}),
    ...(filter === "inactive" ? { isActive: false } : {}),
    ...(filter === "scheduled" ? { startsAt: { gt: now } } : {}),
    ...(filter === "expired" ? { endsAt: { lt: now } } : {})
  };
  return prisma.heroSlide.findMany({ where, orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }] });
}

export async function getHeroSlideById(id: string) {
  const tenantId = await getOmdTenantId();
  return prisma.heroSlide.findFirst({ where: { id, tenantId } });
}