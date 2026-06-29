import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireCatalogAdminUser } from "@/lib/admin-auth";
import { tagTypeLabel, TAG_TYPES } from "@/lib/tags";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
};

export default async function AdminTagsPage({ searchParams }: PageProps) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const type = (params.type ?? "").trim();
  const status = (params.status ?? "").trim();
  const tags = await prisma.tag.findMany({
    where: {
      tenantId,
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { aliases: { some: { value: { contains: q, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    include: {
      aliases: { orderBy: { value: "asc" } },
      _count: { select: { relations: true } }
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Context Graph"
        title="Tags"
        description="Tenant-scoped taxonomy for festivals, puja, rituals, deities, places, material attributes, services, benefits, and future discovery logic."
        tone="admin"
        actions={<Link href="/admin/tags/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">New tag</Link>}
      />

      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_220px_160px_100px]">
          <input name="q" defaultValue={q} placeholder="Search tag, slug, alias" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="type" defaultValue={type} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All types</option>
            {TAG_TYPES.map((item) => (
              <option key={item} value={item}>{tagTypeLabel(item)}</option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {tags.length === 0 ? (
        <EmptyState title="No tags found" description={q || type || status ? "No tag matches the current filter." : "Create the first context tag to begin building the OMD knowledge graph foundation."} />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Tag</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Aliases</th>
                  <th className="px-4 py-3">Relations</th>
                  <th className="px-4 py-3">Sort</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {tags.map((tag) => (
                  <tr key={tag.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/tags/${tag.id}/edit`} className="font-semibold text-omd-ops hover:text-slate-900">{tag.name}</Link>
                      <p className="mt-1 text-xs text-slate-500">/{tag.slug}</p>
                      {tag.description ? <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{tag.description}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{tagTypeLabel(tag.type)}</td>
                    <td className="px-4 py-3"><StatusBadge tone={statusTone(tag.status)}>{statusLabel(tag.status)}</StatusBadge></td>
                    <td className="px-4 py-3 text-slate-600">{tag.aliases.slice(0, 3).map((alias) => alias.value).join(", ") || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{tag._count.relations}</td>
                    <td className="px-4 py-3 text-slate-600">{tag.sortOrder}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
