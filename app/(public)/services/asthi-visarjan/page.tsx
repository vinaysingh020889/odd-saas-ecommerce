import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { BreadcrumbHeader, EmptyState, Panel, StatusBadge } from "@/components/ui";

function inclusions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function AsthiVisarjanServicePage() {
  const tenantId = await getOmdTenantId();
  const user = await getCurrentUser();
  const [locations, packages, addOns, activeApplication] = await Promise.all([
    prisma.asthiLocation.findMany({
      where: { tenantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    prisma.asthiPackage.findMany({
      where: { tenantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
    }),
    prisma.asthiAddOn.findMany({
      where: { tenantId, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    }),
    user
      ? prisma.asthiApplication.findFirst({
          where: {
            tenantId,
            userId: user.id,
            status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] }
          },
          include: {
            location: { select: { name: true, city: true } },
            package: { select: { name: true } }
          },
          orderBy: { updatedAt: "desc" }
        })
      : Promise.resolve(null)
  ]);

  const steps = [
    "Choose a sacred location and service package",
    "Review the quote and confirm mock payment",
    "Submit family, deceased and document details",
    "Admin reviews documents and schedules the ritual",
    "Track progress, proof, certificate notes and prasad dispatch placeholder"
  ];
  const activeApplicationHref =
    activeApplication?.status === "PAYMENT_PENDING"
      ? `/asthi/${activeApplication.id}/review`
      : activeApplication?.status === "DETAILS_PENDING"
        ? `/asthi/${activeApplication.applicationNo ?? activeApplication.id}/complete-details`
        : `/asthi/${activeApplication?.applicationNo ?? activeApplication?.id}`;

  return (
    <div className="grid gap-8">
      <BreadcrumbHeader items={[{ label: "Services", href: "/services" }, { label: "Asthi Visarjan" }]} />

      {activeApplication ? (
        <section className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-omd-brown">You have an active Asthi application</span>
              <StatusBadge tone={statusTone(activeApplication.status)}>{statusLabel(activeApplication.status)}</StatusBadge>
              <StatusBadge tone={statusTone(activeApplication.documentStatus)}>{statusLabel(activeApplication.documentStatus)}</StatusBadge>
            </div>
            <p className="text-sm text-omd-muted">
              {activeApplication.applicationNo ?? "Booking in progress"} · {activeApplication.package?.name ?? "Asthi Seva"} ·{" "}
              {activeApplication.location ? `${activeApplication.location.name}, ${activeApplication.location.city}` : activeApplication.preferredLocation ?? "Location selected"}
            </p>
          </div>
          <Link href={activeApplicationHref} className="inline-flex justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
            Track Application
          </Link>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-omd-sand bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="warning">Mock payment only</StatusBadge>
              <StatusBadge tone="neutral">Guided Seva MVP</StatusBadge>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-omd-saffron">Asthi Visarjan Seva</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-omd-brown md:text-5xl">
              Respectful assistance for a sensitive family ritual.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-omd-muted md:text-base">
              Start a private application, choose the holy place and package, then complete details after mock payment confirmation. Real service capacity, courier, and payment integrations remain deferred.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/asthi/apply" className="rounded-md bg-omd-brown px-5 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
                Start Application
              </Link>
              <Link href="#process" className="rounded-md border border-omd-sand px-5 py-3 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                View Process
              </Link>
            </div>
          </div>
          <div className="bg-omd-brown p-6 text-white md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">Available Holy Places</p>
            <div className="mt-5 grid gap-3">
              {locations.map((location) => (
                <div key={location.id} className="rounded-lg border border-white/15 bg-white/10 p-4">
                  <h2 className="font-semibold">{location.name}</h2>
                  <p className="mt-1 text-sm text-white/75">{location.city}, {location.state}</p>
                </div>
              ))}
              {locations.length === 0 ? <p className="text-sm text-white/75">Locations are being configured.</p> : null}
            </div>
          </div>
        </div>
      </section>

      {packages.length === 0 ? (
        <EmptyState title="Packages are not configured yet" description="Admin must seed or configure Asthi packages before applications can be accepted." />
      ) : (
        <section className="grid gap-4 md:grid-cols-3">
          {packages.map((item) => (
            <article key={item.id} className="rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-omd-brown">{item.name}</h2>
              <p className="mt-2 text-2xl font-semibold text-omd-brown">{formatMoney(item.price, item.currency)}</p>
              {item.description ? <p className="mt-3 text-sm leading-6 text-omd-muted">{item.description}</p> : null}
              <ul className="mt-4 grid gap-2 text-sm text-omd-muted">
                {inclusions(item.inclusionsJson).map((inclusion) => (
                  <li key={inclusion}>- {inclusion}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      )}

      <section id="process" className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Panel>
          <h2 className="text-xl font-semibold text-omd-brown">How the MVP Flow Works</h2>
          <ol className="mt-5 grid gap-3 text-sm leading-6 text-omd-muted">
            {steps.map((step, index) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-omd-ivory text-xs font-semibold text-omd-brown">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Panel>
        <Panel>
          <h2 className="text-xl font-semibold text-omd-brown">Optional Add-ons</h2>
          <div className="mt-4 grid gap-3">
            {addOns.map((addOn) => (
              <div key={addOn.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <strong className="text-omd-brown">{addOn.name}</strong>
                  <span className="font-semibold text-omd-brown">{formatMoney(addOn.price)}</span>
                </div>
                {addOn.description ? <p className="mt-1 text-omd-muted">{addOn.description}</p> : null}
              </div>
            ))}
            {addOns.length === 0 ? <p className="text-sm text-omd-muted">Add-ons are not configured yet.</p> : null}
          </div>
        </Panel>
      </section>
    </div>
  );
}
