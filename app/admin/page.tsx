import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";

const adminLinks = [
  { href: "/admin/products", label: "Products" },
  { href: "/admin/services", label: "Services" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Variants/SKUs" },
  { href: "/admin/orders", label: "Orders placeholder" },
  { href: "/admin/customers", label: "Customers placeholder" },
  { href: "/admin/settings", label: "Settings placeholder" }
];

export default async function AdminPage() {
  const tenantId = await getOmdTenantId();
  const [totalProducts, totalServices, totalCategories, totalVariants, published, inactiveOrDraft, featured] =
    await Promise.all([
      prisma.product.count({ where: { tenantId, type: { in: ["PHYSICAL", "DIGITAL", "MEMBERSHIP", "PACKAGE"] } } }),
      prisma.product.count({ where: { tenantId, type: { in: ["SERVICE", "PACKAGE", "MEMBERSHIP"] } } }),
      prisma.category.count({ where: { tenantId } }),
      prisma.productVariant.count({ where: { product: { tenantId } } }),
      prisma.product.count({ where: { tenantId, status: "ACTIVE" } }),
      prisma.product.count({ where: { tenantId, status: { in: ["DRAFT", "INACTIVE"] } } }),
      prisma.product.count({ where: { tenantId, featured: true } })
    ]);

  const cards = [
    { label: "Products", value: totalProducts },
    { label: "Services", value: totalServices },
    { label: "Categories", value: totalCategories },
    { label: "Variants/SKUs", value: totalVariants },
    { label: "Published", value: published },
    { label: "Draft/Inactive", value: inactiveOrDraft },
    { label: "Featured", value: featured }
  ];

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-sm font-semibold uppercase tracking-wide text-omd-ops">Operations</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Admin Overview</h1>
        <p className="mt-3 text-sm text-slate-600">Control catalog and service data that appears on the public storefront.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{card.value}</p>
          </div>
        ))}
      </section>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Admin Navigation</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {adminLinks.map((link) => (
            <Link key={link.href + link.label} href={link.href} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-omd-ops hover:text-omd-ops">
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
