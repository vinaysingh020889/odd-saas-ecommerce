import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminCategoryForm } from "@/components/admin-category-form";

export default async function NewCategoryPage() {
  const tenantId = await getOmdTenantId();
  const categories = await prisma.category.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
  return <AdminCategoryForm categories={categories} />;
}
