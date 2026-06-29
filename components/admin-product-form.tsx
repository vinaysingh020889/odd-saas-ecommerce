"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { saveProductAction } from "@/lib/admin-actions";
import { AdminPanel, StatusBadge } from "@/components/ui";
import { TagSelector } from "@/components/tag-selector";
import type { TagOption } from "@/lib/tag-relations";

type CategoryOption = {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
};

type ProductFormProps = {
  product?: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    categoryId: string | null;
    type: string;
    status: string;
    basePrice: unknown;
    mrp: unknown;
    currency: string;
    imageUrl: string | null;
    reviewsEnabled: boolean;
    ratingsEnabled: boolean;
    featured: boolean;
    sortOrder: number;
  };
  categories: CategoryOption[];
  tags?: TagOption[];
  selectedTagIds?: string[];
  serviceMode?: boolean;
};

const typeDetails: Record<string, { label: string; description: string; example: string; next: string[] }> = {
  PHYSICAL: {
    label: "Physical product",
    description: "A shippable item with stock tracking.",
    example: "Rudraksha mala, puja thali",
    next: ["Add variants or SKUs", "Add opening stock in Inventory", "Publish when content and stock are ready"]
  },
  DIGITAL: {
    label: "Digital product",
    description: "A report, file, or generated deliverable.",
    example: "Kundli report",
    next: ["Add a sellable variant", "Add delivery instructions later", "Publish when pricing and content are ready"]
  },
  SERVICE: {
    label: "Service",
    description: "A bookable or assisted offering.",
    example: "Rudrabhishek puja",
    next: ["Add a service variant", "Capacity and scheduling come in a later phase", "Publish when the service copy is ready"]
  },
  MEMBERSHIP: {
    label: "Membership",
    description: "A monthly membership package.",
    example: "Divya membership monthly plan",
    next: ["Add membership variant/pricing", "Add package benefits in the description", "Publish only the plans meant for storefront"]
  },
  KIT: {
    label: "Kit",
    description: "A bundle made from saved products or variants.",
    example: "Puja samagri kit",
    next: ["Save this kit first", "Add kit components on the edit screen", "Confirm kit price and storefront visibility"]
  }
};

