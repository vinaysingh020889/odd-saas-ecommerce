import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";
import { addToCartAction, buyNowAction } from "@/lib/cart-actions";
import {
  discountPercent,
  productMrp,
  productPrice,
  productPrimaryImage,
  productRating,
  stockLabel,
  type StorefrontProduct
} from "@/lib/storefront";
import { StatusBadge } from "@/components/ui";
import { PremiumButton } from "@/components/storefront/buttons";

type PremiumProductCardProps = {
  item: CatalogItem | StorefrontProduct;
  href?: string;
  stock?: {
    available: number;
    status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  } | null;
};

export function PremiumProductCard({ item, href = `/product/${item.slug}`, stock }: PremiumProductCardProps) {
  const imageUrl = productPrimaryImage(item);
  const price = productPrice(item);
  const mrp = productMrp(item);
  const discount = discountPercent(price, mrp);
  const rating = productRating(item);
  const variantId = item.variants[0]?.id ?? "";
  const isOutOfStock = stock?.status === "OUT_OF_STOCK";
  const stockText = stockLabel(stock);
  const typeLabel = item.type === "PHYSICAL" ? "Product" : item.type.toLowerCase();
  const safeImageUrl = imageUrl?.replaceAll('"', "%22");
  const visualBackground = imageUrl
    ? `linear-gradient(180deg, rgba(47, 28, 20, 0.02), rgba(47, 28, 20, 0.2)), url("${safeImageUrl}"), radial-gradient(circle at top left, #fff8ec, #ead9bd)`
    : "radial-gradient(circle at top left, #fff8ec, #ead9bd)";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-omd-sand bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-omd-gold hover:shadow-xl">
      <Link href={href} className="block">
        <div
          className="relative aspect-[4/3] overflow-hidden bg-omd-ivory bg-cover bg-center transition duration-500 group-hover:scale-[1.02]"
          style={{ backgroundImage: visualBackground }}
        >
          {!imageUrl ? (
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,#fff8ec,#ead9bd)] px-5 text-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">OMDivyaDarshan</p>
                <p className="mt-2 text-base font-semibold text-omd-brown">{item.category?.name ?? "Catalog"}</p>
              </div>
            </div>
          ) : null}
          <div className="absolute inset-x-0 top-0 flex flex-wrap gap-2 p-3">
            {item.featured ? <StatusBadge tone="warning">Featured</StatusBadge> : null}
            {discount ? <StatusBadge tone="success">{discount}% Off</StatusBadge> : null}
          </div>
          {stockText ? (
            <div className="absolute bottom-3 left-3">
              <StatusBadge tone={stock?.status === "OUT_OF_STOCK" ? "error" : stock?.status === "LOW_STOCK" ? "warning" : "success"}>
                {stockText}
              </StatusBadge>
            </div>
          ) : null}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">
            {item.category?.name ?? "OMD Catalog"}
          </p>
          <span className="rounded-full border border-omd-sand bg-omd-ivory px-2.5 py-1 text-[11px] font-semibold uppercase text-omd-muted">
            {typeLabel}
          </span>
        </div>

        <Link href={href} className="mt-3 block">
          <h2 className="line-clamp-2 text-xl font-semibold leading-7 text-omd-brown group-hover:text-omd-saffron">{item.title}</h2>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-omd-muted">
            {item.shortDescription ?? item.description ?? "Details coming soon."}
          </p>
        </Link>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-omd-brown">
              {item.variants.length > 0 ? "From " : ""}
              {formatMoney(price, item.currency)}
            </p>
            {mrp && mrp > price ? (
              <p className="mt-1 text-xs text-omd-muted">
                <span className="line-through">{formatMoney(mrp, item.currency)}</span>
                <span className="ml-2 font-semibold text-omd-success">Save {formatMoney(mrp - price, item.currency)}</span>
              </p>
            ) : null}
          </div>
          {rating.count ? (
            <p className="shrink-0 rounded-full bg-omd-ivory px-2.5 py-1 text-sm font-semibold text-omd-brown" aria-label={`${rating.average} rating from ${rating.count} reviews`}>
              {rating.average} <span className="text-omd-gold">star</span>
              <span className="ml-1 text-xs font-normal text-omd-muted">({rating.count})</span>
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <form action={addToCartAction}>
            <input type="hidden" name="productId" value={item.id} />
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="quantity" value="1" />
            <PremiumButton type="submit" variant="secondary" disabled={isOutOfStock} className="w-full rounded-xl">
              Add to Cart
            </PremiumButton>
          </form>
          <form action={buyNowAction}>
            <input type="hidden" name="productId" value={item.id} />
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="quantity" value="1" />
            <PremiumButton type="submit" disabled={isOutOfStock} className="w-full rounded-xl">
              Buy Now
            </PremiumButton>
          </form>
        </div>
      </div>
    </article>
  );
}
