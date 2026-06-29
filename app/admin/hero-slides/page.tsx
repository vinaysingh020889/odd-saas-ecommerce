import Link from "next/link";
import { deleteHeroSlideAction, toggleHeroSlideStatusAction } from "@/lib/hero-slide-actions";
import { getAdminHeroSlides } from "@/lib/hero-slides";
import { requireHeroSlideAdminUser } from "@/lib/admin-auth";
import { EmptyState, PageHeader, StatusBadge } from "@/components/ui";

type PageProps = { searchParams: Promise<{ filter?: string }> };

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(value) : "Open";
}

function scheduleStatus(slide: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }) {
  const now = new Date();
  if (!slide.isActive) return { label: "Inactive", tone: "neutral" as const };
  if (slide.startsAt && slide.startsAt > now) return { label: "Scheduled", tone: "warning" as const };
  if (slide.endsAt && slide.endsAt < now) return { label: "Expired", tone: "error" as const };
  return { label: "Live", tone: "success" as const };
}

const filters = [
  { label: "All", value: "" },
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
  { label: "Scheduled", value: "scheduled" },
  { label: "Expired", value: "expired" }
];

export default async function AdminHeroSlidesPage({ searchParams }: PageProps) {
  await requireHeroSlideAdminUser();
  const params = await searchParams;
  const filter = params.filter ?? "";
  const slides = await getAdminHeroSlides(filter);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Merchandising"
        title="Hero Slides"
        description="Manage premium homepage hero slides, scheduling, CTAs, images, and display order."
        tone="admin"
        actions={<Link href="/admin/hero-slides/new" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">New slide</Link>}
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((item) => {
          const filterHref = item.value ? `/admin/hero-slides?filter=${item.value}` : "/admin/hero-slides";
          const filterClassName = `rounded-full border px-3 py-1.5 text-sm font-semibold ${filter === item.value ? "border-omd-ops bg-blue-50 text-omd-ops" : "border-slate-200 bg-white text-slate-600 hover:border-omd-ops"}`;

          return (
            <Link key={item.label} href={filterHref} className={filterClassName}>
              {item.label}
            </Link>
          );
        })}
      </div>

      {slides.length === 0 ? (
        <EmptyState title="No hero slides" description="Create a slide to replace the fallback homepage hero with an admin-managed premium carousel." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Preview</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type / Link</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Sort</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {slides.map((slide) => {
                  const status = scheduleStatus(slide);
                  const desktopImageUrl = slide.desktopImageUrl.replaceAll('"', "%22");
                  const previewBackgroundImage = `url("${desktopImageUrl}")`;
                  const editHref = `/admin/hero-slides/${slide.id}/edit`;
                  const eyebrowText = slide.eyebrow ?? "No eyebrow";
                  const badgeText = slide.badgeText ?? "No badge";
                  const primaryCtaUrl = slide.primaryCtaUrl ?? "resolved entity";

                  return (
                    <tr key={slide.id}>
                      <td className="px-4 py-3">
                        <div className="h-16 w-28 overflow-hidden rounded-md bg-slate-100 bg-cover bg-center" style={{ backgroundImage: previewBackgroundImage }} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-950">{slide.title}</p>
                        <p className="text-xs text-slate-500">{eyebrowText} / {badgeText}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <p>{slide.linkType}</p>
                        <p className="text-xs">{slide.primaryCtaLabel} - {primaryCtaUrl}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(slide.startsAt)} - {formatDate(slide.endsAt)}</td>
                      <td className="px-4 py-3 text-slate-600">{slide.sortOrder}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-3">
                          <Link href={editHref} className="font-semibold text-omd-ops">Edit</Link>
                          <form action={toggleHeroSlideStatusAction.bind(null, slide.id)}>
                            <button className="font-semibold text-slate-700 hover:text-omd-ops">{slide.isActive ? "Deactivate" : "Activate"}</button>
                          </form>
                          <form action={deleteHeroSlideAction.bind(null, slide.id)}>
                            <button className="font-semibold text-omd-error hover:text-red-800">Delete</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}