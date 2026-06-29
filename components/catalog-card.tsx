import type { CatalogItem } from "@/lib/catalog";
import type { StorefrontProduct } from "@/lib/storefront";
import { PremiumProductCard } from "@/components/storefront";

type CatalogCardProps = {
  item: CatalogItem | StorefrontProduct;
  href?: string;
  stock?: {
    available: number;
    status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  } | null;
};

export function CatalogCard(props: CatalogCardProps) {
  return <PremiumProductCard {...props} />;
}