function Section({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminProductForm({ product, categories, tags = [], selectedTagIds = [], serviceMode = false }: ProductFormProps) {
  const allowedTypes = useMemo(
    () => (serviceMode ? ["SERVICE", "MEMBERSHIP", "KIT", "DIGITAL"] : ["PHYSICAL", "DIGITAL", "MEMBERSHIP", "KIT", "SERVICE"]),
    [serviceMode]
  );
  const [selectedType, setSelectedType] = useState(product?.type ?? allowedTypes[0]);
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(product?.slug));
  const selectedTypeDetails = typeDetails[selectedType] ?? typeDetails.PHYSICAL;
  const isNew = !product;
  const suggestedSlug = slugify(title);
  const parentCategories = categories.filter((category) => !category.parentId);
  const childCategories = categories.filter((category) => category.parentId);
  const orphanChildCategories = childCategories.filter((category) => !parentCategories.some((parent) => parent.id === category.parentId));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <form action={saveProductAction} className="grid gap-5">
        <input type="hidden" name="id" value={product?.id ?? ""} />

        <Section
          title="Choose what you are creating"
          description="This controls where the item appears and what admins configure after the first save."
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {allowedTypes.map((type) => {
              const details = typeDetails[type];
              const active = selectedType === type;

              return (
                <label
                  key={type}
                  className={`cursor-pointer rounded-lg border p-4 transition ${
                    active ? "border-omd-ops bg-blue-50/70 shadow-sm" : "border-slate-200 bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={active}
                    onChange={() => setSelectedType(type)}
                    className="sr-only"
                  />
                  <span className="text-sm font-semibold text-slate-950">{details.label}</span>
                  <span className="mt-2 block text-xs leading-5 text-slate-600">{details.description}</span>
                  <span className="mt-3 block text-xs font-medium text-slate-500">{details.example}</span>
                </label>
              );
            })}
          </div>
          {selectedType === "KIT" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Kit contents are added after this kit is saved. Save first, then the Kit Components section appears on the edit screen.
            </div>
          ) : null}
        </Section>

        <Section
          title="Basic identity"
          description="Use a clear title and URL slug. Draft status keeps the item hidden while you finish setup."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              Title
              <input
                name="title"
                value={title}
                onChange={(event) => {
                  const nextTitle = event.target.value;
                  setTitle(nextTitle);
                  if (!slugEdited) {
                    setSlug(slugify(nextTitle));
                  }
                }}
                required
                placeholder="Example: Satvik Puja Samagri Kit"
                className="h-10 rounded-md border border-slate-300 px-3"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              Slug
              <input
                name="slug"
                value={slug}
                onChange={(event) => {
                  setSlug(slugify(event.target.value));
                  setSlugEdited(true);
                }}
                onFocus={() => setSlugEdited(true)}
                required
                placeholder="satvik-puja-samagri-kit"
                className="h-10 rounded-md border border-slate-300 px-3"
              />
              <span className="text-xs font-normal text-slate-500">
                Auto-built from title. You can edit it; suggested value is <span className="font-semibold">{suggestedSlug || "type-a-title-first"}</span>.
              </span>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              Category
              <select name="categoryId" defaultValue={product?.categoryId ?? ""} className="h-10 rounded-md border border-slate-300 px-3">
                <option value="">Uncategorized</option>
                {parentCategories.map((parent) => (
                  <optgroup key={parent.id} label={parent.name}>
                    <option value={parent.id}>{parent.name} (parent collection)</option>
                    {childCategories
                      .filter((category) => category.parentId === parent.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
                {orphanChildCategories.length ? (
                  <optgroup label="Other subcategories">
                    {orphanChildCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
              </select>
              <span className="text-xs font-normal text-slate-500">
                Prefer a subcategory for new products. Parent categories aggregate their subcategory products automatically.
              </span>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              Status
              <select name="status" defaultValue={product?.status ?? "DRAFT"} className="h-10 rounded-md border border-slate-300 px-3">
                <option value="DRAFT">DRAFT</option>
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              Sort Order
              <input name="sortOrder" type="number" defaultValue={product?.sortOrder ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
          </div>
        </Section>

        <Section
          title="Pricing"
          description="Set the visible base price now. More detailed variant pricing can be adjusted after save."
        >
          <div className="grid gap-4 md:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              Base Price
              <input name="basePrice" type="number" step="0.01" defaultValue={product?.basePrice?.toString() ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              MRP
              <input name="mrp" type="number" step="0.01" defaultValue={product?.mrp?.toString() ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-800">
              Currency
              <input name="currency" defaultValue={product?.currency ?? "INR"} className="h-10 rounded-md border border-slate-300 px-3" />
            </label>
            <label className="flex items-end gap-2 text-sm font-medium text-slate-800">
              <input name="featured" type="checkbox" defaultChecked={product?.featured ?? false} className="h-4 w-4" />
              Featured
            </label>
          </div>
        </Section>

        <Section
          title="Storefront content"
          description="This is what customers see on listing cards and the detail page. Keep the short description sharp."
        >
          <label className="grid gap-2 text-sm font-medium text-slate-800">
            Short Description
            <input
              name="shortDescription"
              defaultValue={product?.shortDescription ?? ""}
              placeholder="One-line storefront summary"
              className="h-10 rounded-md border border-slate-300 px-3"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-800">
            Description
            <textarea
              name="description"
              defaultValue={product?.description ?? ""}
              placeholder="Detailed customer-facing description"
              className="min-h-28 rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-slate-800">
            Image URL
            <input name="imageUrl" defaultValue={product?.imageUrl ?? ""} placeholder="https://..." className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
        </Section>

        <TagSelector tags={tags} selectedTagIds={selectedTagIds} />

        <Section
          title="Reviews and ratings"
          description="Control whether customers can see ratings and submit reviews for this product."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800">
              Reviews enabled
              <select name="reviewsEnabled" defaultValue={product?.reviewsEnabled === false ? "false" : "true"} className="h-10 rounded-md border border-slate-300 px-3">
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </label>
            <label className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 text-sm font-medium text-slate-800">
              Ratings visible
              <select name="ratingsEnabled" defaultValue={product?.ratingsEnabled === false ? "false" : "true"} className="h-10 rounded-md border border-slate-300 px-3">
                <option value="true">Visible</option>
                <option value="false">Hidden</option>
              </select>
            </label>
          </div>
        </Section>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            {isNew ? "After saving, you will continue to variants, stock, or kit components." : "Changes update storefront and admin views immediately after save."}
          </p>
          <button className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
            {isNew ? "Save and continue" : "Save changes"}
          </button>
        </div>
      </form>

      <aside className="h-fit lg:sticky lg:top-6">
        <AdminPanel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Creation Guide</p>
              <h2 className="mt-2 text-xl font-semibold text-slate-950">{selectedTypeDetails.label}</h2>
            </div>
            <StatusBadge tone={isNew ? "warning" : "success"}>{isNew ? "Step 1" : "Editing"}</StatusBadge>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">{selectedTypeDetails.description}</p>

          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">What happens after save</p>
            <ol className="mt-3 grid gap-3 text-sm text-slate-700">
              {selectedTypeDetails.next.map((item, index) => (
                <li key={item} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-omd-ops">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="mt-5 grid gap-3 text-sm">
            <p className="font-semibold text-slate-950">Good product record checklist</p>
            <label className="flex items-start gap-2 text-slate-600">
              <input type="checkbox" disabled className="mt-1" />
              Name and slug clearly identify the offering.
            </label>
            <label className="flex items-start gap-2 text-slate-600">
              <input type="checkbox" disabled className="mt-1" />
              Price, MRP, and category are reviewed.
            </label>
            <label className="flex items-start gap-2 text-slate-600">
              <input type="checkbox" disabled className="mt-1" />
              Storefront copy explains what the customer receives.
            </label>
            <label className="flex items-start gap-2 text-slate-600">
              <input type="checkbox" disabled className="mt-1" />
              Status stays Draft until variants, stock, or kit contents are complete.
            </label>
          </div>
        </AdminPanel>
      </aside>
    </div>
  );
}
