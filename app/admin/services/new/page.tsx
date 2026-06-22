import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";

export default async function NewServicePage() {
  const tenantId = await getOmdTenantId();
  const categories = await prisma.category.findMany({
    where: { tenantId, type: { in: ["SERVICE", "MIXED"] } },
    orderBy: { name: "asc" }
  });

  return <AdminProductForm categories={categories} serviceMode />;
}
