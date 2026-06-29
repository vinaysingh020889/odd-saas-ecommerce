import { notFound } from "next/navigation";
import { deleteTagAction } from "@/lib/tag-actions";
import { AdminTagForm } from "@/components/admin-tag-form";
import { AdminPanel } from "@/components/ui";
import { requireCatalogAdminUser } from "@/lib/admin-auth";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

function safeReturnTo(value?: string) {
  if (!value) return "/admin/tags";
  if (!value.startsWith("/admin/")) return "/admin/tags";
  if (value.startsWith("//") || value.includes("://")) return "/admin/tags";
  return value;
}

export default async function EditTagPage({ params, searchParams }: PageProps) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const tag = await prisma.tag.findFirst({
    where: { tenantId, OR: [{ id }, { slug: id }] },
    include: { aliases: { orderBy: { value: "asc" } }, _count: { select: { relations: true } } }
  });

  if (!tag) notFound();

  return (
    <div className="grid gap-6">
      <AdminTagForm tag={tag} returnTo={safeReturnTo(query.returnTo)} />

      <AdminPanel className="border-red-200 bg-red-50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-red-950">Delete tag</h2>
            <p className="mt-1 text-sm text-red-800">
              This removes aliases and tag relations for this tenant. Current relation count: {tag._count.relations}.
            </p>
          </div>
          <form action={deleteTagAction}>
            <input type="hidden" name="id" value={tag.id} />
            <button className="rounded-md border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
              Delete tag
            </button>
          </form>
        </div>
      </AdminPanel>
    </div>
  );
}
