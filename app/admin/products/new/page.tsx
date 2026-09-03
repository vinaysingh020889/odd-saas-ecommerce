import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";
import { PageHeader } from "@/components/ui";
import { getTags } from "@/lib/tag-relations";

type PageProps = { searchParams: Promise<{ returnTo?: string }> };

function safeReturnTo(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/admin/")) return fallback;
  if (value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}

export default async function NewProductPage({ searchParams }: PageProps) {
  const query = await searchParams;
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
        description="Create a physical product, digital deliverable, or kit. Services and memberships are managed in their own modules."
        tone="admin"
      />
      <AdminProductForm categories={categoryOptions} tags={tags} catalogMode="PRODUCT" returnTo={safeReturnTo(query.returnTo, "/admin/products")} />
    </div>
  );
}


