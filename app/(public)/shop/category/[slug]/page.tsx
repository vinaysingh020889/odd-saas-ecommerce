import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogCard } from "@/components/catalog-card";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { TagChips } from "@/components/tag-chips";
import { EmptyState } from "@/components/ui";
import { FilterChip, PremiumLink, PromoStrip, StorefrontSection, TrustFeatureStrip } from "@/components/storefront";
import { categoryScopeIds, getActiveCategoryTree, getCategoryBySlugWithFamily, getOmdTenantId, productTypes } from "@/lib/catalog";
import { getRelatedServices } from "@/lib/recommendations";
import { getStorefrontProducts, productPrimaryImage, type StorefrontProduct, type StorefrontSearchParams } from "@/lib/storefront";
import { getEntityTags } from "@/lib/tag-relations";

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<StorefrontSearchParams>;
};

function inputClass() {
  return "h-11 rounded-xl border border-omd-sand bg-white px-3 text-sm outline-none transition focus:border-omd-gold";
}

function filterHref(slug: string, filters: StorefrontSearchParams, updates: StorefrontSearchParams) {
  const next = new URLSearchParams();
  const merged = { ...filters, ...updates };

  for (const [key, value] of Object.entries(merged)) {
    if (value) next.set(key, value);
  }

  const query = next.toString();
  return query ? `/shop/category/${slug}?${query}` : `/shop/category/${slug}`;
}

function listingHref(href: string) {
  return `${href}#products`;
}

function stockForProduct(product: StorefrontProduct, stockByVariant: Awaited<ReturnType<typeof getStorefrontProducts>>["stockByVariant"]) {
  return product.variants[0]?.id ? stockByVariant.get(product.variants[0].id) ?? null : null;
}

function activeFilterLabels(filters: StorefrontSearchParams) {
  const labels: string[] = [];

  if (filters.q) labels.push(`Search: ${filters.q}`);
  if (filters.type) labels.push(filters.type === "PHYSICAL" ? "Products" : filters.type.toLowerCase());
  if (filters.stock) labels.push(filters.stock === "in" ? "In Stock" : filters.stock === "low" ? "Low Stock" : "Out of Stock");
  if (filters.rating) labels.push(`${filters.rating}+ Rating`);
  if (filters.minPrice) labels.push(`From ₹${filters.minPrice}`);
  if (filters.maxPrice) labels.push(`Under ₹${filters.maxPrice}`);
  if (filters.featured === "true") labels.push("Featured");

  return labels;
}

