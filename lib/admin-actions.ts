"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireAdminUser } from "@/lib/admin-auth";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function nullableText(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function numberValue(formData: FormData, name: string, fallback = 0) {
  const raw = text(formData, name);
  if (!raw) {
    return fallback;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function decimalValue(formData: FormData, name: string) {
  const raw = text(formData, name);
  if (!raw) {
    return null;
  }
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

async function assertUniqueCategorySlug(tenantId: string, slug: string, id?: string) {
  const existing = await prisma.category.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    select: { id: true }
  });

  if (existing && existing.id !== id) {
    throw new Error("Category slug already exists.");
  }
}

async function assertUniqueProductSlug(tenantId: string, slug: string, id?: string) {
  const existing = await prisma.product.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    select: { id: true }
  });

  if (existing && existing.id !== id) {
    throw new Error("Product slug already exists.");
  }
}

async function assertUniqueSku(sku: string | null, id?: string) {
  if (!sku) {
    return;
  }

  const existing = await prisma.productVariant.findUnique({
    where: { sku },
    select: { id: true }
  });

  if (existing && existing.id !== id) {
    throw new Error("SKU already exists.");
  }
}

export async function saveCategoryAction(formData: FormData) {
  await requireAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();

  if (!name || !slug) {
    throw new Error("Category name and slug are required.");
  }

  await assertUniqueCategorySlug(tenantId, slug, id ?? undefined);

  const data = {
    tenantId,
    name,
    slug,
    description: nullableText(formData, "description"),
    parentId: nullableText(formData, "parentId"),
    type: text(formData, "type") || "PRODUCT",
    status: text(formData, "status") || "ACTIVE",
    sortOrder: numberValue(formData, "sortOrder")
  };

  if (id) {
    await prisma.category.update({ where: { id }, data });
  } else {
    await prisma.category.create({ data });
  }

  revalidatePath("/shop");
  revalidatePath("/services");
  revalidatePath("/admin/categories");
  redirect("/admin/categories");
}

export async function saveProductAction(formData: FormData) {
  await requireAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const title = text(formData, "title");
  const slug = text(formData, "slug").toLowerCase();

  if (!title || !slug) {
    throw new Error("Title and slug are required.");
  }

  await assertUniqueProductSlug(tenantId, slug, id ?? undefined);

  const data = {
    tenantId,
    title,
    slug,
    description: nullableText(formData, "description"),
    shortDescription: nullableText(formData, "shortDescription"),
    categoryId: nullableText(formData, "categoryId"),
    type: text(formData, "type") || "PHYSICAL",
    status: text(formData, "status") || "DRAFT",
    basePrice: decimalValue(formData, "basePrice"),
    mrp: decimalValue(formData, "mrp"),
    currency: text(formData, "currency") || "INR",
    imageUrl: nullableText(formData, "imageUrl"),
    featured: checked(formData, "featured"),
    sortOrder: numberValue(formData, "sortOrder")
  };

  const product = id
    ? await prisma.product.update({ where: { id }, data })
    : await prisma.product.create({ data });

  revalidatePath("/shop");
  revalidatePath("/services");
  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/services");
  redirect(`/admin/products/${product.id}/edit`);
}

export async function saveVariantAction(formData: FormData) {
  await requireAdminUser();
  const id = nullableText(formData, "id");
  const productId = text(formData, "productId");
  const sku = nullableText(formData, "sku");

  if (!productId) {
    throw new Error("Product is required.");
  }

  await assertUniqueSku(sku, id ?? undefined);

  const data = {
    productId,
    sku,
    title: nullableText(formData, "title"),
    price: decimalValue(formData, "price"),
    mrp: decimalValue(formData, "mrp"),
    active: text(formData, "active") !== "false",
    stockStatus: text(formData, "stockStatus") || "IN_STOCK"
  };

  await (id
    ? prisma.productVariant.update({ where: { id }, data })
    : prisma.productVariant.create({ data }));

  const product = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    select: { slug: true }
  });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/shop");
  revalidatePath("/services");
  redirect(`/admin/products/${productId}/edit`);
}
