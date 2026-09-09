import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findVariant: vi.fn(),
  updateVariant: vi.fn(),
  findProduct: vi.fn()
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireCatalogAdminUser: vi.fn(async () => ({ id: "admin" })), requireOperationsAdminUser: vi.fn() }));
vi.mock("@/lib/catalog", () => ({ getOmdTenantId: vi.fn(async () => "tenant") }));
vi.mock("@/lib/tag-relations", () => ({ removeEntityTags: vi.fn(), setEntityTags: vi.fn() }));
vi.mock("@/lib/wallet", () => ({ releaseWalletLockForOrder: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  productVariant: { findUnique: mocks.findUnique, findFirst: mocks.findVariant, update: mocks.updateVariant },
  product: { findFirst: mocks.findProduct }
} }));

import { saveVariantRecoverableAction } from "./admin-actions";

function form(id = "", sku = "SKU-1") {
  const data = new FormData();
  data.set("id", id); data.set("productId", "product"); data.set("sku", sku);
  data.set("price", "100"); data.set("mrp", "120"); data.set("active", "true");
  data.set("stockStatus", "IN_STOCK"); data.set("lowStockThreshold", "5");
  return data;
}

describe("variant SKU saving", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findProduct.mockResolvedValue({ id: "product", slug: "product" });
    mocks.findVariant.mockResolvedValue({ id: "variant" });
    mocks.updateVariant.mockResolvedValue({ id: "variant" });
  });

  it("allows an existing variant to retain its own SKU", async () => {
    mocks.findUnique.mockResolvedValue({ id: "variant" });
    await expect(saveVariantRecoverableAction({ status: "idle" }, form("variant"))).resolves.toEqual({ status: "success", message: "Variant saved." });
    expect(mocks.updateVariant).toHaveBeenCalled();
  });

  it("returns duplicate SKU feedback inside the form", async () => {
    mocks.findUnique.mockResolvedValue({ id: "another-variant" });
    await expect(saveVariantRecoverableAction({ status: "idle" }, form("", "DUPLICATE"))).resolves.toEqual({
      status: "error",
      message: "SKU DUPLICATE is already used by another variant. Enter a different SKU."
    });
    expect(mocks.updateVariant).not.toHaveBeenCalled();
  });
});
