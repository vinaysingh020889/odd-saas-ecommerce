import { saveFestivalCampaignAction } from "@/lib/admin-actions";
import { festivalStatuses } from "@/lib/merchandising";
import { TagSelector } from "@/components/tag-selector";
import type { TagOption } from "@/lib/tag-relations";

type LinkOption = {
  id: string;
  title?: string;
  name?: string;
  type?: string;
};

type FestivalFormProps = {
  campaign?: {
    id: string;
    title: string;
    slug: string;
    shortDescription: string | null;
    longDescription: string | null;
    heroImage: string | null;
    cardImage: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    priority: number;
    isFeatured: boolean;
    showOnHomepage: boolean;
    showInHero: boolean;
    showInAnnouncementStrip: boolean;
    ctaLabel: string | null;
    ctaUrl: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    products: Array<{ productId: string }>;
    categories: Array<{ categoryId: string }>;
    services: Array<{ serviceId: string }>;
  };
  products: LinkOption[];
  categories: LinkOption[];
  services: LinkOption[];
  tags?: TagOption[];
  selectedTagIds?: string[];
};

function dateInput(value?: Date) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function CheckboxList({
  name,
  options,
  selected
}: {
  name: string;
  options: LinkOption[];
  selected: Set<string>;
}) {
  return (
    <div className="grid max-h-64 gap-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
      {options.length === 0 ? <p className="text-sm text-slate-500">No records available.</p> : null}
      {options.map((option) => (
        <label key={option.id} className="flex items-start gap-2 text-sm">
          <input name={name} type="checkbox" value={option.id} defaultChecked={selected.has(option.id)} className="mt-1 h-4 w-4" />
          <span>
            <span className="font-semibold text-slate-900">{option.title ?? option.name}</span>
            {option.type ? <span className="ml-2 text-xs uppercase text-slate-500">{option.type}</span> : null}
          </span>
        </label>
      ))}
    </div>
  );
}

export function AdminFestivalForm({ campaign, products, categories, services, tags = [], selectedTagIds = [] }: FestivalFormProps) {
  const selectedProducts = new Set(campaign?.products.map((item) => item.productId) ?? []);
  const selectedCategories = new Set(campaign?.categories.map((item) => item.categoryId) ?? []);
  const selectedServices = new Set(campaign?.services.map((item) => item.serviceId) ?? []);
  const visibility = {
    isFeatured: campaign?.isFeatured ?? false,
    showOnHomepage: campaign?.showOnHomepage ?? false,
    showInHero: campaign?.showInHero ?? false,
    showInAnnouncementStrip: campaign?.showInAnnouncementStrip ?? false
  };

  return (
    <form action={saveFestivalCampaignAction} className="grid gap-5">
      <input type="hidden" name="id" value={campaign?.id ?? ""} />

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Title
            <input name="title" required defaultValue={campaign?.title ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Slug
            <input name="slug" required defaultValue={campaign?.slug ?? ""} placeholder="raksha-bandhan-2026" className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Short description
          <textarea name="shortDescription" defaultValue={campaign?.shortDescription ?? ""} className="min-h-20 rounded-md border border-slate-300 px-3 py-2" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Long description
          <textarea name="longDescription" defaultValue={campaign?.longDescription ?? ""} className="min-h-32 rounded-md border border-slate-300 px-3 py-2" />
        </label>
      </section>

      <TagSelector
        tags={tags}
        selectedTagIds={selectedTagIds}
        helper="Attach deity, place, occasion, ritual, and festival context for future campaign discovery."
      />

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Schedule and visibility</p>
        <div className="grid gap-4 md:grid-cols-4">
          <label className="grid gap-2 text-sm font-medium">
            Status
            <select name="status" defaultValue={campaign?.status ?? "DRAFT"} className="h-10 rounded-md border border-slate-300 px-3">
              {festivalStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Start date
            <input name="startDate" type="date" required defaultValue={dateInput(campaign?.startDate)} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            End date
            <input name="endDate" type="date" required defaultValue={dateInput(campaign?.endDate)} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Priority
            <input name="priority" type="number" defaultValue={campaign?.priority ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {[
            ["isFeatured", "Featured"],
            ["showOnHomepage", "Show on /shop"],
            ["showInHero", "Eligible for hero"],
            ["showInAnnouncementStrip", "Announcement strip"]
          ].map(([name, label]) => (
            <label key={name} className="flex items-center gap-2 text-sm font-semibold">
              <input name={name} type="checkbox" defaultChecked={visibility[name as keyof typeof visibility]} className="h-4 w-4" />
              {label}
            </label>
          ))}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Creative and CTA</p>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Hero image URL
            <input name="heroImage" defaultValue={campaign?.heroImage ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Card image URL
            <input name="cardImage" defaultValue={campaign?.cardImage ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            CTA label
            <input name="ctaLabel" defaultValue={campaign?.ctaLabel ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            CTA URL
            <input name="ctaUrl" defaultValue={campaign?.ctaUrl ?? ""} placeholder="/festivals/raksha-bandhan-2026" className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Linked merchandising</p>
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Products and kits</h2>
            <div className="mt-2"><CheckboxList name="productIds" options={products} selected={selectedProducts} /></div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Services</h2>
            <div className="mt-2"><CheckboxList name="serviceIds" options={services} selected={selectedServices} /></div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Categories</h2>
            <div className="mt-2"><CheckboxList name="categoryIds" options={categories} selected={selectedCategories} /></div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">SEO</p>
        <label className="grid gap-2 text-sm font-medium">
          SEO title
          <input name="seoTitle" defaultValue={campaign?.seoTitle ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          SEO description
          <textarea name="seoDescription" defaultValue={campaign?.seoDescription ?? ""} className="min-h-20 rounded-md border border-slate-300 px-3 py-2" />
        </label>
      </section>

      <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
        Save festival campaign
      </button>
    </form>
  );
}
