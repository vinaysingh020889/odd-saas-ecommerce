import { NextResponse } from "next/server";
import { getHomepageMerchandising, serializeFestival, serializeProductSummary } from "@/lib/merchandising";
import { getStorefrontProducts } from "@/lib/storefront";
import { productTypes, serviceTypes } from "@/lib/catalog";

export async function GET() {
  const [{ products }, { hero, intentCategories, festivals, announcementStrip, shopTopBanner, featuredTargetIds }] = await Promise.all([
    getStorefrontProducts({ types: [...productTypes, ...serviceTypes] }),
    getHomepageMerchandising()
  ]);

  const configuredFeatured = featuredTargetIds.length
    ? featuredTargetIds
        .map((id) => products.find((product) => product.id === id || product.slug === id))
        .filter((product): product is (typeof products)[number] => Boolean(product))
    : [];

  const featuredSource = configuredFeatured.length ? configuredFeatured : products.filter((product) => product.featured);

  return NextResponse.json({
    hero,
    announcementStrip,
    shopTopBanner,
    shopByIntentCategories: intentCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      title: category.homepageIntentTitle ?? category.name,
      description: category.homepageIntentDescription ?? category.description,
      image: category.homepageIntentImage,
      sortOrder: category.homepageIntentSortOrder,
      isFeatured: category.isFeatured
    })),
    activeFestivalCampaigns: festivals.map(serializeFestival),
    featuredProducts: featuredSource.filter((product) => product.type === "PHYSICAL" || product.type === "DIGITAL").slice(0, 8).map(serializeProductSummary),
    featuredKits: featuredSource.filter((product) => product.type === "KIT").slice(0, 6).map(serializeProductSummary),
    featuredServices: featuredSource.filter((product) => product.type === "SERVICE").slice(0, 6).map(serializeProductSummary),
    membershipOrWalletPromo: featuredSource.find((product) => product.type === "MEMBERSHIP") ? serializeProductSummary(featuredSource.find((product) => product.type === "MEMBERSHIP")!) : null
  });
}
