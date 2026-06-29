import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { getCurrentUser } from "@/lib/auth/session";
import { getActiveMembershipForUser, getMembershipBenefitUsageSummary } from "@/lib/membership";
import { activateFreeMembershipAction, recordDemoMembershipBenefitUsageAction, requestMembershipCancellationAction } from "@/lib/membership-actions";
import { statusLabel } from "@/lib/status-labels";
import { CustomerEventBeacon } from "@/components/customer-event-beacon";
import { EmptyState, Panel, StatusBadge } from "@/components/ui";

function benefitLabel(benefit: { type: string; scope: string; usageLimit: number | null; usagePeriod: string | null; valueDecimal: unknown; valueText: string | null }) {
  const usage = benefit.usageLimit ? ` - ${benefit.usageLimit}/${benefit.usagePeriod?.toLowerCase() ?? "period"}` : "";
  const value = benefit.valueDecimal ? ` - ${Number(benefit.valueDecimal)}${benefit.type === "DISCOUNT_PERCENT" ? "%" : ""}` : benefit.valueText ? ` - ${benefit.valueText}` : "";
  return `${benefit.scope}${value}${usage}`;
}

function benefitNote(scope: string, type: string) {
  if (scope === "KUNDLI") return "Available when Kundli module is enabled";
  if (type === "WALLET_BONUS_PLACEHOLDER") return "Wallet bonus will activate after wallet integration";
  if (["SHOP", "PUJA"].includes(scope)) return "Discount preview; checkout integration coming next";
  return "Membership engine rule";
}

function groupedScopes(benefits: Array<{ id: string; scope: string }>) {
  return Array.from(new Set(benefits.map((benefit) => benefit.scope))).join(" / ");
}

