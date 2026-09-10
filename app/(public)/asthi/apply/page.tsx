import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { getOmdTenantId } from "@/lib/catalog";
import { AsthiApplicationForm } from "@/components/asthi-application-form";
import { BreadcrumbHeader, EmptyState, PrimaryLink } from "@/components/ui";
import { getActiveMembershipForUser } from "@/lib/membership";
import { versionBenefits } from "@/lib/membership-plan-versioning";
import type { MembershipBenefitTarget } from "@prisma/client";

function inclusions(value: unknown) {
  return Array.isArray(value) ? value.map(String) : [];
}

export default async function AsthiApplyPage() {
  const user = await requireCurrentUser();
  const tenantId = await getOmdTenantId();
  const [locations, packages, addOns, membership] = await Promise.all([
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
    getActiveMembershipForUser(user.id)
  ]);
  const benefits = membership ? (membership.planVersion ? versionBenefits(membership.planVersion) : membership.plan.benefits) : [];

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader items={[{ label: "Asthi Visarjan", href: "/services/asthi-visarjan" }, { label: "Apply" }]} />
      {locations.length === 0 || packages.length === 0 ? (
        <EmptyState
          title="Asthi Seva setup is incomplete"
          description="Locations and packages must be configured before applications can be started."
          actions={<PrimaryLink href="/services/asthi-visarjan">Back to service page</PrimaryLink>}
        />
      ) : (
        <AsthiApplicationForm
          locations={locations.map((location) => ({
            id: location.id,
            name: location.name,
            city: location.city,
            state: location.state,
            description: location.description
          }))}
          packages={packages.map((item) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            currency: item.currency,
            inclusions: inclusions(item.inclusionsJson)
          }))}
          addOns={addOns.map((addOn) => ({
            id: addOn.id,
            name: addOn.name,
            description: addOn.description,
            price: Number(addOn.price)
          }))}
          membershipBenefits={benefits.filter((benefit) => benefit.active && benefit.method === "CLAIM" && benefit.type === "FREE_USAGE" && (benefit.scope === "ASTHI" || benefit.scope === "GLOBAL")).map((benefit) => { const targets = (benefit as typeof benefit & { targets?: MembershipBenefitTarget[] }).targets ?? []; return { id: benefit.id, title: benefit.title, targetPackageIds: targets.filter((target) => target.targetType === "ASTHI_PACKAGE").map((target) => target.targetId) }; })}
          defaultName={user.name}
          defaultEmail={user.email}
        />
      )}
    </div>
  );
}
