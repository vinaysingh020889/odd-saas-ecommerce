import { notFound } from "next/navigation";
import { AdminOfferForm } from "@/components/admin-offer-form";
import { PageHeader } from "@/components/ui";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

type PageProps = { params: Promise<{ id: string }> };

async function getTargets(tenantId: string) {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { tenantId }, select: { id: true, title: true, type: true }, orderBy: { title: "asc" } }),
    prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" } })
  ]);
  return [
    ...products.map((item) => ({ id: item.id, label: item.title, type: item.type })),
    ...categories.map((item) => ({ id: item.id, label: item.name, type: `CATEGORY:${item.type}` }))
  ];
}

export default async function EditOfferPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const [offer, targets] = await Promise.all([
    prisma.offerRule.findFirst({ where: { id, tenantId }, include: { targets: true } }),
    getTargets(tenantId)
  ]);
  if (!offer) notFound();
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Commerce" title={`Edit ${offer.title}`} description="Update schedule, targeting, value, and stacking policy." tone="admin" />
      <AdminOfferForm offer={offer} targets={targets} />
    </div>
  );
}
