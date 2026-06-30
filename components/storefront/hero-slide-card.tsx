import Link from "next/link";

export type HeroSliderSlide = {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  badgeText: string | null;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  imageAlt: string | null;
  primaryCtaLabel: string;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  linkType: string;
  themeVariant: string;
  textAlign: string;
  overlayStrength: string;
  sortOrder: number;
  resolvedHref: string;
};

const alignClasses: Record<string, string> = {
  LEFT: "items-start text-left",
  CENTER: "items-start text-left md:items-center md:text-center",
  RIGHT: "items-start text-left md:items-end md:text-right"
};

const contentPositionClasses: Record<string, string> = {
  LEFT: "md:mr-auto",
  CENTER: "md:mx-auto",
  RIGHT: "md:ml-auto"
};

const overlayGradients: Record<string, string> = {
  NONE: "linear-gradient(90deg, rgba(43, 19, 13, 0.82) 0%, rgba(90, 31, 18, 0.48) 46%, rgba(229, 57, 0, 0.10) 100%)",
  LIGHT: "linear-gradient(90deg, rgba(43, 19, 13, 0.86) 0%, rgba(90, 31, 18, 0.54) 48%, rgba(229, 57, 0, 0.12) 100%)",
  MEDIUM: "linear-gradient(90deg, rgba(43, 19, 13, 0.90) 0%, rgba(90, 31, 18, 0.62) 50%, rgba(229, 57, 0, 0.16) 100%)",
  STRONG: "linear-gradient(90deg, rgba(43, 19, 13, 0.94) 0%, rgba(90, 31, 18, 0.72) 52%, rgba(229, 57, 0, 0.22) 100%)"
};

const mobileOverlayGradients: Record<string, string> = {
  NONE: "linear-gradient(180deg, rgba(47, 28, 20, 0.18) 0%, rgba(47, 28, 20, 0.84) 62%, rgba(47, 28, 20, 0.94) 100%)",
  LIGHT: "linear-gradient(180deg, rgba(47, 28, 20, 0.20) 0%, rgba(47, 28, 20, 0.86) 60%, rgba(47, 28, 20, 0.95) 100%)",
  MEDIUM: "linear-gradient(180deg, rgba(47, 28, 20, 0.24) 0%, rgba(47, 28, 20, 0.88) 58%, rgba(47, 28, 20, 0.96) 100%)",
  STRONG: "linear-gradient(180deg, rgba(47, 28, 20, 0.34) 0%, rgba(47, 28, 20, 0.92) 56%, rgba(47, 28, 20, 0.98) 100%)"
};

const linkTypeLabels: Record<string, string> = {
  CUSTOM: "Merchandising pick",
  PRODUCT: "Product spotlight",
  SERVICE: "Service spotlight",
  FESTIVAL: "Festival campaign",
  OFFER: "Limited offer",
  MEMBERSHIP: "Membership benefit",
  ASTHI: "Sacred seva",
  KUNDLI: "Astrology service"
};

const chipSets: Record<string, string[]> = {
  CUSTOM: ["Trusted by devotees", "Ritual-ready products", "Guided seva support"],
  PRODUCT: ["Authentic product", "Secure packaging", "Fast checkout"],
  SERVICE: ["Guided booking", "Admin supported", "Clear next steps"],
  FESTIVAL: ["Seasonal edit", "Puja essentials", "Family ready"],
  OFFER: ["Special pricing", "Curated picks", "Limited window"],
  MEMBERSHIP: ["Member benefits", "Priority support", "Monthly seva"],
  ASTHI: ["Dignified care", "Document support", "Track application"],
  KUNDLI: ["Birth details", "Report options", "Expert support"]
};

const themeClasses: Record<string, { eyebrow: string; badge: string; primary: string; secondary: string; chip: string }> = {
  DARK_OVERLAY: {
    eyebrow: "text-[#ffb199]",
    badge: "border-white/20 bg-white/15 text-white",
    primary: "bg-[#e53900] text-white hover:bg-[#ff4a1f] hover:text-white",
    secondary: "border-white/45 bg-black/12 text-white hover:bg-white hover:text-omd-brown",
    chip: "border-white/20 bg-black/18 text-white"
  },
  LIGHT_OVERLAY: {
    eyebrow: "text-[#ffb199]",
    badge: "border-white/20 bg-white/15 text-white",
    primary: "bg-omd-saffron text-white hover:bg-white hover:text-omd-brown",
    secondary: "border-white/45 bg-black/12 text-white hover:bg-white hover:text-omd-brown",
    chip: "border-white/20 bg-black/18 text-white"
  },
  CREAM_CARD: {
    eyebrow: "text-[#ffb199]",
    badge: "border-white/20 bg-white/15 text-white",
    primary: "bg-omd-saffron text-white hover:bg-white hover:text-omd-brown",
    secondary: "border-white/45 bg-black/12 text-white hover:bg-white hover:text-omd-brown",
    chip: "border-white/20 bg-black/18 text-white"
  },
  SAFFRON_GOLD: {
    eyebrow: "text-white",
    badge: "border-white/20 bg-white/15 text-white",
    primary: "bg-white text-omd-brown hover:bg-omd-gold",
    secondary: "border-white/45 bg-black/12 text-white hover:bg-white hover:text-omd-brown",
    chip: "border-white/20 bg-black/18 text-white"
  }
};

