import { prisma } from "@/lib/prisma";
import { getVariantStockSummaries, isPhysicalInventoryType } from "@/lib/inventory";

type TargetType = "PRODUCT" | "SERVICE" | "CATEGORY" | "FESTIVAL_CAMPAIGN";

type ContextTag = {
  id: string;
  name: string;
  type: string;
};

const tagWeights: Record<string, number> = {
  FESTIVAL: 100,
  RITUAL: 95,
  DEITY: 95,
  PLACE: 82,
  PUJA: 82,
  PRODUCT_USE: 65,
  SERVICE_TYPE: 65,
  BENEFIT_INTENT: 60,
  MATERIAL_ATTRIBUTE: 35,
  CONTENT_TOPIC: 30
};

function contextLabel(tag: ContextTag) {
  if (tag.type === "FESTIVAL") return `Related to ${tag.name}`;
  if (tag.type === "RITUAL") return `Used in ${tag.name}`;
  if (tag.type === "DEITY") return `${tag.name} context`;
  if (tag.type === "PLACE") return `For ${tag.name} rituals`;
  if (tag.type === "PUJA") return `${tag.name} match`;
  if (tag.type === "PRODUCT_USE") return `${tag.name} match`;
  if (tag.type === "SERVICE_TYPE") return `${tag.name} service match`;
  return tag.name;
}

export async function getSharedTagContext(tenantId: string, targetType: TargetType, targetId: string) {
  const relations = await prisma.tagRelation.findMany({
    where: { tenantId, targetType, targetId, tag: { status: "ACTIVE" } },
    include: { tag: { select: { id: true, name: true, type: true } } },
    orderBy: [{ sortOrder: "asc" }, { tag: { sortOrder: "asc" } }]
  });

  return relations.map((relation) => relation.tag);
}

export function scoreRelatedEntities({
  sourceTags,
  candidateTags,
  sameCategory = false,
  sameFestivalCampaign = false,
  sameType = false,
  inventoryStatus
}: {
  sourceTags: ContextTag[];
  candidateTags: ContextTag[];
  sameCategory?: boolean;
  sameFestivalCampaign?: boolean;
  sameType?: boolean;
  inventoryStatus?: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | null;
}) {
  const sourceTagIds = new Set(sourceTags.map((tag) => tag.id));
  const sharedTags = candidateTags.filter((tag) => sourceTagIds.has(tag.id));
  let score = 0;

  for (const tag of sharedTags) {
    score += tagWeights[tag.type] ?? 25;
  }

  if (sameFestivalCampaign) score += 120;
  if (sameCategory) score += 70;
  if (sameType) score += 20;
  if (inventoryStatus === "IN_STOCK") score += 30;
  if (inventoryStatus === "LOW_STOCK") score += 10;
  if (inventoryStatus === "OUT_OF_STOCK") score -= 80;

  const contexts = sharedTags
    .sort((left, right) => (tagWeights[right.type] ?? 25) - (tagWeights[left.type] ?? 25))
    .slice(0, 2)
    .map(contextLabel);

  if (!contexts.length && sameFestivalCampaign) contexts.push("Festival collection match");
  if (!contexts.length && sameCategory) contexts.push("Same collection");

  return { score, sharedTags, contexts };
}

function sortScored<T extends { score: number; item: { featured?: boolean; sortOrder?: number; title?: string } }>(items: T[], limit: number) {
  return items
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      const byScore = right.score - left.score;
      if (byScore !== 0) return byScore;
      const byFeatured = Number(right.item.featured ?? false) - Number(left.item.featured ?? false);
      if (byFeatured !== 0) return byFeatured;
      return (left.item.sortOrder ?? 0) - (right.item.sortOrder ?? 0) || (left.item.title ?? "").localeCompare(right.item.title ?? "");
    })
    .slice(0, limit);
}

async function relationMap(tenantId: string, targetType: TargetType, targetIds: string[]) {
  if (!targetIds.length) return new Map<string, ContextTag[]>();
  const relations = await prisma.tagRelation.findMany({
    where: { tenantId, targetType, targetId: { in: targetIds }, tag: { status: "ACTIVE" } },
    include: { tag: { select: { id: true, name: true, type: true } } }
  });
  const map = new Map<string, ContextTag[]>();
  for (const relation of relations) {
    const current = map.get(relation.targetId) ?? [];
    current.push(relation.tag);
    map.set(relation.targetId, current);
  }
  return map;
}

