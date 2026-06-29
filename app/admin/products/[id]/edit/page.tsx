import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminVariantForm } from "@/components/admin-variant-form";
import { AdminKitBuilder } from "@/components/admin-kit-builder";
import { AdminProductMediaManager } from "@/components/admin-product-media-manager";
import { AdminProductReviewPanel } from "@/components/admin-product-review-panel";
import { AdminProductContentManager } from "@/components/admin-product-content-manager";
import { getVariantStockSummaries } from "@/lib/inventory";
import { getEntityTagIds, getTags } from "@/lib/tag-relations";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const [product, categories, tags] = await Promise.all([
    prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        variants: { orderBy: { createdAt: "asc" } },
        kitComponents: {
          include: {
            componentProduct: { select: { title: true, type: true } },
            componentVariant: { select: { id: true, sku: true, title: true, price: true } }
          },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
        },
        media: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }] },
        reviews: { orderBy: [{ status: "asc" }, { createdAt: "desc" }] },
        specs: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }] },
        faqs: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
        contentBlocks: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }
      }
    }),
    prisma.category.findMany({ where: { tenantId }, orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { name: "asc" }] }),
    getTags(tenantId)
  ]);

  if (!product) notFound();
  const selectedTagIds = await getEntityTagIds(tenantId, product.type === "SERVICE" ? "SERVICE" : "PRODUCT", product.id);
  const productFormData = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    categoryId: product.categoryId,
    type: product.type,
    status: product.status,
    basePrice: product.basePrice?.toString() ?? null,
    mrp: product.mrp?.toString() ?? null,
    currency: product.currency,
    imageUrl: product.imageUrl,
    reviewsEnabled: product.reviewsEnabled,
    ratingsEnabled: product.ratingsEnabled,
    featured: product.featured,
    sortOrder: product.sortOrder
  };
  const categoryOptions = categories.map((category) => ({ id: category.id, name: category.name, type: category.type, parentId: category.parentId }));
  const [stockByVariant, componentOptions] = await Promise.all([
    getVariantStockSummaries(product.variants.map((variant) => variant.id)),
    prisma.productVariant.findMany({
      where: {
        active: true,
        product: {
          tenantId,
          status: "ACTIVE",
          id: { not: product.id }
        }
      },
      include: { product: { select: { title: true, type: true } } },
      orderBy: [{ product: { title: "asc" } }, { createdAt: "asc" }]
    })
  ]);

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Catalog</p>
        <h1 className="mt-3 text-3xl font-semibold">Edit {product.title}</h1>
      </section>
      <AdminProductForm product={productFormData} categories={categoryOptions} tags={tags} selectedTagIds={selectedTagIds} />
      <AdminProductMediaManager productId={product.id} media={product.media} variants={product.variants} />
      <AdminProductReviewPanel reviews={product.reviews} />
      <AdminProductContentManager productId={product.id} specs={product.specs} faqs={product.faqs} contentBlocks={product.contentBlocks} />
      {product.type === "KIT" ? (
        <AdminKitBuilder kitProductId={product.id} components={product.kitComponents} componentOptions={componentOptions} />
      ) : null}
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Variants/SKUs</h2>
        {product.variants.map((variant) => (
          <AdminVariantForm key={variant.id} productId={product.id} variant={variant} stock={stockByVariant.get(variant.id) ?? null} />
        ))}
        <AdminVariantForm productId={product.id} />
      </section>
    </div>
  );
}
