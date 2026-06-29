import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogCard } from "@/components/catalog-card";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { TagChips } from "@/components/tag-chips";
import { StatusBadge } from "@/components/ui";
import { PremiumLink, StorefrontSection } from "@/components/storefront";
import { getOmdTenantId } from "@/lib/catalog";
import { getActiveFestivalCampaigns } from "@/lib/merchandising";
import { getFestivalRecommendations } from "@/lib/recommendations";
import { getEntityTags } from "@/lib/tag-relations";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(value);
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const [festival] = await getActiveFestivalCampaigns({ slug });

  if (!festival) return {};

  return {
    title: festival.seoTitle ?? festival.title,
    description: festival.seoDescription ?? festival.shortDescription ?? undefined
  };
}

export default async function FestivalPage({ params }: PageProps) {
  const { slug } = await params;
  const [festival] = await getActiveFestivalCampaigns({ slug });

  if (!festival) notFound();

  const heroImage = festival.heroImage ?? festival.cardImage;
  const safeHeroImage = heroImage?.replaceAll('"', "%22");
  const tenantId = await getOmdTenantId();
  const [tagRelations, festivalRecommendations] = await Promise.all([
    getEntityTags(tenantId, "FESTIVAL_CAMPAIGN", festival.id),
    getFestivalRecommendations({ tenantId, festivalId: festival.id, limit: 6 })
  ]);
  const assignedTags = tagRelations.map((relation) => relation.tag).filter((tag) => tag.status === "ACTIVE");

  return (
    <div className="grid gap-10 lg:gap-12">
      <CustomerEventBeacon
        eventType="FESTIVAL_VIEW"
        entityType="FESTIVAL"
        entityId={festival.id}
        entitySlug={festival.slug}
        metadata={{
          title: festival.title,
          tags: assignedTags.map((tag) => ({ id: tag.id, name: tag.name, type: tag.type })),
          linkedProducts: festival.products.length,
          linkedServices: festival.services.length,
          linkedCategories: festival.categories.length
        }}
      />
      <section className="overflow-hidden rounded-[2rem] border border-omd-sand bg-white shadow-sm">
        <div className="grid min-h-[440px] lg:grid-cols-[1fr_0.9fr]">
          <div className="flex flex-col justify-center px-5 py-10 sm:px-8 lg:px-12">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Festival Campaign</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-omd-brown sm:text-5xl">{festival.title}</h1>
            {festival.shortDescription ? <p className="mt-5 max-w-2xl text-base leading-7 text-omd-muted">{festival.shortDescription}</p> : null}
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusBadge tone="success">{formatDate(festival.startDate)} - {formatDate(festival.endDate)}</StatusBadge>
              {festival.isFeatured ? <StatusBadge tone="warning">Featured</StatusBadge> : null}
            </div>
            <div className="mt-5">
              <TagChips tags={assignedTags} />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <PremiumLink href={festival.ctaUrl ?? "#festival-products"}>{festival.ctaLabel ?? "Shop Festival"}</PremiumLink>
              <PremiumLink href="/shop" variant="secondary">Back to Shop</PremiumLink>
            </div>
          </div>
          <div
            className="min-h-[320px] bg-omd-brown bg-cover bg-center"
            style={{
              backgroundImage: heroImage
                ? `linear-gradient(180deg, rgba(47, 28, 20, 0.04), rgba(47, 28, 20, 0.45)), url("${safeHeroImage}")`
                : "radial-gradient(circle at 25% 25%, #c89b3c, transparent 32%), linear-gradient(135deg, #2f1c14, #7b3f17 55%, #fff8ec)"
            }}
          />
        </div>
      </section>

      {festival.longDescription ? (
        <section className="rounded-2xl border border-omd-sand bg-white p-6 shadow-sm">
          <p className="max-w-4xl whitespace-pre-line text-sm leading-7 text-omd-muted">{festival.longDescription}</p>
        </section>
      ) : null}

      <StorefrontSection
        eyebrow="Festival products"
        title="Products, kits and memberships"
        subtitle="Linked sellable records selected by the merchandising team for this festival."
        className="scroll-mt-28"
      >
        <div id="festival-products" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {festivalRecommendations.products.map((recommendation) => (
            <div key={recommendation.item.id} className="grid gap-3">
              <CatalogCard item={recommendation.item} />
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

      {festivalRecommendations.services.length ? (
        <StorefrontSection eyebrow="Festival services" title="Services for this campaign" subtitle="Service offerings linked to this festival campaign.">
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {festivalRecommendations.services.map((recommendation) => (
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

      <section className="rounded-2xl border border-omd-sand bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Linked categories</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {festival.categories.map((item) => (
            <Link key={item.categoryId} href={`/shop/category/${item.category.slug}`} className="rounded-full border border-omd-sand bg-omd-ivory px-3 py-1.5 text-sm font-semibold text-omd-brown hover:border-omd-gold">
              {item.category.name}
            </Link>
          ))}
          {festival.categories.length === 0 ? <span className="text-sm text-omd-muted">No categories linked yet.</span> : null}
        </div>
      </section>
    </div>
  );
}
