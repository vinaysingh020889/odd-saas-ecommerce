import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { hasAnyRole, isAdminRole, isFullAdminRole } from "./admin-auth";
import { getOmdTenantId } from "./catalog";
import { prisma } from "./prisma";

const describeUat = process.env.RUN_PHASE1_ROLE_UAT === "true" ? describe : describe.skip;

describeUat("Gate 4 persisted role-matrix and dashboard projection UAT", () => {
  const runId = randomUUID().slice(0, 12);
  const prefix = `role-uat-${runId}`;
  let tenantId = "";
  let planId = "";
  const userIds: string[] = [];
  const roleKeys = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT", "PRODUCT_MANAGER", "ASTROLOGER"] as const;

  beforeAll(async () => {
    tenantId = await getOmdTenantId();
    const roles = await prisma.role.findMany({ where: { tenantId, key: { in: [...roleKeys] } } });
    expect(roles.map((role) => role.key).sort()).toEqual([...roleKeys].sort());
    const roleByKey = new Map(roles.map((role) => [role.key, role.id]));

    for (const roleKey of roleKeys) {
      const user = await prisma.user.create({
        data: {
          tenantId,
          email: `${prefix}-${roleKey.toLowerCase()}@example.invalid`,
          name: `Synthetic ${roleKey}`,
          verifiedEmail: true,
          roles: { create: { tenantId, roleId: roleByKey.get(roleKey)! } }
        }
      });
      userIds.push(user.id);
    }
    const customers = await Promise.all(["customer-a", "customer-b"].map((name) => prisma.user.create({
      data: { tenantId, email: `${prefix}-${name}@example.invalid`, name: `Synthetic ${name}`, verifiedEmail: true }
    })));
    userIds.push(...customers.map((user) => user.id));
    const plan = await prisma.membershipPlan.create({
      data: { tenantId, name: "Synthetic Role UAT Plan", slug: `${prefix}-plan`, price: 0, durationDays: 30, status: "ACTIVE" }
    });
    planId = plan.id;
    await prisma.userMembership.createMany({
      data: customers.map((user) => ({ tenantId, userId: user.id, planId, status: "ACTIVE", startsAt: new Date(), expiresAt: new Date(Date.now() + 30 * 86_400_000) }))
    });
  }, 30_000);

  afterAll(async () => {
    if (!tenantId) return;
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    if (planId) await prisma.membershipPlan.deleteMany({ where: { id: planId } });
    expect(await prisma.user.count({ where: { tenantId, email: { startsWith: prefix } } })).toBe(0);
    expect(await prisma.membershipPlan.count({ where: { tenantId, slug: { startsWith: prefix } } })).toBe(0);
  }, 30_000);

  it("proves persisted role capabilities and customer/admin projection isolation", async () => {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { roles: { include: { role: true } } }
    });
    const byRole = new Map<string, { roles: string[] }>(
      users.flatMap((user) => user.roles.map(({ role }) => [role.key, { roles: [role.key] }] as [string, { roles: string[] }]))
    );
    const operations = byRole.get("OPERATIONS_ADMIN")!;
    const support = byRole.get("SUPPORT_AGENT")!;
    const product = byRole.get("PRODUCT_MANAGER")!;
    const guruji = byRole.get("ASTROLOGER")!;

    expect(isAdminRole(operations.roles[0])).toBe(true);
    expect(isFullAdminRole(operations.roles[0])).toBe(true);
    expect(hasAnyRole(operations, ["SUPER_ADMIN", "OPERATIONS_ADMIN"])).toBe(true);
    expect(hasAnyRole(support, ["SUPER_ADMIN", "OPERATIONS_ADMIN", "SUPPORT_AGENT"])).toBe(true);
    expect(hasAnyRole(support, ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"])).toBe(false);
    expect(hasAnyRole(product, ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER"])).toBe(true);
    expect(hasAnyRole(product, ["SUPER_ADMIN", "OPERATIONS_ADMIN"])).toBe(false);
    expect(isAdminRole(guruji.roles[0])).toBe(true);
    expect(isFullAdminRole(guruji.roles[0])).toBe(false);
    expect(hasAnyRole(guruji, ["SUPER_ADMIN", "OPERATIONS_ADMIN", "PRODUCT_MANAGER", "SUPPORT_AGENT"])).toBe(false);

    const customerIds = users.filter((user) => user.roles.length === 0).map((user) => user.id);
    expect(customerIds).toHaveLength(2);
    const ownProjection = await prisma.userMembership.findMany({ where: { tenantId, userId: customerIds[0] } });
    const otherProjection = await prisma.userMembership.findMany({ where: { tenantId, userId: customerIds[1] } });
    const adminProjection = await prisma.userMembership.findMany({ where: { tenantId, userId: { in: customerIds } } });
    expect(ownProjection).toHaveLength(1);
    expect(otherProjection).toHaveLength(1);
    expect(ownProjection[0].userId).not.toBe(otherProjection[0].userId);
    expect(adminProjection).toHaveLength(2);
  }, 30_000);
});
