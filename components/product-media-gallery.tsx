"use client";

import { useState } from "react";

type MediaItem = {
  id: string;
  url: string;
  altText: string;
};

function FallbackImage({ title, category }: { title: string; category?: string | null }) {
  return (
    <div className="flex h-full min-h-[380px] items-center justify-center bg-[radial-gradient(circle_at_24%_18%,#f2dfc5,transparent_34%),linear-gradient(135deg,#fff8ec,#ead9bd)] p-8 text-center lg:min-h-[460px]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">OMDivyaDarshan</p>
        <p className="mt-3 text-2xl font-semibold text-omd-brown">{title}</p>
        {category ? <p className="mt-2 text-sm text-omd-muted">{category}</p> : null}
      </div>
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return <span className="text-2xl leading-none">{direction === "left" ? "‹" : "›"}</span>;
}

export function ProductMediaGallery({
  media,
  title,
  category,
  badges = [],
  wishlistActive = false
}: {
  media: MediaItem[];
  title: string;
  category?: string | null;
  badges?: string[];
  wishlistActive?: boolean;
}) {
  const [selected, setSelected] = useState(media[0] ?? null);
  const [failedMediaIds, setFailedMediaIds] = useState<string[]>([]);
  const selectedFailed = selected ? failedMediaIds.includes(selected.id) : false;
  const selectedIndex = selected ? Math.max(0, media.findIndex((item) => item.id === selected.id)) : 0;
  const move = (direction: -1 | 1) => {
    if (media.length === 0) return;
    const nextIndex = (selectedIndex + direction + media.length) % media.length;
    setSelected(media[nextIndex]);
  };
  const primaryBadge = badges.find((badge) => badge.toLowerCase().includes("off")) ?? badges[0];

  return (
    <section className="grid gap-3">
      <div className="relative overflow-hidden rounded-lg border border-[#ead7bf] bg-white shadow-sm">
        {primaryBadge ? (
          <div className="absolute left-4 top-4 z-10">
            <span className="rounded-md bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-omd-success shadow-sm">
              {primaryBadge}
            </span>
          </div>
        ) : null}
        <div className="absolute right-4 top-4 z-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-omd-brown shadow-sm ring-1 ring-omd-sand/80">
            <svg className={`h-5 w-5 ${wishlistActive ? "fill-omd-saffron text-omd-saffron" : ""}`} viewBox="0 0 24 24" fill={wishlistActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </span>
        </div>

        {media.length > 1 ? (
          <>
            <button type="button" onClick={() => move(-1)} aria-label="Previous image" className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-omd-brown shadow-sm ring-1 ring-omd-sand hover:text-omd-saffron">
              <ArrowIcon direction="left" />
            </button>
            <button type="button" onClick={() => move(1)} aria-label="Next image" className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-omd-brown shadow-sm ring-1 ring-omd-sand hover:text-omd-saffron">
              <ArrowIcon direction="right" />
            </button>
          </>
        ) : null}

        {selected && !selectedFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.url}
            alt={selected.altText}
            onError={() => setFailedMediaIds((current) => [...new Set([...current, selected.id])])}
            className="aspect-[1.4/1] min-h-[380px] w-full object-cover lg:min-h-[460px]"
          />
        ) : (
          <FallbackImage title={title} category={category} />
        )}
      </div>

      {media.length > 1 ? (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => move(-1)} aria-label="Previous thumbnail" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ead7bf] bg-white text-omd-brown shadow-sm hover:border-omd-gold">
            <ArrowIcon direction="left" />
          </button>
          <div className="grid min-w-0 flex-1 grid-cols-4 gap-3 sm:grid-cols-5">
            {media.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                aria-label={`View ${item.altText}`}
                className={`overflow-hidden rounded-md border bg-white p-1 transition ${selected?.id === item.id ? "border-omd-saffron ring-2 ring-omd-saffron/15" : "border-[#ead7bf] hover:border-omd-gold"}`}
              >
                {failedMediaIds.includes(item.id) ? (
                  <span className="flex aspect-[1.35/1] w-full items-center justify-center rounded bg-omd-ivory px-2 text-center text-[10px] font-semibold uppercase text-omd-saffron">
                    OMD
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    onError={() => setFailedMediaIds((current) => [...new Set([...current, item.id])])}
                    className="aspect-[1.35/1] w-full rounded object-cover"
                  />
                )}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Next thumbnail" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ead7bf] bg-white text-omd-brown shadow-sm hover:border-omd-gold">
            <ArrowIcon direction="right" />
          </button>
        </div>
      ) : null}
    </section>
  );
}