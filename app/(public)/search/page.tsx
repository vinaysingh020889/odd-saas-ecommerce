import Link from "next/link";
import { CatalogCard } from "@/components/catalog-card";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { TagChips } from "@/components/tag-chips";
import { EmptyState } from "@/components/ui";
import { PremiumLink, StorefrontSection } from "@/components/storefront";
import { getCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { logSearchQuery, searchSite } from "@/lib/search";

type PageProps = {
  searchParams: Promise<{ q?: string; source?: string }>;
};

function searchHref(query: string) {
  return `/search?q=${encodeURIComponent(query)}`;
}

function ResultReason({ reason }: { reason: string }) {
  return <span className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{reason}</span>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const [{ q, source }, user] = await Promise.all([searchParams, getCurrentUser()]);
  const tenantId = await getOmdTenantId();
  const query = q?.trim() ?? "";
  const results = await searchSite({ tenantId, query });

  if (query) {
    await logSearchQuery({
      tenantId,
      query,
      resultCount: results.resultCount,
      userId: user?.id,
      source: source ?? "public_search"
    });
  }

  const hasQuery = Boolean(results.normalizedQuery);
  const hasResults = results.resultCount > 0;

  return (
    <div className="grid gap-8">
      {hasQuery ? (
        <CustomerEventBeacon
          eventType="SEARCH"
          entityType="SEARCH_QUERY"
          entitySlug={results.normalizedQuery}
          metadata={{ query, normalizedQuery: results.normalizedQuery, resultCount: results.resultCount, source: source ?? "public_search" }}
        />
      ) : null}
      <section className="rounded-[1.5rem] border border-omd-sand bg-white p-5 shadow-sm md:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Smart Search</p>
        <h1 className="mt-2 text-3xl font-semibold text-omd-brown">Search OMDivyaDarshan</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-omd-muted">
          Search products, services, categories, festivals, and spiritual context tags from one place.
        </p>
        <form className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            name="q"
            defaultValue={query}
            placeholder="Try Shiv, Ganga Jal, Sawan, Pind Daan, Raksha Bandhan..."
            className="h-12 flex-1 rounded-xl border border-omd-sand bg-white px-4 text-sm outline-none focus:border-omd-gold"
          />
          <input type="hidden" name="source" value="search_page" />
          <button className="h-12 rounded-xl bg-omd-brown px-5 text-sm font-semibold text-white hover:bg-omd-saffron">
            Search
          </button>
        </form>
        {hasQuery ? (
          <p className="mt-4 text-sm text-omd-muted">
            {hasResults ? `${results.resultCount} result(s) for "${query}"` : `No direct results for "${query}"`}
          </p>
        ) : null}
      </section>

      {!hasQuery ? (
        <EmptyState
          title="Start with a devotional term"
          description="Search by product name, service, festival, place, deity, ritual, tag, or common spelling alias."
        />
      ) : null}

      {hasQuery && !hasResults && results.suggestions ? (
        <section className="grid gap-5 rounded-[1.5rem] border border-omd-sand bg-white p-5 shadow-sm">
          <EmptyState title="No matching results yet" description="Try one of these seeded demo contexts or browse core collections." />
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h2 className="text-sm font-semibold text-omd-brown">Popular tags</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {results.suggestions.popularTags.map((tag) => (
                  <Link key={tag.id} href={searchHref(tag.name)} className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1.5 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-omd-brown">Top categories</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {results.suggestions.topCategories.map((category) => (
                  <Link key={category.id} href={`/shop/category/${category.slug}`} className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1.5 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <PremiumLink href="/services">Browse Services</PremiumLink>
            <PremiumLink href="/shop" variant="secondary">Browse Shop</PremiumLink>
          </div>
        </section>
      ) : null}

      {results.products.length ? (
        <StorefrontSection eyebrow="Products" title="Product matches" subtitle="Catalog items ranked by title, slug, tag context, and content relevance.">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {results.products.map((product) => (
              <div key={product.id} className="grid gap-3">
                <ResultReason reason={product.reason} />
                <CatalogCard item={product} />
                <TagChips tags={product.matchedTags} />
              </div>
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      {results.services.length ? (
        <StorefrontSection eyebrow="Services" title="Service matches" subtitle="Guided seva and service offerings matched by title, content, and context tags.">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {results.services.map((service) => (
              <div key={service.id} className="grid gap-3">
                <ResultReason reason={service.reason} />
                <CatalogCard item={service} href={service.slug === "asthi-visarjan-assistance" ? "/services/asthi-visarjan" : `/product/${service.slug}`} />
                <TagChips tags={service.matchedTags} />
              </div>
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      {results.categories.length ? (
        <StorefrontSection eyebrow="Categories" title="Category matches" subtitle="Browse matching collections and subcategories.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {results.categories.map((category) => (
              <Link key={category.id} href={`/shop/category/${category.slug}`} className="rounded-2xl border border-omd-sand bg-white p-4 shadow-sm hover:border-omd-gold">
                <ResultReason reason={category.reason} />
                <h2 className="mt-2 text-lg font-semibold text-omd-brown">{category.name}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-omd-muted">{category.description ?? "Browse this OMDivyaDarshan collection."}</p>
                <div className="mt-3"><TagChips tags={category.matchedTags} /></div>
              </Link>
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      {results.festivals.length ? (
        <StorefrontSection eyebrow="Festivals" title="Festival campaign matches" subtitle="Active merchandising campaigns connected to products, categories, services, and tags.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.festivals.map((festival) => (
              <Link key={festival.id} href={`/festivals/${festival.slug}`} className="rounded-2xl border border-omd-sand bg-white p-4 shadow-sm hover:border-omd-gold">
                <ResultReason reason={festival.reason} />
                <h2 className="mt-2 text-lg font-semibold text-omd-brown">{festival.title}</h2>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-omd-muted">{festival.shortDescription ?? "Festival campaign details."}</p>
                <div className="mt-3"><TagChips tags={festival.matchedTags} /></div>
              </Link>
            ))}
          </div>
        </StorefrontSection>
      ) : null}

      {results.tags.length ? (
        <StorefrontSection eyebrow="Tags" title="Context tag matches" subtitle="Search terms matched directly to the context graph.">
          <div className="flex flex-wrap gap-2">
            {results.tags.map((tag) => (
              <Link key={tag.id} href={searchHref(tag.name)} className="rounded-full border border-omd-sand bg-white px-3 py-1.5 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                {tag.name}
              </Link>
            ))}
          </div>
        </StorefrontSection>
      ) : null}
    </div>
  );
}
