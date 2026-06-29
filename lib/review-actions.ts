"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";

function text(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function submitProductReviewAction(formData: FormData) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const productId = text(formData, "productId");
  const rating = Number(text(formData, "rating"));
  const title = text(formData, "title");
  const body = text(formData, "body");

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Product and rating from 1 to 5 are required.");
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId, reviewsEnabled: true },
    select: { id: true, slug: true }
  });

  if (!product) {
    throw new Error("Reviews are not enabled for this product.");
  }

  const verifiedOrder = await prisma.order.findFirst({
    where: {
      tenantId,
      userId: user.id,
      paymentStatus: "succeeded",
      items: { some: { productId } }
    },
    select: { id: true }
  });

  await prisma.productReview.create({
    data: {
      tenantId,
      productId,
      userId: user.id,
      orderId: verifiedOrder?.id,
      rating,
      title: title || null,
      body: body || null,
      customerName: user.name ?? user.email ?? "Customer",
      status: "pending",
      isVerifiedPurchase: Boolean(verifiedOrder)
    }
  });

  revalidatePath(`/product/${product.slug}`);
  revalidatePath(`/admin/products/${product.id}/edit`);
  redirect(`/product/${product.slug}?review=submitted`);
}
