import { AdminFestivalForm } from "@/components/admin-festival-form";
import { PageHeader } from "@/components/ui";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getTags } from "@/lib/tag-relations";

export default async function NewFestivalPage() {
  const tenantId = await getOmdTenantId();
  const [products, categories, services, tags] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE", type: { in: ["PHYSICAL", "DIGITAL", "MEMBERSHIP", "KIT"] } }, orderBy: { title: "asc" } }),
    prisma.category.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE", type: "SERVICE" }, orderBy: { title: "asc" } }),
    getTags(tenantId)
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Merchandising" title="Create Festival" description="Build a scheduled campaign and connect it to existing sellable records." tone="admin" />
      <AdminFestivalForm products={products} categories={categories} services={services} tags={tags} />
    </div>
  );
}
