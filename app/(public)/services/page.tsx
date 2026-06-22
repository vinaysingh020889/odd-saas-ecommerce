import { CatalogCard } from "@/components/catalog-card";
import { getActiveCatalogItems, getActiveCategories, serviceTypes } from "@/lib/catalog";

type ServicesPageProps = {
  searchParams: Promise<{ category?: string; type?: string }>;
};

export default async function ServicesPage({ searchParams }: ServicesPageProps) {
  const params = await searchParams;
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
          <a href="/services" className="rounded-full bg-omd-brown px-3 py-1 text-sm font-semibold text-white">All</a>
          {categories.map((category) => (
            <a
              key={category.id}
              href={`/services?category=${category.slug}`}
              className="rounded-full border border-omd-sand px-3 py-1 text-sm text-omd-muted"
            >
              {category.name}
            </a>
          ))}
          {["SERVICE", "PACKAGE", "MEMBERSHIP"].map((type) => (
            <a key={type} href={`/services?type=${type}`} className="rounded-full border border-omd-sand px-3 py-1 text-sm text-omd-muted">{type}</a>
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
