import { Decimal } from "@prisma/client/runtime/library";
import { describe, expect, it, vi } from "vitest";
import {
  planFromPublishedVersion,
  publishMembershipPlanVersion
} from "@/lib/membership-plan-versioning";

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: "plan_1",
    tenantId: "tenant_1",
    name: "Editable draft",
    slug: "premium",
    description: "Draft description",
    price: new Decimal(9999),
    currency: "INR",
    durationDays: 100,
    status: "INACTIVE",
    sortOrder: 10,
    featured: false,
    renewalAllowed: false,
    upgradeAllowed: false,
    cancellationRequestAllowed: false,
    customerNote: "Draft note",
    internalNote: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    ...overrides
  };
}

function version(overrides: Record<string, unknown> = {}) {
  return {
    id: "version_1",
    tenantId: "tenant_1",
    planId: "plan_1",
    versionNumber: 1,
    status: "RETIRED",
    name: "Purchased Premium",
    description: "Purchased description",
    price: new Decimal(5001),
    currency: "INR",
    durationDays: 365,
    renewalAllowed: true,
    upgradeAllowed: true,
    cancellationRequestAllowed: true,
    customerNote: "Purchased note",
    benefitsSnapshotJson: [
      {
        id: "benefit_active",
        tenantId: "tenant_1",
        planId: "plan_1",
        title: "Five percent",
        description: null,
        type: "DISCOUNT_PERCENT",
        scope: "SHOP",
        valueDecimal: 5,
        valueText: null,
        usageLimit: null,
        usagePeriod: null,
        active: true,
        validFrom: null,
        validUntil: null,
        customerVisible: true,
        internalNote: null,
        sortOrder: 10,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "benefit_inactive",
        tenantId: "tenant_1",
        planId: "plan_1",
        title: "Disabled",
        description: null,
        type: "CUSTOM",
        scope: "GLOBAL",
        valueDecimal: null,
        valueText: null,
        usageLimit: null,
        usagePeriod: null,
        active: false,
        validFrom: null,
        validUntil: null,
        customerVisible: true,
        internalNote: null,
        sortOrder: 20,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    ],
    rulesSnapshotJson: [],
    targetsSnapshotJson: [],
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    retiredAt: new Date("2026-02-01T00:00:00.000Z"),
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides
  };
}

describe("membership plan versions", () => {
  it("keeps an existing member on the purchased snapshot after the working draft changes", () => {
    const effective = planFromPublishedVersion(plan() as any, version() as any);

    expect(effective.name).toBe("Purchased Premium");
    expect(Number(effective.price)).toBe(5001);
    expect(effective.durationDays).toBe(365);
    expect(effective.renewalAllowed).toBe(true);
    expect(effective.benefits.map((benefit: { id: string }) => benefit.id)).toEqual(["benefit_active"]);
    expect(effective.publishedVersion?.versionNumber).toBe(1);
  });

  it("publishes a new immutable snapshot and retires the previously published version", async () => {
    const benefit = {
      ...version().benefitsSnapshotJson[0],
      valueDecimal: new Decimal(7),
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-02-01T00:00:00.000Z"),
      targets: [{ id: "target_1", tenantId: "tenant_1", benefitId: "benefit_active", targetType: "PRODUCT", targetId: "product_1", labelSnapshot: "Prasad", createdAt: new Date("2026-02-01T00:00:00.000Z") }]
    };
    const draft = plan({ name: "Premium 2027", benefits: [benefit], rules: [] });
    const created = version({ id: "version_2", versionNumber: 2, name: "Premium 2027", status: "PUBLISHED" });
    const tx = {
      $executeRawUnsafe: vi.fn().mockResolvedValue(1),
      membershipPlan: {
        findFirst: vi.fn().mockResolvedValue(draft),
        update: vi.fn().mockResolvedValue({ ...draft, status: "ACTIVE" })
      },
      membershipPlanVersion: {
        findFirst: vi.fn().mockResolvedValue({ versionNumber: 1 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        create: vi.fn().mockResolvedValue(created)
      }
    };

    const result = await publishMembershipPlanVersion(tx as never, { tenantId: "tenant_1", planId: "plan_1" });

    expect(result.versionNumber).toBe(2);
    expect(tx.membershipPlanVersion.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ planId: "plan_1", status: "PUBLISHED" })
    }));
    expect(tx.membershipPlanVersion.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        versionNumber: 2,
        name: "Premium 2027",
        benefitsSnapshotJson: expect.arrayContaining([expect.objectContaining({ valueDecimal: 7 })]),
        targetsSnapshotJson: [expect.objectContaining({ targetType: "PRODUCT", targetId: "product_1", createdAt: "2026-02-01T00:00:00.000Z" })]
      })
    }));
    expect(tx.membershipPlan.update).toHaveBeenCalledWith({
      where: { id: "plan_1" },
      data: { status: "ACTIVE" }
    });
  });
});
