import { prisma } from "@/lib/prisma";

type SearchEntity = {
  id: string;
  title?: string;
  name?: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  status?: string;
  type?: string;
};

type TaggedResult<T> = T & {
  matchedTags: Array<{ id: string; name: string; type: string }>;
  score: number;
  reason: string;
};

export function normalizeSearchQuery(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, " ");
}

function includes(value: string | null | undefined, query: string) {
  return Boolean(value?.toLowerCase().includes(query));
}

function exact(value: string | null | undefined, query: string) {
  return value?.toLowerCase() === query;
}

function scoreEntity({
  entity,
  query,
  matchedTags,
  attachedTagMatch,
  deepContentMatch
}: {
  entity: SearchEntity;
  query: string;
  matchedTags: Array<{ id: string; name: string; type: string }>;
  attachedTagMatch: boolean;
  deepContentMatch?: boolean;
}) {
  const title = entity.title ?? entity.name ?? "";
  let score = 0;
  let reason = "Content match";

  if (exact(title, query)) {
    score += 1000;
    reason = "Exact title match";
  } else if (includes(title, query)) {
    score += 850;
    reason = "Title match";
  }

  if (exact(entity.slug, query) || includes(entity.slug, query)) {
    score += 760;
    reason = reason === "Content match" ? "Slug match" : reason;
  }

  if (matchedTags.some((tag) => exact(tag.name, query))) {
    score += 720;
    reason = reason === "Content match" ? "Tag name match" : reason;
  } else if (matchedTags.length) {
    score += 680;
    reason = reason === "Content match" ? "Tag alias match" : reason;
  }

  if (attachedTagMatch) {
    score += 620;
    reason = reason === "Content match" ? "Attached tag match" : reason;
  }

  if (includes(entity.shortDescription, query) || includes(entity.description, query) || deepContentMatch) {
    score += 420;
    reason = reason === "Content match" ? "Description/spec/FAQ match" : reason;
  }

  if (entity.status === "ACTIVE") score += 120;
  else if (entity.status === "SCHEDULED") score += 80;
  else score -= 100;

  return { score, reason };
}

function sortResults<T extends { score: number; title?: string; name?: string }>(items: T[]) {
  return items.sort((left, right) => {
    const byScore = right.score - left.score;
    if (byScore !== 0) return byScore;
    return (left.title ?? left.name ?? "").localeCompare(right.title ?? right.name ?? "");
  });
}