async function productCampaignIds(tenantId: string, productId: string, service = false) {
  if (service) {
    const links = await prisma.festivalCampaignService.findMany({ where: { tenantId, serviceId: productId }, select: { campaignId: true } });
    return links.map((link) => link.campaignId);
  }
  const links = await prisma.festivalCampaignProduct.findMany({ where: { tenantId, productId }, select: { campaignId: true } });
  return links.map((link) => link.campaignId);
}

export async function getRelatedProducts({
  tenantId,
  currentProductId,
  categoryId,
  currentType,
  limit = 4
}: {
  tenantId: string;
  currentProductId: string;
  categoryId?: string | null;
  currentType?: string;
  limit?: number;
}) {
  const sourceTargetType: TargetType = currentType === "SERVICE" ? "SERVICE" : "PRODUCT";
  const [sourceTags, sourceCampaignIds, candidates] = await Promise.all([
    getSharedTagContext(tenantId, sourceTargetType, currentProductId),
    productCampaignIds(tenantId, currentProductId, currentType === "SERVICE"),
    prisma.product.findMany({
      where: { tenantId, status: "ACTIVE", type: { not: "SERVICE" }, id: { not: currentProductId } },
      include: {
        category: true,
        variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
        media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
        reviews: { where: { status: "approved" }, select: { rating: true } }
      },
      take: 40
    })
  ]);
  const [candidateTags, campaignLinks, stockByVariant] = await Promise.all([
    relationMap(tenantId, "PRODUCT", candidates.map((candidate) => candidate.id)),
    sourceCampaignIds.length
      ? prisma.festivalCampaignProduct.findMany({
          where: { tenantId, campaignId: { in: sourceCampaignIds }, productId: { in: candidates.map((candidate) => candidate.id) } },
          select: { productId: true }
        })
      : [],
    getVariantStockSummaries(
      candidates
        .filter((candidate) => isPhysicalInventoryType(candidate.type))
        .map((candidate) => candidate.variants[0]?.id)
        .filter((id): id is string => Boolean(id))
    )
  ]);
  const campaignProductIds = new Set(campaignLinks.map((link) => link.productId));

  return sortScored(
    candidates.map((candidate) => {
      const variantId = candidate.variants[0]?.id;
      const stock = variantId ? stockByVariant.get(variantId) : null;
      const score = scoreRelatedEntities({
        sourceTags,
        candidateTags: candidateTags.get(candidate.id) ?? [],
        sameCategory: Boolean(categoryId && candidate.categoryId === categoryId),
        sameFestivalCampaign: campaignProductIds.has(candidate.id),
        sameType: Boolean(currentType && candidate.type === currentType),
        inventoryStatus: stock?.status ?? null
      });
      return { item: candidate, stock, ...score };
    }),
    limit
  );
}

export async function getRelatedServices({
  tenantId,
  targetType,
  targetId,
  categoryId,
  limit = 3
}: {
  tenantId: string;
  targetType: TargetType;
  targetId: string;
  categoryId?: string | null;
  limit?: number;
}) {
  const [sourceTags, candidates] = await Promise.all([
    getSharedTagContext(tenantId, targetType, targetId),
    prisma.product.findMany({
      where: { tenantId, status: "ACTIVE", type: "SERVICE", id: targetType === "SERVICE" ? { not: targetId } : undefined },
      include: {
        category: true,
        variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
        media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
        reviews: { where: { status: "approved" }, select: { rating: true } }
      },
      take: 30
    })
  ]);
  const candidateTags = await relationMap(tenantId, "SERVICE", candidates.map((candidate) => candidate.id));

  return sortScored(
    candidates.map((candidate) => {
      const score = scoreRelatedEntities({
        sourceTags,
        candidateTags: candidateTags.get(candidate.id) ?? [],
        sameCategory: Boolean(categoryId && candidate.categoryId === categoryId)
      });
      return { item: candidate, stock: null, ...score };
    }),
    limit
  );
}

