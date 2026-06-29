import { notFound } from "next/navigation";
import { AdminFestivalForm } from "@/components/admin-festival-form";
import { PageHeader } from "@/components/ui";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";
import { getEntityTagIds, getTags } from "@/lib/tag-relations";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditFestivalPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const [campaign, products, categories, services, tags] = await Promise.all([
    prisma.festivalCampaign.findFirst({
      where: { id, tenantId },
      include: { products: true, categories: true, services: true }
    }),
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE", type: { in: ["PHYSICAL", "DIGITAL", "MEMBERSHIP", "KIT"] } }, orderBy: { title: "asc" } }),
    prisma.category.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE", type: "SERVICE" }, orderBy: { title: "asc" } }),
    getTags(tenantId)
  ]);

  if (!campaign) notFound();
  const selectedTagIds = await getEntityTagIds(tenantId, "FESTIVAL_CAMPAIGN", campaign.id);

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Merchandising" title={`Edit ${campaign.title}`} description="Update schedule, creative, homepage visibility, and linked records." tone="admin" />
      <AdminFestivalForm campaign={campaign} products={products} categories={categories} services={services} tags={tags} selectedTagIds={selectedTagIds} />
    </div>
  );
}
