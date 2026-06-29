import Link from "next/link";
import { CatalogCard } from "@/components/catalog-card";
import { EmptyState } from "@/components/ui";
import {
  CollectionCard,
  FilterChip,
  PremiumLink,
  PromoStrip,
  StorefrontSection,
  TrustFeatureStrip
} from "@/components/storefront";
import { getActiveParentCategories, productTypes } from "@/lib/catalog";
import { getHomepageMerchandising, promotionHref } from "@/lib/merchandising";
import { getStorefrontProducts, productPrimaryImage, type StorefrontProduct, type StorefrontSearchParams } from "@/lib/storefront";

type ShopPageProps = {
  searchParams: Promise<StorefrontSearchParams>;
};

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
  const [{ products, stockByVariant }, categories, merchandising] = await Promise.all([
    getStorefrontProducts({ searchParams: params, types: productTypes }),
    getActiveParentCategories(["PRODUCT", "MIXED"]),
    getHomepageMerchandising()
  ]);

  const hasFilters = Boolean(params.q || params.type || params.minPrice || params.maxPrice || params.stock || params.rating || params.sort || params.featured);
  const featured = products.filter((product) => product.featured).slice(0, 4);
  const configuredFeatured = merchandising.featuredTargetIds
    .map((id) => products.find((product) => product.id === id || product.slug === id))
    .filter((product): product is StorefrontProduct => Boolean(product));
  const featuredProducts = (configuredFeatured.length ? configuredFeatured : featured.length ? featured : products).slice(0, 4);
  const kits = products.filter((product) => product.type === "KIT").slice(0, 4);
  const membership = products.find((product) => product.type === "MEMBERSHIP");
  const previewProducts = products.filter((product) => product.type !== "MEMBERSHIP").slice(0, 8);
  const heroProduct = featuredProducts.find((product) => productPrimaryImage(product)) ?? products.find((product) => productPrimaryImage(product));
  const heroImage = merchandising.hero.image ?? (heroProduct ? productPrimaryImage(heroProduct) : null);
  const safeHeroImage = heroImage?.replaceAll('"', "%22");
  const heroVisualBackground = heroImage
    ? `linear-gradient(180deg, rgba(47, 28, 20, 0.04), rgba(47, 28, 20, 0.5)), url("${safeHeroImage}"), radial-gradient(circle at 25% 25%, #c89b3c, transparent 32%), linear-gradient(135deg, #2f1c14, #7b3f17 55%, #fff8ec)`
    : "radial-gradient(circle at 25% 25%, #c89b3c, transparent 32%), linear-gradient(135deg, #2f1c14, #7b3f17 55%, #fff8ec)";

  return (
    <div className="grid gap-10 lg:gap-12">
      {merchandising.announcementStrip ? (
        <PromoStrip
          eyebrow="Seasonal Update"
          title={merchandising.announcementStrip.title}
          description={merchandising.announcementStrip.description ?? undefined}
          href={promotionHref(merchandising.announcementStrip)}
          cta={merchandising.announcementStrip.ctaLabel ?? "Explore"}
        />
      ) : null}

      <section className="overflow-hidden rounded-[2rem] border border-omd-sand bg-white shadow-sm">
        <div className="grid min-h-[520px] gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-10 xl:px-14">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{merchandising.hero.eyebrow}</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-omd-brown sm:text-5xl xl:text-6xl">
              {merchandising.hero.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-omd-muted">
              {merchandising.hero.description}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <PremiumLink href={merchandising.hero.href}>{merchandising.hero.ctaLabel}</PremiumLink>
              <PremiumLink href="/services" variant="secondary">Explore Services</PremiumLink>
            </div>
            <div className="mt-8 grid gap-3 text-sm font-semibold text-omd-brown sm:grid-cols-3">
              {["Trusted by devotees", "Authentic ritual-ready products", "Guided seva and spiritual support"].map((point) => (
                <div key={point} className="rounded-2xl border border-omd-sand bg-omd-ivory/70 px-4 py-3">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative min-h-[360px] overflow-hidden bg-omd-brown bg-cover bg-center lg:min-h-full"
            style={{ backgroundImage: heroVisualBackground }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-omd-brown/70 via-omd-brown/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-white/20 bg-white/90 p-5 shadow-xl backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{merchandising.hero.source === "default" ? "Featured offering" : "Merchandising pick"}</p>
              <h2 className="mt-2 text-xl font-semibold text-omd-brown">{merchandising.hero.source === "default" ? heroProduct?.title ?? "Ritual-ready selections" : merchandising.hero.title}</h2>
              <p className="mt-2 line-clamp-2 max-w-[280px] text-sm leading-6 text-omd-muted sm:max-w-none">
                {merchandising.hero.source === "default" ? heroProduct?.shortDescription ?? "Premium devotional products and guided services curated for everyday worship." : merchandising.hero.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      <StorefrontSection
        eyebrow="Shop by intent"
        title="Choose the journey you are shopping for"
        subtitle="Move quickly into the right collection, from daily puja essentials to membership and seva services."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {merchandising.intentCategories.map((category) => (
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
      </StorefrontSection>

      {merchandising.festivals.length ? (
        <StorefrontSection
          eyebrow="Festival focus"
          title="Seasonal devotional collections"
          subtitle="Active festival campaigns curated by the OMDivyaDarshan merchandising team."
        >
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {merchandising.festivals.slice(0, 3).map((festival) => (
              <CollectionCard
                key={festival.id}
                title={festival.title}
                description={festival.shortDescription}
                href={festival.ctaUrl ?? `/festivals/${festival.slug}`}
                cta={festival.ctaLabel ?? "Explore Festival"}
                imageUrl={festival.cardImage ?? festival.heroImage}
              />
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      {merchandising.shopTopBanner ? (
        <PromoStrip
          eyebrow="Shop Highlight"
          title={merchandising.shopTopBanner.title}
          description={merchandising.shopTopBanner.description ?? undefined}
          href={promotionHref(merchandising.shopTopBanner)}
          cta={merchandising.shopTopBanner.ctaLabel ?? "View Now"}
        />
      ) : null}

      <section className="rounded-[1.75rem] border border-omd-sand bg-white/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-2 pb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Discover</p>
          <h2 className="text-2xl font-semibold text-omd-brown">Find the right offering</h2>
        </div>
        <form className="grid gap-3 xl:grid-cols-[1fr_170px_170px_170px_150px_auto]">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search products, kits, memberships"
            className="h-12 rounded-2xl border border-omd-sand bg-omd-ivory/40 px-4 text-sm outline-none focus:border-omd-gold"
          />
          <select name="type" defaultValue={params.type ?? ""} className="h-12 rounded-2xl border border-omd-sand bg-omd-ivory/40 px-4 text-sm outline-none focus:border-omd-gold">
            <option value="">All types</option>
            <option value="PHYSICAL">Products</option>
            <option value="KIT">Kits</option>
            <option value="MEMBERSHIP">Membership</option>
            <option value="DIGITAL">Digital</option>
          </select>
          <select name="stock" defaultValue={params.stock ?? ""} className="h-12 rounded-2xl border border-omd-sand bg-omd-ivory/40 px-4 text-sm outline-none focus:border-omd-gold">
            <option value="">Any stock</option>
            <option value="in">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>
          <select name="sort" defaultValue={params.sort ?? "featured"} className="h-12 rounded-2xl border border-omd-sand bg-omd-ivory/40 px-4 text-sm outline-none focus:border-omd-gold">
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-asc">Price low</option>
            <option value="price-desc">Price high</option>
            <option value="rating">Top rated</option>
            <option value="name">Name</option>
          </select>
          <select name="rating" defaultValue={params.rating ?? ""} className="h-12 rounded-2xl border border-omd-sand bg-omd-ivory/40 px-4 text-sm outline-none focus:border-omd-gold">
            <option value="">Any rating</option>
            <option value="4">4+ rating</option>
            <option value="3">3+ rating</option>
          </select>
          <button className="h-12 rounded-2xl bg-omd-brown px-6 text-sm font-semibold text-white shadow-sm hover:bg-omd-saffron">
            Apply
          </button>
        </form>
        <div className="mt-4 flex max-w-[320px] flex-wrap gap-2 sm:max-w-none">
          <FilterChip href="/shop" selected={!hasFilters}>All</FilterChip>
          <FilterChip href={filterHref(params, { type: "KIT" })} selected={params.type === "KIT"}>Kits</FilterChip>
          <FilterChip href="/shop/category/puja-samagri">Puja Samagri</FilterChip>
          <FilterChip href={filterHref(params, { stock: "in" })} selected={params.stock === "in"}>In Stock</FilterChip>
          <FilterChip href={filterHref(params, { sort: "rating" })} selected={params.sort === "rating"}>Best Sellers</FilterChip>
          <FilterChip href={filterHref(params, { sort: "newest" })} selected={params.sort === "newest"}>New Arrivals</FilterChip>
          <FilterChip href={filterHref(params, { featured: "true" })} selected={params.featured === "true"}>On Sale</FilterChip>
        </div>
      </section>

      <StorefrontSection
        eyebrow={hasFilters ? "Filtered picks" : "Featured products"}
        title={hasFilters ? "Products matching your search" : "Featured Products"}
        subtitle={hasFilters ? `${products.length} matching offerings from the current filters.` : "A curated first look at products and offerings ready for demo checkout."}
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
        eyebrow="Monthly Membership"
        title={membership?.title ?? "Divya Membership"}
        description="Membership for ongoing devotional participation, exclusive benefits, priority support, early access, and free delivery placeholders for future commerce rules."
        href="/membership"
        cta="Explore Membership"
      />

      {kits.length ? (
        <StorefrontSection
          eyebrow="Curated bundles"
          title="Kits & Bundles"
          subtitle="Grouped offerings for devotees who want a complete ritual-ready selection."
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
        eyebrow={hasFilters ? "Results" : "Best sellers preview"}
        title={hasFilters ? "Filtered Product Preview" : "Best Sellers & All Products"}
        subtitle="A focused storefront preview. Use the full listing when you want to browse every active product."
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

      <section className="flex flex-col gap-3 rounded-[1.75rem] border border-omd-sand bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Need guided help?</p>
          <h2 className="mt-1 text-xl font-semibold text-omd-brown">Explore seva services and spiritual support.</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <PremiumLink href="/services" variant="secondary">Services</PremiumLink>
          <Link href="/services/asthi-visarjan" className="inline-flex min-h-11 items-center justify-center rounded-full bg-omd-brown px-5 text-sm font-semibold text-white hover:bg-omd-saffron">
            Asthi Visarjan
          </Link>
        </div>
      </section>

      {categories.length === 0 ? null : (
        <nav className="flex flex-wrap gap-2 text-sm text-omd-muted" aria-label="Store collections">
          {categories.slice(0, 10).map((category) => (
            <Link key={category.id} href={`/shop/category/${category.slug}`} className="rounded-full border border-omd-sand bg-white px-3 py-1.5 font-semibold hover:border-omd-gold hover:text-omd-brown">
              {category.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
