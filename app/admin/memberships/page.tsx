import Link from "next/link";
import type { UserMembershipStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireOperationsAdminUser } from "@/lib/admin-auth";
import {
  previewMembershipRuleEvaluationAction,
  processMembershipRequestAction,
  saveMembershipBenefitAction,
  saveMembershipRuleAction,
  toggleMembershipBenefitAction,
  toggleMembershipRuleAction,
  updateMembershipPlanAction,
  updateMembershipPlanStatusAction
} from "@/lib/membership-actions";
import { evaluateMembershipRulesForScope, membershipBenefitTypes, membershipRuleKeys, membershipUsagePeriods, supportedMembershipScopes } from "@/lib/membership";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { AdminPanel, EmptyState, PageHeader, StatusBadge, SummaryRow } from "@/components/ui";

type PageProps = {
  searchParams: Promise<{ q?: string; status?: string; previewUserId?: string; previewScope?: string; previewAmount?: string }>;
};

export default async function AdminMembershipsPage({ searchParams }: PageProps) {
  await requireOperationsAdminUser();
  const params = await searchParams;
  const tenantId = await getOmdTenantId();
  const q = (params.q ?? "").trim();
  const status = (params.status ?? "").trim();
  const previewUserId = (params.previewUserId ?? "").trim();
  const previewScope = (params.previewScope ?? "GLOBAL").trim();
  const previewAmount = (params.previewAmount ?? "").trim();
  const membershipStatus = ["ACTIVE", "EXPIRED", "CANCELLED"].includes(status) ? (status as UserMembershipStatus) : undefined;
  const now = new Date();
  const [plans, memberships, requests, previewUsers, previewEvaluation] = await Promise.all([
    prisma.membershipPlan.findMany({
      where: { tenantId },
      include: {
        benefits: { orderBy: [{ sortOrder: "asc" }, { title: "asc" }] },
        rules: { include: { benefit: { select: { title: true } } }, orderBy: [{ priority: "desc" }, { createdAt: "asc" }] },
        userMemberships: {
          where: { status: "ACTIVE", expiresAt: { gt: now } },
          select: { id: true }
        },
        _count: { select: { userMemberships: true } }
      },
      orderBy: [{ sortOrder: "asc" }, { price: "asc" }]
    }),
    prisma.userMembership.findMany({
      where: {
        tenantId,
        ...(membershipStatus ? { status: membershipStatus } : {}),
        ...(q
          ? {
              OR: [
                { user: { name: { contains: q, mode: "insensitive" } } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { plan: { name: { contains: q, mode: "insensitive" } } }
              ]
            }
          : {})
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true, slug: true } },
        usages: { include: { benefit: { select: { title: true, scope: true } } }, orderBy: { usedAt: "desc" }, take: 5 },
        requests: { orderBy: { createdAt: "desc" }, take: 3 },
        statusHistory: { orderBy: { createdAt: "desc" }, take: 3 }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    }),
    prisma.membershipRequest.findMany({
      where: {
        tenantId,
        ...(q
          ? {
              OR: [
                { user: { name: { contains: q, mode: "insensitive" } } },
                { user: { email: { contains: q, mode: "insensitive" } } },
                { currentPlan: { name: { contains: q, mode: "insensitive" } } },
                { requestedPlan: { name: { contains: q, mode: "insensitive" } } },
                { customerNote: { contains: q, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        currentPlan: { select: { name: true } },
        requestedPlan: { select: { name: true } },
        userMembership: { select: { id: true, status: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    prisma.user.findMany({
      where: { tenantId, userMemberships: { some: {} } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 80
    }),
    previewUserId ? evaluateMembershipRulesForScope(previewUserId, previewScope, { amount: Number(previewAmount || 0) }) : Promise.resolve(null)
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Memberships"
        title="Membership Engine"
        description="Business-controlled plan, benefit, rule, entitlement and usage visibility. Changes affect future evaluations immediately."
        tone="admin"
      />

      <div id="membership-preview">
      <AdminPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Rule Preview</h2>
            <p className="mt-1 text-sm text-slate-600">Test plan benefits and guided rules without consuming usage.</p>
          </div>
          {previewEvaluation ? <StatusBadge tone={previewEvaluation.allowed ? "success" : "warning"}>{previewEvaluation.allowed ? "Allowed" : statusLabel(previewEvaluation.blockedReason)}</StatusBadge> : null}
        </div>
        <form action={previewMembershipRuleEvaluationAction} className="mt-4 grid gap-3 lg:grid-cols-[1fr_180px_160px_120px]">
          <select name="userId" defaultValue={previewUserId} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">Choose member</option>
            {previewUsers.map((user) => <option key={user.id} value={user.id}>{user.name ?? user.email ?? user.id}</option>)}
          </select>
          <select name="scope" defaultValue={previewScope} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            {supportedMembershipScopes.map((scope) => <option key={scope} value={scope}>{statusLabel(scope)}</option>)}
          </select>
          <input name="amount" type="number" min="0" step="1" defaultValue={previewAmount} placeholder="Amount" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Evaluate</button>
        </form>
        {previewEvaluation ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <SummaryRow label="Active plan" value={previewEvaluation.activePlan?.name ?? "None"} />
            <SummaryRow label="Matched benefits" value={previewEvaluation.matchingBenefits.length} />
            <SummaryRow label="Matched rules" value={previewEvaluation.matchingRules.length} />
            <SummaryRow label="Discount percent" value={previewEvaluation.discountPercent ? `${previewEvaluation.discountPercent}%` : "None"} />
            <SummaryRow label="Discount amount" value={previewEvaluation.discountAmount ? formatMoney(previewEvaluation.discountAmount) : "None"} />
            <SummaryRow label="Usage remaining" value={previewEvaluation.usageRemaining ?? "Unlimited / not limited"} />
            <SummaryRow label="Priority support" value={previewEvaluation.prioritySupport ? "Yes" : "No"} />
            <SummaryRow label="Priority queue" value={previewEvaluation.priorityQueue ? "Yes" : "No"} />
            <SummaryRow label="Access granted" value={previewEvaluation.accessGranted ? "Yes" : "No"} />
          </div>
        ) : null}
      </AdminPanel>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => (
          <AdminPanel key={plan.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">{plan.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{formatMoney(plan.price, plan.currency)} - {plan.durationDays} days</p>
              </div>
              <StatusBadge tone={statusTone(plan.status)}>{statusLabel(plan.status)}</StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
            <div className="mt-4 grid gap-2">
              {plan.benefits.map((benefit) => (
                <div key={benefit.id} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-sm">
                  <p className="font-semibold text-slate-950">{benefit.title}</p>
                  <p className="mt-1 text-xs text-slate-600">{statusLabel(benefit.scope)} - {statusLabel(benefit.type)}</p>
                </div>
              ))}
            </div>
            <form action={updateMembershipPlanAction} className="mt-4 grid gap-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-omd-ops">Edit Plan</p>
              <p className="mt-1 text-xs text-slate-500">Update customer-facing plan basics and operational controls.</p>
                </div>
                <StatusBadge tone={plan.rules.length ? "neutral" : "warning"}>{plan.rules.length} rule(s)</StatusBadge>
              </div>
              <input type="hidden" name="planId" value={plan.id} />
              <input name="name" defaultValue={plan.name} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
              <textarea name="description" defaultValue={plan.description ?? ""} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <div className="grid gap-2 sm:grid-cols-2">
                <input name="price" type="number" step="1" min="0" defaultValue={Number(plan.price)} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="durationDays" type="number" min="1" defaultValue={plan.durationDays} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="sortOrder" type="number" defaultValue={plan.sortOrder} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
                <select name="status" defaultValue={plan.status} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                  {["ACTIVE", "INACTIVE"].map((option) => <option key={option} value={option}>{statusLabel(option)}</option>)}
                </select>
                <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input type="checkbox" name="featured" defaultChecked={plan.featured} />
                  Featured
                </label>
              </div>
              <div className="grid gap-2 text-xs font-semibold text-slate-700 sm:grid-cols-3">
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="renewalAllowed" defaultChecked={plan.renewalAllowed} /> Renewal</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="upgradeAllowed" defaultChecked={plan.upgradeAllowed} /> Upgrade</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" name="cancellationRequestAllowed" defaultChecked={plan.cancellationRequestAllowed} /> Cancellation</label>
              </div>
              <textarea name="customerNote" defaultValue={plan.customerNote ?? ""} rows={2} placeholder="Customer-visible note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <textarea name="internalNote" defaultValue={plan.internalNote ?? ""} rows={2} placeholder="Internal admin note" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
              <button className="w-fit rounded-md bg-omd-ops px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Save plan</button>
            </form>

            <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-slate-950">Add Benefit</h3>
              <form action={saveMembershipBenefitAction} className="mt-3 grid gap-2">
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="redirectTo" value="/admin/memberships" />
                <input name="title" placeholder="Benefit title" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                <textarea name="description" rows={2} placeholder="Customer-facing description" className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="type" defaultValue="CUSTOM" className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                    {membershipBenefitTypes.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                  </select>
                  <select name="scope" defaultValue="GLOBAL" className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                    {supportedMembershipScopes.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                  </select>
                  <input name="valueDecimal" type="number" step="0.01" min="0" placeholder="Value" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                  <input name="usageLimit" type="number" min="0" placeholder="Usage limit" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                  <select name="usagePeriod" defaultValue="" className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                    <option value="">No reset</option>
                    {membershipUsagePeriods.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                  </select>
                  <input name="sortOrder" type="number" defaultValue="0" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="validFrom" type="date" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                  <input name="validUntil" type="date" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                </div>
                <input name="valueText" placeholder="Text value / badge / note" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                <input name="internalNote" placeholder="Internal note" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="active" defaultChecked /> Active</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="customerVisible" defaultChecked /> Customer visible</label>
                </div>
                <button className="w-fit rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-omd-ops">Create benefit</button>
              </form>
            </div>

            <div className="mt-4 grid gap-3">
              {plan.benefits.map((benefit) => (
                <details key={benefit.id} id={`benefit-${benefit.id}`} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-950">{benefit.title} - {statusLabel(benefit.type)} - {benefit.active ? "Active" : "Inactive"}</summary>
                  <form action={saveMembershipBenefitAction} className="mt-3 grid gap-2">
                    <input type="hidden" name="benefitId" value={benefit.id} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="redirectTo" value="/admin/memberships" />
                    <input name="title" defaultValue={benefit.title} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    <textarea name="description" defaultValue={benefit.description ?? ""} rows={2} className="rounded-md border border-slate-300 px-3 py-2 text-sm" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select name="type" defaultValue={benefit.type} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                        {membershipBenefitTypes.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                      </select>
                      <select name="scope" defaultValue={benefit.scope} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                        {supportedMembershipScopes.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                      </select>
                      <input name="valueDecimal" type="number" step="0.01" min="0" defaultValue={benefit.valueDecimal !== null ? Number(benefit.valueDecimal) : ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                      <input name="usageLimit" type="number" min="0" defaultValue={benefit.usageLimit ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                      <select name="usagePeriod" defaultValue={benefit.usagePeriod ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                        <option value="">No reset</option>
                        {membershipUsagePeriods.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                      </select>
                      <input name="sortOrder" type="number" defaultValue={benefit.sortOrder} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input name="validFrom" type="date" defaultValue={benefit.validFrom?.toISOString().slice(0, 10) ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                      <input name="validUntil" type="date" defaultValue={benefit.validUntil?.toISOString().slice(0, 10) ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    </div>
                    <input name="valueText" defaultValue={benefit.valueText ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    <input name="internalNote" defaultValue={benefit.internalNote ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                      <label className="inline-flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={benefit.active} /> Active</label>
                      <label className="inline-flex items-center gap-2"><input type="checkbox" name="customerVisible" defaultChecked={benefit.customerVisible} /> Customer visible</label>
                    </div>
                    <button className="w-fit rounded-md bg-omd-ops px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Save benefit</button>
                  </form>
                  <form action={toggleMembershipBenefitAction} className="mt-2">
                    <input type="hidden" name="benefitId" value={benefit.id} />
                    <input type="hidden" name="active" value={benefit.active ? "false" : "true"} />
                    <input type="hidden" name="redirectTo" value="/admin/memberships" />
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      {benefit.active ? "Deactivate" : "Reactivate"} benefit
                    </button>
                  </form>
                </details>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
              <h3 className="text-sm font-semibold text-slate-950">Add Rule</h3>
              <form action={saveMembershipRuleAction} className="mt-3 grid gap-2">
                <input type="hidden" name="planId" value={plan.id} />
                <input type="hidden" name="redirectTo" value="/admin/memberships" />
                <div className="grid gap-2 sm:grid-cols-2">
                  <select name="ruleKey" defaultValue="custom_note" className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                    {membershipRuleKeys.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                  </select>
                  <select name="scope" defaultValue="GLOBAL" className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                    {supportedMembershipScopes.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                  </select>
                  <select name="benefitId" defaultValue="" className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                    <option value="">No linked benefit</option>
                    {plan.benefits.map((benefit) => <option key={benefit.id} value={benefit.id}>{benefit.title}</option>)}
                  </select>
                  <input name="valueDecimal" type="number" step="0.01" min="0" placeholder="Rule value" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                  <input name="usageLimit" type="number" min="0" placeholder="Limit" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                  <select name="usagePeriod" defaultValue="" className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                    <option value="">No reset</option>
                    {membershipUsagePeriods.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                  </select>
                  <input name="minAmount" type="number" min="0" step="1" placeholder="Min amount" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                  <input name="priority" type="number" defaultValue="0" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input name="validFrom" type="date" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                  <input name="validUntil" type="date" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                </div>
                <input name="note" placeholder="Customer/admin explanation" className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="active" defaultChecked /> Active</label>
                <button className="w-fit rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-omd-ops">Create rule</button>
              </form>
            </div>

            <div className="mt-4 grid gap-3">
              {plan.rules.map((rule) => (
                <details key={rule.id} id={`rule-${rule.id}`} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <summary className="cursor-pointer font-semibold text-slate-950">{statusLabel(rule.ruleKey)} - {statusLabel(rule.scope)} - {rule.active ? "Active" : "Inactive"}</summary>
                  <form action={saveMembershipRuleAction} className="mt-3 grid gap-2">
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="redirectTo" value="/admin/memberships" />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select name="ruleKey" defaultValue={rule.ruleKey} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                        {membershipRuleKeys.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                      </select>
                      <select name="scope" defaultValue={rule.scope} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                        {supportedMembershipScopes.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                      </select>
                      <select name="benefitId" defaultValue={rule.benefitId ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                        <option value="">No linked benefit</option>
                        {plan.benefits.map((benefit) => <option key={benefit.id} value={benefit.id}>{benefit.title}</option>)}
                      </select>
                      <input name="valueDecimal" type="number" step="0.01" min="0" defaultValue={rule.valueDecimal !== null ? Number(rule.valueDecimal) : ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                      <input name="usageLimit" type="number" min="0" defaultValue={rule.usageLimit ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                      <select name="usagePeriod" defaultValue={rule.usagePeriod ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm">
                        <option value="">No reset</option>
                        {membershipUsagePeriods.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
                      </select>
                      <input name="minAmount" type="number" min="0" step="1" defaultValue={rule.minAmount !== null ? Number(rule.minAmount) : ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                      <input name="priority" type="number" defaultValue={rule.priority} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input name="validFrom" type="date" defaultValue={rule.validFrom?.toISOString().slice(0, 10) ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                      <input name="validUntil" type="date" defaultValue={rule.validUntil?.toISOString().slice(0, 10) ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    </div>
                    <input name="note" defaultValue={rule.note ?? ""} className="h-9 rounded-md border border-slate-300 px-3 text-sm" />
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" name="active" defaultChecked={rule.active} /> Active</label>
                    <button className="w-fit rounded-md bg-omd-ops px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800">Save rule</button>
                  </form>
                  <form action={toggleMembershipRuleAction} className="mt-2">
                    <input type="hidden" name="ruleId" value={rule.id} />
                    <input type="hidden" name="active" value={rule.active ? "false" : "true"} />
                    <input type="hidden" name="redirectTo" value="/admin/memberships" />
                    <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-500">
                      {rule.active ? "Deactivate" : "Reactivate"} rule
                    </button>
                  </form>
                </details>
              ))}
            </div>
            <div className="mt-4 grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <p>{plan.userMemberships.length} active member(s)</p>
              <p>{plan._count.userMemberships} total activation(s)</p>
              <p>{plan.rules.length} seeded rule(s)</p>
            </div>
            {plan.status === "ACTIVE" && plan.userMemberships.length > 0 ? (
              <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-5 text-slate-700">
                Deactivating blocks new activations only. Existing active members remain visible until expiry/cancel.
              </p>
            ) : null}
            <form action={updateMembershipPlanStatusAction} className="mt-4">
              <input type="hidden" name="planId" value={plan.id} />
              <input type="hidden" name="status" value={plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"} />
              <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-500">
                Mark {plan.status === "ACTIVE" ? "Inactive" : "Active"}
              </button>
            </form>
          </AdminPanel>
        ))}
      </section>

      <AdminPanel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Membership Requests</h2>
            <p className="mt-1 text-sm text-slate-600">Cancellation, downgrade and plan-change requests. Approvals are internal/manual only; no refund or wallet movement is triggered.</p>
          </div>
          <StatusBadge tone={requests.some((request) => ["submitted", "under_review"].includes(request.status)) ? "warning" : "neutral"}>
            {requests.filter((request) => ["submitted", "under_review"].includes(request.status)).length} open
          </StatusBadge>
        </div>
        <div className="mt-4 grid gap-3">
          {requests.length === 0 ? <p className="text-sm text-slate-600">No membership requests found.</p> : null}
          {requests.map((request) => (
            <div key={request.id} className="grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={statusTone(request.requestType)}>{statusLabel(request.requestType)}</StatusBadge>
                  <StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge>
                </div>
                <Link href={`/admin/customers/${request.user.id}`} className="mt-3 inline-flex font-semibold text-omd-ops hover:text-slate-950">
                  {request.user.name ?? request.user.email ?? "Customer"}
                </Link>
                <p className="mt-1 text-sm text-slate-600">
                  {request.currentPlan?.name ?? "Current plan"}{request.requestedPlan ? ` to ${request.requestedPlan.name}` : ""}
                </p>
                {request.customerNote ? <p className="mt-2 text-sm leading-6 text-slate-700">{request.customerNote}</p> : null}
                {request.adminDecisionNote ? <p className="mt-2 text-xs text-slate-500">Admin note: {request.adminDecisionNote}</p> : null}
                <p className="mt-2 text-xs text-slate-500">Submitted {request.createdAt.toLocaleString("en-IN")}</p>
              </div>
              <form action={processMembershipRequestAction} className="grid gap-2">
                <input type="hidden" name="requestId" value={request.id} />
                <input type="hidden" name="redirectTo" value="/admin/memberships" />
                <select name="action" defaultValue={request.status === "submitted" ? "under_review" : request.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                  {["under_review", "approved", "rejected", "closed"].map((option) => (
                    <option key={option} value={option}>{statusLabel(option)}</option>
                  ))}
                </select>
                <input name="adminDecisionNote" placeholder="Admin decision note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save decision</button>
              </form>
            </div>
          ))}
        </div>
      </AdminPanel>

      <AdminPanel>
        <form className="grid gap-3 md:grid-cols-[1fr_180px_100px]">
          <input name="q" defaultValue={q} placeholder="Customer or plan" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
          <select name="status" defaultValue={status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
            <option value="">All statuses</option>
            {["ACTIVE", "EXPIRED", "CANCELLED"].map((option) => (
              <option key={option} value={option}>{statusLabel(option)}</option>
            ))}
          </select>
          <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Filter</button>
        </form>
      </AdminPanel>

      {memberships.length === 0 ? (
        <EmptyState title="No user memberships" description={q || status ? "No membership entitlement matches the filter." : "User memberships appear here after Free activation or paid mock confirmation."} />
      ) : (
        <AdminPanel className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Activation</th>
                  <th className="px-4 py-3">Usage / History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {memberships.map((membership) => (
                  <tr key={membership.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link href={`/admin/customers/${membership.user.id}`} className="font-semibold text-omd-ops hover:text-slate-900">
                        {membership.user.name ?? membership.user.email ?? "Customer"}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{membership.user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-semibold text-slate-950">{membership.plan.name}</span>
                      <br />
                      {membership.plan.slug}
                    </td>
                    <td className="px-4 py-3"><StatusBadge tone={statusTone(membership.status)}>{statusLabel(membership.status)}</StatusBadge></td>
                    <td className="px-4 py-3 text-slate-600">
                      {membership.startsAt.toLocaleDateString("en-IN")} - {membership.expiresAt.toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{membership.mockPaymentReference ?? membership.activatedByOrderRef ?? "Free activation"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{membership.usages.length} recent usage record(s)</p>
                      <p className="mt-1 text-xs">{membership.requests.length} request(s)</p>
                      {membership.statusHistory[0] ? <p className="mt-1 text-xs">{membership.statusHistory[0].note ?? statusLabel(membership.statusHistory[0].toStatus)}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminPanel>
      )}
    </div>
  );
}