export async function searchSite({
  tenantId,
  query
}: {
  tenantId: string;
  query: string;
}) {
  const normalizedQuery = normalizeSearchQuery(query);

  if (!normalizedQuery) {
    return {
      normalizedQuery,
      products: [],
      services: [],
      categories: [],
      festivals: [],
      tags: [],
      resultCount: 0,
      suggestions: await getNoResultSuggestions(tenantId)
    };
  }

  const matchingTags = await prisma.tag.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      OR: [
        { name: { contains: normalizedQuery, mode: "insensitive" } },
        { slug: { contains: normalizedQuery, mode: "insensitive" } },
        { aliases: { some: { value: { contains: normalizedQuery, mode: "insensitive" } } } }
      ]
    },
    include: { aliases: true },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }]
  });
  const matchingTagIds = matchingTags.map((tag) => tag.id);
  const tagRelations = matchingTagIds.length
    ? await prisma.tagRelation.findMany({
        where: { tenantId, tagId: { in: matchingTagIds } },
        include: { tag: { select: { id: true, name: true, type: true } } }
      })
    : [];

  const relationsByTarget = new Map<string, Array<{ id: string; name: string; type: string }>>();
  for (const relation of tagRelations) {
    const key = `${relation.targetType}:${relation.targetId}`;
    const current = relationsByTarget.get(key) ?? [];
    current.push(relation.tag);
    relationsByTarget.set(key, current);
  }

  const productRelationIds = tagRelations.filter((item) => item.targetType === "PRODUCT").map((item) => item.targetId);
  const serviceRelationIds = tagRelations.filter((item) => item.targetType === "SERVICE").map((item) => item.targetId);
  const categoryRelationIds = tagRelations.filter((item) => item.targetType === "CATEGORY").map((item) => item.targetId);
  const festivalRelationIds = tagRelations.filter((item) => item.targetType === "FESTIVAL_CAMPAIGN").map((item) => item.targetId);

  const [products, services, categories, festivals] = await Promise.all([
    prisma.product.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        type: { not: "SERVICE" },
        OR: [
          { id: { in: productRelationIds } },
          { title: { contains: normalizedQuery, mode: "insensitive" } },
          { slug: { contains: normalizedQuery, mode: "insensitive" } },
          { description: { contains: normalizedQuery, mode: "insensitive" } },
          { shortDescription: { contains: normalizedQuery, mode: "insensitive" } },
          { specs: { some: { OR: [{ label: { contains: normalizedQuery, mode: "insensitive" } }, { value: { contains: normalizedQuery, mode: "insensitive" } }] } } },
          { faqs: { some: { OR: [{ question: { contains: normalizedQuery, mode: "insensitive" } }, { answer: { contains: normalizedQuery, mode: "insensitive" } }] } } }
        ]
      },
      include: {
        category: true,
        variants: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 },
        media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
        specs: { take: 5 },
        faqs: { take: 5 }
      },
      take: 24
    }),
    prisma.product.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        type: "SERVICE",
        OR: [
          { id: { in: serviceRelationIds } },
          { title: { contains: normalizedQuery, mode: "insensitive" } },
          { slug: { contains: normalizedQuery, mode: "insensitive" } },
          { description: { contains: normalizedQuery, mode: "insensitive" } },
          { shortDescription: { contains: normalizedQuery, mode: "insensitive" } }
        ]
      },
      include: { category: true, variants: { where: { active: true }, orderBy: { createdAt: "asc" }, take: 1 } },
      take: 16
    }),
    prisma.category.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        OR: [
          { id: { in: categoryRelationIds } },
          { name: { contains: normalizedQuery, mode: "insensitive" } },
          { slug: { contains: normalizedQuery, mode: "insensitive" } },
          { description: { contains: normalizedQuery, mode: "insensitive" } }
        ]
      },
      take: 16
    }),
    prisma.festivalCampaign.findMany({
      where: {
        tenantId,
        status: "ACTIVE",
        OR: [
          { id: { in: festivalRelationIds } },
          { title: { contains: normalizedQuery, mode: "insensitive" } },
          { slug: { contains: normalizedQuery, mode: "insensitive" } },
          { shortDescription: { contains: normalizedQuery, mode: "insensitive" } },
          { longDescription: { contains: normalizedQuery, mode: "insensitive" } }
        ]
      },
      take: 12
    })
  ]);

  const productsWithScore: Array<TaggedResult<(typeof products)[number]>> = products.map((product) => {
    const matchedTags = relationsByTarget.get(`PRODUCT:${product.id}`) ?? [];
    const score = scoreEntity({
      entity: product,
      query: normalizedQuery,
      matchedTags,
      attachedTagMatch: productRelationIds.includes(product.id),
      deepContentMatch:
        product.specs.some((spec) => includes(spec.label, normalizedQuery) || includes(spec.value, normalizedQuery)) ||
        product.faqs.some((faq) => includes(faq.question, normalizedQuery) || includes(faq.answer, normalizedQuery))
    });
    return { ...product, matchedTags, ...score };
  });

  const servicesWithScore: Array<TaggedResult<(typeof services)[number]>> = services.map((service) => {
    const matchedTags = relationsByTarget.get(`SERVICE:${service.id}`) ?? [];
    const score = scoreEntity({ entity: service, query: normalizedQuery, matchedTags, attachedTagMatch: serviceRelationIds.includes(service.id) });
    return { ...service, matchedTags, ...score };
  });

  const categoriesWithScore: Array<TaggedResult<(typeof categories)[number]>> = categories.map((category) => {
    const matchedTags = relationsByTarget.get(`CATEGORY:${category.id}`) ?? [];
    const score = scoreEntity({ entity: category, query: normalizedQuery, matchedTags, attachedTagMatch: categoryRelationIds.includes(category.id) });
    return { ...category, matchedTags, ...score };
  });

  const festivalsWithScore: Array<TaggedResult<(typeof festivals)[number]>> = festivals.map((festival) => {
    const matchedTags = relationsByTarget.get(`FESTIVAL_CAMPAIGN:${festival.id}`) ?? [];
    const score = scoreEntity({
      entity: { ...festival, name: festival.title, description: festival.longDescription, shortDescription: festival.shortDescription },
      query: normalizedQuery,
      matchedTags,
      attachedTagMatch: festivalRelationIds.includes(festival.id)
    });
    return { ...festival, matchedTags, ...score };
  });

  const tagsWithScore = matchingTags.map((tag) => {
    const aliasMatch = tag.aliases.some((alias) => includes(alias.value, normalizedQuery));
    const score = scoreEntity({
      entity: tag,
      query: normalizedQuery,
      matchedTags: [{ id: tag.id, name: tag.name, type: tag.type }],
      attachedTagMatch: false,
      deepContentMatch: aliasMatch
    });
    return { ...tag, matchedTags: [], reason: aliasMatch ? "Tag alias match" : score.reason, score: aliasMatch ? score.score + 40 : score.score };
  });

  const resultCount = products.length + services.length + categories.length + festivals.length + matchingTags.length;

  return {
    normalizedQuery,
    products: sortResults(productsWithScore),
    services: sortResults(servicesWithScore),
    categories: sortResults(categoriesWithScore),
    festivals: sortResults(festivalsWithScore),
    tags: sortResults(tagsWithScore),
    resultCount,
    suggestions: resultCount === 0 ? await getNoResultSuggestions(tenantId) : null
  };
}

