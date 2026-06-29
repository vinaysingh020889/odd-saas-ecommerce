import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";

export async function getHeroSlideTargets() {
  const tenantId = await getOmdTenantId();
  const [products, services, festivals, offers, memberships] = await Promise.all([
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE", type: { not: "SERVICE" } }, orderBy: { title: "asc" }, select: { id: true, title: true, slug: true } }),
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE", type: "SERVICE" }, orderBy: { title: "asc" }, select: { id: true, title: true, slug: true } }),
    prisma.festivalCampaign.findMany({ where: { tenantId }, orderBy: { title: "asc" }, select: { id: true, title: true, slug: true } }),
    prisma.offerRule.findMany({ where: { tenantId }, orderBy: { title: "asc" }, select: { id: true, title: true, code: true } }),
    prisma.membershipPlan.findMany({ where: { tenantId }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true, slug: true } })
  ]);

  return {
    products: products.map((item) => ({ id: item.id, label: `${item.title} (${item.slug})` })),
    services: services.map((item) => ({ id: item.id, label: `${item.title} (${item.slug})` })),
    festivals: festivals.map((item) => ({ id: item.id, label: `${item.title} (${item.slug})` })),
    offers: offers.map((item) => ({ id: item.id, label: `${item.title} (${item.code ?? "no code"})` })),
    memberships: memberships.map((item) => ({ id: item.id, label: `${item.name} (${item.slug})` }))
  };
}