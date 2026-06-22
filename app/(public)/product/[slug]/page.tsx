import Link from "next/link";
import { formatMoney, getCatalogItemBySlug } from "@/lib/catalog";
import { addToCartAction } from "@/lib/cart-actions";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCatalogItemBySlug(slug);

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
              product.variants.map((variant: (typeof product.variants)[number]) => (
                <div
                  key={variant.id}
                  className="flex items-center justify-between rounded-md border border-omd-sand px-3 py-2 text-sm"
                >
                  <span className="text-omd-muted">{variant.title ?? variant.sku ?? "Default"} · {variant.stockStatus}</span>
                  <span className="font-semibold text-omd-brown">
                    {formatMoney(variant.price ?? product.basePrice, product.currency)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-omd-muted">Variant options coming in a later phase.</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-omd-gold bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-omd-brown">Next Step</h2>
          <p className="mt-4 text-sm leading-6 text-omd-muted">
            Add this item to your cart. Checkout is a review shell only; payment is coming in Phase 4.
          </p>
          <form action={addToCartAction} className="mt-6 grid gap-3">
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="variantId" value={product.variants[0]?.id ?? ""} />
            <button
              type="submit"
              className="inline-flex justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron"
            >
              Add to cart
            </button>
            <Link href="/shop" className="text-sm font-semibold text-omd-saffron hover:text-omd-brown">
              Back to shop
            </Link>
          </form>
        </div>
      </section>
    </article>
  );
}
