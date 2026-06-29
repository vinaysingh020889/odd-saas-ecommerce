import { AdminTagForm } from "@/components/admin-tag-form";
import { requireCatalogAdminUser } from "@/lib/admin-auth";

type PageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

function safeReturnTo(value?: string) {
  if (!value) return "/admin/tags";
  if (!value.startsWith("/admin/")) return "/admin/tags";
  if (value.startsWith("//") || value.includes("://")) return "/admin/tags";
  return value;
}

export default async function NewTagPage({ searchParams }: PageProps) {
  await requireCatalogAdminUser();
  const params = await searchParams;

  return <AdminTagForm returnTo={safeReturnTo(params.returnTo)} />;
}
