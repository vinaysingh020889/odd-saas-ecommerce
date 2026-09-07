import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  closed: [] as unknown[],
  created: [] as unknown[],
  orderUpdates: [] as unknown[],
  histories: [] as unknown[]
  ,audits: [] as unknown[],
  previous: { id: 'assignment-old' } as { id: string } | null
}));

const profile = {
  id: "profile-new",
  tenantId: "tenant",
  userId: "guru-new",
  displayName: "Guruji New",
  assignmentPriority: 1,
  standardDeliveryBusinessDays: 2,
  timezone: "UTC",
  dailyActiveOrderLimit: 5,
  weeklyActiveOrderLimit: 20,
  monthlyActiveOrderLimit: 60,
  unavailability: []
};

const tx = {
  kundliOrder: {
    findUniqueOrThrow: vi.fn(async () => ({ id: "order", tenantId: "tenant", packageId: "package", status: "IN_REVIEW", paymentStatus: "CONFIRMED", package: { deliveryMode: "DIGITAL_REPORT" } })),
    findFirst: vi.fn(async () => ({ package: { deliveryMode: "DIGITAL_REPORT" } })),
    update: vi.fn(async (args) => { calls.orderUpdates.push(args); return args.data; })
  },
  kundliPractitionerProfile: { findFirst: vi.fn(async () => profile) },
  assignment: {
    findMany: vi.fn(async () => []),
    updateMany: vi.fn(async (args) => { calls.closed.push(args); return { count: 1 }; }),
    create: vi.fn(async (args) => { calls.created.push(args); return { id: "assignment-new", ...args.data }; }),
    findFirst: vi.fn(async (args: any) => args.select ? calls.previous : ({ assignedUser: { kundliPractitionerProfile: profile } }))
  },
  kundliStatusHistory: { create: vi.fn(async (args) => { calls.histories.push(args); return args.data; }) },
  auditLog: { create: vi.fn(async (args) => { calls.audits.push(args); return args.data; }) },
  checklistInstanceItem: { findMany: vi.fn(async () => [{ title: "Review birth details", status: "completed" }]) }
};

vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: vi.fn(async (work: (client: typeof tx) => unknown) => work(tx)) }
}));

import { recalculateKundliDeliveryPromise, reassignKundliOrder } from "./kundli-assignment-engine";
import { buildKundliCustomerAssignmentProjection } from "./kundli-customer-assignment";

describe("Kundli reassignment transaction", () => {
  beforeEach(() => {
    calls.closed.length = 0;
    calls.created.length = 0;
    calls.orderUpdates.length = 0;
    calls.histories.length = 0;
    calls.audits.length = 0;
    calls.previous = { id: 'assignment-old' };
  });

  it("closes old work, creates a new primary history record, and explicitly recalculates the promise", async () => {
    await reassignKundliOrder({ orderId: "order", practitionerProfileId: profile.id, actorId: "admin", reason: "Customer escalation", now: new Date("2026-07-20T10:00:00.000Z") });
    expect(calls.closed).toHaveLength(1);
    expect(calls.closed[0]).toMatchObject({ data: { isPrimary: false, status: "CANCELLED", endedReason: "Customer escalation" } });
    expect(calls.created).toHaveLength(1);
    expect(calls.created[0]).toMatchObject({ data: { isPrimary: true, source: "ADMIN", assignmentReason: "Customer escalation" } });
    expect(calls.histories).toHaveLength(1);
    expect(calls.orderUpdates[0]).toMatchObject({ data: {
      assignmentState: "REASSIGNED", assignmentQueuedAt: null, assignmentQueuePosition: null, internalNote: null,
      deliveryPromiseChangedReason: "Customer escalation"
    } });
    expect(calls.audits[0]).toMatchObject({ data: { action: "kundli_assignment_reassigned", metadata: { previousAssignmentId: "assignment-old", assignmentId: "assignment-new" } } });
    const orderData = (calls.orderUpdates[0] as any).data;
    const projection = buildKundliCustomerAssignmentProjection(
      { assignmentState: orderData.assignmentState, assignmentQueuePosition: orderData.assignmentQueuePosition, promisedDeliveryAt: orderData.promisedDeliveryAt },
      { assignedUser: { kundliPractitionerProfile: { displayName: "Guruji New", publicVisible: true } } }
    );
    expect(projection).toMatchObject({ assignmentState: "REASSIGNED", gurujiDisplayName: "Guruji New", queuePosition: null });
  });

  it("creates a manual primary assignment and atomically clears queued state", async () => {
    calls.previous = null;
    await reassignKundliOrder({ orderId: "order", practitionerProfileId: profile.id, actorId: "admin", reason: "Manual queue resolution", now: new Date("2026-07-20T10:00:00.000Z") });
    expect(calls.created[0]).toMatchObject({ data: { assignedUserId: "guru-new", isPrimary: true, source: "ADMIN" } });
    expect(calls.orderUpdates[0]).toMatchObject({ data: {
      assignmentState: "ASSIGNED", assignmentQueuedAt: null, assignmentQueuePosition: null, internalNote: null
    } });
    expect(calls.audits[0]).toMatchObject({ data: { action: "kundli_assignment_admin_created", metadata: { previousAssignmentId: null } } });
  });

  it("requires a persisted reason for explicit promise recalculation", async () => {
    await expect(recalculateKundliDeliveryPromise({ orderId: "order", actorId: "admin", reason: "" })).rejects.toThrow(/reason is required/);
    await recalculateKundliDeliveryPromise({ orderId: "order", actorId: "admin", reason: "Guruji leave", now: new Date("2026-07-20T10:00:00.000Z") });
    expect(calls.orderUpdates.at(-1)).toMatchObject({ data: { deliveryPromiseChangedReason: "Guruji leave" } });
  });
});