export default async function MembershipPage() {
  const [tenantId, user] = await Promise.all([getOmdTenantId(), getCurrentUser()]);
  const [plans, activeMembership] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { tenantId, status: "ACTIVE" },
      include: {
        benefits: {
          where: { active: true },
          orderBy: [{ scope: "asc" }, { sortOrder: "asc" }, { title: "asc" }]
        }
      },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
    }),
    user ? getActiveMembershipForUser(user.id) : Promise.resolve(null)
  ]);
  const [usageSummary, membershipRequests] = await Promise.all([
    activeMembership ? getMembershipBenefitUsageSummary(activeMembership.id) : Promise.resolve([]),
    user
      ? prisma.membershipRequest.findMany({
          where: { tenantId, userId: user.id, status: { in: ["submitted", "under_review"] } },
          include: { requestedPlan: true, currentPlan: true },
          orderBy: { createdAt: "desc" },
          take: 5
        })
      : Promise.resolve([])
  ]);

  return (
    <div className="grid gap-8">
      <CustomerEventBeacon
        eventType="MEMBERSHIP_VIEWED"
        entityType="MEMBERSHIP_PLAN"
        entitySlug="membership"
        metadata={{ title: "Membership Listing", visiblePlans: plans.map((plan) => ({ id: plan.id, name: plan.name, slug: plan.slug })) }}
      />
      <section className="overflow-hidden rounded-xl border border-omd-sand bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-6 md:p-8">
            <nav className="flex items-center gap-2 text-sm text-omd-muted">
              <Link href="/shop" className="font-semibold text-omd-saffron hover:text-omd-brown">Shop</Link>
              <span>/</span>
              <span>Membership</span>
            </nav>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-omd-saffron">Membership Engine</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold text-omd-brown md:text-5xl">Benefits that travel across the OMD ecosystem.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-omd-muted md:text-base">
              Membership plans are managed as a dedicated entitlement engine, separate from normal product categories. Benefits are structured for shop, puja, Asthi, festivals, support, and future Kundli/wallet modules.
            </p>
          </div>
          <div className="bg-omd-brown p-6 text-white md:p-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">Your Membership</p>
            {activeMembership ? (
              <div className="mt-5 rounded-lg border border-white/15 bg-white/10 p-4">
                <StatusBadge tone="success">{activeMembership.plan.name}</StatusBadge>
                <p className="mt-3 text-sm text-white/75">Active until {activeMembership.expiresAt.toLocaleDateString("en-IN")}</p>
                <p className="mt-2 text-sm text-white/75">{activeMembership.plan.benefits.length} active benefit(s) across {groupedScopes(activeMembership.plan.benefits)}.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/membership/${activeMembership.plan.slug}/review`} className="rounded-md bg-white px-3 py-2 text-xs font-semibold text-omd-brown hover:bg-omd-gold">
                    Renew
                  </Link>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-white/75">No active membership yet. Start with Free or choose a premium plan.</p>
            )}
          </div>
        </div>
      </section>

      {plans.length === 0 ? (
        <EmptyState title="Membership plans are not configured" description="Seed or configure MembershipPlan records to activate the membership engine." />
      ) : (
        <section className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = activeMembership?.planId === plan.id;
            const isFree = Number(plan.price) === 0;
            const blocksFreeDowngrade = Boolean(activeMembership && isFree && !isCurrent && Number(activeMembership.plan.price) > 0);

            return (
              <article key={plan.id} className={`grid gap-5 rounded-xl border bg-white p-5 shadow-sm ${plan.featured ? "border-omd-gold" : "border-omd-sand"}`}>
                <div>
                  <div className="flex flex-wrap gap-2">
                    {plan.featured ? <StatusBadge tone="warning">Featured</StatusBadge> : null}
                    {isCurrent ? <StatusBadge tone="success">Current Plan</StatusBadge> : null}
                  </div>
                  <h2 className="mt-3 text-2xl font-semibold text-omd-brown">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-omd-muted">{plan.description}</p>
                </div>
                <div className="rounded-lg bg-omd-ivory p-4">
                  <p className="text-3xl font-semibold text-omd-brown">{formatMoney(plan.price, plan.currency)}</p>
                  <p className="mt-1 text-sm text-omd-muted">{plan.durationDays} days access</p>
                </div>
                <ul className="grid gap-3 text-sm">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                      <p className="font-semibold text-omd-brown">{benefit.title}</p>
                      <p className="mt-1 text-xs text-omd-muted">{benefit.description}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-omd-saffron">{benefitLabel(benefit)}</p>
                      <p className="mt-1 text-xs text-omd-muted">{benefitNote(benefit.scope, benefit.type)}</p>
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Link href="/dashboard" className="rounded-md border border-omd-sand px-4 py-3 text-center text-sm font-semibold text-omd-brown hover:border-omd-gold">
                    View Benefits
                  </Link>
                ) : blocksFreeDowngrade ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-semibold text-omd-brown">
                    Paid plan active - Free downgrade blocked
                  </div>
                ) : isFree ? (
                  <form action={activateFreeMembershipAction}>
                    <input type="hidden" name="planSlug" value={plan.slug} />
                    <button className="w-full rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
                      Activate Free
                    </button>
                  </form>
                ) : (
                  <Link href={`/membership/${plan.slug}/review`} className="rounded-md bg-omd-brown px-4 py-3 text-center text-sm font-semibold text-white hover:bg-omd-saffron">
                    {activeMembership ? "Upgrade / Renew" : `Choose ${plan.name}`}
                  </Link>
                )}
              </article>
            );
          })}
        </section>
      )}

      {activeMembership ? (
        <Panel>
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">Active Plan</StatusBadge>
                <StatusBadge tone="neutral">Expires {activeMembership.expiresAt.toLocaleDateString("en-IN")}</StatusBadge>
              </div>
              <h2 className="mt-3 text-2xl font-semibold text-omd-brown">{activeMembership.plan.name} usage</h2>
              <p className="mt-2 text-sm leading-6 text-omd-muted">
                Benefit consumption is recorded here for demo-safe use cases. Automatic checkout/service consumption is intentionally limited until each module is connected safely.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {usageSummary.map((item) => (
                  <div key={item.benefit.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-omd-brown">{item.benefit.title}</p>
                        <p className="mt-1 text-xs text-omd-muted">{item.benefit.description}</p>
                      </div>
                      <StatusBadge tone="neutral">{item.benefit.scope}</StatusBadge>
                    </div>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-omd-saffron">
                      Used {item.usedCount}{item.usageLimit ? ` / ${item.usageLimit}` : ""}{item.usagePeriod ? ` ${item.usagePeriod.toLowerCase()}` : ""}
                    </p>
                    {typeof item.remaining === "number" ? <p className="mt-1 text-xs text-omd-muted">{item.remaining} remaining</p> : null}
                    {["KUNDLI", "SUPPORT", "GLOBAL"].includes(item.benefit.scope) && (item.remaining === null || item.remaining > 0) ? (
                      <form action={recordDemoMembershipBenefitUsageAction} className="mt-3">
                        <input type="hidden" name="userMembershipId" value={activeMembership.id} />
                        <input type="hidden" name="benefitId" value={item.benefit.id} />
                        <input type="hidden" name="scope" value={item.benefit.scope} />
                        <button className="rounded-md border border-omd-sand px-3 py-2 text-xs font-semibold text-omd-brown hover:border-omd-gold">
                          Record Demo Use
                        </button>
                      </form>
                    ) : null}
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-omd-brown">Recent membership activity</h3>
                <div className="mt-3 grid gap-2">
                  {activeMembership.statusHistory.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="rounded-md border border-omd-sand px-3 py-2 text-xs text-omd-muted">
                      <span className="font-semibold text-omd-brown">{statusLabel(entry.toStatus)}</span> - {entry.note ?? "Membership status updated"} - {entry.createdAt.toLocaleString("en-IN")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <aside className="h-fit rounded-lg border border-omd-sand bg-omd-ivory/40 p-4">
              <h3 className="text-base font-semibold text-omd-brown">Membership actions</h3>
              <div className="mt-4 grid gap-3">
                <Link href={`/membership/${activeMembership.plan.slug}/review`} className="rounded-md bg-omd-brown px-4 py-3 text-center text-sm font-semibold text-white hover:bg-omd-saffron">
                  Renew Current Plan
                </Link>
                <form action={requestMembershipCancellationAction} className="grid gap-2">
                  <input type="hidden" name="userMembershipId" value={activeMembership.id} />
                  <textarea name="customerNote" rows={3} placeholder="Optional cancellation note" className="rounded-md border border-omd-sand px-3 py-2 text-sm" />
                  <button className="rounded-md border border-omd-sand px-4 py-3 text-sm font-semibold text-omd-brown hover:border-omd-gold">
                    Request Cancellation
                  </button>
                </form>
              </div>
              {membershipRequests.length > 0 ? (
                <div className="mt-5 border-t border-omd-sand pt-4">
                  <h4 className="text-sm font-semibold text-omd-brown">Pending requests</h4>
                  <div className="mt-3 grid gap-2">
                    {membershipRequests.map((request) => (
                      <div key={request.id} className="rounded-md border border-omd-sand bg-white p-2 text-xs text-omd-muted">
                        <p className="font-semibold text-omd-brown">{statusLabel(request.requestType)} - {statusLabel(request.status)}</p>
                        <p className="mt-1">{request.currentPlan?.name ?? "Current plan"} {request.requestedPlan ? `to ${request.requestedPlan.name}` : ""}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="text-xl font-semibold text-omd-brown">Benefit Scope</h2>
        <div className="mt-4 grid gap-3 text-sm text-omd-muted md:grid-cols-3">
          <p>Shop and Puja discounts are structured now; checkout application comes next.</p>
          <p>Kundli, wallet, and content benefits are visible placeholders until those modules are enabled.</p>
          <p>Support and Asthi benefits are available for priority/rule checks through the helper layer.</p>
        </div>
      </Panel>
    </div>
  );
}
