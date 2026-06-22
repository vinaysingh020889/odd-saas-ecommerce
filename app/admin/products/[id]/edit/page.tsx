import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { AdminProductForm } from "@/components/admin-product-form";
import { AdminVariantForm } from "@/components/admin-variant-form";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const [product, categories] = await Promise.all([
    prisma.product.findFirst({ where: { id, tenantId }, include: { variants: { orderBy: { createdAt: "asc" } } } }),
    prisma.category.findMany({ where: { tenantId }, orderBy: { name: "asc" } })
  ]);

  if (!product) notFound();

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Catalog</p>
        <h1 className="mt-3 text-3xl font-semibold">Edit {product.title}</h1>
      </section>
      <AdminProductForm product={product} categories={categories} />
      <section className="grid gap-4">
        <h2 className="text-xl font-semibold">Variants/SKUs</h2>
        {product.variants.map((variant) => (
          <AdminVariantForm key={variant.id} productId={product.id} variant={variant} />
        ))}
        <AdminVariantForm productId={product.id} />
      </section>
    </div>
  );
}