function categoryFallbackDescription(name: string) {
  return `Explore curated ${name.toLowerCase()} selected for devotional quality, practical ritual use, and a confident OMDivyaDarshan shopping experience.`;
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const [{ slug }, filters] = await Promise.all([params, searchParams]);
  const tenantId = await getOmdTenantId();
  const [category, categoryTree] = await Promise.all([
    getCategoryBySlugWithFamily(slug, ["PRODUCT", "MIXED"]),
    getActiveCategoryTree(["PRODUCT", "MIXED"])
  ]);

  if (!category) {
    notFound();
  }

  const scopedCategoryIds = category.parentId ? [category.id] : categoryScopeIds(category);

  const [{ products, stockByVariant }, tagRelations, relatedServices] = await Promise.all([
    getStorefrontProducts({
      categoryIds: scopedCategoryIds,
      searchParams: filters,
      types: productTypes
    }),
    getEntityTags(tenantId, "CATEGORY", category.id),
    getRelatedServices({ tenantId, targetType: "CATEGORY", targetId: category.id, categoryId: category.id, limit: 3 })
  ]);
  const assignedTags = tagRelations.map((relation) => relation.tag).filter((tag) => tag.status === "ACTIVE");

  const heroTitle = category.homepageIntentTitle || category.name;
  const heroDescription = category.homepageIntentDescription || category.description || categoryFallbackDescription(category.name);
  const heroProduct = products.find((product) => productPrimaryImage(product));
  const productHeroImage = heroProduct ? productPrimaryImage(heroProduct) : null;
  const heroImage = category.homepageIntentImage || productHeroImage;
  const safeHeroImage = heroImage?.replaceAll('"', "%22");
  const heroVisualBackground = heroImage
    ? `linear-gradient(180deg, rgba(47, 28, 20, 0.04), rgba(47, 28, 20, 0.52)), url("${safeHeroImage}"), radial-gradient(circle at 25% 20%, #c89b3c, transparent 30%), radial-gradient(circle at 80% 75%, #d97706, transparent 28%), linear-gradient(135deg, #2f1c14, #7b6656)`
    : "radial-gradient(circle at 25% 20%, #c89b3c, transparent 30%), radial-gradient(circle at 80% 75%, #d97706, transparent 28%), linear-gradient(135deg, #2f1c14, #7b6656)";
  const labels = activeFilterLabels(filters);
  const hasFilters = labels.length > 0 || Boolean(filters.sort);

  return (
    <div className="grid gap-8 lg:gap-10">
      <CustomerEventBeacon
        eventType="CATEGORY_VIEW"
        entityType="CATEGORY"
        entityId={category.id}
        entitySlug={category.slug}
        metadata={{
          title: category.name,
          categoryId: category.id,
          categoryName: category.name,
          parentId: category.parentId,
          productCount: products.length,
          tags: assignedTags.map((tag) => ({ id: tag.id, name: tag.name, type: tag.type }))
        }}
      />
      <nav className="flex flex-wrap items-center gap-2 text-sm text-omd-muted" aria-label="Breadcrumb">
        <Link href="/" className="font-semibold hover:text-omd-saffron">Home</Link>
        <span className="text-omd-sand">/</span>
        <Link href="/shop" className="font-semibold hover:text-omd-saffron">Shop</Link>
        <span className="text-omd-sand">/</span>
        {category.parent ? (
          <>
            <Link href={`/shop/category/${category.parent.slug}`} className="font-semibold hover:text-omd-saffron">{category.parent.name}</Link>
            <span className="text-omd-sand">/</span>
          </>
        ) : null}
        <span>{category.name}</span>
      </nav>

      <section className="overflow-hidden rounded-[2rem] border border-omd-sand bg-white shadow-sm">
        <div className="grid min-h-[420px] lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col justify-center px-5 py-9 sm:px-8 lg:px-10">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Collection</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-omd-brown sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-[300px] text-base leading-7 text-omd-muted sm:max-w-2xl">
              {heroDescription}
            </p>
            <div className="mt-5">
              <TagChips tags={assignedTags} />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <PremiumLink href="#products">Explore Products</PremiumLink>
              <PremiumLink href={listingHref(filterHref(slug, filters, { sort: "rating" }))} variant="secondary">View Best Sellers</PremiumLink>
            </div>
            <div className="mt-7 grid gap-3 text-sm font-semibold text-omd-brown sm:grid-cols-2 xl:grid-cols-4">
              {["Authentic Products", "Ritual-Ready", "Fast Dispatch", "Trusted by Devotees"].map((point) => (
                <div key={point} className="rounded-2xl border border-omd-sand bg-omd-ivory/70 px-4 py-3">
                  {point}
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative min-h-[300px] overflow-hidden bg-omd-brown bg-cover bg-center"
            style={{ backgroundImage: heroVisualBackground }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-omd-brown/70 via-omd-brown/10 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-white/20 bg-white/90 p-5 shadow-xl backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Showing</p>
              <p className="mt-1 text-2xl font-semibold text-omd-brown">{products.length} products</p>
              <p className="mt-1 text-sm text-omd-muted">
                {category.parentId ? `Filtered within ${category.name}` : `Includes ${category.children.length} subcategories`}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 rounded-[1.5rem] border border-omd-sand bg-white/90 p-4 shadow-sm" id="products">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-omd-brown">{category.name} Products</h2>
            <div className="mt-3 flex max-w-full flex-wrap gap-2">
              <FilterChip href={listingHref(`/shop/category/${slug}`)} selected={!hasFilters}>All</FilterChip>
              <FilterChip href={listingHref(filterHref(slug, filters, { stock: "in" }))} selected={filters.stock === "in"}>In Stock</FilterChip>
              <FilterChip href={listingHref(filterHref(slug, filters, { featured: "true" }))} selected={filters.featured === "true"}>Featured</FilterChip>
              <FilterChip href={listingHref(filterHref(slug, filters, { sort: "rating" }))} selected={filters.sort === "rating"}>Best Sellers</FilterChip>
              <FilterChip href={listingHref(filterHref(slug, filters, { type: "KIT" }))} selected={filters.type === "KIT"}>Kits</FilterChip>
              <FilterChip href={listingHref(filterHref(slug, filters, { rating: "4" }))} selected={filters.rating === "4"}>Highest Rated</FilterChip>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
            <form action={`/shop/category/${slug}#products`} className="flex items-center gap-2">
              {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
              {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
              {filters.stock ? <input type="hidden" name="stock" value={filters.stock} /> : null}
              {filters.rating ? <input type="hidden" name="rating" value={filters.rating} /> : null}
              {filters.minPrice ? <input type="hidden" name="minPrice" value={filters.minPrice} /> : null}
              {filters.maxPrice ? <input type="hidden" name="maxPrice" value={filters.maxPrice} /> : null}
              {filters.featured ? <input type="hidden" name="featured" value={filters.featured} /> : null}
              <label className="sr-only" htmlFor="category-sort">Sort products</label>
              <select id="category-sort" name="sort" defaultValue={filters.sort ?? "featured"} className="h-11 rounded-xl border border-omd-sand bg-white px-3 text-sm outline-none focus:border-omd-gold">
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price low</option>
                <option value="price-desc">Price high</option>
                <option value="rating">Top rated</option>
                <option value="name">Name</option>
              </select>
              <button className="h-11 rounded-xl bg-omd-brown px-4 text-sm font-semibold text-white hover:bg-omd-saffron">Sort</button>
            </form>
            <div className="hidden rounded-xl border border-omd-sand bg-white p-1 text-omd-muted sm:flex" aria-label="View options">
              <span className="rounded-lg bg-omd-ivory px-3 py-2 text-xs font-semibold">Grid</span>
              <span className="px-3 py-2 text-xs font-semibold">List</span>
            </div>
          </div>
        </div>

        <form action={`/shop/category/${slug}#products`} className="grid gap-3 border-t border-omd-sand pt-4 lg:grid-cols-[minmax(220px,1.3fr)_160px_160px_140px_minmax(160px,0.8fr)_auto] lg:items-end">
          <section className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-omd-muted">Search within category</label>
            <input name="q" defaultValue={filters.q ?? ""} placeholder="Search this collection" className={inputClass()} />
          </section>
          <section className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-omd-muted">Product Type</label>
            <select name="type" defaultValue={filters.type ?? ""} className={inputClass()}>
              <option value="">All types</option>
              <option value="PHYSICAL">Products</option>
              <option value="KIT">Kits</option>
              <option value="MEMBERSHIP">Membership</option>
              <option value="DIGITAL">Digital</option>
            </select>
          </section>
          <section className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-omd-muted">Availability</label>
            <select name="stock" defaultValue={filters.stock ?? ""} className={inputClass()}>
              <option value="">Any stock</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </section>
          <section className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-omd-muted">Rating</label>
            <select name="rating" defaultValue={filters.rating ?? ""} className={inputClass()}>
              <option value="">Any rating</option>
              <option value="4">4+ rating</option>
              <option value="3">3+ rating</option>
            </select>
          </section>
          <section className="grid gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-omd-muted">Price / Budget</label>
            <div className="grid grid-cols-2 gap-2">
              <input name="minPrice" defaultValue={filters.minPrice ?? ""} placeholder="Min" inputMode="numeric" className={inputClass()} />
              <input name="maxPrice" defaultValue={filters.maxPrice ?? ""} placeholder="Max" inputMode="numeric" className={inputClass()} />
            </div>
          </section>
          <div className="flex gap-2">
            {filters.featured ? <input type="hidden" name="featured" value={filters.featured} /> : null}
            {filters.sort ? <input type="hidden" name="sort" value={filters.sort} /> : null}
            <button className="h-11 flex-1 rounded-xl bg-omd-brown px-4 text-sm font-semibold text-white hover:bg-omd-saffron">Apply</button>
            <Link href={listingHref(`/shop/category/${slug}`)} className="inline-flex h-11 items-center rounded-xl border border-omd-sand px-4 text-sm font-semibold text-omd-brown hover:border-omd-gold">Clear</Link>
          </div>
        </form>

        {labels.length ? (
          <div className="flex flex-wrap gap-2">
            {labels.map((label) => (
              <span key={label} className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1 text-xs font-semibold text-omd-muted">
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </section>

      <section className="grid gap-6 scroll-mt-28">
        {products.length === 0 ? (
          <EmptyState
            title="No matching products"
            description="No products matched the current filters. Clear filters, browse all products, or return to the main shop."
            actions={
              <>
                <PremiumLink href={listingHref(`/shop/category/${slug}`)}>Clear filters</PremiumLink>
                <PremiumLink href="/shop" variant="secondary">Go back to shop</PremiumLink>
              </>
            }
          />
        ) : (
          <div className="grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {products.map((product) => (
              <CatalogCard key={product.id} item={product} stock={stockForProduct(product, stockByVariant)} />
            ))}
          </div>
        )}
      </section>
      {relatedServices.length ? (
        <StorefrontSection
          eyebrow="Useful with this collection"
          title="Related services"
          subtitle="Service offerings connected to this collection through shared ritual, place, deity, or festival context."
        >
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {relatedServices.map((recommendation) => (
              <div key={recommendation.item.id} className="grid gap-3">
                <CatalogCard
                  item={recommendation.item}
                  href={recommendation.item.slug === "asthi-visarjan-assistance" ? "/services/asthi-visarjan" : `/product/${recommendation.item.slug}`}
                />
                <div className="flex flex-wrap gap-2">
                  {recommendation.contexts.slice(0, 2).map((context) => (
                    <span key={context} className="rounded-full border border-omd-sand bg-white px-3 py-1 text-xs font-semibold text-omd-brown">
                      {context}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      <TrustFeatureStrip />

      <StorefrontSection>
        <div className="flex flex-col gap-3 rounded-[1.5rem] border border-omd-sand bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-omd-brown">Showing {products.length} products in {category.name}</p>
            <p className="mt-1 text-sm text-omd-muted">Continue exploring curated offerings across the full OMDivyaDarshan store.</p>
          </div>
          <PremiumLink href="/shop" variant="secondary">Explore all products</PremiumLink>
        </div>
      </StorefrontSection>
      <PromoStrip
        eyebrow="Recommended"
        title="Divya Membership and Puja Kits"
        description="Pair your product shopping with membership benefits, guided support, and ritual-ready bundled selections."
        href="/membership"
        cta="Explore Membership"
      />
    </div>
  );
}









