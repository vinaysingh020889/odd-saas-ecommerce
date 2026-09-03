import { describe, expect, it } from 'vitest';
import { buildKundliCustomerAssignmentProjection, CUSTOMER_KUNDLI_QUEUED_MESSAGE } from './kundli-customer-assignment';

const promisedDeliveryAt = new Date('2026-09-05T18:29:59.000Z');

describe('Kundli customer assignment projection', () => {
  it('projects the public Guruji and promise while hiding stale queue state', () => {
    const projection = buildKundliCustomerAssignmentProjection(
      { assignmentState: 'ASSIGNED', assignmentQueuePosition: 7, promisedDeliveryAt },
      { assignedUser: { kundliPractitionerProfile: { displayName: 'Guruji Dev Sharma', publicVisible: true } } }
    );
    expect(projection).toMatchObject({ assignmentState: 'ASSIGNED', assignmentStateLabel: 'Assigned', gurujiDisplayName: 'Guruji Dev Sharma', promisedDeliveryAt, isQueued: false, queuePosition: null });
  });

  it('uses a safe generic name when the assigned profile is not public', () => {
    const projection = buildKundliCustomerAssignmentProjection(
      { assignmentState: 'ASSIGNED', assignmentQueuePosition: null, promisedDeliveryAt: null },
      { assignedUser: { kundliPractitionerProfile: { displayName: 'Internal Practitioner Name', publicVisible: false } } }
    );
    expect(projection.gurujiDisplayName).toBe('Assigned Kundli Expert');
    expect(projection.customerMessage).not.toContain('Internal Practitioner Name');
  });

  it('shows a real queue position with safe wording and no blocking reason', () => {
    const projection = buildKundliCustomerAssignmentProjection(
      { assignmentState: 'AWAITING_ASSIGNMENT', assignmentQueuePosition: 4, promisedDeliveryAt: null }, null
    );
    expect(projection).toMatchObject({ assignmentStateLabel: 'Awaiting Guruji assignment', isQueued: true, queuePosition: 4, customerMessage: CUSTOMER_KUNDLI_QUEUED_MESSAGE });
    expect(projection.customerMessage).not.toMatch(/capacity|eligible|unavailable|accepting work/i);
  });

  it('does not project a stale queue position outside the awaiting state', () => {
    const projection = buildKundliCustomerAssignmentProjection(
      { assignmentState: 'ASSIGNED', assignmentQueuePosition: 9, promisedDeliveryAt }, null
    );
    expect(projection.isQueued).toBe(false);
    expect(projection.queuePosition).toBeNull();
  });
});
