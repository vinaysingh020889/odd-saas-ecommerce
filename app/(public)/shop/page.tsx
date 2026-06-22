import { CatalogCard } from "@/components/catalog-card";
import { getActiveCatalogItems, getActiveCategories, productTypes } from "@/lib/catalog";

type ShopPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    sort?: string;
  }>;
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const [products, categories] = await Promise.all([
    getActiveCatalogItems(productTypes),
    getActiveCategories(["PRODUCT", "MIXED"])
  ]);
  const query = (params.q ?? "").toLowerCase();
  const filteredProducts = products
    .filter((product) => !params.category || product.category?.slug === params.category)
    .filter((product) => !query || `${product.title} ${product.description ?? ""} ${product.shortDescription ?? ""}`.toLowerCase().includes(query))
    .sort((left, right) => {
      if (params.sort === "price-asc") return Number(left.basePrice ?? 0) - Number(right.basePrice ?? 0);
      if (params.sort === "price-desc") return Number(right.basePrice ?? 0) - Number(left.basePrice ?? 0);
      if (params.sort === "newest") return right.createdAt.getTime() - left.createdAt.getTime();
      return Number(right.featured) - Number(left.featured) || left.sortOrder - right.sortOrder;
    });

  return (
    <div className="grid gap-8">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">Commerce</p>
        <h1 className="mt-3 text-3xl font-semibold text-omd-brown">Shop</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-omd-muted">
          Browse demo OMDivyaDarshan products and packages. Cart, checkout, payment, and inventory are reserved for later phases.
        </p>
      </section>

      <section className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-omd-brown">Find Products</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_220px_180px_auto]">
          <input name="q" defaultValue={params.q ?? ""} placeholder="Search products" className="h-10 rounded-md border border-omd-sand px-3 text-sm" />
          <select name="category" defaultValue={params.category ?? ""} className="h-10 rounded-md border border-omd-sand px-3 text-sm">
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>{category.name}</option>
            ))}
          </select>
          <select name="sort" defaultValue={params.sort ?? "featured"} className="h-10 rounded-md border border-omd-sand px-3 text-sm">
            <option value="featured">Featured/default</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
            <option value="newest">Newest</option>
          </select>
          <button className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">Apply</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/shop" className="rounded-full bg-omd-brown px-3 py-1 text-sm font-semibold text-white">All</a>
          {categories.map((category) => (
            <a
              key={category.id}
              href={`/shop?category=${category.slug}`}
              className="rounded-full border border-omd-sand px-3 py-1 text-sm text-omd-muted"
            >
              {category.name}
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-omd-sand bg-white p-8 text-omd-muted">No products match your filters.</div>
        ) : null}
        {filteredProducts.map((product) => (
          <CatalogCard key={product.id} item={product} />
        ))}
      </section>
    </div>
  );
}
