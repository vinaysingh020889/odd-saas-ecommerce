import type { CatalogItem } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";

type AdminCatalogTableProps = {
  items: CatalogItem[];
};

export function AdminCatalogTable({ items }: AdminCatalogTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Variants</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3 font-semibold text-slate-950">{item.title}</td>
              <td className="px-4 py-3 text-slate-600">{item.category?.name ?? "Uncategorized"}</td>
              <td className="px-4 py-3 text-slate-600">{item.type}</td>
              <td className="px-4 py-3 text-slate-600">{item.status}</td>
              <td className="px-4 py-3 text-slate-600">{formatMoney(item.basePrice, item.currency)}</td>
              <td className="px-4 py-3 text-slate-600">{item.variants.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
