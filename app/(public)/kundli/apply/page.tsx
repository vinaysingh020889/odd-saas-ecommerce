import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { createKundliOrderAction } from "@/lib/kundli-actions";
import { BreadcrumbHeader, EmptyState, Panel, StatusBadge } from "@/components/ui";
import { statusLabel } from "@/lib/status-labels";

type PageProps = {
  searchParams: Promise<{ package?: string }>;
};

function inclusions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function KundliApplyPage({ searchParams }: PageProps) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const { package: packageSlug } = await searchParams;
  const packages = await prisma.kundliPackage.findMany({
    where: { tenantId, status: "ACTIVE" },
    orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
  });
  const selectedPackage = packages.find((item) => item.slug === packageSlug) ?? packages[0] ?? null;

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader items={[{ label: "Kundli", href: "/kundli" }, { label: "Apply" }]} title="Start Kundli Request" />

      {packages.length === 0 ? (
        <EmptyState title="No active Kundli packages" description="Please ask admin to activate at least one Kundli package before intake can begin." />
      ) : (
        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <Panel>
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Step 1 of 3</p>
            <h1 className="mt-2 text-3xl font-semibold text-omd-brown">Package and contact details</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-omd-muted">
              Birth details are collected after mock payment. This first step saves the package, applicant contact, language preference, and question focus.
            </p>

            <form action={createKundliOrderAction} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Package
                <select name="packageId" defaultValue={selectedPackage?.id} className="h-11 rounded-md border border-omd-sand px-3">
                  {packages.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {formatMoney(item.price, item.currency)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-omd-brown">
                  Applicant name
                  <input name="applicantName" defaultValue={user.name ?? ""} required className="h-11 rounded-md border border-omd-sand px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">
                  Phone
                  <input name="applicantPhone" required className="h-11 rounded-md border border-omd-sand px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">
                  Email
                  <input name="applicantEmail" type="email" defaultValue={user.email ?? ""} required className="h-11 rounded-md border border-omd-sand px-3" />
                </label>
                <label className="grid gap-2 text-sm font-medium text-omd-brown">
                  Language preference
                  <select name="languagePreference" defaultValue="Hindi" className="h-11 rounded-md border border-omd-sand px-3">
                    <option>Hindi</option>
                    <option>English</option>
                    <option>Marathi</option>
                    <option>Gujarati</option>
                    <option>Bengali</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-medium text-omd-brown">
                Question or concern
                <textarea name="questionOrConcern" rows={4} placeholder="Career, marriage, health, spiritual guidance, matching, or any specific concern." className="rounded-md border border-omd-sand px-3 py-2" />
              </label>

              <button type="submit" className="rounded-md bg-omd-brown px-5 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
                Continue to Review
              </button>
            </form>
          </Panel>

          <Panel className="h-fit lg:sticky lg:top-20">
            <h2 className="text-xl font-semibold text-omd-brown">Selected Package</h2>
            {selectedPackage ? (
              <div className="mt-4">
                <StatusBadge tone="neutral">{statusLabel(selectedPackage.deliveryMode)}</StatusBadge>
                <p className="mt-4 font-semibold text-omd-brown">{selectedPackage.name}</p>
                <p className="mt-2 text-2xl font-semibold text-omd-brown">{formatMoney(selectedPackage.price, selectedPackage.currency)}</p>
                {selectedPackage.estimatedDeliveryDays ? <p className="mt-1 text-sm text-omd-muted">{selectedPackage.estimatedDeliveryDays} day estimate after details submission.</p> : null}
                <ul className="mt-4 grid gap-2 text-sm text-omd-muted">
                  {inclusions(selectedPackage.inclusionsJson).map((inclusion) => (
                    <li key={inclusion}>- {inclusion}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Panel>
        </section>
      )}
    </div>
  );
}
