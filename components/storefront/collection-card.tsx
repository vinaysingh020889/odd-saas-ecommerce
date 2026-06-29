import Link from "next/link";

export function CollectionCard({
  title,
  description,
  href,
  imageUrl,
  cta = "Explore",
  compact = false
}: {
  title: string;
  description?: string | null;
  href: string;
  imageUrl?: string | null;
  cta?: string;
  compact?: boolean;
}) {
  const safeImageUrl = imageUrl?.replaceAll('"', "%22");
  const visualBackground = imageUrl
    ? `linear-gradient(180deg, rgba(47, 28, 20, 0.02), rgba(47, 28, 20, 0.38)), url("${safeImageUrl}"), linear-gradient(135deg,#fff8ec,#ead9bd)`
    : "linear-gradient(135deg,#fff8ec,#ead9bd)";

  return (
    <Link href={href} className="group block overflow-hidden rounded-2xl border border-omd-sand bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-omd-gold hover:shadow-lg">
      <div
        className={`relative overflow-hidden bg-omd-ivory bg-cover bg-center transition duration-300 group-hover:scale-[1.01] ${compact ? "aspect-[4/3]" : "aspect-[5/3]"}`}
        style={{ backgroundImage: visualBackground }}
      >
        {!imageUrl ? (
          <div className="flex h-full items-center justify-center px-4 text-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">OMDivyaDarshan</p>
              <p className="mt-2 text-lg font-semibold text-omd-brown">{title}</p>
            </div>
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-omd-brown/55 to-transparent" />
      </div>
      <div className={compact ? "p-3" : "p-5"}>
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Collection</p>
        <h3 className={`${compact ? "mt-1 line-clamp-2 text-sm leading-5" : "mt-2 text-xl"} font-semibold text-omd-brown group-hover:text-omd-saffron`}>{title}</h3>
        {description && !compact ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-omd-muted">{description}</p> : null}
        <p className={`${compact ? "mt-2 text-xs" : "mt-4 text-sm"} font-semibold text-omd-brown`}>{cta}</p>
      </div>
    </Link>
  );
}
