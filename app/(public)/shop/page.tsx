import Link from "next/link";
import type { ReactNode } from "react";
import { CatalogCard } from "@/components/catalog-card";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { EmptyState } from "@/components/ui";
import {
  CollectionCard,
  PremiumLink,
  PromoStrip,
  StorefrontSection,
  TrustFeatureStrip
} from "@/components/storefront";
import { getActiveParentCategories, productTypes } from "@/lib/catalog";
import { fallbackHeroSlide, getActiveHeroSlides } from "@/lib/hero-slides";
import { getHomepageMerchandising, promotionHref } from "@/lib/merchandising";
import { getStorefrontProducts, type StorefrontProduct, type StorefrontSearchParams } from "@/lib/storefront";
import { runtimeConfig } from "@/lib/env";
import { isPhase1PublicHandoffHref } from "@/lib/public-handoffs";

type ShopPageProps = {
  searchParams: Promise<StorefrontSearchParams>;
};

function SectionTitle({ children, accent }: { children: ReactNode; accent: string }) {
  return (
    <>
      {children} <span className="italic text-[#b00000]">{accent}</span>
    </>
  );
}
function filterHref(params: StorefrontSearchParams, updates: StorefrontSearchParams) {
  const next = new URLSearchParams();
  const merged = { ...params, ...updates };

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `/shop?${query}` : "/shop";
}

