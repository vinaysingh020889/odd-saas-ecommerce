"use client";

import { tagTypeLabel } from "@/lib/tags";

type TagChip = {
  id: string;
  name: string;
  type: string;
};

export function TagChips({ tags, label = "Context" }: { tags: TagChip[]; label?: string }) {
  if (tags.length === 0) return null;

  function trackTag(tag: TagChip) {
    void fetch("/api/customer-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "TAG_CLICK",
        entityType: "TAG",
        entityId: tag.id,
        entitySlug: tag.name.toLowerCase().replace(/\s+/g, "-"),
        sourcePath: window.location.pathname + window.location.search,
        metadata: { title: tag.name, tags: [{ id: tag.id, name: tag.name, type: tag.type }] }
      })
    }).catch(() => {
      // Internal analytics must not interrupt tag navigation.
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-omd-muted">{label}</span>
      {tags.map((tag) => (
        <a
          key={tag.id}
          href={`/search?q=${encodeURIComponent(tag.name)}&source=tag_chip`}
          title={tagTypeLabel(tag.type)}
          onClick={() => trackTag(tag)}
          className="rounded-full border border-omd-sand bg-white px-3 py-1 text-xs font-semibold text-omd-brown"
        >
          {tag.name}
        </a>
      ))}
    </div>
  );
}
