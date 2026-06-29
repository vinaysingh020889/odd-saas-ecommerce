import { notFound } from "next/navigation";
import { AdminPromotionForm } from "@/components/admin-promotion-form";
import { PageHeader } from "@/components/ui";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getEntityTagIds, getTags } from "@/lib/tag-relations";

type PageProps = { params: Promise<{ id: string }> };

async function getTargets() {
  const tenantId = await getOmdTenantId();
  const [products, categories, festivals] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: { title: "asc" }, select: { id: true, title: true, type: true } }),
    prisma.category.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, type: true } }),
    prisma.festivalCampaign.findMany({ where: { tenantId }, orderBy: { title: "asc" }, select: { id: true, title: true, slug: true } })
  ]);

  return [
    ...festivals.map((item) => ({ id: item.slug, label: item.title, type: "FESTIVAL" })),
    ...products.map((item) => ({ id: item.id, label: item.title, type: item.type })),
    ...categories.map((item) => ({ id: item.slug, label: item.name, type: "CATEGORY" }))
  ];
}

export default async function EditPromotionPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const [placement, targets, tags] = await Promise.all([
    prisma.promotionPlacement.findFirst({ where: { id, tenantId } }),
    getTargets(),
    getTags(tenantId)
  ]);

  if (!placement) notFound();
  const selectedTagIds = await getEntityTagIds(tenantId, "PROMOTION_PLACEMENT", placement.id);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Merchandising" title={`Edit ${placement.title}`} description="Update placement content, schedule, priority, and target." tone="admin" />
      <AdminPromotionForm placement={placement} targets={targets} tags={tags} selectedTagIds={selectedTagIds} />
    </div>
  );
}
