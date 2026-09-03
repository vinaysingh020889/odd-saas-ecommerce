import { Prisma, type KundliAssignmentState } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const customerActiveAssignmentSelect = Prisma.validator<Prisma.AssignmentSelect>()({
  assignedUser: { select: { kundliPractitionerProfile: { select: { displayName: true, publicVisible: true } } } }
});
type CustomerActiveAssignment = Prisma.AssignmentGetPayload<{ select: typeof customerActiveAssignmentSelect }>;
type CustomerAssignmentOrder = {
  id: string;
  tenantId: string;
  assignmentState: KundliAssignmentState;
  assignmentQueuePosition: number | null;
  promisedDeliveryAt: Date | null;
};

export const CUSTOMER_KUNDLI_QUEUED_MESSAGE = 'Your request is in the Guruji assignment queue. We will update this page when a Guruji is assigned.';
export type KundliCustomerAssignmentProjection = {
  assignmentState: KundliAssignmentState;
  assignmentStateLabel: string;
  gurujiDisplayName: string | null;
  promisedDeliveryAt: Date | null;
  isQueued: boolean;
  queuePosition: number | null;
  customerMessage: string;
};

export function buildKundliCustomerAssignmentProjection(
  order: Pick<CustomerAssignmentOrder, 'assignmentState' | 'assignmentQueuePosition' | 'promisedDeliveryAt'>,
  activeAssignment: CustomerActiveAssignment | null
): KundliCustomerAssignmentProjection {
  const profile = activeAssignment?.assignedUser?.kundliPractitionerProfile ?? null;
  const gurujiDisplayName = activeAssignment ? (profile?.publicVisible ? profile.displayName : 'Assigned Kundli Expert') : null;
  const isQueued = !activeAssignment && order.assignmentState === 'AWAITING_ASSIGNMENT';
  const assignmentState = activeAssignment ? (order.assignmentState === 'REASSIGNED' ? 'REASSIGNED' : 'ASSIGNED') : order.assignmentState;

  if (activeAssignment) return {
    assignmentState,
    assignmentStateLabel: assignmentState === 'REASSIGNED' ? 'Reassigned' : 'Assigned',
    gurujiDisplayName,
    promisedDeliveryAt: order.promisedDeliveryAt,
    isQueued: false,
    queuePosition: null,
    customerMessage: profile?.publicVisible ? profile.displayName + ' is assigned to your Kundli request.' : 'A Kundli expert is assigned to your request.'
  };

  return {
    assignmentState,
    assignmentStateLabel: isQueued ? 'Awaiting Guruji assignment' : assignmentState === 'NOT_READY' ? 'Not ready for assignment' : 'Assignment pending',
    gurujiDisplayName: null,
    promisedDeliveryAt: order.promisedDeliveryAt,
    isQueued,
    queuePosition: isQueued ? order.assignmentQueuePosition : null,
    customerMessage: isQueued ? CUSTOMER_KUNDLI_QUEUED_MESSAGE : 'We will update this page when your Kundli expert is assigned.'
  };
}

export async function getKundliCustomerAssignmentProjection(order: CustomerAssignmentOrder) {
  const activeAssignment = await prisma.assignment.findFirst({
    where: {
      tenantId: order.tenantId, workType: 'KUNDLI_ORDER', workId: order.id, isPrimary: true, endedAt: null,
      status: { notIn: ['COMPLETED', 'CANCELLED'] }
    },
    select: customerActiveAssignmentSelect
  });
  return buildKundliCustomerAssignmentProjection(order, activeAssignment);
}
