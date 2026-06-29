import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId, productTypes } from "@/lib/catalog";
import { getVariantStockSummaries, isPhysicalInventoryType, type VariantStockSummary } from "@/lib/inventory";

export type StorefrontSearchParams = {
  q?: string;
  type?: string;
  sort?: string;
  minPrice?: string;
  maxPrice?: string;
  stock?: string;
  rating?: string;
  featured?: string;
};

export type StorefrontProduct = Awaited<ReturnType<typeof getStorefrontProducts>>["products"][number];

export function productPrice(product: {
  basePrice: unknown;
  variants: Array<{ price: unknown; mrp?: unknown; active?: boolean }>;
}) {
  return Number(product.variants[0]?.price ?? product.basePrice ?? 0);
}

export function productMrp(product: {
  mrp?: unknown;
  variants: Array<{ mrp?: unknown }>;
}) {
  return Number(product.variants[0]?.mrp ?? product.mrp ?? 0);
}

export function productPrimaryImage(product: {
  imageUrl?: string | null;
  media?: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
}) {
  return product.media?.find((media) => media.isPrimary)?.url ?? product.media?.[0]?.url ?? product.imageUrl ?? null;
}

export function productRating(product: {
  reviewsEnabled?: boolean;
  ratingsEnabled?: boolean;
  reviews?: Array<{ rating: number }>;
}) {
  if (product.reviewsEnabled === false || product.ratingsEnabled === false || !product.reviews?.length) {
    return { average: 0, count: 0 };
  }

  const total = product.reviews.reduce((sum, review) => sum + review.rating, 0);

  return {
    average: Math.round((total / product.reviews.length) * 10) / 10,
    count: product.reviews.length
  };
}

export function discountPercent(price: number, mrp: number) {
  if (!mrp || !price || mrp <= price) {
    return 0;
  }

  return Math.round(((mrp - price) / mrp) * 100);
}

export function stockLabel(stock?: Pick<VariantStockSummary, "available" | "status"> | null) {
  if (!stock) {
    return null;
  }

  if (stock.status === "OUT_OF_STOCK") return "Out of Stock";
  if (stock.status === "LOW_STOCK") return `Only ${stock.available} Left`;
  return "In Stock";
}

export function compactPrice(product: StorefrontProduct) {
  return formatMoney(productPrice(product), product.currency);
}

export async function getStorefrontProducts({
  categorySlug,
  categoryIds,
  searchParams,
  types = productTypes
}: {
  categorySlug?: string;
  categoryIds?: string[];
  searchParams?: StorefrontSearchParams;
  types?: readonly string[];
}) {
  const tenantId = await getOmdTenantId();
  const query = (searchParams?.q ?? "").trim().toLowerCase();
  const minPrice = Number(searchParams?.minPrice ?? "");
  const maxPrice = Number(searchParams?.maxPrice ?? "");
  const rating = Number(searchParams?.rating ?? "");
  const type = (searchParams?.type ?? "").trim();
  const sort = searchParams?.sort ?? "featured";
  const stockFilter = searchParams?.stock ?? "";
  const featuredOnly = searchParams?.featured === "true";

  const products = await prisma.product.findMany({
    where: {
      tenantId,
      status: "ACTIVE",
      type: { in: type && types.includes(type) ? [type] : [...types] },
      ...(categoryIds?.length ? { categoryId: { in: categoryIds } } : {}),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
      ...(featuredOnly ? { featured: true } : {})
    },
    include: {
      category: true,
      variants: {
        where: { active: true },
        orderBy: { createdAt: "asc" }
      },
      media: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }]
      },
      reviews: {
        where: { status: "approved" },
        orderBy: { createdAt: "desc" },
        take: 20
      }
    }
  });

  const stockByVariant = await getVariantStockSummaries(
    products
      .filter((product) => isPhysicalInventoryType(product.type))
      .map((product) => product.variants[0]?.id)
      .filter((variantId): variantId is string => Boolean(variantId))
  );

  const filteredProducts = products
    .filter((product) => {
      if (!query) return true;
      const haystack = `${product.title} ${product.description ?? ""} ${product.shortDescription ?? ""} ${product.category?.name ?? ""}`.toLowerCase();
      return haystack.includes(query);
    })
    .filter((product) => {
      const price = productPrice(product);
      if (Number.isFinite(minPrice) && minPrice > 0 && price < minPrice) return false;
      if (Number.isFinite(maxPrice) && maxPrice > 0 && price > maxPrice) return false;
      return true;
    })
    .filter((product) => {
      if (!rating || rating < 1) return true;
      return productRating(product).average >= rating;
    })
    .filter((product) => {
      if (!stockFilter || !isPhysicalInventoryType(product.type)) return true;
      const variantId = product.variants[0]?.id;
      const stock = variantId ? stockByVariant.get(variantId) : null;
      if (stockFilter === "in") return stock?.status === "IN_STOCK";
      if (stockFilter === "low") return stock?.status === "LOW_STOCK";
      if (stockFilter === "out") return stock?.status === "OUT_OF_STOCK" || !stock;
      return true;
    })
    .sort((left, right) => {
      if (sort === "price-asc") return productPrice(left) - productPrice(right);
      if (sort === "price-desc") return productPrice(right) - productPrice(left);
      if (sort === "newest") return right.createdAt.getTime() - left.createdAt.getTime();
      if (sort === "rating") return productRating(right).average - productRating(left).average;
      if (sort === "name") return left.title.localeCompare(right.title);
      return Number(right.featured) - Number(left.featured) || left.sortOrder - right.sortOrder || left.title.localeCompare(right.title);
    });

  return {
    products: filteredProducts,
    stockByVariant,
    total: products.length
  };
}
