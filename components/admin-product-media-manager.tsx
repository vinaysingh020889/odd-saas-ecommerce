import { removeProductMediaAction, saveProductMediaAction } from "@/lib/admin-actions";
import { AdminPanel, StatusBadge } from "@/components/ui";

type MediaRow = {
  id: string;
  variantId: string | null;
  url: string;
  altText: string | null;
  role: string;
  sortOrder: number;
  isPrimary: boolean;
};

type VariantOption = {
  id: string;
  sku: string | null;
  title: string | null;
};

export function AdminProductMediaManager({
  productId,
  media,
  variants
}: {
  productId: string;
  media: MediaRow[];
  variants: VariantOption[];
}) {
  return (
    <AdminPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Product Media</h2>
          <p className="mt-2 text-sm text-slate-600">Add gallery images, choose the primary image, and optionally connect images to variants.</p>
        </div>
        <StatusBadge tone={media.some((item) => item.isPrimary) ? "success" : "warning"}>
          {media.some((item) => item.isPrimary) ? "Primary set" : "Needs primary"}
        </StatusBadge>
      </div>

      <div className="mt-5 grid gap-3">
        {media.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No product images added yet.
          </div>
        ) : null}
        {media.map((item) => (
          <form key={item.id} action={saveProductMediaAction} className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:grid-cols-[110px_1fr_140px_100px_90px]">
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="productId" value={productId} />
            <div className="h-20 overflow-hidden rounded-md border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="h-full w-full object-cover" />
            </div>
            <div className="grid gap-2">
              <input name="url" defaultValue={item.url} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input name="altText" defaultValue={item.altText ?? ""} placeholder="Alt text" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            </div>
            <select name="variantId" defaultValue={item.variantId ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              <option value="">All variants</option>
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>{variant.title ?? variant.sku ?? "Variant"}</option>
              ))}
            </select>
            <input name="sortOrder" type="number" defaultValue={item.sortOrder} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input name="isPrimary" type="checkbox" defaultChecked={item.isPrimary} />
              Primary
            </label>
            <input type="hidden" name="role" value={item.isPrimary ? "primary" : item.role} />
            <div className="flex gap-2 lg:col-start-5">
              <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </form>
        ))}
        {media.map((item) => (
          <form key={`remove-${item.id}`} action={removeProductMediaAction}>
            <input type="hidden" name="id" value={item.id} />
            <button className="text-sm font-semibold text-red-700 hover:text-red-900">Remove image {item.sortOrder}</button>
          </form>
        ))}
      </div>

      <form action={saveProductMediaAction} className="mt-5 grid gap-3 rounded-lg border border-dashed border-slate-300 p-3 lg:grid-cols-[1fr_180px_110px_110px]">
        <input type="hidden" name="productId" value={productId} />
        <input name="url" required placeholder="Image URL" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <select name="variantId" defaultValue="" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
          <option value="">All variants</option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>{variant.title ?? variant.sku ?? "Variant"}</option>
          ))}
        </select>
        <input name="sortOrder" type="number" defaultValue={0} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input name="isPrimary" type="checkbox" />
          Primary
        </label>
        <input name="altText" placeholder="Alt text" className="h-10 rounded-md border border-slate-300 px-3 text-sm lg:col-span-2" />
        <select name="role" defaultValue="gallery" className="h-10 rounded-md border border-slate-300 px-3 text-sm">
          <option value="gallery">Gallery</option>
          <option value="thumbnail">Thumbnail</option>
          <option value="primary">Primary</option>
        </select>
        <button className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white">Add image</button>
      </form>
    </AdminPanel>
  );
}
