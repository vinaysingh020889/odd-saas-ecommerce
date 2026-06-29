"use client";

import Link from "next/link";
import { useState } from "react";
import { saveCategoryAction } from "@/lib/admin-actions";
import { TagSelector } from "@/components/tag-selector";
import type { TagOption } from "@/lib/tag-relations";

type CategoryOption = {
  id: string;
  name: string;
  parentId: string | null;
};

type CategoryFormProps = {
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    parentId: string | null;
    type: string;
    status: string;
    sortOrder: number;
    showOnHomepageIntent: boolean;
    homepageIntentTitle: string | null;
    homepageIntentDescription: string | null;
    homepageIntentImage: string | null;
    homepageIntentSortOrder: number;
    isFeatured: boolean;
    _count?: { products: number; children?: number };
  };
  categories: CategoryOption[];
  tags?: TagOption[];
  selectedTagIds?: string[];
  defaultParentId?: string | null;
  returnTo?: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminCategoryForm({ category, categories, tags = [], selectedTagIds = [], defaultParentId, returnTo = "/admin/categories" }: CategoryFormProps) {
  const parentOptions = categories.filter((item) => !item.parentId && item.id !== category?.id);
  const isParentWithProducts = !category?.parentId && Boolean(category?._count?.products);
  const selectedParentId = category?.parentId ?? defaultParentId ?? "";
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(category?.slug));
  const suggestedSlug = slugify(name);

  return (
    <form action={saveCategoryAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={category?.id ?? ""} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Catalog</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">{category ? `Edit ${category.name}` : "Create Category"}</h1>
        </div>
        <Link href={returnTo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops">
          Back
        </Link>
      </div>
      {isParentWithProducts ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          This parent category has {category?._count?.products} product(s) directly assigned. New products should usually be assigned to a subcategory; parent pages will still include these legacy products.
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Name
          <input
            name="name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) {
                setSlug(slugify(nextName));
              }
            }}
            required
            placeholder="Example: Puja Oils"
            className="h-10 rounded-md border border-slate-300 px-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
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
            placeholder="puja-oils"
            className="h-10 rounded-md border border-slate-300 px-3"
          />
          <span className="text-xs font-normal text-slate-500">
            Auto-built from name. You can edit it; suggested value is <span className="font-semibold">{suggestedSlug || "type-a-name-first"}</span>.
          </span>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Description
        <textarea name="description" defaultValue={category?.description ?? ""} className="min-h-24 rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Parent
          <select name="parentId" defaultValue={selectedParentId} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="">Top-level parent category</option>
            {parentOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-slate-500">
            Choose a top-level parent to create a subcategory. Two levels are supported.
          </span>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Type
          <select name="type" defaultValue={category?.type ?? "PRODUCT"} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="PRODUCT">PRODUCT</option>
            <option value="SERVICE">SERVICE</option>
            <option value="MIXED">MIXED</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select name="status" defaultValue={category?.status ?? "ACTIVE"} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Sort Order
          <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>
      <section className="grid gap-4 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Homepage Intent</p>
          <p className="mt-1 text-sm text-slate-600">
            Controls whether this category appears in the /shop Shop by Intent section. Normal category browsing remains unaffected.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input name="showOnHomepageIntent" type="checkbox" defaultChecked={category?.showOnHomepageIntent ?? false} className="h-4 w-4" />
            Show in Shop by Intent
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input name="isFeatured" type="checkbox" defaultChecked={category?.isFeatured ?? false} className="h-4 w-4" />
            Featured category
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            Intent title
            <input name="homepageIntentTitle" defaultValue={category?.homepageIntentTitle ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Intent sort order
            <input name="homepageIntentSortOrder" type="number" defaultValue={category?.homepageIntentSortOrder ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-medium">
          Intent image URL
          <input name="homepageIntentImage" defaultValue={category?.homepageIntentImage ?? ""} placeholder="https://..." className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Intent description
          <textarea
            name="homepageIntentDescription"
            defaultValue={category?.homepageIntentDescription ?? ""}
            className="min-h-20 rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </section>
      <TagSelector
        tags={tags}
        selectedTagIds={selectedTagIds}
        helper="Attach context tags to support future storefront discovery, campaign grouping, and SEO-aware browsing."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
          Save category
        </button>
        <Link href={returnTo} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops">
          Cancel
        </Link>
      </div>
    </form>
  );
}
