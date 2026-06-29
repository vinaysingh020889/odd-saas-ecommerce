import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminCategoryForm } from "@/components/admin-category-form";
import { getEntityTagIds, getTags } from "@/lib/tag-relations";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
};

function safeReturnTo(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/admin/")) return fallback;
  if (value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}

export default async function EditCategoryPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const tenantId = await getOmdTenantId();
  const [category, categories, tags] = await Promise.all([
    prisma.category.findFirst({
      where: {
        tenantId,
        OR: [{ id }, { slug: id }]
      },
      include: { _count: { select: { products: true, children: true } } }
    }),
    prisma.category.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    getTags(tenantId)
  ]);
  if (!category) notFound();
  const selectedTagIds = await getEntityTagIds(tenantId, "CATEGORY", category.id);
  const parentSlug = category.parentId ? categories.find((item) => item.id === category.parentId)?.slug : category.slug;
  const fallbackReturnTo = parentSlug ? `/admin/categories?parent=${parentSlug}` : "/admin/categories";

  return <AdminCategoryForm category={category} categories={categories} tags={tags} selectedTagIds={selectedTagIds} returnTo={safeReturnTo(returnTo, fallbackReturnTo)} />;
}