function stockForProduct(product: StorefrontProduct, stockByVariant: Awaited<ReturnType<typeof getStorefrontProducts>>["stockByVariant"]) {
  return product.variants[0]?.id ? stockByVariant.get(product.variants[0].id) ?? null : null;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const [categories, merchandising, activeHeroSlides] = await Promise.all([
    getActiveParentCategories(["PRODUCT", "MIXED"]),
    getHomepageMerchandising(),
    getActiveHeroSlides()
  ]);
  const festivalProductIds = Array.from(new Set(merchandising.festivals.flatMap((festival) => festival.products.map((item) => item.productId))));
  const { products, stockByVariant } = await getStorefrontProducts({
    searchParams: params,
    types: productTypes,
    productIds: runtimeConfig.phase1UatMode ? festivalProductIds : undefined
  });

  const hasFilters = Boolean(params.q || params.type || params.minPrice || params.maxPrice || params.stock || params.rating || params.sort || params.featured);
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const configuredFeatured = merchandising.featuredTargetIds
    .map((id) => products.find((product) => product.id === id || product.slug === id))
    .filter((product): product is StorefrontProduct => Boolean(product));
  const featuredProducts = (configuredFeatured.length ? configuredFeatured : featured.length ? featured : products).slice(0, 4);
  const kits = products.filter((product) => product.type === "KIT").slice(0, 4);
  const membership = products.find((product) => product.type === "MEMBERSHIP");
  const previewProducts = products.filter((product) => product.type !== "MEMBERSHIP").slice(0, 8);
  const phase1HeroSlides = activeHeroSlides
    .filter((slide) => ["FESTIVAL", "MEMBERSHIP", "KUNDLI", "ASTHI"].includes(slide.linkType)
      || (slide.linkType === "PRODUCT" && Boolean(slide.linkedProductId && festivalProductIds.includes(slide.linkedProductId))))
    .filter((slide) => isPhase1PublicHandoffHref(slide.resolvedHref))
    .map((slide) => ({
      ...slide,
      secondaryCtaLabel: isPhase1PublicHandoffHref(slide.secondaryCtaUrl) ? slide.secondaryCtaLabel : null,
      secondaryCtaUrl: isPhase1PublicHandoffHref(slide.secondaryCtaUrl) ? slide.secondaryCtaUrl : null
    }));
  const fallback = fallbackHeroSlide();
  const phase1Fallback = {
    ...fallback,
    title: "Festival blessings, thoughtfully prepared.",
    subtitle: "Explore only the current festival hampers selected for this Phase-1 experience.",
    secondaryCtaLabel: "Explore Membership",
    secondaryCtaUrl: "/membership"
  };
  const selectedHeroSlides = runtimeConfig.phase1UatMode ? phase1HeroSlides : activeHeroSlides;
  const heroSlides = selectedHeroSlides.length ? selectedHeroSlides : [runtimeConfig.phase1UatMode ? phase1Fallback : fallback];

  return (
    <div className="-mt-5 grid gap-8 lg:-mt-5 lg:gap-10">
      <HeroSlider slides={heroSlides} />
      {!runtimeConfig.phase1UatMode && merchandising.announcementStrip ? (
        <PromoStrip
          title={merchandising.announcementStrip.title}
          description={undefined}
          href={promotionHref(merchandising.announcementStrip)}
          cta={merchandising.announcementStrip.ctaLabel ?? "Explore"}
          dismissible
        />
      ) : null}
      {!runtimeConfig.phase1UatMode ? <StorefrontSection title={<SectionTitle accent="Intent">Shop by Your</SectionTitle>}>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          {merchandising.intentCategories.slice(0, 6).map((category) => (
            <CollectionCard
              key={category.id}
              title={category.homepageIntentTitle ?? category.name}
              description={category.homepageIntentDescription ?? category.description}
              href={category.slug === "membership" ? "/membership" : `/shop/category/${category.slug}`}
              cta={category.type === "SERVICE" ? "Explore Seva" : "Shop Collection"}
              imageUrl={category.homepageIntentImage}
              compact
            />
          ))}
          {merchandising.intentCategories.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-3">
              <EmptyState title="No intent categories published" description="Shop by Intent appears after admin enables homepage intent categories." />
            </div>
          ) : null}
        </div>
      </StorefrontSection> : null}

      {merchandising.festivals.length ? (
        <StorefrontSection title={<SectionTitle accent="Festivals">Shop by</SectionTitle>}>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {merchandising.festivals.slice(0, 3).map((festival) => (
              <CollectionCard
                key={festival.id}
                title={festival.title}
                description={festival.shortDescription}
                href={runtimeConfig.phase1UatMode ? `/festivals/${festival.slug}` : festival.ctaUrl ?? `/festivals/${festival.slug}`}
                cta={festival.ctaLabel ?? "Explore Festival"}
                imageUrl={festival.cardImage ?? festival.heroImage}
              />
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      {!runtimeConfig.phase1UatMode && merchandising.shopTopBanner ? (
        <PromoStrip
          title={merchandising.shopTopBanner.title}
          description={merchandising.shopTopBanner.description ?? undefined}
          href={promotionHref(merchandising.shopTopBanner)}
          cta={merchandising.shopTopBanner.ctaLabel ?? "View Now"}
        />
      ) : null}

      <StorefrontSection
        title={hasFilters ? <SectionTitle accent="Results">Matching</SectionTitle> : <SectionTitle accent="Products">Featured</SectionTitle>}
        subtitle={hasFilters ? `${products.length} matching offerings from the current filters.` : undefined}
        action={<PremiumLink href={filterHref(params, { featured: "true" })} variant="secondary">View featured</PremiumLink>}
        className="scroll-mt-28"
      >
        <div id="featured-products" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {featuredProducts.length === 0 ? (
            <div className="sm:col-span-2 xl:col-span-4">
              <EmptyState title="No featured products found" description="Try clearing filters or browsing all products." />
            </div>
          ) : null}
          {featuredProducts.map((product) => (
            <CatalogCard key={product.id} item={product} stock={stockForProduct(product, stockByVariant)} />
          ))}
        </div>
      </StorefrontSection>

      <PromoStrip
        title={membership?.title ?? "Divya Membership"}
        description="Membership for ongoing devotional participation, exclusive benefits, priority support, early access, and member-focused care."
        href="/membership"
        cta="Explore Membership"
      />

      {kits.length ? (
        <StorefrontSection
          title={<SectionTitle accent="Bundles">Kits &</SectionTitle>}
          action={<PremiumLink href={filterHref(params, { type: "KIT" })} variant="secondary">View kits</PremiumLink>}
        >
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {kits.map((product) => (
              <CatalogCard key={product.id} item={product} stock={stockForProduct(product, stockByVariant)} />
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      <StorefrontSection
        title={runtimeConfig.phase1UatMode ? <SectionTitle accent="Hampers">Current Festival</SectionTitle> : hasFilters ? <SectionTitle accent="Products">Filtered</SectionTitle> : <SectionTitle accent="Products">Best Sellers & All</SectionTitle>}
        action={<PremiumLink href="/shop?sort=rating" variant="secondary">View all products</PremiumLink>}
      >
        {previewProducts.length === 0 ? (
          <EmptyState title="No products found" description="Try clearing filters or searching with a different term." />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {previewProducts.map((product) => (
              <CatalogCard key={product.id} item={product} stock={stockForProduct(product, stockByVariant)} />
            ))}
          </div>
        )}
      </StorefrontSection>

      <TrustFeatureStrip />

      {!runtimeConfig.phase1UatMode ? <section className="flex flex-col gap-3 rounded-[1.75rem] border border-omd-sand bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-omd-brown">Explore seva services and spiritual support.</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <PremiumLink href="/services" variant="secondary">Services</PremiumLink>
          <Link href="/services/asthi-visarjan" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#b00000] px-5 text-sm font-semibold text-white hover:bg-[#d91400]">
            Asthi Visarjan
          </Link>
        </div>

      </section> : null}
      {runtimeConfig.phase1UatMode || categories.length === 0 ? null : (
        <nav className="flex flex-wrap gap-2 text-sm text-omd-muted" aria-label="Store collections">
          {categories.slice(0, 10).map((category) => (
            <Link key={category.id} href={`/shop/category/${category.slug}`} className="rounded-full border border-omd-sand bg-white px-3 py-1.5 font-semibold hover:border-[#b00000] hover:text-[#b00000]">
              {category.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
