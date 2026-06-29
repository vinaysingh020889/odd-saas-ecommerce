import Link from "next/link";
import { createHeroSlideAction, updateHeroSlideAction } from "@/lib/hero-slide-actions";
import { heroSlideLinkTypes, heroSlideOverlays, heroSlideTextAligns, heroSlideThemes } from "@/lib/hero-slides";
import { HeroSlideCard, type HeroSliderSlide } from "@/components/storefront/hero-slide-card";

type Option = { id: string; label: string };
type HeroSlideFormData = {
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
  linkedProductId: string | null;
  linkedServiceId: string | null;
  linkedFestivalId: string | null;
  linkedOfferId: string | null;
  linkedMembershipId: string | null;
  themeVariant: string;
  textAlign: string;
  overlayStrength: string;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  sortOrder: number;
};

function inputClass() {
  return "h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-omd-ops";
}

function dateTimeInput(value?: Date | null) {
  if (!value) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function SelectField({ name, label, value, options }: { name: string; label: string; value?: string | null; options: Option[] }) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-700">
      {label}
      <select name={name} defaultValue={value ?? ""} className={inputClass()}>
        <option value="">None</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Preview({ slide }: { slide?: HeroSlideFormData }) {
  const previewSlide: HeroSliderSlide = {
    id: slide?.id ?? "preview",
    title: slide?.title || "Premium devotional hero title",
    subtitle: slide?.subtitle || "Use this preview to check the headline, overlay, CTA hierarchy, and devotional image mood before publishing.",
    eyebrow: slide?.eyebrow || "HERO PREVIEW",
    badgeText: slide?.badgeText || "Preview",
    desktopImageUrl: slide?.desktopImageUrl || "https://images.unsplash.com/photo-1604608672516-8e6c6ed88492?auto=format&fit=crop&w=1600&q=80",
    mobileImageUrl: slide?.mobileImageUrl ?? null,
    imageAlt: slide?.imageAlt ?? "Hero slide preview",
    primaryCtaLabel: slide?.primaryCtaLabel || "Primary CTA",
    primaryCtaUrl: slide?.primaryCtaUrl || "/shop",
    secondaryCtaLabel: slide?.secondaryCtaLabel || "Secondary CTA",
    secondaryCtaUrl: slide?.secondaryCtaUrl || "/services",
    linkType: slide?.linkType || "CUSTOM",
    themeVariant: slide?.themeVariant || "DARK_OVERLAY",
    textAlign: slide?.textAlign || "LEFT",
    overlayStrength: slide?.overlayStrength || "MEDIUM",
    sortOrder: slide?.sortOrder ?? 0,
    resolvedHref: slide?.primaryCtaUrl || "/shop"
  };

  return (
    <div className="scale-[0.62] origin-top-left md:scale-[0.72] xl:scale-[0.58]">
      <div className="w-[920px]">
        <HeroSlideCard slide={previewSlide} />
      </div>
    </div>
  );
}

export function AdminHeroSlideForm({
  slide,
  products,
  services,
  festivals,
  offers,
  memberships
}: {
  slide?: HeroSlideFormData;
  products: Option[];
  services: Option[];
  festivals: Option[];
  offers: Option[];
  memberships: Option[];
}) {
  const action = slide ? updateHeroSlideAction.bind(null, slide.id) : createHeroSlideAction;

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="grid gap-5">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Content</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">Eyebrow<input name="eyebrow" defaultValue={slide?.eyebrow ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Badge text<input name="badgeText" defaultValue={slide?.badgeText ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">Title<input name="title" required defaultValue={slide?.title ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">Subtitle<textarea name="subtitle" defaultValue={slide?.subtitle ?? ""} rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-omd-ops" /></label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Image</p>
          <div className="mt-4 grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">Desktop image URL<input name="desktopImageUrl" required defaultValue={slide?.desktopImageUrl ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Mobile image URL<input name="mobileImageUrl" defaultValue={slide?.mobileImageUrl ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Image alt text<input name="imageAlt" defaultValue={slide?.imageAlt ?? ""} className={inputClass()} /></label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Link & CTA</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-700">Link type<select name="linkType" defaultValue={slide?.linkType ?? "CUSTOM"} className={inputClass()}>{heroSlideLinkTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Primary CTA label<input name="primaryCtaLabel" required defaultValue={slide?.primaryCtaLabel ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">Primary CTA URL<input name="primaryCtaUrl" defaultValue={slide?.primaryCtaUrl ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Secondary CTA label<input name="secondaryCtaLabel" defaultValue={slide?.secondaryCtaLabel ?? ""} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Secondary CTA URL<input name="secondaryCtaUrl" defaultValue={slide?.secondaryCtaUrl ?? ""} className={inputClass()} /></label>
            <SelectField name="linkedProductId" label="Linked product" value={slide?.linkedProductId} options={products} />
            <SelectField name="linkedServiceId" label="Linked service" value={slide?.linkedServiceId} options={services} />
            <SelectField name="linkedFestivalId" label="Linked festival" value={slide?.linkedFestivalId} options={festivals} />
            <SelectField name="linkedOfferId" label="Linked offer" value={slide?.linkedOfferId} options={offers} />
            <SelectField name="linkedMembershipId" label="Linked membership" value={slide?.linkedMembershipId} options={memberships} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Design</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-slate-700">Theme<select name="themeVariant" defaultValue={slide?.themeVariant ?? "DARK_OVERLAY"} className={inputClass()}>{heroSlideThemes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Text alignment<select name="textAlign" defaultValue={slide?.textAlign ?? "LEFT"} className={inputClass()}>{heroSlideTextAligns.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Overlay<select name="overlayStrength" defaultValue={slide?.overlayStrength ?? "MEDIUM"} className={inputClass()}>{heroSlideOverlays.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Schedule</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input name="isActive" type="checkbox" defaultChecked={slide?.isActive ?? true} className="h-4 w-4" /> Active</label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Starts at<input name="startsAt" type="datetime-local" defaultValue={dateTimeInput(slide?.startsAt)} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Ends at<input name="endsAt" type="datetime-local" defaultValue={dateTimeInput(slide?.endsAt)} className={inputClass()} /></label>
            <label className="grid gap-2 text-sm font-medium text-slate-700">Sort order<input name="sortOrder" type="number" defaultValue={slide?.sortOrder ?? 0} className={inputClass()} /></label>
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">{slide ? "Update hero slide" : "Create hero slide"}</button>
          <Link href="/admin/hero-slides" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops">Cancel</Link>
        </div>
      </div>

      <aside className="h-[430px] overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Admin preview</p>
        <div className="mt-4 h-[360px] overflow-hidden rounded-lg bg-slate-100">
          <Preview slide={slide} />
        </div>
      </aside>
    </form>
  );
}