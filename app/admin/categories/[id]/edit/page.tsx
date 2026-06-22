import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminCategoryForm } from "@/components/admin-category-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditCategoryPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const [category, categories] = await Promise.all([
    prisma.category.findFirst({ where: { id, tenantId } }),
    prisma.category.findMany({ where: { tenantId }, orderBy: { name: "asc" } })
  ]);
  if (!category) notFound();
  return <AdminCategoryForm category={category} categories={categories} />;
}
