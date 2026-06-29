import { AdminPromotionForm } from "@/components/admin-promotion-form";
import { PageHeader } from "@/components/ui";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getTags } from "@/lib/tag-relations";

async function getTargets() {
  const tenantId = await getOmdTenantId();
  const [products, categories, festivals] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: { title: "asc" }, select: { id: true, title: true, type: true } }),
    prisma.category.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, type: true } }),
    prisma.festivalCampaign.findMany({ where: { tenantId }, orderBy: { title: "asc" }, select: { id: true, title: true, slug: true } })
  ]);

  return [
    ...festivals.map((item) => ({ id: item.slug ?? item.id, label: item.title, type: "FESTIVAL" })),
    ...products.map((item) => ({ id: item.id, label: item.title, type: item.type })),
    ...categories.map((item) => ({ id: item.slug, label: item.name, type: "CATEGORY" }))
  ];
}

export default async function NewPromotionPage() {
  const tenantId = await getOmdTenantId();
  const [targets, tags] = await Promise.all([getTargets(), getTags(tenantId)]);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Merchandising" title="Create Promotion Placement" description="Create a scheduled slot for storefront and operational merchandising surfaces." tone="admin" />
      <AdminPromotionForm targets={targets} tags={tags} />
    </div>
  );
}