export function HeroSlideCard({ slide, active = true }: { slide: HeroSliderSlide; active?: boolean }) {
  const theme = themeClasses[slide.themeVariant] ?? themeClasses.DARK_OVERLAY;
  const align = alignClasses[slide.textAlign] ?? alignClasses.LEFT;
  const contentPosition = contentPositionClasses[slide.textAlign] ?? contentPositionClasses.LEFT;
  const desktopImageUrl = slide.desktopImageUrl.replaceAll('"', "%22");
  const mobileImageUrl = (slide.mobileImageUrl || slide.desktopImageUrl).replaceAll('"', "%22");
  const desktopOverlay = overlayGradients[slide.overlayStrength] ?? overlayGradients.MEDIUM;
  const mobileOverlay = mobileOverlayGradients[slide.overlayStrength] ?? mobileOverlayGradients.MEDIUM;
  const backgroundImage = `${desktopOverlay}, url("${desktopImageUrl}")`;
  const mobileBackgroundImage = `${mobileOverlay}, url("${mobileImageUrl}")`;
  const primaryHref = slide.resolvedHref || slide.primaryCtaUrl || "/shop";
  const promotionLabel = slide.eyebrow || linkTypeLabels[slide.linkType] || "Featured promotion";
  const badgeLabel = slide.badgeText || linkTypeLabels[slide.linkType] || "OMD curated";
  const chips = chipSets[slide.linkType] ?? chipSets.CUSTOM;
  const mobileStyle = `@media (max-width: 767px) { [data-hero-slide="${slide.id}"] { background-image: ${mobileBackgroundImage}; } }`;

  return (
    <article
      aria-hidden={!active}
      className="relative isolate min-h-[520px] overflow-hidden rounded-none border-y border-x-0 border-[#ff4a1f]/35 bg-omd-brown bg-cover bg-center text-white shadow-[0_22px_70px_rgba(47,28,20,0.2)] sm:min-h-[560px] md:min-h-[585px] lg:min-h-[calc(100vh-132px)]"
      style={{ backgroundImage }}
    >
      <style dangerouslySetInnerHTML={{ __html: mobileStyle }} />
      <div data-hero-slide={slide.id} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage }} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_22%,rgba(255,74,31,0.24),transparent_24%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff4a1f]/90 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/48 to-transparent" />

      <div className="relative z-10 flex min-h-[520px] flex-col justify-end px-5 pb-24 pt-14 sm:min-h-[560px] sm:px-8 sm:pb-24 md:min-h-[585px] md:justify-center md:px-16 md:pb-20 lg:min-h-[calc(100vh-132px)] lg:px-20">
        <div className={`flex max-w-[620px] flex-col ${align} ${contentPosition}`}>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide backdrop-blur ${theme.badge}`}>{promotionLabel}</span>
            {slide.badgeText ? <span className="rounded-full bg-[#ff4a1f] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">{slide.badgeText}</span> : null}
          </div>

          <p className={`mt-5 text-xs font-bold uppercase tracking-[0.22em] ${theme.eyebrow}`}>{badgeLabel}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-[1.02] tracking-normal text-white sm:text-5xl md:text-6xl lg:text-7xl">{slide.title}</h1>
          {slide.subtitle ? <p className="mt-4 max-w-xl text-sm leading-6 text-white/88 sm:text-base md:text-lg md:leading-7">{slide.subtitle}</p> : null}

          <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Link href={primaryHref} className={`inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-bold shadow-sm transition sm:rounded-xl ${theme.primary}`}>
              {slide.primaryCtaLabel}
            </Link>
            {slide.secondaryCtaLabel && slide.secondaryCtaUrl ? (
              <Link href={slide.secondaryCtaUrl} className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-5 text-sm font-bold backdrop-blur transition sm:rounded-xl ${theme.secondary}`}>
                {slide.secondaryCtaLabel}
              </Link>
            ) : null}
          </div>

          <div className="mt-8 grid w-full max-w-[560px] grid-cols-1 gap-2 text-[11px] font-semibold uppercase tracking-wide sm:grid-cols-3">
            {chips.map((item) => (
              <span key={item} className={`rounded-xl border px-3 py-3 backdrop-blur ${theme.chip}`}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}