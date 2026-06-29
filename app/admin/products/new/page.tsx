import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";
import { PageHeader } from "@/components/ui";
import { getTags } from "@/lib/tag-relations";

export default async function NewProductPage() {
  const tenantId = await getOmdTenantId();
  const [categories, tags] = await Promise.all([
    prisma.category.findMany({ where: { tenantId }, orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    getTags(tenantId)
  ]);
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name, type: category.type, parentId: category.parentId }));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Catalog CMS"
        title="Create Product"
        description="Create the sellable record first, then continue to variants, stock, and kit composition where applicable."
        tone="admin"
      />
      <AdminProductForm categories={categoryOptions} tags={tags} />
    </div>
  );
}
