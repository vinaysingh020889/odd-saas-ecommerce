import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";

type CatalogCardProps = {
  item: CatalogItem;
  href?: string;
  stock?: {
    available: number;
    status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  } | null;
};

export function CatalogCard({ item, href = `/product/${item.slug}`, stock }: CatalogCardProps) {
  return (
    <Link
      href={href}
      className="group block h-full rounded-lg border border-omd-sand bg-white p-5 shadow-sm transition hover:border-omd-gold hover:shadow-md"
    >
    <article className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">
          {item.category?.name ?? "OMD Catalog"}
        </p>
        {item.featured ? (
          <span className="rounded-full bg-omd-gold px-2.5 py-1 text-xs font-semibold text-omd-brown">
            Featured
          </span>
        ) : null}
        {stock ? (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              stock.status === "OUT_OF_STOCK"
                ? "bg-red-50 text-omd-error"
                : stock.status === "LOW_STOCK"
                  ? "bg-amber-50 text-omd-saffron"
                  : "bg-green-50 text-omd-success"
            }`}
          >
            {stock.status === "OUT_OF_STOCK" ? "Out of stock" : stock.status === "LOW_STOCK" ? "Low stock" : "In stock"}
          </span>
        ) : null}
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
        <span className="text-sm font-semibold text-omd-saffron group-hover:text-omd-brown">
          View detail
        </span>
      </div>
    </article>
    </Link>
  );
}
