import { notFound } from "next/navigation";
import { AdminHeroSlideForm } from "@/components/admin-hero-slide-form";
import { PageHeader } from "@/components/ui";
import { requireHeroSlideAdminUser } from "@/lib/admin-auth";
import { getHeroSlideById } from "@/lib/hero-slides";
import { getHeroSlideTargets } from "../../targets";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditHeroSlidePage({ params }: PageProps) {
  await requireHeroSlideAdminUser();
  const { id } = await params;
  const [slide, targets] = await Promise.all([getHeroSlideById(id), getHeroSlideTargets()]);
  if (!slide) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader eyebrow="Merchandising" title={`Edit ${slide.title}`} description="Update slide content, imagery, CTAs, design treatment, schedule and active state." tone="admin" />
      <AdminHeroSlideForm slide={slide} {...targets} />
    </div>
  );
}