import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  order: null as any,
  profiles: [] as any[],
  orderUpdates: [] as any[],
  assignments: [] as any[],
  histories: [] as any[]
}));

const tx = {
  kundliOrder: {
    findUnique: vi.fn(async () => state.order),
    findMany: vi.fn(async () => []),
    aggregate: vi.fn(async () => ({ _max: { assignmentQueuePosition: 4 } })),
    update: vi.fn(async (args: any) => { state.orderUpdates.push(args); return args.data; })
  },
  kundliPackage: { findFirstOrThrow: vi.fn(async () => ({ restrictToSelectedPractitioners: false, eligiblePractitioners: [] })) },
  kundliPractitionerProfile: { findMany: vi.fn(async () => state.profiles) },
  assignment: {
    findMany: vi.fn(async () => []),
    create: vi.fn(async (args: any) => { state.assignments.push(args); return { id: 'assignment', ...args.data }; })
  },
  kundliStatusHistory: {
    create: vi.fn(async (args: any) => { state.histories.push(args); return args.data; })
  }
};

vi.mock('@/lib/prisma', () => ({
  prisma: { $transaction: vi.fn(async (work: (client: typeof tx) => unknown) => work(tx)) }
}));

import { attemptKundliAssignment, KUNDLI_ASSIGNMENT_BLOCKING_MESSAGES } from './kundli-assignment-engine';
import { buildKundliCustomerAssignmentProjection } from './kundli-customer-assignment';

describe('Kundli automatic assignment transaction paths', () => {
  beforeEach(() => {
    state.orderUpdates.length = 0;
    state.assignments.length = 0;
    state.histories.length = 0;
    state.order = {
      id: 'order', tenantId: 'tenant', packageId: 'package', status: 'SUBMITTED', paymentStatus: 'CONFIRMED',
      birthName: 'Customer', dateOfBirth: new Date('1990-01-01'), timeOfBirth: '10:00', placeOfBirth: 'Jaipur',
      partnerName: null, partnerDateOfBirth: null, partnerTimeOfBirth: null, partnerPlaceOfBirth: null,
      package: { deliveryMode: 'DIGITAL_REPORT', practitionerSelectionMode: 'INTERNAL_ASSIGNMENT' },
      requestedPractitionerProfileId: null, assignmentQueuedAt: new Date('2026-09-01T08:00:00Z'), assignmentQueuePosition: 3,
      promisedDeliveryAt: null, deliveryPromiseSetAt: null, internalNote: 'Old capacity reason'
    };
    state.profiles = [{
      id: 'profile-dev', tenantId: 'tenant', userId: 'guru-dev', displayName: 'Guruji Dev Sharma',
      active: true, acceptingWork: true, assignmentPriority: 1, standardDeliveryBusinessDays: 2, timezone: 'UTC',
      dailyActiveOrderLimit: 5, weeklyActiveOrderLimit: 20, monthlyActiveOrderLimit: 60,
      user: { id: 'guru-dev' }, unavailability: []
    }];
  });

  it('clears queue fields atomically when automatic assignment succeeds', async () => {
    const result = await attemptKundliAssignment('order', { actorId: 'system', now: new Date('2026-09-01T10:00:00Z') });
    expect(result.outcome).toBe('ASSIGNED');
    expect(state.assignments[0]).toMatchObject({ data: { assignedUserId: 'guru-dev', isPrimary: true, source: 'AUTO' } });
    expect(state.orderUpdates[0]).toMatchObject({ data: {
      assignmentState: 'ASSIGNED', assignmentQueuedAt: null, assignmentQueuePosition: null, internalNote: null
    } });
    const data = state.orderUpdates[0].data;
    const projection = buildKundliCustomerAssignmentProjection(
      { assignmentState: data.assignmentState, assignmentQueuePosition: data.assignmentQueuePosition, promisedDeliveryAt: data.promisedDeliveryAt },
      { assignedUser: { kundliPractitionerProfile: { displayName: 'Guruji Dev Sharma', publicVisible: true } } }
    );
    expect(projection).toMatchObject({ gurujiDisplayName: 'Guruji Dev Sharma', isQueued: false, queuePosition: null });
  });

  it('keeps no-candidate work queued with an admin reason but a safe customer projection', async () => {
    state.profiles = [];
    state.order.assignmentQueuedAt = null;
    state.order.assignmentQueuePosition = null;
    const result = await attemptKundliAssignment('order', { actorId: 'system', now: new Date('2026-09-01T10:00:00Z') });
    expect(result.outcome).toBe('AWAITING_ASSIGNMENT');
    expect(state.orderUpdates[0]).toMatchObject({ data: {
      assignmentState: 'AWAITING_ASSIGNMENT', assignmentQueuePosition: 5,
      internalNote: KUNDLI_ASSIGNMENT_BLOCKING_MESSAGES.NO_ACTIVE_GURUJI
    } });
    const data = state.orderUpdates[0].data;
    const projection = buildKundliCustomerAssignmentProjection(
      { assignmentState: data.assignmentState, assignmentQueuePosition: data.assignmentQueuePosition, promisedDeliveryAt: null }, null
    );
    expect(projection).toMatchObject({ isQueued: true, queuePosition: 5 });
    expect(projection.customerMessage).not.toContain(data.internalNote);
  });
});
