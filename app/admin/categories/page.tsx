import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";

export default async function AdminCategoriesPage() {
  const tenantId = await getOmdTenantId();
  const categories = await prisma.category.findMany({
    where: { tenantId },
    include: { parent: true, _count: { select: { products: true } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });

  return (
    <div className="grid gap-6">
      <section className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Catalog</p>
          <h1 className="mt-3 text-3xl font-semibold">Categories</h1>
        </div>
        <Link href="/admin/categories/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
          New category
        </Link>
      </section>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Items</th><th className="px-4 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 font-semibold">{category.name}</td>
                <td className="px-4 py-3 text-slate-600">{category.type}</td>
                <td className="px-4 py-3 text-slate-600">{category.status}</td>
                <td className="px-4 py-3 text-slate-600">{category.parent?.name ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">{category._count.products}</td>
                <td className="px-4 py-3"><Link className="font-semibold text-omd-ops" href={`/admin/categories/${category.id}/edit`}>Edit</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
