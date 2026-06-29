"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireCatalogAdminUser, requireOperationsAdminUser } from "@/lib/admin-auth";
import { removeEntityTags, setEntityTags } from "@/lib/tag-relations";

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

function positiveIntValue(formData: FormData, name: string, fallback = 1) {
  const value = Math.trunc(numberValue(formData, name, fallback));
  return value > 0 ? value : fallback;
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

function dateValue(formData: FormData, name: string, fallback?: Date) {
  const raw = text(formData, name);
  if (!raw) return fallback ?? new Date();
  const normalized = raw.length === 10 && name.toLowerCase().includes("end") ? `${raw}T23:59:59` : raw;
  const value = new Date(normalized);
  return Number.isNaN(value.getTime()) ? fallback ?? new Date() : value;
}

function formIds(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .map((value) => String(value))
    .filter(Boolean);
}

function safeAdminReturnTo(value: string | null, fallback: string) {
  if (!value) return fallback;
  if (!value.startsWith("/admin/")) return fallback;
  if (value.startsWith("//") || value.includes("://")) return fallback;
  return value;
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
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const returnTo = safeAdminReturnTo(nullableText(formData, "returnTo"), "/admin/categories");
  const name = text(formData, "name");
  const slug = text(formData, "slug").toLowerCase();
  const parentId = nullableText(formData, "parentId");

  if (!name || !slug) {
    throw new Error("Category name and slug are required.");
  }

  await assertUniqueCategorySlug(tenantId, slug, id ?? undefined);

  if (parentId) {
    if (parentId === id) {
      throw new Error("A category cannot be its own parent.");
    }

    const parent = await prisma.category.findFirst({
      where: { id: parentId, tenantId },
      select: { parentId: true }
    });

    if (!parent) {
      throw new Error("Selected parent category does not exist.");
    }

    if (parent.parentId) {
      throw new Error("Only two category levels are supported. Choose a top-level parent category.");
    }
  }

  if (id && parentId) {
    const childCount = await prisma.category.count({ where: { tenantId, parentId: id } });
    if (childCount > 0) {
      throw new Error("A parent category with subcategories cannot be moved under another parent.");
    }
  }

  const data = {
    tenantId,
    name,
    slug,
    description: nullableText(formData, "description"),
    parentId,
    type: text(formData, "type") || "PRODUCT",
    status: text(formData, "status") || "ACTIVE",
    sortOrder: numberValue(formData, "sortOrder"),
    showOnHomepageIntent: checked(formData, "showOnHomepageIntent"),
    homepageIntentTitle: nullableText(formData, "homepageIntentTitle"),
    homepageIntentDescription: nullableText(formData, "homepageIntentDescription"),
    homepageIntentImage: nullableText(formData, "homepageIntentImage"),
    homepageIntentSortOrder: numberValue(formData, "homepageIntentSortOrder"),
    isFeatured: checked(formData, "isFeatured")
  };

  if (id) {
    const category = await prisma.category.update({ where: { id }, data });
    await setEntityTags({ tenantId, targetType: "CATEGORY", targetId: category.id, tagIds: formIds(formData, "tagIds") });
  } else {
    const category = await prisma.category.create({ data });
    await setEntityTags({ tenantId, targetType: "CATEGORY", targetId: category.id, tagIds: formIds(formData, "tagIds") });
  }

  revalidatePath("/shop");
  revalidatePath("/api/public/homepage");
  revalidatePath("/services");
  revalidatePath("/admin/categories");
  redirect(returnTo);
}

export async function saveProductAction(formData: FormData) {
  await requireCatalogAdminUser();
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
    reviewsEnabled: text(formData, "reviewsEnabled") !== "false",
    ratingsEnabled: text(formData, "ratingsEnabled") !== "false",
    featured: checked(formData, "featured"),
    sortOrder: numberValue(formData, "sortOrder")
  };

  const product = id
    ? await prisma.product.update({ where: { id }, data })
    : await prisma.product.create({ data });
  const targetType = product.type === "SERVICE" ? "SERVICE" : "PRODUCT";
  const staleTargetType = product.type === "SERVICE" ? "PRODUCT" : "SERVICE";

  await setEntityTags({ tenantId, targetType, targetId: product.id, tagIds: formIds(formData, "tagIds") });
  await removeEntityTags(tenantId, staleTargetType, product.id);

  revalidatePath("/shop");
  revalidatePath("/services");
  revalidatePath(`/product/${product.slug}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/services");
  redirect(`/admin/products/${product.id}/edit`);
}

export async function saveVariantAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const productId = text(formData, "productId");
  const sku = nullableText(formData, "sku");

  if (!productId) {
    throw new Error("Product is required.");
  }

  await assertUniqueSku(sku, id ?? undefined);

  const productForTenant = await prisma.product.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, slug: true }
  });

  if (!productForTenant) {
    throw new Error("Product was not found for this tenant.");
  }

  const data = {
    productId,
    sku,
    title: nullableText(formData, "title"),
    price: decimalValue(formData, "price"),
    mrp: decimalValue(formData, "mrp"),
    active: text(formData, "active") !== "false",
    stockStatus: text(formData, "stockStatus") || "IN_STOCK",
    lowStockThreshold: Math.max(0, Math.trunc(numberValue(formData, "lowStockThreshold", 5)))
  };

  await (id
    ? prisma.productVariant.update({ where: { id }, data })
    : prisma.productVariant.create({ data }));

  revalidatePath(`/product/${productForTenant.slug}`);
  revalidatePath("/shop");
  revalidatePath("/services");
  revalidatePath("/admin/inventory");
  redirect(`/admin/products/${productId}/edit`);
}

export async function addOrderActivityNoteAction(formData: FormData) {
  const admin = await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");
  const message = text(formData, "message");

  if (!orderId || !message) {
    throw new Error("Order and note are required.");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true }
  });

  if (!order) {
    throw new Error("Order was not found for this tenant.");
  }

  await prisma.orderActivity.create({
    data: {
      tenantId,
      orderId,
      actorId: admin.id,
      type: "admin_note",
      message
    }
  });

  revalidatePath(`/admin/orders/${orderId}`);
  redirect(`/admin/orders/${orderId}`);
}

export async function cancelPaymentPendingOrderAction(formData: FormData) {
  const admin = await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const orderId = text(formData, "orderId");

  if (!orderId) {
    throw new Error("Order is required.");
  }

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, tenantId, status: "payment_pending" },
      select: { id: true, orderNumber: true }
    });

    if (!order) {
      throw new Error("Only payment-pending order drafts can be cancelled in this phase.");
    }

    const reserved = await tx.inventoryLedger.groupBy({
      by: ["variantId", "productId", "orderItemId"],
      where: { tenantId, orderId, movementType: "reserved" },
      _sum: { quantity: true }
    });

    const released = await tx.inventoryLedger.groupBy({
      by: ["variantId", "productId", "orderItemId"],
      where: { tenantId, orderId, movementType: "released" },
      _sum: { quantity: true }
    });

    const releasedByKey = new Map(
      released.map((row) => [`${row.variantId}:${row.orderItemId ?? ""}`, row._sum.quantity ?? 0])
    );

    for (const row of reserved) {
      const key = `${row.variantId}:${row.orderItemId ?? ""}`;
      const remaining = (row._sum.quantity ?? 0) - (releasedByKey.get(key) ?? 0);

      if (remaining > 0) {
        await tx.inventoryLedger.create({
          data: {
            tenantId,
            productId: row.productId,
            variantId: row.variantId,
            orderId,
            orderItemId: row.orderItemId,
            movementType: "released",
            quantity: remaining,
            reason: "Released because admin cancelled payment-pending order draft.",
            actorId: admin.id
          }
        });
      }
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "cancelled",
        paymentStatus: "cancelled"
      }
    });

    await tx.paymentAttempt.updateMany({
      where: { orderId, provider: "MOCK", status: { in: ["created", "pending"] } },
      data: { status: "cancelled" }
    });

    await tx.orderActivity.create({
      data: {
        tenantId,
        orderId,
        actorId: admin.id,
        type: "order_cancelled",
        message: `Admin cancelled payment-pending order draft ${order.orderNumber}.`
      }
    });
  });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/inventory");
  redirect(`/admin/orders/${orderId}`);
}

export async function saveKitComponentAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const kitProductId = text(formData, "kitProductId");
  const componentVariantId = nullableText(formData, "componentVariantId");
  const quantity = positiveIntValue(formData, "quantity", 1);
  const sortOrder = Math.trunc(numberValue(formData, "sortOrder", 0));

  if (!kitProductId || !componentVariantId) {
    throw new Error("Kit product and component variant are required.");
  }

  const kit = await prisma.product.findFirst({
    where: { id: kitProductId, tenantId, type: "KIT" },
    select: { id: true, slug: true }
  });

  if (!kit) {
    throw new Error("Only KIT products can have kit components.");
  }

  const componentVariant = await prisma.productVariant.findFirst({
    where: { id: componentVariantId, product: { tenantId } },
    include: { product: { select: { id: true } } }
  });

  if (!componentVariant) {
    throw new Error("Component variant was not found for this tenant.");
  }

  const data = {
    tenantId,
    kitProductId,
    componentProductId: componentVariant.product.id,
    componentVariantId,
    quantity,
    sortOrder
  };

  if (id) {
    const existing = await prisma.kitComponent.findFirst({
      where: { id, tenantId, kitProductId },
      select: { id: true }
    });

    if (!existing) {
      throw new Error("Kit component was not found.");
    }

    await prisma.kitComponent.update({ where: { id }, data });
  } else {
    await prisma.kitComponent.create({ data });
  }

  revalidatePath(`/product/${kit.slug}`);
  revalidatePath(`/admin/products/${kitProductId}/edit`);
  redirect(`/admin/products/${kitProductId}/edit`);
}

export async function removeKitComponentAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const kitProductId = text(formData, "kitProductId");

  if (!id || !kitProductId) {
    throw new Error("Kit component is required.");
  }

  const component = await prisma.kitComponent.findFirst({
    where: { id, tenantId, kitProductId },
    include: { kitProduct: { select: { slug: true } } }
  });

  if (!component) {
    throw new Error("Kit component was not found.");
  }

  await prisma.kitComponent.delete({ where: { id } });

  revalidatePath(`/product/${component.kitProduct.slug}`);
  revalidatePath(`/admin/products/${kitProductId}/edit`);
  redirect(`/admin/products/${kitProductId}/edit`);
}

export async function saveProductMediaAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const productId = text(formData, "productId");
  const variantId = nullableText(formData, "variantId");
  const url = text(formData, "url");
  const role = text(formData, "role") || "gallery";
  const isPrimary = checked(formData, "isPrimary");

  if (!productId || !url) {
    throw new Error("Product and image URL are required.");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId },
    select: { id: true, slug: true }
  });

  if (!product) {
    throw new Error("Product was not found for this tenant.");
  }

  if (variantId) {
    const variant = await prisma.productVariant.findFirst({ where: { id: variantId, productId }, select: { id: true } });
    if (!variant) throw new Error("Variant was not found for this product.");
  }

  await prisma.$transaction(async (tx) => {
    if (isPrimary) {
      await tx.productMedia.updateMany({
        where: { tenantId, productId, ...(variantId ? { variantId } : { variantId: null }) },
        data: { isPrimary: false, role: "gallery" }
      });
    }

    const data = {
      tenantId,
      productId,
      variantId,
      url,
      altText: nullableText(formData, "altText"),
      role: isPrimary ? "primary" : role,
      sortOrder: Math.trunc(numberValue(formData, "sortOrder", 0)),
      isPrimary
    };

    if (id) {
      await tx.productMedia.update({ where: { id }, data });
    } else {
      await tx.productMedia.create({ data });
    }
  });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(`/admin/products/${productId}/edit`);
}

export async function removeProductMediaAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const media = await prisma.productMedia.findFirst({
    where: { id, tenantId },
    include: { product: { select: { id: true, slug: true } } }
  });

  if (!media) {
    throw new Error("Product media was not found.");
  }

  await prisma.productMedia.delete({ where: { id } });
  revalidatePath(`/product/${media.product.slug}`);
  revalidatePath(`/admin/products/${media.product.id}/edit`);
  redirect(`/admin/products/${media.product.id}/edit`);
}

export async function moderateProductReviewAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const reviewId = text(formData, "reviewId");
  const status = text(formData, "status");

  if (!reviewId || !["approved", "rejected", "pending"].includes(status)) {
    throw new Error("Valid review and status are required.");
  }

  const review = await prisma.productReview.findFirst({
    where: { id: reviewId, tenantId },
    include: { product: { select: { id: true, slug: true } } }
  });

  if (!review) {
    throw new Error("Review was not found.");
  }

  await prisma.productReview.update({ where: { id: review.id }, data: { status } });
  revalidatePath(`/product/${review.product.slug}`);
  revalidatePath(`/admin/products/${review.product.id}/edit`);
  redirect(`/admin/products/${review.product.id}/edit`);
}

async function assertUniqueFestivalSlug(tenantId: string, slug: string, id?: string) {
  const existing = await prisma.festivalCampaign.findUnique({
    where: { tenantId_slug: { tenantId, slug } },
    select: { id: true }
  });

  if (existing && existing.id !== id) {
    throw new Error("Festival campaign slug already exists.");
  }
}

export async function saveFestivalCampaignAction(formData: FormData) {
  const user = await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const title = text(formData, "title");
  const slug = text(formData, "slug").toLowerCase();

  if (!title || !slug) {
    throw new Error("Festival title and slug are required.");
  }

  await assertUniqueFestivalSlug(tenantId, slug, id ?? undefined);

  const data = {
    tenantId,
    title,
    slug,
    shortDescription: nullableText(formData, "shortDescription"),
    longDescription: nullableText(formData, "longDescription"),
    heroImage: nullableText(formData, "heroImage"),
    cardImage: nullableText(formData, "cardImage"),
    startDate: dateValue(formData, "startDate"),
    endDate: dateValue(formData, "endDate"),
    status: text(formData, "status") || "DRAFT",
    priority: numberValue(formData, "priority"),
    isFeatured: checked(formData, "isFeatured"),
    showOnHomepage: checked(formData, "showOnHomepage"),
    showInHero: checked(formData, "showInHero"),
    showInAnnouncementStrip: checked(formData, "showInAnnouncementStrip"),
    ctaLabel: nullableText(formData, "ctaLabel"),
    ctaUrl: nullableText(formData, "ctaUrl"),
    seoTitle: nullableText(formData, "seoTitle"),
    seoDescription: nullableText(formData, "seoDescription")
  };

  const campaign = id
    ? await prisma.festivalCampaign.update({ where: { id }, data })
    : await prisma.festivalCampaign.create({ data });
  await setEntityTags({ tenantId, targetType: "FESTIVAL_CAMPAIGN", targetId: campaign.id, tagIds: formIds(formData, "tagIds") });

  const productIds = formIds(formData, "productIds");
  const categoryIds = formIds(formData, "categoryIds");
  const serviceIds = formIds(formData, "serviceIds");

  await prisma.$transaction([
    prisma.festivalCampaignProduct.deleteMany({ where: { campaignId: campaign.id } }),
    prisma.festivalCampaignCategory.deleteMany({ where: { campaignId: campaign.id } }),
    prisma.festivalCampaignService.deleteMany({ where: { campaignId: campaign.id } }),
    ...(productIds.length
      ? [
          prisma.festivalCampaignProduct.createMany({
            data: productIds.map((productId, index) => ({ tenantId, campaignId: campaign.id, productId, sortOrder: (index + 1) * 10, isFeatured: index < 4 }))
          })
        ]
      : []),
    ...(categoryIds.length
      ? [
          prisma.festivalCampaignCategory.createMany({
            data: categoryIds.map((categoryId, index) => ({ tenantId, campaignId: campaign.id, categoryId, sortOrder: (index + 1) * 10, isFeatured: index < 3 }))
          })
        ]
      : []),
    ...(serviceIds.length
      ? [
          prisma.festivalCampaignService.createMany({
            data: serviceIds.map((serviceId, index) => ({ tenantId, campaignId: campaign.id, serviceId, sortOrder: (index + 1) * 10, isFeatured: index < 3 }))
          })
        ]
      : []),
    prisma.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: id ? "festival_campaign_updated" : "festival_campaign_created",
        entity: "FestivalCampaign",
        entityId: campaign.id
      }
    })
  ]);

  revalidatePath("/shop");
  revalidatePath("/festivals");
  revalidatePath(`/festivals/${campaign.slug}`);
  revalidatePath("/api/public/homepage");
  revalidatePath("/admin/festivals");
  redirect("/admin/festivals");
}

export async function updateFestivalCampaignStatusAction(formData: FormData) {
  const user = await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const status = text(formData, "status") || "DRAFT";
  const campaign = await prisma.festivalCampaign.update({ where: { id }, data: { status } });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: user.id,
      action: "festival_campaign_status_updated",
      entity: "FestivalCampaign",
      entityId: campaign.id,
      metadata: { status }
    }
  });

  revalidatePath("/shop");
  revalidatePath(`/festivals/${campaign.slug}`);
  revalidatePath("/admin/festivals");
}

export async function savePromotionPlacementAction(formData: FormData) {
  const user = await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const placementKey = text(formData, "placementKey");
  const title = text(formData, "title");

  if (!placementKey || !title) {
    throw new Error("Placement key and title are required.");
  }

  const data = {
    tenantId,
    placementKey,
    surface: text(formData, "surface") || "HOMEPAGE",
    targetType: text(formData, "targetType") || "CUSTOM",
    targetId: nullableText(formData, "targetId"),
    title,
    description: nullableText(formData, "description"),
    image: nullableText(formData, "image"),
    ctaLabel: nullableText(formData, "ctaLabel"),
    ctaUrl: nullableText(formData, "ctaUrl"),
    startDate: nullableText(formData, "startDate") ? dateValue(formData, "startDate") : null,
    endDate: nullableText(formData, "endDate") ? dateValue(formData, "endDate") : null,
    priority: numberValue(formData, "priority"),
    status: text(formData, "status") || "DRAFT",
    sortOrder: numberValue(formData, "sortOrder")
  };

  const placement = id
    ? await prisma.promotionPlacement.update({ where: { id }, data })
    : await prisma.promotionPlacement.create({ data });
  await setEntityTags({ tenantId, targetType: "PROMOTION_PLACEMENT", targetId: placement.id, tagIds: formIds(formData, "tagIds") });

  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: user.id,
      action: id ? "promotion_placement_updated" : "promotion_placement_created",
      entity: "PromotionPlacement",
      entityId: placement.id
    }
  });

  revalidatePath("/shop");
  revalidatePath("/api/public/homepage");
  revalidatePath("/admin/promotions");
  redirect("/admin/promotions");
}

export async function saveProductSpecAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const productId = text(formData, "productId");
  const label = text(formData, "label");
  const value = text(formData, "value");

  if (!productId || !label || !value) throw new Error("Product, label and value are required.");

  const product = await prisma.product.findFirstOrThrow({ where: { id: productId, tenantId }, select: { slug: true } });
  const data = {
    tenantId,
    productId,
    label,
    value,
    groupName: nullableText(formData, "groupName"),
    sortOrder: numberValue(formData, "sortOrder")
  };

  if (id) await prisma.productSpec.update({ where: { id }, data });
  else await prisma.productSpec.create({ data });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(`/admin/products/${productId}/edit`);
}

export async function removeProductSpecAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const spec = await prisma.productSpec.findFirstOrThrow({ where: { id, tenantId }, include: { product: { select: { id: true, slug: true } } } });
  await prisma.productSpec.delete({ where: { id } });
  revalidatePath(`/product/${spec.product.slug}`);
  revalidatePath(`/admin/products/${spec.product.id}/edit`);
  redirect(`/admin/products/${spec.product.id}/edit`);
}

export async function saveProductFaqAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const productId = text(formData, "productId");
  const question = text(formData, "question");
  const answer = text(formData, "answer");

  if (!productId || !question || !answer) throw new Error("Product, question and answer are required.");

  const product = await prisma.product.findFirstOrThrow({ where: { id: productId, tenantId }, select: { slug: true } });
  const data = {
    tenantId,
    productId,
    question,
    answer,
    status: text(formData, "status") || "ACTIVE",
    sortOrder: numberValue(formData, "sortOrder")
  };

  if (id) await prisma.productFaq.update({ where: { id }, data });
  else await prisma.productFaq.create({ data });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(`/admin/products/${productId}/edit`);
}

export async function removeProductFaqAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const faq = await prisma.productFaq.findFirstOrThrow({ where: { id, tenantId }, include: { product: { select: { id: true, slug: true } } } });
  await prisma.productFaq.delete({ where: { id } });
  revalidatePath(`/product/${faq.product.slug}`);
  revalidatePath(`/admin/products/${faq.product.id}/edit`);
  redirect(`/admin/products/${faq.product.id}/edit`);
}

export async function saveProductContentBlockAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const productId = text(formData, "productId");
  const title = text(formData, "title");
  const body = text(formData, "body");
  const items = text(formData, "items")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!productId || !title || !body) throw new Error("Product, title and body are required.");

  const product = await prisma.product.findFirstOrThrow({ where: { id: productId, tenantId }, select: { slug: true } });
  const data = {
    tenantId,
    productId,
    title,
    body,
    blockType: text(formData, "blockType") || "DETAIL",
    itemsJson: items.length ? items : undefined,
    status: text(formData, "status") || "ACTIVE",
    sortOrder: numberValue(formData, "sortOrder")
  };

  if (id) await prisma.productContentBlock.update({ where: { id }, data });
  else await prisma.productContentBlock.create({ data });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath(`/admin/products/${productId}/edit`);
  redirect(`/admin/products/${productId}/edit`);
}

export async function removeProductContentBlockAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = text(formData, "id");
  const block = await prisma.productContentBlock.findFirstOrThrow({ where: { id, tenantId }, include: { product: { select: { id: true, slug: true } } } });
  await prisma.productContentBlock.delete({ where: { id } });
  revalidatePath(`/product/${block.product.slug}`);
  revalidatePath(`/admin/products/${block.product.id}/edit`);
  redirect(`/admin/products/${block.product.id}/edit`);
}

export async function saveDeliveryZoneAction(formData: FormData) {
  await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const pincode = text(formData, "pincode");
  const city = text(formData, "city");
  const state = text(formData, "state");

  if (!pincode || !city || !state) throw new Error("Pincode, city and state are required.");

  const data = {
    tenantId,
    pincode,
    city,
    state,
    serviceable: checked(formData, "serviceable"),
    estimatedDays: numberValue(formData, "estimatedDays", 0) || null,
    shippingCharge: numberValue(formData, "shippingCharge"),
    codAvailable: checked(formData, "codAvailable"),
    note: nullableText(formData, "note")
  };

  if (id) await prisma.serviceablePincode.update({ where: { id }, data });
  else await prisma.serviceablePincode.upsert({ where: { tenantId_pincode: { tenantId, pincode } }, update: data, create: data });

  revalidatePath("/admin/delivery-zones");
  redirect("/admin/delivery-zones");
}

export async function saveOfferRuleAction(formData: FormData) {
  const user = await requireCatalogAdminUser();
  const tenantId = await getOmdTenantId();
  const id = nullableText(formData, "id");
  const title = text(formData, "title");
  const code = nullableText(formData, "code")?.toUpperCase() ?? null;
  const targetIds = formIds(formData, "targetIds");

  if (!title) throw new Error("Offer title is required.");

  const data = {
    tenantId,
    title,
    code,
    ruleType: text(formData, "ruleType") || "AUTOMATIC",
    status: text(formData, "status") || "DRAFT",
    priority: numberValue(formData, "priority"),
    startDate: nullableText(formData, "startDate") ? dateValue(formData, "startDate") : null,
    endDate: nullableText(formData, "endDate") ? dateValue(formData, "endDate") : null,
    targetScope: text(formData, "targetScope") || "ALL",
    discountKind: text(formData, "discountKind") || "PERCENT",
    discountValue: decimalValue(formData, "discountValue") ?? 0,
    minCartValue: decimalValue(formData, "minCartValue") ?? 0,
    maxDiscountAmount: decimalValue(formData, "maxDiscountAmount"),
    cashbackKind: nullableText(formData, "cashbackKind"),
    cashbackValue: decimalValue(formData, "cashbackValue"),
    usageLimit: numberValue(formData, "usageLimit", 0) || null,
    perUserLimit: numberValue(formData, "perUserLimit", 0) || null,
    stackWithAutomatic: checked(formData, "stackWithAutomatic"),
    stackWithCoupon: checked(formData, "stackWithCoupon")
  };

  const offer = id ? await prisma.offerRule.update({ where: { id }, data }) : await prisma.offerRule.create({ data });
  const targetType = text(formData, "targetType") || "PRODUCT";

  await prisma.$transaction([
    prisma.offerTarget.deleteMany({ where: { offerRuleId: offer.id } }),
    ...(data.targetScope === "TARGETED" && targetIds.length
      ? [
          prisma.offerTarget.createMany({
            data: targetIds.map((targetId) => ({ tenantId, offerRuleId: offer.id, targetType, targetId }))
          })
        ]
      : []),
    prisma.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        action: id ? "offer_rule_updated" : "offer_rule_created",
        entity: "OfferRule",
        entityId: offer.id
      }
    })
  ]);

  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/admin/offers");
  redirect("/admin/offers");
}
