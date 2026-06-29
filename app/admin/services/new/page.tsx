import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";
import { PageHeader } from "@/components/ui";
import { getTags } from "@/lib/tag-relations";

export default async function NewServicePage() {
  const tenantId = await getOmdTenantId();
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({
      where: { tenantId, type: { in: ["SERVICE", "MIXED"] } },
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
    }),
    getTags(tenantId)
  ]);
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name, type: category.type, parentId: category.parentId }));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Service CMS"
        title="Create Service"
        description="Create the service record first, then continue to service variants and operational setup in later phases."
        tone="admin"
      />
      <AdminProductForm categories={categoryOptions} tags={tags} serviceMode />
    </div>
  );
}
