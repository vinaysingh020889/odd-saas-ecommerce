import Link from "next/link";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";
import { getHomepageMerchandising, promotionHref } from "@/lib/merchandising";

export default async function AdminHomepageLayoutPage() {
  const { hero, intentCategories, festivals, announcementStrip, shopTopBanner } = await getHomepageMerchandising();
  const safeHeroImage = hero.image?.replaceAll('"', "%22");
  const heroPreviewBackground = hero.image
    ? `linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.45)), url("${safeHeroImage}")`
    : "linear-gradient(135deg,#f8fafc,#e2e8f0)";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Merchandising"
        title="Homepage Layout"
        description="Live control view for the /shop merchandising surface. Edit the source records to change what customers see."
        tone="admin"
        actions={
          <>
            <Link href="/admin/promotions" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:border-omd-ops hover:text-omd-ops">Promotions</Link>
            <Link href="/admin/festivals" className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">Festivals</Link>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <AdminPanel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Current Hero</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{hero.title}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{hero.description}</p>
            </div>
            <StatusBadge tone={hero.source === "default" ? "neutral" : "success"}>{hero.source}</StatusBadge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link href={hero.href} className="font-semibold text-omd-ops">Preview hero CTA</Link>
            <span className="text-slate-400">CTA: {hero.ctaLabel}</span>
          </div>
          <div
            className="mt-5 min-h-56 overflow-hidden rounded-xl border border-slate-200 bg-cover bg-center"
            style={{ backgroundImage: heroPreviewBackground }}
          >
            {!hero.image ? (
              <div className="flex min-h-56 items-center justify-center px-4 text-center text-sm font-semibold text-slate-500">
                No hero image is configured. Add an image URL to the active homepage_hero promotion or hero festival.
              </div>
            ) : null}
          </div>
          {hero.image ? <p className="mt-2 break-all text-xs text-slate-500">Image: {hero.image}</p> : null}
        </AdminPanel>

        <AdminPanel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Announcement Strip</p>
          {announcementStrip ? (
            <div className="mt-3">
              <h2 className="font-semibold text-slate-950">{announcementStrip.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{announcementStrip.description}</p>
              <Link href={promotionHref(announcementStrip)} className="mt-3 inline-flex text-sm font-semibold text-omd-ops">Preview target</Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No active announcement placement.</p>
          )}
        </AdminPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <AdminPanel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Shop by Intent</p>
          <div className="mt-4 grid gap-3">
            {intentCategories.map((category) => (
              <div key={category.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-semibold text-slate-950">{category.homepageIntentTitle ?? category.name}</p>
                <p className="text-xs text-slate-500">/{category.slug} · order {category.homepageIntentSortOrder}</p>
              </div>
            ))}
            {intentCategories.length === 0 ? <EmptyState title="No intent categories" description="Enable categories for Shop by Intent from the category edit screen." /> : null}
          </div>
        </AdminPanel>

        <AdminPanel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Festival Focus</p>
          <div className="mt-4 grid gap-3">
            {festivals.map((festival) => (
              <Link key={festival.id} href={`/admin/festivals/${festival.id}/edit`} className="rounded-md border border-slate-200 p-3 hover:border-omd-ops">
                <p className="font-semibold text-slate-950">{festival.title}</p>
                <p className="text-xs text-slate-500">/{festival.slug} · priority {festival.priority}</p>
              </Link>
            ))}
            {festivals.length === 0 ? <p className="text-sm text-slate-500">No active homepage festivals.</p> : null}
          </div>
        </AdminPanel>

        <AdminPanel>
          <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Shop Banner</p>
          {shopTopBanner ? (
            <div className="mt-3">
              <h2 className="font-semibold text-slate-950">{shopTopBanner.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{shopTopBanner.description}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No active shop banner placement.</p>
          )}
        </AdminPanel>
      </div>
    </div>
  );
}
