import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";

export type TopMenuOffer = {
  id: string;
  title: string;
  href: string;
};

export async function getActiveTopMenuOffer(): Promise<TopMenuOffer | null> {
  const tenantId = await getOmdTenantId();
  const now = new Date();

  const offer = await prisma.offerRule.findFirst({
    where: {
      tenantId,
      showInTopMenu: true,
      status: { in: ["ACTIVE", "SCHEDULED"] },
      AND: [
        { OR: [{ startDate: null }, { startDate: { lte: now } }] },
        { OR: [{ endDate: null }, { endDate: { gte: now } }] }
      ]
    },
    orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
    select: { id: true, title: true, topMenuTitle: true, code: true }
  });

  if (!offer) return null;

  return {
    id: offer.id,
    title: offer.topMenuTitle?.trim() || offer.title,
    href: offer.code ? `/shop?offer=${encodeURIComponent(offer.code)}` : "/shop"
  };
}
