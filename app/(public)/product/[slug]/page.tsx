import Link from "next/link";
import { formatMoney, getCatalogItemBySlug } from "@/lib/catalog";
import { addToCartAction } from "@/lib/cart-actions";
import { getVariantStockSummaries, isPhysicalInventoryType } from "@/lib/inventory";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function stockLabel(stock: { available: number; status: string } | null | undefined) {
  if (!stock) return "Stock pending setup";
  if (stock.status === "OUT_OF_STOCK") return "Out of stock";
  if (stock.status === "LOW_STOCK") return `Low stock: ${stock.available} available`;
  return `${stock.available} in stock`;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCatalogItemBySlug(slug);
  const isPhysical = isPhysicalInventoryType(product.type);
  const stockByVariant = await getVariantStockSummaries(isPhysical ? product.variants.map((variant) => variant.id) : []);

  return (
    <article className="grid gap-8">
      <section className="rounded-lg border border-omd-sand bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">
          {product.category?.name ?? "OMD Catalog"}
        </p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-omd-brown">{product.title}</h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-omd-muted">
              {product.description ?? product.shortDescription ?? "Details coming soon."}
            </p>
          </div>
          <span className="rounded-full border border-omd-gold px-3 py-1 text-sm font-semibold text-omd-brown">
            {product.type}
          </span>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-[1fr_1fr]">
        <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-lg border border-omd-sand bg-white shadow-sm">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="p-8 text-center text-omd-muted">
              <p className="text-sm font-semibold uppercase tracking-wide text-omd-saffron">OMDivyaDarshan</p>
              <p className="mt-3 text-xl font-semibold text-omd-brown">{product.category?.name ?? product.type}</p>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-omd-sand bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-omd-brown">Price & Variants</h2>
          <p className="mt-4 text-2xl font-semibold text-omd-brown">
            {product.variants.length > 0 ? "From " : ""}
            {formatMoney(product.variants[0]?.price ?? product.basePrice, product.currency)}
            {product.mrp ? <span className="ml-3 text-base font-normal text-omd-muted line-through">{formatMoney(product.mrp, product.currency)}</span> : null}
          </p>
          <div className="mt-4 grid gap-2">
            {product.variants.length > 0 ? (
              product.variants.map((variant: (typeof product.variants)[number]) => {
                const stock = stockByVariant.get(variant.id);

                return (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between rounded-md border border-omd-sand px-3 py-2 text-sm"
                  >
                    <span className="text-omd-muted">
                      {variant.title ?? variant.sku ?? "Default"} - {variant.stockStatus}
                      {isPhysical ? ` - ${stockLabel(stock)}` : ""}
                    </span>
                    <span className="font-semibold text-omd-brown">
                      {formatMoney(variant.price ?? product.basePrice, product.currency)}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-omd-muted">Variant options coming in a later phase.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-omd-gold bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-omd-brown">Next Step</h2>
          <p className="mt-4 text-sm leading-6 text-omd-muted">
            Choose an available option and add it to your cart. Checkout is a review shell only; payment is coming in Phase 4.
          </p>
          <div className="mt-6 grid gap-3">
            {product.variants.length > 0 ? (
              product.variants.map((variant) => {
                const stock = stockByVariant.get(variant.id);
                const canAddVariant = !isPhysical || Boolean(stock && stock.available > 0);

                return (
                  <form key={variant.id} action={addToCartAction} className="rounded-md border border-omd-sand p-3">
                    <input type="hidden" name="productId" value={product.id} />
                    <input type="hidden" name="variantId" value={variant.id} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-omd-brown">{variant.title ?? variant.sku ?? "Default"}</p>
                        <p className="mt-1 text-sm text-omd-muted">
                          {formatMoney(variant.price ?? product.basePrice, product.currency)}
                          {isPhysical ? ` - ${stockLabel(stock)}` : ""}
                        </p>
                      </div>
                      <button
                        type="submit"
                        disabled={!canAddVariant}
                        className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron disabled:cursor-not-allowed disabled:bg-omd-muted"
                      >
                        {canAddVariant ? "Add to cart" : "Out of stock"}
                      </button>
                    </div>
                  </form>
                );
              })
            ) : (
              <form action={addToCartAction}>
                <input type="hidden" name="productId" value={product.id} />
                <button className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
                  Add to cart
                </button>
              </form>
            )}
            <Link href="/shop" className="text-sm font-semibold text-omd-saffron hover:text-omd-brown">
              Back to shop
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