export async function logSearchQuery({
  tenantId,
  query,
  resultCount,
  userId,
  sessionId,
  source
}: {
  tenantId: string;
  query: string;
  resultCount: number;
  userId?: string | null;
  sessionId?: string | null;
  source?: string | null;
}) {
  const normalizedQuery = normalizeSearchQuery(query);
  if (!normalizedQuery) return;

  await prisma.searchQueryLog.create({
    data: {
      tenantId,
      userId: userId ?? null,
      query: query.trim(),
      normalizedQuery,
      resultCount,
      sessionId: sessionId ?? null,
      source: source ?? null
    }
  });
}

export async function getSearchInsights(tenantId: string) {
  const [recent, repeated, noResults] = await Promise.all([
    prisma.searchQueryLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { user: { select: { email: true, name: true } } }
    }),
    prisma.searchQueryLog.groupBy({
      by: ["normalizedQuery"],
      where: { tenantId },
      _count: { normalizedQuery: true },
      _max: { createdAt: true },
      orderBy: { _count: { normalizedQuery: "desc" } },
      take: 20
    }),
    prisma.searchQueryLog.groupBy({
      by: ["normalizedQuery"],
      where: { tenantId, resultCount: 0 },
      _count: { normalizedQuery: true },
      _max: { createdAt: true },
      orderBy: { _count: { normalizedQuery: "desc" } },
      take: 20
    })
  ]);

  return { recent, repeated, noResults };
}

export async function getNoResultSuggestions(tenantId: string) {
  const [popularTags, topCategories, festivals, services] = await Promise.all([
    prisma.tag.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], take: 8 }),
    prisma.category.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { name: "asc" }], take: 6 }),
    prisma.festivalCampaign.findMany({ where: { tenantId, status: "ACTIVE" }, orderBy: [{ priority: "desc" }, { title: "asc" }], take: 4 }),
    prisma.product.findMany({ where: { tenantId, status: "ACTIVE", type: "SERVICE" }, orderBy: [{ featured: "desc" }, { sortOrder: "asc" }, { title: "asc" }], take: 4 })
  ]);

  return { popularTags, topCategories, festivals, services };
}
