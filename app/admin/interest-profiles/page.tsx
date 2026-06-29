import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import { AdminPanel, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

function profileItems(value: unknown): Array<{ id: string; label: string; count: number }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { id: string; label: string; count: number } => {
      return typeof item === "object" && item !== null && "id" in item && "label" in item && "count" in item;
    })
    .slice(0, 6);
}

function ChipRow({ label, items }: { label: string; items: Array<{ id: string; label: string; count: number }> }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={`${label}-${item.id}`} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
            {item.label} ({item.count})
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function AdminInterestProfilesPage() {
  await requireOperationsAdminUser();
  const tenantId = await getOmdTenantId();
  const [profiles, anonymousProfiles] = await Promise.all([
    prisma.customerInterestProfile.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { lastActivityAt: "desc" },
      take: 100
    }),
    prisma.anonymousInterestProfile.findMany({
      where: { tenantId },
      orderBy: { lastActivityAt: "desc" },
      take: 30
    })
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Analytics"
        title="Interest Profiles"
        description="First-party internal interest summaries recomputed from product, category, service, festival, search, cart and wishlist events."
        tone="admin"
        actions={<StatusBadge tone="ops">{profiles.length} customer profile(s)</StatusBadge>}
      />

      {profiles.length === 0 ? (
        <EmptyState title="No customer profiles yet" description="Profiles are created after logged-in users generate tracked events or anonymous events are merged on login." />
      ) : (
        <div className="grid gap-4">
          {profiles.map((profile) => (
            <AdminPanel key={profile.id}>
              <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    <Link href={`/admin/customers/${profile.user.id}`} className="hover:text-omd-ops">
                      {profile.user.name ?? profile.user.email ?? "Customer"}
                    </Link>
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">{profile.user.email ?? profile.user.id}</p>
                  <p className="mt-3 text-xs text-slate-500">Last activity: {profile.lastActivityAt ? profile.lastActivityAt.toLocaleString("en-IN") : "Not set"}</p>
                </div>
                <div className="grid gap-4">
                  <ChipRow label="Top tags" items={profileItems(profile.topTagsJson)} />
                  <ChipRow label="Top categories" items={profileItems(profile.topCategoriesJson)} />
                  <ChipRow label="Top products" items={profileItems(profile.topProductsJson)} />
                  <ChipRow label="Top services" items={profileItems(profile.topServicesJson)} />
                  <ChipRow label="Top festivals" items={profileItems(profile.topFestivalsJson)} />
                  <ChipRow label="Search terms" items={profileItems(profile.searchTermsJson)} />
                </div>
              </div>
            </AdminPanel>
          ))}
        </div>
      )}

      <AdminPanel>
        <h2 className="text-lg font-semibold text-slate-950">Anonymous Interest Profiles</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Anonymous profiles are first-party browsing summaries. They merge into a customer profile after login where safe.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {anonymousProfiles.length === 0 ? <p className="text-sm text-slate-600">No anonymous profiles yet.</p> : null}
          {anonymousProfiles.map((profile) => (
            <div key={profile.id} className="rounded-md border border-slate-200 p-3">
              <p className="break-all text-sm font-semibold text-slate-950">{profile.anonymousId}</p>
              <p className="mt-1 text-xs text-slate-500">{profile.lastActivityAt ? profile.lastActivityAt.toLocaleString("en-IN") : "No activity date"}</p>
              <ChipRow label="Searches" items={profileItems(profile.searchTermsJson).slice(0, 3)} />
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