export async function getRequiredSamagri({ tenantId, serviceId, limit = 4 }: { tenantId: string; serviceId: string; limit?: number }) {
  const sourceTags = await getSharedTagContext(tenantId, "SERVICE", serviceId);
  const sourceProductUseTags = sourceTags.filter((tag) => ["PRODUCT_USE", "PUJA", "RITUAL", "DEITY", "PLACE", "FESTIVAL"].includes(tag.type));
  const candidates = await getRelatedProducts({ tenantId, currentProductId: serviceId, currentType: "SERVICE", limit: limit + 4 });

  return candidates
    .map((candidate) => {
      const usefulShared = candidate.sharedTags.filter((tag) => sourceProductUseTags.some((sourceTag) => sourceTag.id === tag.id));
      return {
        ...candidate,
        score: candidate.score + (candidate.item.type === "KIT" ? 35 : 0) + (usefulShared.length ? 25 : 0),
        contexts: candidate.contexts.length ? candidate.contexts : ["Useful samagri"]
      };
    })
    .slice(0, limit);
}

export async function getFestivalRecommendations({
  tenantId,
  festivalId,
  limit = 6
}: {
  tenantId: string;
  festivalId: string;
  limit?: number;
}) {
  const [sourceTags, linkedProducts, linkedServices] = await Promise.all([
    getSharedTagContext(tenantId, "FESTIVAL_CAMPAIGN", festivalId),
    prisma.festivalCampaignProduct.findMany({
      where: { tenantId, campaignId: festivalId },
      include: {
        product: {
          include: {
            category: true,
            variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
            media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
            reviews: { where: { status: "approved" }, select: { rating: true } }
          }
        }
      },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }]
    }),
    prisma.festivalCampaignService.findMany({
      where: { tenantId, campaignId: festivalId },
      include: {
        service: {
          include: {
            category: true,
            variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
            media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
            reviews: { where: { status: "approved" }, select: { rating: true } }
          }
        }
      },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }]
    })
  ]);

  const linkedProductIds = new Set(linkedProducts.map((link) => link.productId));
  const linkedServiceIds = new Set(linkedServices.map((link) => link.serviceId));
  const [fallbackProductCandidates, fallbackServices] = await Promise.all([
    sourceTags.length
      ? prisma.product.findMany({
          where: { tenantId, status: "ACTIVE", type: { not: "SERVICE" }, id: { notIn: [...linkedProductIds] } },
          include: {
            category: true,
            variants: { where: { active: true }, orderBy: { createdAt: "asc" } },
            media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
            reviews: { where: { status: "approved" }, select: { rating: true } }
          },
          take: 30
        })
      : [],
    sourceTags.length
      ? getRelatedServices({ tenantId, targetType: "FESTIVAL_CAMPAIGN", targetId: festivalId, limit: 3 })
      : []
  ]);
  const fallbackProductTags = await relationMap(tenantId, "PRODUCT", fallbackProductCandidates.map((candidate) => candidate.id));
  const fallbackProducts = sortScored(
    fallbackProductCandidates.map((candidate) => {
      const score = scoreRelatedEntities({
        sourceTags,
        candidateTags: fallbackProductTags.get(candidate.id) ?? []
      });
      return { item: candidate, contexts: score.contexts, score: score.score, stock: null, sharedTags: score.sharedTags };
    }),
    limit
  );

  const products = [
    ...linkedProducts.filter((link) => link.product.status === "ACTIVE").map((link) => ({ item: link.product, contexts: ["Festival collection"], score: 999, stock: null, sharedTags: [] })),
    ...fallbackProducts.filter((item) => !linkedProductIds.has(item.item.id))
  ].slice(0, limit);
  const services = [
    ...linkedServices.filter((link) => link.service.status === "ACTIVE").map((link) => ({ item: link.service, contexts: ["Festival service"], score: 999, stock: null, sharedTags: [] })),
    ...fallbackServices.filter((item) => !linkedServiceIds.has(item.item.id))
  ].slice(0, 3);

  return { products, services };
}
