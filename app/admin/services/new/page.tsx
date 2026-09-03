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

export default async function NewServicePage({ searchParams }: PageProps) {
  const query = await searchParams;
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
        description="Create an assisted or bookable service record, then continue to variants and operational setup."
        tone="admin"
      />
      <AdminProductForm categories={categoryOptions} tags={tags} serviceMode catalogMode="SERVICE" returnTo={safeReturnTo(query.returnTo, "/admin/services")} />
    </div>
  );
}


