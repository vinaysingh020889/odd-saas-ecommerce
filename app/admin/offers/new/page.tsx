import { AdminOfferForm } from "@/components/admin-offer-form";
import { PageHeader } from "@/components/ui";
import { getOmdTenantId } from "@/lib/catalog";
import { prisma } from "@/lib/prisma";

async function getTargets() {
  const tenantId = await getOmdTenantId();
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { tenantId }, select: { id: true, title: true, type: true }, orderBy: { title: "asc" } }),
    prisma.category.findMany({ where: { tenantId }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" } })
  ]);
  return [
    ...products.map((item) => ({ id: item.id, label: item.title, type: item.type })),
    ...categories.map((item) => ({ id: item.id, label: item.name, type: `CATEGORY:${item.type}` }))
  ];
}

export default async function NewOfferPage() {
  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Commerce" title="Create Offer" description="Create an automatic or coupon offer for cart pricing." tone="admin" />
      <AdminOfferForm targets={await getTargets()} />
    </div>
  );
}
