import type { ReactNode } from "react";
import { PremiumLink } from "@/components/storefront/buttons";

export function PromoStrip({
  eyebrow,
  title,
  description,
  href,
  cta = "Explore",
  action
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  cta?: string;
  action?: ReactNode;
}) {
  return (
    <section className="grid gap-5 overflow-hidden rounded-2xl border border-omd-gold/60 bg-omd-brown p-5 text-white shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-7">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">{eyebrow}</p> : null}
        <h2 className="mt-2 text-2xl font-semibold tracking-normal sm:text-3xl">{title}</h2>
        {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-white/80">{description}</p> : null}
      </div>
      {action ?? (href ? <PremiumLink href={href} variant="gold">{cta}</PremiumLink> : null)}
    </section>
  );
}
