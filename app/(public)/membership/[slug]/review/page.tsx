import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { getActiveMembershipForUser } from "@/lib/membership";
import { activateFreeMembershipAction, confirmMembershipMockActivationAction, requestMembershipDowngradeAction } from "@/lib/membership-actions";
import { Panel, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MembershipReviewPage({ params }: PageProps) {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const { slug } = await params;
  const [plan, activeMembership] = await Promise.all([
    prisma.membershipPlan.findFirst({
      where: { tenantId, slug },
      include: {
        benefits: {
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }]
        }
      }
    }),
    getActiveMembershipForUser(user.id)
  ]);

  if (!plan) notFound();

  const isFree = Number(plan.price) === 0;
  const isInactive = plan.status !== "ACTIVE";
  const isSameActivePlan = activeMembership?.planId === plan.id;
  const isUpgrade = Boolean(activeMembership && activeMembership.planId !== plan.id && Number(plan.price) > Number(activeMembership.plan.price));
  const isDowngradeRequest = Boolean(activeMembership && activeMembership.planId !== plan.id && Number(plan.price) < Number(activeMembership.plan.price));
  const isSwitch = Boolean(activeMembership && activeMembership.planId !== plan.id && !isUpgrade && !isDowngradeRequest);
  const action = isDowngradeRequest ? requestMembershipDowngradeAction : isFree ? activateFreeMembershipAction : confirmMembershipMockActivationAction;

  return (
    <div className="grid gap-6">
      <nav className="flex items-center gap-2 text-sm text-omd-muted">
        <Link href="/membership" className="font-semibold text-omd-saffron hover:text-omd-brown">Membership</Link>
        <span>/</span>
        <span>Review</span>
      </nav>

      <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <Panel>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={isFree ? "success" : "warning"}>{isFree ? "Free activation" : "Mock payment"}</StatusBadge>
            {isInactive ? <StatusBadge tone="error">Inactive plan</StatusBadge> : null}
            {activeMembership ? <StatusBadge tone="neutral">Current: {activeMembership.plan.name}</StatusBadge> : null}
          </div>
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-omd-saffron">Membership Review</p>
          <h1 className="mt-2 text-3xl font-semibold text-omd-brown">{plan.name}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-omd-muted">{plan.description}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {plan.benefits.map((benefit) => (
              <div key={benefit.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                <p className="font-semibold text-omd-brown">{benefit.title}</p>
                <p className="mt-1 text-omd-muted">{benefit.description}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="h-fit lg:sticky lg:top-20">
          <h2 className="text-xl font-semibold text-omd-brown">Activation Summary</h2>
          <div className="mt-5 grid gap-3">
            <SummaryRow label="Plan" value={plan.name} />
            <SummaryRow label="Duration" value={`${plan.durationDays} days`} />
            <SummaryRow label="Benefits" value={`${plan.benefits.length} active`} />
            <div className="border-t border-omd-sand pt-3">
              <SummaryRow label="Payable" value={formatMoney(plan.price, plan.currency)} strong />
            </div>
          </div>
          <p className="mt-5 rounded-md border border-omd-sand bg-omd-ivory/40 p-3 text-sm leading-6 text-omd-muted">
            {isInactive
              ? "This plan is inactive and cannot be activated."
              : isSameActivePlan
                ? "Renewing this active plan will extend your expiry from the current expiry date."
                : isUpgrade
                  ? "This will upgrade your active membership. The older active plan will be cancelled and history will be retained."
                  : isDowngradeRequest
                    ? "Downgrades from an active paid membership require admin review. No refund or proration is processed here."
                    : isSwitch
                      ? "This will switch your active membership after confirmation. The older active plan will be cancelled and history will be retained."
                    : isFree
                      ? "This plan activates directly. If a paid plan is active, Free downgrade is blocked."
                      : "This is a mock membership payment confirmation. No Razorpay, PayPal, or wallet ledger is used."}
          </p>
          {isInactive ? (
            <Link href="/membership" className="mt-5 inline-flex w-full justify-center rounded-md border border-omd-sand px-4 py-3 text-sm font-semibold text-omd-brown hover:border-omd-gold">
              Back to Membership
            </Link>
          ) : (
            <form action={action} className="mt-5">
              <input type="hidden" name={isDowngradeRequest ? "requestedPlanSlug" : "planSlug"} value={plan.slug} />
              {isDowngradeRequest ? (
                <textarea
                  name="customerNote"
                  rows={3}
                  placeholder="Optional note for admin review"
                  className="mb-3 w-full rounded-md border border-omd-sand px-3 py-2 text-sm"
                />
              ) : null}
              <button className="w-full rounded-md bg-omd-brown px-4 py-3 text-sm font-semibold text-white hover:bg-omd-saffron">
                {isDowngradeRequest ? "Request Plan Change" : isSameActivePlan ? "Renew Membership" : isFree ? "Activate Free" : isUpgrade ? "Confirm Mock Upgrade" : "Confirm Mock Activation"}
              </button>
            </form>
          )}
        </Panel>
      </section>
    </div>
  );
}
