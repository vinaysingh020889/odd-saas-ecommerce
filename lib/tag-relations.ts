import { prisma } from "@/lib/prisma";

type TagTargetType =
  | "PRODUCT"
  | "PRODUCT_VARIANT"
  | "CATEGORY"
  | "SERVICE"
  | "ASTHI_PACKAGE"
  | "ASTHI_LOCATION"
  | "KUNDLI_PACKAGE"
  | "MEMBERSHIP_PLAN"
  | "FESTIVAL_CAMPAIGN"
  | "PROMOTION_PLACEMENT";

export type TagOption = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export async function getTags(tenantId: string, status = "ACTIVE") {
  return prisma.tag.findMany({
    where: { tenantId, ...(status ? { status } : {}) },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, status: true }
  });
}

export async function searchTags(tenantId: string, query: string, status = "ACTIVE") {
  const q = query.trim();
  return prisma.tag.findMany({
    where: {
      tenantId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { aliases: { some: { value: { contains: q, mode: "insensitive" } } } }
            ]
          }
        : {})
    },
    orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, status: true }
  });
}

export async function getEntityTags(tenantId: string, targetType: TagTargetType, targetId: string) {
  return prisma.tagRelation.findMany({
    where: { tenantId, targetType, targetId },
    include: {
      tag: { select: { id: true, name: true, type: true, status: true, sortOrder: true } }
    },
    orderBy: [{ tag: { type: "asc" } }, { tag: { sortOrder: "asc" } }, { tag: { name: "asc" } }]
  });
}

export async function getEntityTagIds(tenantId: string, targetType: TagTargetType, targetId: string) {
  const relations = await prisma.tagRelation.findMany({
    where: { tenantId, targetType, targetId },
    select: { tagId: true }
  });
  return relations.map((relation) => relation.tagId);
}

export async function setEntityTags({
  tenantId,
  targetType,
  targetId,
  tagIds
}: {
  tenantId: string;
  targetType: TagTargetType;
  targetId: string;
  tagIds: string[];
}) {
  const uniqueTagIds = [...new Set(tagIds.filter(Boolean))];
  const validTags = uniqueTagIds.length
    ? await prisma.tag.findMany({
        where: { tenantId, id: { in: uniqueTagIds } },
        select: { id: true }
      })
    : [];
  const validTagIds = new Set(validTags.map((tag) => tag.id));

  await prisma.$transaction([
    prisma.tagRelation.deleteMany({ where: { tenantId, targetType, targetId } }),
    ...(validTagIds.size
      ? [
          prisma.tagRelation.createMany({
            data: [...validTagIds].map((tagId, index) => ({
              tenantId,
              tagId,
              targetType,
              targetId,
              context: "default",
              sortOrder: (index + 1) * 10
            })),
            skipDuplicates: true
          })
        ]
      : [])
  ]);
}

export async function removeEntityTags(tenantId: string, targetType: TagTargetType, targetId: string) {
  await prisma.tagRelation.deleteMany({ where: { tenantId, targetType, targetId } });
}
