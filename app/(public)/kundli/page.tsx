import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { evaluateMembershipForScope } from "@/lib/membership";
import { BreadcrumbHeader, EmptyState, Panel, StatusBadge } from "@/components/ui";
import { statusLabel } from "@/lib/status-labels";

function inclusions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function KundliPage() {
  const tenantId = await getOmdTenantId();
  const user = await getCurrentUser();
  const [packages, activeOrder, membershipPreview] = await Promise.all([
    prisma.kundliPackage.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
    }),
    user
      ? prisma.kundliOrder.findFirst({
          where: { tenantId, userId: user.id, status: { notIn: ["COMPLETED", "CANCELLED", "REFUNDED"] } },
          include: { package: { select: { name: true } } },
          orderBy: { updatedAt: "desc" }
        })
      : Promise.resolve(null),
    user ? evaluateMembershipForScope(user.id, "KUNDLI", { relatedType: "KUNDLI" }) : Promise.resolve(null)
  ]);

  const activeOrderHref =
    activeOrder?.status === "PAYMENT_PENDING"
      ? `/kundli/${activeOrder.id}/review`
      : activeOrder?.status === "DETAILS_PENDING"
        ? `/kundli/${activeOrder.orderNo ?? activeOrder.id}/complete-details`
        : `/kundli/${activeOrder?.orderNo ?? activeOrder?.id}`;

  return (
    <div className="grid gap-8">
      <BreadcrumbHeader items={[{ label: "Services", href: "/services" }, { label: "Kundli" }]} />

      {activeOrder ? (
        <section className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-omd-brown">You have an active Kundli request</span>
              <StatusBadge tone="warning">{statusLabel(activeOrder.status)}</StatusBadge>
            </div>
            <p className="mt-1 text-sm text-omd-muted">
              {activeOrder.orderNo ?? "Request in progress"} - {activeOrder.package.name}
            </p>
          </div>
          <Link href={activeOrderHref} className="inline-flex justify-center rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
            Track Kundli
          </Link>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-omd-sand bg-white shadow-sm">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone="warning">Mock payment only</StatusBadge>
              <StatusBadge tone="neutral">Private astrology intake</StatusBadge>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-omd-saffron">Kundli Services</p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold text-omd-brown md:text-5xl">
              Guided Kundli reports, matching, and consultation requests.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-omd-muted md:text-base">
              Choose a package, confirm mock payment, submit birth details, and track report preparation from your dashboard. Real astrology fulfilment integrations are intentionally deferred.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/kundli/apply" className="rounded-md bg-omd-brown px-5 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
                Start Kundli Request
              </Link>
              <Link href="#packages" className="rounded-md border border-omd-sand px-5 py-3 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                View Packages
              </Link>
            </div>
          </div>
          <div className="bg-omd-brown p-6 text-white md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">Membership Preview</p>
            {membershipPreview?.hasActiveMembership ? (
              <div className="mt-5 rounded-lg border border-white/15 bg-white/10 p-4">
                <p className="font-semibold">{membershipPreview.plan?.name ?? "Active membership"}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Kundli benefits are visible for this member. Membership benefit application will be enabled in a later benefit-consumption pass; no usage is consumed in this MVP flow.
                </p>
                <ul className="mt-3 grid gap-2 text-sm text-white/80">
                  {membershipPreview.applicableBenefits.slice(0, 3).map((benefit) => (
                    <li key={benefit.id}>- {benefit.title}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-white/75">
                Sign in with an active membership to preview Kundli-specific benefits. This is preview only; no benefit usage is consumed.
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="packages" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {packages.map((item) => (
          <article key={item.id} className="flex flex-col rounded-lg border border-omd-sand bg-white p-5 shadow-sm">
            <div className="flex-1">
              <StatusBadge tone="neutral">{statusLabel(item.deliveryMode)}</StatusBadge>
              <h2 className="mt-4 text-lg font-semibold text-omd-brown">{item.name}</h2>
              <p className="mt-2 text-2xl font-semibold text-omd-brown">{formatMoney(item.price, item.currency)}</p>
              {item.estimatedDeliveryDays ? <p className="mt-1 text-xs font-semibold text-omd-saffron">{item.estimatedDeliveryDays} day estimate</p> : null}
              {item.description ? <p className="mt-3 text-sm leading-6 text-omd-muted">{item.description}</p> : null}
              <ul className="mt-4 grid gap-2 text-sm text-omd-muted">
                {inclusions(item.inclusionsJson).map((inclusion) => (
                  <li key={inclusion}>- {inclusion}</li>
                ))}
              </ul>
            </div>
            <Link href={`/kundli/apply?package=${item.slug}`} className="mt-5 rounded-md bg-omd-brown px-4 py-2 text-center text-sm font-semibold text-white hover:bg-omd-saffron">
              Select Package
            </Link>
          </article>
        ))}
      </section>

      {packages.length === 0 ? (
        <EmptyState title="Kundli packages are not configured yet" description="Admin must seed or activate Kundli packages before customers can start a request." />
      ) : null}

      <section className="grid gap-5 lg:grid-cols-3">
        {["Select package and contact details", "Confirm mock payment", "Submit birth details and track report"].map((step, index) => (
          <Panel key={step}>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-omd-ivory text-sm font-semibold text-omd-brown">{index + 1}</span>
            <h2 className="mt-4 font-semibold text-omd-brown">{step}</h2>
            <p className="mt-2 text-sm leading-6 text-omd-muted">The flow stays private, customer-owned, and visible to admins through the Kundli operations queue.</p>
          </Panel>
        ))}
      </section>
    </div>
  );
}
