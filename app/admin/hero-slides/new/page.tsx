import { AdminHeroSlideForm } from "@/components/admin-hero-slide-form";
import { PageHeader } from "@/components/ui";
import { requireHeroSlideAdminUser } from "@/lib/admin-auth";
import { getHeroSlideTargets } from "../targets";

export default async function NewHeroSlidePage() {
  await requireHeroSlideAdminUser();
  const targets = await getHeroSlideTargets();

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Merchandising" title="Create Hero Slide" description="Build a scheduled image-led homepage slide with premium CTAs and storefront styling." tone="admin" />
      <AdminHeroSlideForm {...targets} />
    </div>
  );
}