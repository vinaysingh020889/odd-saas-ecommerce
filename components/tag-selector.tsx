"use client";

type TagSelectorProps = {
  name?: string;
  tags: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
  }>;
  selectedTagIds?: string[];
  label?: string;
  helper?: string;
};

export function TagSelector({
  name = "tagIds",
  tags,
  selectedTagIds = [],
  label = "Tags",
  helper = "Select context tags for future search, recommendations, and merchandising."
}: TagSelectorProps) {
  const selected = new Set(selectedTagIds);
  const grouped = tags.reduce<Record<string, typeof tags>>((acc, tag) => {
    acc[tag.type] = acc[tag.type] ?? [];
    acc[tag.type].push(tag);
    return acc;
  }, {});

  return (
    <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <p className="text-sm font-semibold text-slate-950">{label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p>
      </div>
      <div className="grid max-h-72 gap-4 overflow-y-auto">
        {Object.entries(grouped).map(([type, items]) => (
          <div key={type} className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{type.replaceAll("_", " ")}</p>
            <div className="flex flex-wrap gap-2">
              {items.map((tag) => (
                <label key={tag.id} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-omd-ops">
                  <input name={name} type="checkbox" value={tag.id} defaultChecked={selected.has(tag.id)} className="h-3.5 w-3.5" />
                  {tag.name}
                </label>
              ))}
            </div>
          </div>
        ))}
        {tags.length === 0 ? <p className="text-sm text-slate-500">No active tags are configured yet.</p> : null}
      </div>
    </section>
  );
}
