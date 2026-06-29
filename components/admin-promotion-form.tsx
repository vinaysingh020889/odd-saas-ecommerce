import { savePromotionPlacementAction } from "@/lib/admin-actions";
import { promotionPlacementKeys, promotionStatuses, promotionSurfaces, promotionTargetTypes } from "@/lib/merchandising";
import { TagSelector } from "@/components/tag-selector";
import type { TagOption } from "@/lib/tag-relations";

type TargetOption = {
  id: string;
  label: string;
  type: string;
};

type PromotionFormProps = {
  placement?: {
    id: string;
    placementKey: string;
    surface: string;
    targetType: string;
    targetId: string | null;
    title: string;
    description: string | null;
    image: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    startDate: Date | null;
    endDate: Date | null;
    priority: number;
    status: string;
    sortOrder: number;
  };
  targets: TargetOption[];
  tags?: TagOption[];
  selectedTagIds?: string[];
};

function dateInput(value?: Date | null) {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

export function AdminPromotionForm({ placement, targets, tags = [], selectedTagIds = [] }: PromotionFormProps) {
  return (
    <form action={savePromotionPlacementAction} className="grid gap-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <input type="hidden" name="id" value={placement?.id ?? ""} />
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Placement key
          <select name="placementKey" defaultValue={placement?.placementKey ?? "homepage_hero"} className="h-10 rounded-md border border-slate-300 px-3">
            {promotionPlacementKeys.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Surface
          <select name="surface" defaultValue={placement?.surface ?? "HOMEPAGE"} className="h-10 rounded-md border border-slate-300 px-3">
            {promotionSurfaces.map((surface) => <option key={surface} value={surface}>{surface}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Status
          <select name="status" defaultValue={placement?.status ?? "DRAFT"} className="h-10 rounded-md border border-slate-300 px-3">
            {promotionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium">
          Target type
          <select name="targetType" defaultValue={placement?.targetType ?? "CUSTOM"} className="h-10 rounded-md border border-slate-300 px-3">
            {promotionTargetTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Target record
          <select name="targetId" defaultValue={placement?.targetId ?? ""} className="h-10 rounded-md border border-slate-300 px-3">
            <option value="">Custom/no target</option>
            {targets.map((target) => <option key={`${target.type}-${target.id}`} value={target.id}>{target.type}: {target.label}</option>)}
          </select>
        </label>
      </div>
      <label className="grid gap-2 text-sm font-medium">
        Title
        <input name="title" required defaultValue={placement?.title ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Description
        <textarea name="description" defaultValue={placement?.description ?? ""} className="min-h-24 rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="grid gap-2 text-sm font-medium">
          Image URL
          <input name="image" defaultValue={placement?.image ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          CTA label
          <input name="ctaLabel" defaultValue={placement?.ctaLabel ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          CTA URL
          <input name="ctaUrl" defaultValue={placement?.ctaUrl ?? ""} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>
      {placement?.image ? (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={placement.image} alt="" className="h-56 w-full object-cover" />
          <p className="border-t border-slate-200 px-3 py-2 text-xs text-slate-500">
            Preview uses the saved image URL. If this area is blank or broken, the URL is not reachable by the browser.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-4">
        <label className="grid gap-2 text-sm font-medium">
          Start date
          <input name="startDate" type="date" defaultValue={dateInput(placement?.startDate)} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          End date
          <input name="endDate" type="date" defaultValue={dateInput(placement?.endDate)} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Priority
          <input name="priority" type="number" defaultValue={placement?.priority ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
        <label className="grid gap-2 text-sm font-medium">
          Sort order
          <input name="sortOrder" type="number" defaultValue={placement?.sortOrder ?? 0} className="h-10 rounded-md border border-slate-300 px-3" />
        </label>
      </div>
      <TagSelector
        tags={tags}
        selectedTagIds={selectedTagIds}
        helper="Attach context tags so this promotion can later participate in targeted merchandising and discovery."
      />
      <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
        Save promotion placement
      </button>
    </form>
  );
}
