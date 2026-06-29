"use client";

import { useState } from "react";

type MediaItem = {
  id: string;
  url: string;
  altText: string;
};

function FallbackImage({ title, category }: { title: string; category?: string | null }) {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center bg-[radial-gradient(circle_at_25%_20%,#ead9bd,transparent_34%),linear-gradient(135deg,#fff8ec,#f1dcc0)] p-8 text-center">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">OMDivyaDarshan</p>
        <p className="mt-3 text-2xl font-semibold text-omd-brown">{title}</p>
        {category ? <p className="mt-2 text-sm text-omd-muted">{category}</p> : null}
      </div>
    </div>
  );
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
  const selectedIndex = selected ? media.findIndex((item) => item.id === selected.id) : 0;
  const move = (direction: -1 | 1) => {
    if (media.length === 0) return;
    const nextIndex = (selectedIndex + direction + media.length) % media.length;
    setSelected(media[nextIndex]);
  };

  return (
    <section className="grid gap-4">
      <div className="relative overflow-hidden rounded-xl border border-[#ead7bf] bg-white shadow-sm">
        <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
          {badges.map((badge, index) => (
            <span
              key={badge}
              className={`rounded-md px-3 py-2 text-xs font-semibold ${index === 0 ? "bg-omd-saffron text-white" : "bg-white text-omd-success"}`}
            >
              {badge}
            </span>
          ))}
        </div>
        <div className="absolute right-4 top-4 z-10">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-omd-brown shadow-sm">
            <svg className={`h-5 w-5 ${wishlistActive ? "fill-omd-saffron text-omd-saffron" : ""}`} viewBox="0 0 24 24" fill={wishlistActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </span>
        </div>
        {selected && !selectedFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={selected.url}
            alt={selected.altText}
            onError={() => setFailedMediaIds((current) => [...new Set([...current, selected.id])])}
            className="aspect-[1.25/1] min-h-[360px] w-full object-cover lg:min-h-[430px]"
          />
        ) : (
          <FallbackImage title={title} category={category} />
        )}
      </div>
      {media.length > 1 ? (
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => move(-1)} aria-label="Previous image" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ead7bf] bg-white text-omd-brown shadow-sm hover:border-omd-gold">
            &lsaquo;
          </button>
          <div className="grid min-w-0 flex-1 grid-cols-5 gap-3">
            {media.slice(0, 5).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelected(item)}
                aria-label={`View ${item.altText}`}
                className={`overflow-hidden rounded-md border bg-white transition ${selected?.id === item.id ? "border-omd-saffron ring-2 ring-omd-saffron/20" : "border-[#ead7bf] hover:border-omd-gold"}`}
              >
                {failedMediaIds.includes(item.id) ? (
                  <span className="flex aspect-[1.15/1] w-full items-center justify-center bg-omd-ivory px-2 text-center text-[10px] font-semibold uppercase text-omd-saffron">
                    OMD
                  </span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.url}
                    alt=""
                    onError={() => setFailedMediaIds((current) => [...new Set([...current, item.id])])}
                    className="aspect-[1.15/1] w-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => move(1)} aria-label="Next image" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ead7bf] bg-white text-omd-brown shadow-sm hover:border-omd-gold">
            &rsaquo;
          </button>
        </div>
      ) : null}
    </section>
  );
}
