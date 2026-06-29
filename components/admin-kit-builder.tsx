import { removeKitComponentAction, saveKitComponentAction } from "@/lib/admin-actions";
import { AdminPanel } from "@/components/ui";

type KitComponentRow = {
  id: string;
  quantity: number;
  sortOrder: number;
  componentProduct: { title: string; type: string };
  componentVariant: { id: string; sku: string | null; title: string | null; price: unknown } | null;
};

type ComponentOption = {
  id: string;
  sku: string | null;
  title: string | null;
  price: unknown;
  product: { title: string; type: string };
};

function optionLabel(option: ComponentOption) {
  const variantTitle = option.title ? ` - ${option.title}` : "";
  const sku = option.sku ? ` (${option.sku})` : "";
  return `${option.product.title}${variantTitle}${sku}`;
}

function priceText(value: unknown) {
  return value == null ? "-" : `₹${Number(value).toLocaleString("en-IN")}`;
}

export function AdminKitBuilder({
  kitProductId,
  components,
  componentOptions
}: {
  kitProductId: string;
  components: KitComponentRow[];
  componentOptions: ComponentOption[];
}) {
  return (
    <AdminPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Kit Components</h2>
          <p className="mt-2 text-sm text-slate-600">Define what is included when this kit is sold. This does not reserve stock yet.</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {components.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No kit components yet. Add variants below so this kit has a real sellable composition.
          </div>
        ) : null}
        {components.map((component) => (
          <form key={component.id} action={saveKitComponentAction} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 md:grid-cols-[1fr_100px_100px_90px]">
            <input type="hidden" name="id" value={component.id} />
            <input type="hidden" name="kitProductId" value={kitProductId} />
            <select name="componentVariantId" defaultValue={component.componentVariant?.id ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
              {componentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {optionLabel(option)} - {priceText(option.price)}
                </option>
              ))}
            </select>
            <input name="quantity" type="number" min="1" step="1" defaultValue={component.quantity} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <input name="sortOrder" type="number" step="1" defaultValue={component.sortOrder} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
            <button className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">Save</button>
          </form>
        ))}
      </div>

      <form action={saveKitComponentAction} className="mt-5 grid gap-3 rounded-md border border-dashed border-slate-300 p-3 md:grid-cols-[1fr_100px_100px_100px]">
        <input type="hidden" name="kitProductId" value={kitProductId} />
        <select name="componentVariantId" required className="h-10 rounded-md border border-slate-300 px-3 text-sm">
          <option value="">Select component variant</option>
          {componentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {optionLabel(option)} - {priceText(option.price)}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min="1" step="1" defaultValue={1} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <input name="sortOrder" type="number" step="1" defaultValue={0} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
        <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Add item</button>
      </form>

      {components.length > 0 ? (
        <div className="mt-4 grid gap-2">
          {components.map((component) => (
            <form key={`remove-${component.id}`} action={removeKitComponentAction}>
              <input type="hidden" name="id" value={component.id} />
              <input type="hidden" name="kitProductId" value={kitProductId} />
              <button className="text-sm font-semibold text-red-700 hover:text-red-900">
                Remove {component.componentProduct.title}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </AdminPanel>
  );
}
