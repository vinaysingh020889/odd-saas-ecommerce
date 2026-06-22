import { CatalogCard } from "@/components/catalog-card";
import { getActiveCatalogItems, getActiveCategories, serviceTypes } from "@/lib/catalog";

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

  return (
    <div className="grid gap-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Services</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Services</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">
          Discover demo service listings for puja, Asthi Visarjan, Kundli, and membership. Booking and capacity logic are not active.
        </p>
      </section>

      <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-omd-brown">Service Categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/services"
            className={`rounded-full px-3 py-1 text-sm font-semibold ${
              params.category || params.type ? "border border-omd-sand text-omd-muted" : "bg-omd-brown text-white"
            }`}
          >
            All
          </a>
          {categories.map((category) => (
            <a
              key={category.id}
              href={filterHref({ category: category.slug })}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                params.category === category.slug
                  ? "bg-omd-brown text-white"
                  : "border border-omd-sand text-omd-muted"
              }`}
            >
              {category.name}
            </a>
          ))}
          {["SERVICE", "KIT", "MEMBERSHIP"].map((type) => (
            <a
              key={type}
              href={filterHref({ type })}
              className={`rounded-full px-3 py-1 text-sm font-semibold ${
                params.type === type ? "bg-omd-brown text-white" : "border border-omd-sand text-omd-muted"
              }`}
            >
              {type}
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredServices.length === 0 ? (
          <div className="rounded-lg border border-omd-sand bg-white p-8 text-omd-muted">No services match your filters.</div>
        ) : null}
        {filteredServices.map((service) => (
          <CatalogCard
            key={service.id}
            item={service}
            href={service.slug === "asthi-visarjan-assistance" ? "/services/asthi-visarjan" : `/product/${service.slug}`}
          />
        ))}
      </section>
    </div>
  );
}
