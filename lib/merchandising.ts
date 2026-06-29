import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { productPrimaryImage, productPrice, type StorefrontProduct } from "@/lib/storefront";

export const festivalStatuses = ["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED", "ARCHIVED"] as const;
export const promotionStatuses = ["DRAFT", "SCHEDULED", "ACTIVE", "EXPIRED", "ARCHIVED"] as const;
export const promotionSurfaces = ["HOMEPAGE", "SHOP", "DASHBOARD", "CHECKOUT", "PRODUCT_DETAIL", "SERVICE_DETAIL", "GLOBAL"] as const;
export const promotionTargetTypes = ["FESTIVAL", "PRODUCT", "CATEGORY", "KIT", "SERVICE", "MEMBERSHIP", "CUSTOM"] as const;
export const promotionPlacementKeys = [
  "homepage_hero",
  "homepage_shop_by_intent",
  "homepage_festival_focus",
  "homepage_featured_products",
  "shop_top_banner",
  "dashboard_seasonal_card",
  "product_detail_related_festival",
  "cart_cross_sell",
  "checkout_last_suggestion",
  "top_announcement_strip"
] as const;

const publicStatuses = new Set(["ACTIVE", "SCHEDULED"]);

type DateWindow = {
  status: string;
  startDate?: Date | null;
  endDate?: Date | null;
};

export type MerchandisingHero = {
  source: "promotion" | "festival" | "default";
  eyebrow: string;
  title: string;
  description: string;
  image: string | null;
  href: string;
  ctaLabel: string;
};

export function isCurrentlyActive(item: DateWindow, now = new Date()) {
  if (!publicStatuses.has(item.status)) return false;
  if (item.startDate && item.startDate > now) return false;
  if (item.endDate && item.endDate < now) return false;
  return true;
}

function toDateOrNull(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function money(value: unknown, currency = "INR") {
  return formatMoney(Number(value ?? 0), currency);
}

export function promotionHref(promotion: { ctaUrl?: string | null; targetType: string; targetId?: string | null }) {
  if (promotion.ctaUrl) return promotion.ctaUrl;
  if (promotion.targetType === "FESTIVAL" && promotion.targetId) return `/festivals/${promotion.targetId}`;
  if (promotion.targetType === "CATEGORY" && promotion.targetId) return `/shop/category/${promotion.targetId}`;
  if (promotion.targetType === "MEMBERSHIP") return "/membership";
  return "/shop";
}

export async function getHomepageIntentCategories() {
  const tenantId = await getOmdTenantId();

  return prisma.category.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      showOnHomepageIntent: true
    },
    orderBy: [{ homepageIntentSortOrder: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });
}

export async function getActivePromotions(options: { placementKey?: string; surface?: string } = {}) {
  const tenantId = await getOmdTenantId();
  const rows = await prisma.promotionPlacement.findMany({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "SCHEDULED"] },
      ...(options.placementKey ? { placementKey: options.placementKey } : {}),
      ...(options.surface ? { surface: options.surface } : {})
    },
    orderBy: [{ priority: "desc" }, { sortOrder: "asc" }, { updatedAt: "desc" }]
  });

  return rows.filter((row) => isCurrentlyActive(row));
}

export async function getActiveFestivalCampaigns(options: { homepageOnly?: boolean; heroOnly?: boolean; slug?: string } = {}) {
  const tenantId = await getOmdTenantId();
  const rows = await prisma.festivalCampaign.findMany({
    where: {
      tenantId,
      status: { in: ["ACTIVE", "SCHEDULED"] },
      ...(options.homepageOnly ? { showOnHomepage: true } : {}),
      ...(options.heroOnly ? { showInHero: true } : {}),
      ...(options.slug ? { slug: options.slug } : {})
    },
    include: {
      products: {
        include: {
          product: {
            include: {
              category: true,
              variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
              media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }
            }
          }
        },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }]
      },
      categories: {
        include: { category: true },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }]
      },
      services: {
        include: {
          service: {
            include: {
              category: true,
              variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
              media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] }
            }
          }
        },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }]
      }
    },
    orderBy: [{ priority: "desc" }, { startDate: "desc" }]
  });

  return rows.filter((row) => isCurrentlyActive(row));
}

