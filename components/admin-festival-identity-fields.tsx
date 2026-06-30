"use client";

import { useState } from "react";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminFestivalIdentityFields({ initialTitle = "", initialSlug = "" }: { initialTitle?: string; initialSlug?: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [slug, setSlug] = useState(initialSlug);
  const [slugEdited, setSlugEdited] = useState(Boolean(initialSlug));
  const suggestedSlug = slugify(title);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-medium">
        Title
        <input
          name="title"
          required
          value={title}
          onChange={(event) => {
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            if (!slugEdited) {
              setSlug(slugify(nextTitle));
            }
          }}
          className="h-10 rounded-md border border-slate-300 px-3"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Slug
        <input
          name="slug"
          required
          value={slug}
          onChange={(event) => {
            setSlug(slugify(event.target.value));
            setSlugEdited(true);
          }}
          onFocus={() => setSlugEdited(true)}
          placeholder="raksha-bandhan-2026"
          className="h-10 rounded-md border border-slate-300 px-3"
        />
        <span className="text-xs font-normal text-slate-500">
          Auto-built from title. You can edit it; suggested value is <span className="font-semibold">{suggestedSlug || "type-a-title-first"}</span>.
        </span>
      </label>
    </div>
  );
}
