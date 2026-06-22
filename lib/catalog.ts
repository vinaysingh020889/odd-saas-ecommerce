import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const productTypes = ["PHYSICAL", "DIGITAL", "MEMBERSHIP", "KIT"] as const;
export const serviceTypes = ["SERVICE", "KIT"] as const;

export type CatalogItem = Awaited<ReturnType<typeof getActiveCatalogItems>>[number];

export function formatMoney(value: unknown, currency = "INR") {
  if (value === null || value === undefined) {
    return "Price coming soon";
  }

  const amount = Number(value);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export async function getOmdTenantId() {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "omdivyadarshan" },
    select: { id: true }
  });

  if (!tenant) {
    throw new Error("OMDivyaDarshan tenant is not seeded.");
  }

  return tenant.id;
}

export async function getActiveCatalogItems(types: readonly string[]) {
  const tenantId = await getOmdTenantId();

  return prisma.product.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      type: { in: [...types] }
    },
    include: {
      category: true,
      variants: {
        where: { active: true },
        orderBy: { createdAt: "asc" }
      }
    },
    orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { category: { sortOrder: "asc" } }, { title: "asc" }]
  });
}

export async function getCatalogItemBySlug(slug: string) {
  const tenantId = await getOmdTenantId();
  const item = await prisma.product.findFirst({
    where: {
      tenantId,
      slug,
      status: "ACTIVE"
    },
    include: {
      category: true,
      variants: {
        where: { active: true },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!item) {
    notFound();
  }

  return item;
}

export async function getAdminCatalogItems(types?: readonly string[]) {
  const tenantId = await getOmdTenantId();

  return prisma.product.findMany({
    where: {
      tenantId,
      ...(types ? { type: { in: [...types] } } : {})
    },
    include: {
      category: true,
      variants: true
    },
    orderBy: [{ updatedAt: "desc" }, { title: "asc" }]
  });
}

export async function getActiveCategories(types?: readonly string[]) {
  const tenantId = await getOmdTenantId();

  return prisma.category.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      ...(types ? { type: { in: [...types] } } : {})
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
  });
}
