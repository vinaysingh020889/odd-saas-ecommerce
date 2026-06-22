import { saveVariantAction } from "@/lib/admin-actions";
import Link from "next/link";

type VariantFormProps = {
  productId: string;
  variant?: {
    id: string;
    sku: string | null;
    title: string | null;
    price: unknown;
    mrp: unknown;
    active: boolean;
    stockStatus: string;
  };
  stock?: {
    available: number;
    currentReserved: number;
    status: string;
  } | null;
};

export function AdminVariantForm({ productId, variant, stock }: VariantFormProps) {
  return (
    <form action={saveVariantAction} className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-7">
      <input type="hidden" name="id" value={variant?.id ?? ""} />
      <input type="hidden" name="productId" value={productId} />
      {variant ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 md:col-span-7">
          Ledger available: <span className="font-semibold text-slate-950">{stock?.available ?? 0}</span>
          {" - "}Reserved: <span className="font-semibold text-slate-950">{stock?.currentReserved ?? 0}</span>
          {" - "}Computed status: <span className="font-semibold text-slate-950">{stock?.status ?? "OUT_OF_STOCK"}</span>
          {" - "}
          <Link href="/admin/inventory" className="font-semibold text-omd-ops">Inventory history</Link>
        </div>
      ) : null}
      <input name="sku" placeholder="SKU" defaultValue={variant?.sku ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <input name="title" placeholder="Variant title" defaultValue={variant?.title ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <input name="price" type="number" step="0.01" placeholder="Price" defaultValue={variant?.price?.toString() ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <input name="mrp" type="number" step="0.01" placeholder="MRP" defaultValue={variant?.mrp?.toString() ?? ""} className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
      <select name="stockStatus" defaultValue={variant?.stockStatus ?? "IN_STOCK"} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
        <option value="IN_STOCK">IN_STOCK</option>
        <option value="LOW_STOCK">LOW_STOCK</option>
        <option value="OUT_OF_STOCK">OUT_OF_STOCK</option>
      </select>
      <select name="active" defaultValue={variant?.active === false ? "false" : "true"} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>
      <button className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
        Save SKU
      </button>
    </form>
  );
}