export async function chooseHeroContent(): Promise<MerchandisingHero> {
  const [heroPromotion] = await getActivePromotions({ placementKey: "homepage_hero" });

  if (heroPromotion) {
    return {
      source: "promotion",
      eyebrow: "OMDivyaDarshan Store",
      title: heroPromotion.title,
      description: heroPromotion.description ?? "Curated devotional offerings selected by the OMDivyaDarshan team.",
      image: heroPromotion.image,
      href: promotionHref(heroPromotion),
      ctaLabel: heroPromotion.ctaLabel ?? "Shop Now"
    };
  }

  const [heroFestival] = await getActiveFestivalCampaigns({ heroOnly: true });

  if (heroFestival) {
    return {
      source: "festival",
      eyebrow: "Festival Focus",
      title: heroFestival.title,
      description: heroFestival.shortDescription ?? "Seasonal devotional products, kits, and services for the current festival period.",
      image: heroFestival.heroImage ?? heroFestival.cardImage,
      href: heroFestival.ctaUrl ?? `/festivals/${heroFestival.slug}`,
      ctaLabel: heroFestival.ctaLabel ?? "Explore Festival"
    };
  }

  return {
    source: "default",
    eyebrow: "OMDivyaDarshan Store",
    title: "Sacred Products. Meaningful Devotion.",
    description: "Curated puja samagri, kits, spiritual items, seva services and memberships for a more connected spiritual journey.",
    image: null,
    href: "#featured-products",
    ctaLabel: "Shop Now"
  };
}

export async function getHomepageMerchandising() {
  const [hero, intentCategories, festivals, featuredPlacements, announcementPromotions, shopBannerPromotions] = await Promise.all([
    chooseHeroContent(),
    getHomepageIntentCategories(),
    getActiveFestivalCampaigns({ homepageOnly: true }),
    getActivePromotions({ placementKey: "homepage_featured_products" }),
    getActivePromotions({ placementKey: "top_announcement_strip" }),
    getActivePromotions({ placementKey: "shop_top_banner" })
  ]);

  return {
    hero,
    intentCategories,
    festivals,
    featuredTargetIds: featuredPlacements.map((placement) => placement.targetId).filter((id): id is string => Boolean(id)),
    announcementStrip: announcementPromotions[0] ?? null,
    shopTopBanner: shopBannerPromotions[0] ?? null
  };
}

export function serializeProductSummary(product: StorefrontProduct) {
  return {
    id: product.id,
    title: product.title,
    slug: product.slug,
    type: product.type,
    price: productPrice(product),
    priceLabel: money(productPrice(product), product.currency),
    image: productPrimaryImage(product),
    category: product.category ? { name: product.category.name, slug: product.category.slug } : null
  };
}

export function serializeFestival(campaign: Awaited<ReturnType<typeof getActiveFestivalCampaigns>>[number]) {
  return {
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
    shortDescription: campaign.shortDescription,
    longDescription: campaign.longDescription,
    heroImage: campaign.heroImage,
    cardImage: campaign.cardImage,
    startDate: toDateOrNull(campaign.startDate),
    endDate: toDateOrNull(campaign.endDate),
    status: campaign.status,
    priority: campaign.priority,
    isFeatured: campaign.isFeatured,
    showOnHomepage: campaign.showOnHomepage,
    showInHero: campaign.showInHero,
    showInAnnouncementStrip: campaign.showInAnnouncementStrip,
    ctaLabel: campaign.ctaLabel,
    ctaUrl: campaign.ctaUrl ?? `/festivals/${campaign.slug}`,
    seoTitle: campaign.seoTitle,
    seoDescription: campaign.seoDescription,
    products: campaign.products.map((item) => serializeProductSummary(item.product as StorefrontProduct)),
    services: campaign.services.map((item) => serializeProductSummary(item.service as StorefrontProduct)),
    categories: campaign.categories.map((item) => ({
      id: item.category.id,
      name: item.category.name,
      slug: item.category.slug,
      description: item.category.description
    }))
  };
}
