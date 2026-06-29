import Link from "next/link";
import type { CatalogItem } from "@/lib/catalog";
import { formatMoney } from "@/lib/catalog";

type AdminCatalogTableProps = {
  items: CatalogItem[];
};

export function AdminCatalogTable({ items }: AdminCatalogTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Price</th>
            <th className="px-4 py-3">Variants</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((item) => (
            <tr key={item.id} className="align-top hover:bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-950">{item.title}</td>
              <td className="px-4 py-3 text-slate-600">{item.category?.name ?? "Uncategorized"}</td>
              <td className="px-4 py-3 text-slate-600">{item.type}</td>
              <td className="px-4 py-3 text-slate-600">{item.status}</td>
              <td className="px-4 py-3 text-slate-600">{formatMoney(item.basePrice, item.currency)}</td>
              <td className="px-4 py-3 text-slate-600">{item.variants.length}</td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/products/${item.id}/edit`}
                  className="inline-flex rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-omd-ops hover:border-omd-ops"
                >
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
