"use client";

import Link from "next/link";
import { useState } from "react";
import { saveTagAction } from "@/lib/tag-actions";
import { slugifyTag, TAG_TYPES, tagTypeLabel } from "@/lib/tags";

type AdminTagFormProps = {
  tag?: {
    id: string;
    name: string;
    slug: string;
    type: string;
    description: string | null;
    status: string;
    sortOrder: number;
    aliases: Array<{ value: string }>;
  };
  returnTo?: string;
};

export function AdminTagForm({ tag, returnTo = "/admin/tags" }: AdminTagFormProps) {
  const [name, setName] = useState(tag?.name ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(tag?.slug));
  const suggestedSlug = slugifyTag(name);

  return (
    <form action={saveTagAction} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={tag?.id ?? ""} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Tag Graph</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-950">{tag ? `Edit ${tag.name}` : "Create Tag"}</h1>
          <p className="mt-1 text-sm text-slate-600">Foundation taxonomy for festivals, deities, rituals, places, services, benefits and future search.</p>
        </div>
        <Link href={returnTo} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops">
          Back
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Name
          <input
            name="name"
            value={name}
            onChange={(event) => {
              const nextName = event.target.value;
              setName(nextName);
              if (!slugEdited) setSlug(slugifyTag(nextName));
            }}
            required
            placeholder="Example: Sawan"
            className="h-10 rounded-md border border-slate-300 px-3"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Slug
          <input
            name="slug"
            value={slug}
            onChange={(event) => {
              setSlug(slugifyTag(event.target.value));
              setSlugEdited(true);
            }}
            onFocus={() => setSlugEdited(true)}
            required
            placeholder="sawan"
            className="h-10 rounded-md border border-slate-300 px-3"
          />
          <span className="text-xs font-normal text-slate-500">
            Auto-built from name. Suggested value: <span className="font-semibold">{suggestedSlug || "type-a-name-first"}</span>.
          </span>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Type
          <select name="type" defaultValue={tag?.type ?? "FESTIVAL"} className="h-10 rounded-md border border-slate-300 px-3">
            {TAG_TYPES.map((type) => (
              <option key={type} value={type}>{tagTypeLabel(type)}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select name="status" defaultValue={tag?.status ?? "ACTIVE"} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Sort order
          <input name="sortOrder" type="number" defaultValue={tag?.sortOrder ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>

      <label className="grid gap-2 text-sm font-medium">
        Description
        <textarea name="description" defaultValue={tag?.description ?? ""} rows={4} className="rounded-md border border-slate-300 px-3 py-2" />
      </label>

      <label className="grid gap-2 text-sm font-medium">
        Aliases
        <textarea
          name="aliases"
          defaultValue={tag?.aliases.map((alias) => alias.value).join("\n") ?? ""}
          rows={6}
          placeholder={"Hindi, Sanskrit, transliteration, spelling variants, and search aliases.\nExample:\nशिव\nShiva\nMahadev"}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
        <span className="text-xs font-normal text-slate-500">Add one alias per line or comma-separated. These are foundation search aliases only.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
          Save tag
        </button>
        <Link href={returnTo} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops">
          Cancel
        </Link>
      </div>
    </form>
  );
}
