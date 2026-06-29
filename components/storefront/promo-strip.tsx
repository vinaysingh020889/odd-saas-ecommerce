"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { PremiumLink } from "@/components/storefront/buttons";

export function PromoStrip({
  eyebrow,
  title,
  description,
  href,
  cta = "Explore",
  action,
  dismissible = false
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  cta?: string;
  action?: ReactNode;
  dismissible?: boolean;
}) {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <section className="relative isolate overflow-hidden rounded-[1.35rem] border border-omd-gold/45 bg-[linear-gradient(135deg,#2f1c14_0%,#482315_48%,#8a4b12_100%)] px-5 py-5 text-white shadow-[0_18px_55px_rgba(47,28,20,0.16)] sm:px-7 lg:px-9">
      <div className="absolute -left-16 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-omd-gold/18 blur-3xl" />
      <div className="absolute right-12 top-0 h-28 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative z-10 grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div className="min-w-0">
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.22em] text-omd-gold">{eyebrow}</p> : null}
          <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-normal text-white sm:text-3xl lg:text-4xl">{title}</h2>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-white/78 sm:text-base">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 md:justify-end">
          {action ?? (href ? <PremiumLink href={href} variant="gold" className="shrink-0 px-6">{cta}</PremiumLink> : null)}
          {dismissible ? (
            <button
              type="button"
              onClick={() => setHidden(true)}
              aria-label="Close promotion"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-sm font-bold text-white shadow-sm backdrop-blur transition hover:bg-white hover:text-omd-brown"
            >
              x
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}