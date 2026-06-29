import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminCategoryForm } from "@/components/admin-category-form";
import { getTags } from "@/lib/tag-relations";

type PageProps = {
  searchParams: Promise<{ parent?: string; returnTo?: string }>;
};

function safeReturnTo(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/admin/")) return fallback;
  if (value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}

export default async function NewCategoryPage({ searchParams }: PageProps) {
  const { parent, returnTo } = await searchParams;
  const tenantId = await getOmdTenantId();
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    getTags(tenantId)
  ]);
  const defaultParent = categories.find((category) => !category.parentId && (category.slug === parent || category.id === parent));
  const fallbackReturnTo = defaultParent ? `/admin/categories?parent=${defaultParent.slug}` : "/admin/categories";

  return <AdminCategoryForm categories={categories} tags={tags} defaultParentId={defaultParent?.id ?? null} returnTo={safeReturnTo(returnTo, fallbackReturnTo)} />;
}
