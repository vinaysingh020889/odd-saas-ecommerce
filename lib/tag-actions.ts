"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireCatalogAdminUser } from "@/lib/admin-auth";
import { parseAliasLines, slugifyTag, TAG_TYPES } from "@/lib/tags";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function numberValue(formData: FormData, name: string, fallback = 0) {
  const raw = text(formData, name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function safeReturnTo(value: string | null, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/admin/")) return fallback;
  if (value.startsWith("//") || value.includes("://")) return fallback;
  return value;
}

export async function saveTagAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const returnTo = safeReturnTo(nullableText(formData, "returnTo"), "/admin/tags");
  const name = text(formData, "name");
  const slug = slugifyTag(text(formData, "slug") || name);
  const type = text(formData, "type");

  if (!name || !slug) {
    throw new Error("Tag name and slug are required.");
  }

  if (!TAG_TYPES.includes(type as (typeof TAG_TYPES)[number])) {
    throw new Error("Invalid tag type.");
  }

  const existing = await prisma.tag.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    select: { id: true }
  });

  if (existing && existing.id !== id) {
    throw new Error("Tag slug already exists.");
  }

  if (id) {
    const currentTag = await prisma.tag.findFirst({
      where: { id, tenantId },
      select: { id: true }
    });

    if (!currentTag) {
      throw new Error("Tag was not found.");
    }
  }

  const tag = await prisma.$transaction(async (tx) => {
    const saved = id
      ? await tx.tag.update({
          where: { id },
          data: {
            name,
            slug,
            type,
            description: nullableText(formData, "description"),
            status: text(formData, "status") || "ACTIVE",
            sortOrder: numberValue(formData, "sortOrder")
          }
        })
      : await tx.tag.create({
          data: {
            tenantId,
            name,
            slug,
            type,
            description: nullableText(formData, "description"),
            status: text(formData, "status") || "ACTIVE",
            sortOrder: numberValue(formData, "sortOrder")
          }
        });

    await tx.tagAlias.deleteMany({ where: { tenantId, tagId: saved.id } });
    const aliases = parseAliasLines(text(formData, "aliases"));
    if (aliases.length) {
      await tx.tagAlias.createMany({
        data: aliases.map((value) => ({
          tenantId,
          tagId: saved.id,
          value,
          locale: null,
          kind: "search"
        })),
        skipDuplicates: true
      });
    }

    return saved;
  });

  revalidatePath("/admin/tags");
  revalidatePath(`/admin/tags/${tag.id}/edit`);
  redirect(returnTo);
}

export async function deleteTagAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");

  if (!id) {
    throw new Error("Tag is required.");
  }

  const tag = await prisma.tag.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!tag) {
    throw new Error("Tag was not found.");
  }

  await prisma.tag.delete({ where: { id } });
  revalidatePath("/admin/tags");
  redirect("/admin/tags");
}
