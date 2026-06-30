"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { TopMenuOffer } from "@/lib/top-menu-offer";

function dismissedStorageKey(offerId: string) {
  return `omd-top-offer-${offerId}`;
}

export function TopOfferStrip({ offer }: { offer: TopMenuOffer | null }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!offer) return;
    const timer = window.setTimeout(() => {
      setDismissed(window.sessionStorage.getItem(dismissedStorageKey(offer.id)) === "dismissed");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [offer]);

  if (!offer || dismissed) return null;

  return (
    <div className="bg-[linear-gradient(90deg,#9f0000_0%,#d91400_48%,#b00000_100%)] text-white">
      <div className="mx-auto grid min-h-8 w-full max-w-[1680px] grid-cols-[2rem_1fr_2rem] items-center gap-2 px-3 text-sm font-bold tracking-wide sm:min-h-9 md:px-7">
        <span aria-hidden="true" />
        <Link href={offer.href} className="min-w-0 truncate text-center transition hover:text-[#ffd35c]" title={offer.title}>
          {offer.title}
        </Link>
        <button
          type="button"
          aria-label="Close top offer"
          className="inline-flex h-7 w-7 items-center justify-center justify-self-end rounded-full border border-white/25 bg-white/10 text-lg leading-none text-white transition hover:bg-white hover:text-[#b00000]"
          onClick={() => {
            window.sessionStorage.setItem(dismissedStorageKey(offer.id), "dismissed");
            setDismissed(true);
          }}
        >
          x
        </button>
      </div>
    </div>
  );
}
