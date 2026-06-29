import Link from "next/link";
import { CatalogCard } from "@/components/catalog-card";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { TagChips } from "@/components/tag-chips";
import { BreadcrumbHeader, EmptyState } from "@/components/ui";
import { StorefrontSection } from "@/components/storefront";
import { getActiveCatalogItems, getActiveCategories, getOmdTenantId, serviceTypes } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getRequiredSamagri } from "@/lib/recommendations";

type ServicesPageProps = {
  searchParams: Promise<{ category?: string; type?: string }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const params = await searchParams;
  const filterHref = (filter: { category?: string; type?: string }) => {
    const nextParams = new URLSearchParams();
    if (filter.category) nextParams.set("category", filter.category);
    if (filter.type) nextParams.set("type", filter.type);
    const queryString = nextParams.toString();

    return queryString ? `/services?${queryString}` : "/services";
  };
  const [services, categories] = await Promise.all([
    getActiveCatalogItems(serviceTypes),
    getActiveCategories(["SERVICE", "MIXED"])
  ]);
  const filteredServices = services
    .filter((service) => !params.category || service.category?.slug === params.category)
    .filter((service) => !params.type || service.type === params.type)
    .sort((left, right) => Number(right.featured) - Number(left.featured) || left.sortOrder - right.sortOrder);
  const tenantId = await getOmdTenantId();
  const serviceTagRelations = filteredServices.length
    ? await prisma.tagRelation.findMany({
        where: {
          tenantId,
          targetType: "SERVICE",
          targetId: { in: filteredServices.map((service) => service.id) },
          tag: { status: "ACTIVE" }
        },
        include: { tag: { select: { id: true, name: true, type: true, status: true } } },
        orderBy: [{ sortOrder: "asc" }, { tag: { name: "asc" } }]
      })
    : [];
  const tagsByServiceId = new Map<string, Array<{ id: string; name: string; type: string }>>();
  for (const relation of serviceTagRelations) {
    const current = tagsByServiceId.get(relation.targetId) ?? [];
    current.push(relation.tag);
    tagsByServiceId.set(relation.targetId, current);
  }
  const requiredSamagri = filteredServices[0] ? await getRequiredSamagri({ tenantId, serviceId: filteredServices[0].id, limit: 4 }) : [];

  return (
    <div className="grid gap-8">
      <CustomerEventBeacon
        eventType="SERVICE_VIEW"
        entityType="SERVICE"
        entitySlug="services"
        metadata={{
          title: "Services Listing",
          visibleServices: filteredServices.map((service) => ({ id: service.id, title: service.title, slug: service.slug })),
          categoryFilter: params.category ?? null,
          typeFilter: params.type ?? null
        }}
      />
      <BreadcrumbHeader items={[{ label: "Home", href: "/" }, { label: "Services" }]} />

      <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-omd-brown">Service Categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/services"
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              params.category || params.type ? "border border-omd-sand text-omd-muted" : "bg-omd-brown text-white"
            }`}
          >
            All
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={filterHref({ category: category.slug })}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                params.category === category.slug
                  ? "bg-omd-brown text-white"
                  : "border border-omd-sand text-omd-muted"
              }`}
            >
              {category.name}
            </Link>
          ))}
          {["SERVICE", "KIT", "MEMBERSHIP"].map((type) => (
            <Link
              key={type}
              href={filterHref({ type })}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                params.type === type ? "bg-omd-brown text-white" : "border border-omd-sand text-omd-muted"
              }`}
            >
              {type}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredServices.length === 0 ? (
          <EmptyState title="No services found" description="Try another service type or clear the selected filter." />
        ) : null}
        {filteredServices.map((service) => (
          <div key={service.id} className="grid gap-3">
            <CatalogCard
              item={service}
              href={service.slug === "asthi-visarjan-assistance" ? "/services/asthi-visarjan" : `/services/${service.slug}`}
            />
            <TagChips tags={tagsByServiceId.get(service.id) ?? []} label="Service tags" />
          </div>
        ))}
      </section>

      {requiredSamagri.length ? (
        <StorefrontSection
          eyebrow="Useful with seva"
          title="Required Samagri"
          subtitle="Products and kits connected to the visible service context through shared tags."
        >
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {requiredSamagri.map((recommendation) => (
              <div key={recommendation.item.id} className="grid gap-3">
                <CatalogCard item={recommendation.item} stock={recommendation.stock} />
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
    </div>
  );
}
