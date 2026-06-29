import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ parent?: string; q?: string }>;
};

export default async function AdminCategoriesPage({ searchParams }: PageProps) {
  const { parent, q: rawQuery } = await searchParams;
  const tenantId = await getOmdTenantId();
  const q = (rawQuery ?? "").trim();
  const categories = await prisma.category.findMany({
    where: { tenantId },
    include: {
      parent: true,
      children: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      _count: { select: { products: true, children: true } }
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
  const matchesQuery = (category: { name: string; slug: string; description?: string | null }) => {
    if (!q) return true;
    const text = `${category.name} ${category.slug} ${category.description ?? ""}`.toLowerCase();
    return text.includes(q.toLowerCase());
  };
  const parentCategories = categories.filter((category) => !category.parentId);
  const visibleParentCategories = q
    ? parentCategories.filter((category) => matchesQuery(category) || category.children.some((child) => matchesQuery(child)))
    : parentCategories;
  const selectedParent =
    visibleParentCategories.find((category) => category.slug === parent || category.id === parent) ??
    visibleParentCategories[0] ??
    null;
  const selectedParentMatches = selectedParent ? matchesQuery(selectedParent) : false;
  const selectedChildren = selectedParent
    ? q && !selectedParentMatches
      ? selectedParent.children.filter((child) => matchesQuery(child))
      : selectedParent.children
    : [];
  const returnParams = [selectedParent ? `parent=${selectedParent.slug}` : "", q ? `q=${encodeURIComponent(q)}` : ""].filter(Boolean).join("&");
  const currentReturnTo = `/admin/categories${returnParams ? `?${returnParams}` : ""}`;
  const encodedReturnTo = encodeURIComponent(currentReturnTo);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Catalog"
        title="Categories"
        description="Select a parent category, then manage its subcategories in the detail panel."
        tone="admin"
        actions={
          <Link href={`/admin/categories/new?returnTo=${encodedReturnTo}`} className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
            New category
          </Link>
        }
      />

      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_110px]">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search parent category, subcategory, slug"
            className="h-10 rounded-md border border-slate-300 px-3 text-sm"
          />
          {selectedParent ? <input type="hidden" name="parent" value={selectedParent.slug} /> : null}
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Search</button>
        </form>
      </AdminPanel>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="h-fit overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm lg:sticky lg:top-20">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-950">Parent Categories</h2>
            <p className="mt-1 text-xs text-slate-500">The right panel updates based on your selection.</p>
          </div>
          <div className="max-h-[68vh] overflow-y-auto p-2">
            {visibleParentCategories.map((category) => {
              const selected = selectedParent?.id === category.id;

              return (
                <Link
                  key={category.id}
                  href={`/admin/categories?parent=${category.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={`grid gap-2 rounded-md border px-3 py-3 text-sm transition ${
                    selected ? "border-omd-ops bg-blue-50 text-slate-950" : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-semibold">{category.name}</span>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {category._count.children}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {category._count.products} direct products - {statusLabel(category.status)}
                  </span>
                </Link>
              );
            })}
            {visibleParentCategories.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-slate-500">No category matches this search.</div>
            ) : null}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {selectedParent ? (
            <>
              <div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-950">{selectedParent.name}</h2>
                    <StatusBadge tone={statusTone(selectedParent.status)}>{statusLabel(selectedParent.status)}</StatusBadge>
                    <StatusBadge tone="neutral">Parent</StatusBadge>
                    {selectedParent.showOnHomepageIntent ? <StatusBadge tone="ops">Homepage Intent #{selectedParent.homepageIntentSortOrder}</StatusBadge> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedChildren.length} subcategories - {selectedParent._count.products} direct product(s)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-omd-ops hover:text-omd-ops" href={`/admin/categories/${selectedParent.slug}/edit?returnTo=${encodedReturnTo}`}>
                    Edit parent
                  </Link>
                  <Link className="rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800" href={`/admin/categories/new?parent=${selectedParent.slug}&returnTo=${encodedReturnTo}`}>
                    Add subcategory
                  </Link>
                </div>
              </div>

              {selectedChildren.length === 0 ? (
                <div className="grid place-items-center px-5 py-12 text-center">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">No subcategories yet</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                      Create a subcategory under {selectedParent.name} to keep product assignment clean and storefront navigation compact.
                    </p>
                    <Link className="mt-5 inline-flex rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800" href={`/admin/categories/new?parent=${selectedParent.slug}&returnTo=${encodedReturnTo}`}>
                      Create subcategory
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  <div className="hidden grid-cols-[1fr_120px_120px_120px_auto] gap-3 bg-white px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
                    <span>Subcategory</span>
                    <span>Type</span>
                    <span>Status</span>
                    <span>Products</span>
                    <span className="text-right">Action</span>
                  </div>
                  {selectedChildren.map((child) => {
                    const childRecord = categories.find((item) => item.id === child.id);

                    return (
                      <div key={child.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[1fr_120px_120px_120px_auto] md:items-center">
                        <div>
                          <p className="font-semibold text-slate-950">{child.name}</p>
                          <p className="text-xs text-slate-500">/{child.slug}</p>
                        </div>
                        <span className="text-slate-600">{child.type}</span>
                        <span><StatusBadge tone={statusTone(child.status)}>{statusLabel(child.status)}</StatusBadge></span>
                        <span className="text-slate-600">{childRecord?._count.products ?? 0} products</span>
                        <Link className="text-right font-semibold text-omd-ops hover:text-slate-900" href={`/admin/categories/${child.slug}/edit?returnTo=${encodedReturnTo}`}>
                          Edit
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="px-5 py-12 text-center text-sm text-slate-500">No parent categories found.</div>
          )}
        </section>
      </div>
    </div>
  );
}
