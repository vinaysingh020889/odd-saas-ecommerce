import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";

type CatalogCardProps = {
  item: CatalogItem;
  href?: string;
};

export function CatalogCard({ item, href = `/product/${item.slug}` }: CatalogCardProps) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">
          {item.category?.name ?? "OMD Catalog"}
        </p>
        {item.featured ? (
          <span className="rounded-full bg-omd-gold px-2.5 py-1 text-xs font-semibold text-omd-brown">
            Featured
          </span>
        ) : null}
        <span className="rounded-full border border-omd-gold px-2.5 py-1 text-xs font-semibold text-omd-brown">
          {item.type}
        </span>
      </div>
      <div className="mt-4 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-omd-ivory text-sm font-semibold text-omd-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{item.category?.name ?? "OMD"}</span>
        )}
      </div>
      <h2 className="mt-3 text-xl font-semibold text-omd-brown">{item.title}</h2>
      <p className="mt-3 flex-1 text-sm leading-6 text-omd-muted">
        {item.shortDescription ?? item.description ?? "Details coming soon."}
      </p>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="font-semibold text-omd-brown">
          {item.variants.length > 0 ? "From " : ""}
          {formatMoney(item.variants[0]?.price ?? item.basePrice, item.currency)}
          {item.mrp ? <span className="ml-2 text-sm font-normal text-omd-muted line-through">{formatMoney(item.mrp, item.currency)}</span> : null}
        </p>
        <Link href={href} className="text-sm font-semibold text-omd-saffron hover:text-omd-brown">
          View detail
        </Link>
      </div>
    </article>
  );
}
