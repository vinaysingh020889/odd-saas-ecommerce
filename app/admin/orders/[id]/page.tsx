import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, getOmdTenantId } from "@/lib/catalog";
import { requireAdminRole } from "@/lib/admin-auth";
import { releaseReservedStockForOrderAction } from "@/lib/inventory-actions";
import { reservationSummaryFromMovements } from "@/lib/inventory";
import { buildAddressText } from "@/lib/checkout-maturity";
import { addOrderActivityNoteAction, cancelPaymentPendingOrderAction } from "@/lib/admin-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import {
  cancelOperationalOrderAction,
  markOrderDeliveredAction,
  markOrderProcessingAction,
  markOrderReadyToShipAction,
  markOrderShippedAction,
  markRefundRequestedAction,
  markRefundedAction,
  saveOrderTrackingAction
} from "@/lib/admin-order-actions";
import { updateOrderRequestStatusAction } from "@/lib/order-request-actions";
import { AdminPanel, PageHeader, StatusBadge } from "@/components/ui";
import Link from "next/link";
import { MockPaymentPanel } from "@/components/mock-payment-panel";
import { AdminAssignmentPanel } from "@/components/admin-assignment-panel";
import { AdminChecklistPanel } from "@/components/admin-checklist-panel";
import { AdminDocumentPanel } from "@/components/admin-document-panel";
import { getDocumentsForOwner } from "@/lib/documents";
import { getOrCreateChecklistForOwner } from "@/lib/checklists";

type PageProps = { params: Promise<{ id: string }> };

function hasKitSnapshot(metadata: unknown): metadata is { kitComponents: unknown } {
  return Boolean(metadata && typeof metadata === "object" && !Array.isArray(metadata) && "kitComponents" in metadata);
}

export default async function AdminOrderDetailPage({ params }: PageProps) {
  await requireAdminRole(["SUPER_ADMIN", "OPERATIONS_ADMIN"]);
  const { id } = await params;
  const tenantId = await getOmdTenantId();
  const [order, assignments, users, operationalDocuments] = await Promise.all([
    prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        inventoryMovements: {
          orderBy: { createdAt: "desc" },
          include: {
            variant: { select: { sku: true, title: true } }
          }
        },
        activities: {
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { name: true, email: true } } }
        },
        paymentAttempts: {
          orderBy: { createdAt: "desc" },
          include: { events: { orderBy: { createdAt: "desc" } } }
        },
        offerRedemptions: {
          include: { offerRule: { select: { title: true, ruleType: true } } },
          orderBy: { createdAt: "asc" }
        },
        membershipSubscriptions: { orderBy: { createdAt: "desc" } },
        requests: {
          include: {
            orderItem: { select: { titleSnapshot: true, skuSnapshot: true } },
            createdBy: { select: { name: true, email: true } },
            reviewedBy: { select: { name: true, email: true } }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    }),
    prisma.assignment.findMany({
      where: { tenantId, workType: "ORDER", workId: id },
      include: { assignedUser: { select: { name: true, email: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    }),
    prisma.user.findMany({
      where: { tenantId, status: "ACTIVE" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: 100
    }),
    getDocumentsForOwner("ORDER", id, tenantId)
  ]);

  if (!order) notFound();
  const checklist = await getOrCreateChecklistForOwner({ tenantId, relatedType: "ORDER_FULFILMENT", relatedId: order.id });
  const reservation = reservationSummaryFromMovements(order.inventoryMovements);
  const isPaid = order.paymentStatus === "succeeded";
  const isClosed = ["cancelled", "refunded"].includes(order.status) || ["cancelled", "refunded"].includes(order.fulfillmentStatus);
  const canProcess = isPaid && !isClosed && !["shipped", "delivered"].includes(order.status);
  const canReady = isPaid && !isClosed && !["shipped", "delivered"].includes(order.status);
  const canShip = isPaid && !isClosed && order.status !== "delivered";
  const canDeliver = isPaid && !isClosed && order.status === "shipped";
  const canCancel = !["shipped", "delivered", "refunded", "cancelled"].includes(order.status);
  const canRefundRequest = isPaid && order.paymentStatus !== "refunded";
  const canRefund = isPaid && order.fulfillmentStatus !== "delivered";
  const latestAttempt = order.paymentAttempts[0]
    ? {
        id: order.paymentAttempts[0].id,
        provider: order.paymentAttempts[0].provider,
        providerOrderId: order.paymentAttempts[0].providerOrderId,
        amount: Number(order.paymentAttempts[0].amount),
        currency: order.paymentAttempts[0].currency,
        status: order.paymentAttempts[0].status,
        attemptNo: order.paymentAttempts[0].attemptNo,
        createdAt: order.paymentAttempts[0].createdAt.toISOString()
      }
    : null;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Order"
        title={order.orderNumber}
        description="Order lifecycle detail with mock payment attempts, payment events, inventory movement, and timeline."
        tone="admin"
        actions={
          <>
            <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
            <StatusBadge tone={statusTone(order.paymentStatus)}>Mock Payment {statusLabel(order.paymentStatus)}</StatusBadge>
            <StatusBadge tone={statusTone(order.fulfillmentStatus)}>Fulfilment {statusLabel(order.fulfillmentStatus)}</StatusBadge>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <MockPaymentPanel
            orderId={order.id}
            orderNumber={order.orderNumber}
            orderStatus={order.status}
            paymentStatus={order.paymentStatus}
            latestAttempt={latestAttempt}
            redirectTo={`/admin/orders/${order.id}`}
            customerName={order.customerName}
            customerEmail={order.customerEmail}
            admin
          />

          <AdminPanel>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order total</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">{formatMoney(order.totalAmount, order.currency)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order status</p>
                <div className="mt-2"><StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge></div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</p>
                <div className="mt-2"><StatusBadge tone={statusTone(order.paymentStatus)}>{statusLabel(order.paymentStatus)}</StatusBadge></div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fulfilment</p>
                <div className="mt-2"><StatusBadge tone={statusTone(order.fulfillmentStatus)}>{statusLabel(order.fulfillmentStatus)}</StatusBadge></div>
              </div>
            </div>
          </AdminPanel>

          <AdminAssignmentPanel
            title="Fulfilment / Operator Assignment"
            helper="Assign internal staff, vendor placeholder, or fulfilment owner. Customer only sees the customer-visible note."
            workType="ORDER"
            workId={order.id}
            redirectTo={`/admin/orders/${order.id}`}
            defaultRole="Fulfilment Operator"
            assignments={assignments}
            users={users}
          />

          <AdminChecklistPanel checklist={checklist} users={users} redirectTo={`/admin/orders/${order.id}`} />

          <AdminDocumentPanel
            title="Order Documents / Proof"
            ownerType="ORDER"
            ownerId={order.id}
            redirectTo={`/admin/orders/${order.id}`}
            documents={operationalDocuments}
          />

          <AdminPanel>
            <h2 className="text-lg font-semibold">Customer & Contact</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr]">
              <div className="text-sm text-slate-600">
                <p className="font-semibold text-slate-950">{order.customerName}</p>
                <p className="mt-1">{order.customerEmail}</p>
                <p className="mt-1">{order.customerPhone}</p>
                <Link href={`/admin/customers/${order.userId}`} className="mt-3 inline-flex font-semibold text-omd-ops hover:text-slate-900">
                  Open customer profile
                </Link>
              </div>
              <div className="text-sm leading-6 text-slate-600">
                <p>{buildAddressText(order.shippingAddressJson)}</p>
                <p className="mt-2 text-xs text-slate-500">
                  {order.shippingEstimateDays ? `Estimated delivery ${order.shippingEstimateDays} day(s).` : order.shippingNote ?? "Manual review / standard delivery placeholder."}
                </p>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold">Pricing & Offers</h2>
            <div className="mt-4 grid gap-2 text-sm text-slate-700">
              <div className="flex justify-between gap-4">
                <span>Subtotal</span>
                <strong>{formatMoney(order.subtotalAmount, order.currency)}</strong>
              </div>
              <div className="flex justify-between gap-4">
                <span>Discount</span>
                <strong>{formatMoney(order.discountAmount, order.currency)}</strong>
              </div>
              {order.couponCode ? (
                <div className="flex justify-between gap-4">
                  <span>Coupon</span>
                  <strong>{order.couponCode}</strong>
                </div>
              ) : null}
              {order.offerRedemptions.length === 0 ? <p className="text-slate-500">No offer redemptions on this order.</p> : null}
              {order.offerRedemptions.map((redemption) => (
                <div key={redemption.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="font-semibold text-slate-950">{redemption.offerRule.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {redemption.code ? `Code ${redemption.code} - ` : ""}
                    Discount {formatMoney(redemption.discountAmount, order.currency)} - Cashback promise {formatMoney(redemption.cashbackAmount, order.currency)}
                  </p>
                </div>
              ))}
              {Number(order.cashbackPromiseAmount) > 0 ? (
                <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2 font-semibold text-omd-success">
                  Cashback promised: {formatMoney(order.cashbackPromiseAmount, order.currency)}. Wallet ledger not created.
                </div>
              ) : null}
              <div className="grid gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="flex justify-between gap-4">
                  <span>Shipping</span>
                  <strong>{formatMoney(order.shippingAmount, order.currency)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Taxable value</span>
                  <strong>{formatMoney(order.taxableAmount, order.currency)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>GST snapshot</span>
                  <strong>{formatMoney(order.taxAmount, order.currency)}</strong>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Invoice</span>
                  <strong>{order.invoiceNumber ?? "Pending payment"}</strong>
                </div>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-200 pt-2">
                <span>Total</span>
                <strong>{formatMoney(order.totalAmount, order.currency)}</strong>
              </div>
            </div>
          </AdminPanel>

          <AdminPanel>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Cancellation / Return / Refund Requests</h2>
                <p className="mt-1 text-sm text-slate-600">Customer support requests linked to this order. No real refund or courier pickup is triggered here.</p>
              </div>
              <Link href="/admin/requests" className="text-sm font-semibold text-omd-ops hover:text-omd-brown">Open queue</Link>
            </div>
            <div className="mt-4 grid gap-3">
              {order.requests.length === 0 ? <p className="text-sm text-slate-600">No customer request is linked to this order.</p> : null}
              {order.requests.map((request) => (
                <div key={request.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={statusTone(request.requestType)}>{statusLabel(request.requestType)}</StatusBadge>
                        <StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-950">
                        {request.orderItem ? request.orderItem.titleSnapshot : "Whole order"} - {request.reason}
                      </p>
                      {request.customerNote ? <p className="mt-1 text-sm text-slate-600">Customer note: {request.customerNote}</p> : null}
                      {request.adminDecisionNote ? <p className="mt-1 text-sm text-slate-600">Admin note: {request.adminDecisionNote}</p> : null}
                      <p className="mt-1 text-xs text-slate-500">
                        Created {request.createdAt.toLocaleString("en-IN")} by {request.createdBy.name ?? request.createdBy.email ?? "Customer"}
                      </p>
                    </div>
                  </div>
                  {!["rejected", "closed"].includes(request.status) ? (
                    <form action={updateOrderRequestStatusAction} className="mt-3 grid gap-2 md:grid-cols-[180px_1fr_auto]">
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="redirectTo" value={`/admin/orders/${order.id}`} />
                      <select name="status" defaultValue={request.status === "submitted" ? "under_review" : request.status} className="h-10 rounded-md border border-slate-300 px-3 text-sm">
                        <option value="under_review">Under Review</option>
                        <option value="approved">Approve</option>
                        <option value="rejected">Reject</option>
                        <option value="closed">Close</option>
                      </select>
                      <input name="adminDecisionNote" placeholder="Decision note" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
                      <button className="rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save</button>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </AdminPanel>

          <AdminPanel>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Stock Reservation</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Reserved {reservation.reserved} - Released {reservation.released} - Active {reservation.activeReserved}
                </p>
              </div>
              {order.status === "payment_pending" && reservation.activeReserved > 0 ? (
                <form action={releaseReservedStockForOrderAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <button className="rounded-md border border-omd-ops px-3 py-2 text-sm font-semibold text-omd-ops hover:bg-slate-50">
                    Release reserved stock
                  </button>
                </form>
              ) : null}
            </div>
            <div className="mt-4 grid gap-2">
              {order.inventoryMovements.length === 0 ? (
                <p className="text-sm text-slate-600">No stock movements are linked to this order.</p>
              ) : null}
              {order.inventoryMovements.map((movement) => (
                <div key={movement.id} className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <span className="font-semibold">{statusLabel(movement.movementType)}</span>
                  {" - "}Qty {movement.quantity}
                  {" - "}SKU {movement.variant.sku ?? movement.variant.title ?? "-"}
                  {" - "}{movement.reason}
                </div>
              ))}
            </div>
          </AdminPanel>

          <section className="grid gap-3">
            <h2 className="text-lg font-semibold">Order Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap justify-between gap-4">
                  <div>
                    <p className="font-semibold">{item.titleSnapshot}</p>
                    <p className="text-sm text-slate-600">SKU {item.skuSnapshot ?? "-"} - {item.itemType} - Qty {item.quantity}</p>
                    {Number(item.taxAmount) > 0 ? (
                      <p className="mt-1 text-xs text-slate-500">
                        GST {item.taxPercent ? `${Number(item.taxPercent)}%` : "snapshot"}: taxable {formatMoney(item.taxableAmount, order.currency)}, tax {formatMoney(item.taxAmount, order.currency)}
                      </p>
                    ) : null}
                  </div>
                  <p className="font-semibold">{formatMoney(item.lineTotal, order.currency)}</p>
                </div>
                {hasKitSnapshot(item.metadataJson) ? (
                  <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                    <p className="font-semibold text-slate-950">Kit component snapshot</p>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                      {JSON.stringify(item.metadataJson.kitComponents, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ))}
          </section>

          <AdminPanel>
            <h2 className="text-lg font-semibold">Payment Attempts & Events</h2>
            <div className="mt-4 grid gap-3">
              {order.paymentAttempts.length === 0 ? <p className="text-sm text-slate-600">No payment attempts yet.</p> : null}
              {order.paymentAttempts.map((attempt) => (
                <div key={attempt.id} className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        Attempt #{attempt.attemptNo} - {attempt.provider}
                      </p>
                      <p className="mt-1 text-slate-600">
                        {attempt.providerOrderId} - {statusLabel(attempt.status)} - {formatMoney(attempt.amount, attempt.currency)}
                      </p>
                    </div>
                    <StatusBadge tone={statusTone(attempt.status)}>{statusLabel(attempt.status)}</StatusBadge>
                  </div>
                  <div className="mt-3 grid gap-2">
                    {attempt.events.length === 0 ? <p className="text-xs text-slate-500">No events for this attempt yet.</p> : null}
                    {attempt.events.map((event) => (
                      <div key={event.id} className="rounded border border-slate-200 bg-white px-3 py-2">
                        <div className="flex flex-wrap justify-between gap-2">
                          <span className="font-semibold">{statusLabel(event.eventType)}</span>
                          <span className="text-xs text-slate-500">{event.providerEventId}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {event.processedAt ? `Processed ${event.processedAt.toLocaleString("en-IN")}` : "Not processed"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AdminPanel>

          {order.membershipSubscriptions.length > 0 ? (
            <AdminPanel>
              <h2 className="text-lg font-semibold">Membership Subscriptions</h2>
              <div className="mt-4 grid gap-2">
                {order.membershipSubscriptions.map((membership) => (
                  <div key={membership.id} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <span className="font-semibold">{statusLabel(membership.status)}</span>
                    {" - "}Starts {membership.startsAt.toLocaleDateString("en-IN")}
                    {" - "}Ends {membership.endsAt.toLocaleDateString("en-IN")}
                  </div>
                ))}
              </div>
            </AdminPanel>
          ) : null}

          <AdminPanel>
            <h2 className="text-lg font-semibold">Fulfilment Shell</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Courier</p>
                <p className="mt-1 font-semibold text-slate-950">{order.courierName ?? "Not set"}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking number</p>
                <p className="mt-1 font-semibold text-slate-950">{order.trackingNumber ?? "Not set"}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Shipped at</p>
                <p className="mt-1 font-semibold text-slate-950">{order.shippedAt?.toLocaleString("en-IN") ?? "Not shipped"}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivered at</p>
                <p className="mt-1 font-semibold text-slate-950">{order.deliveredAt?.toLocaleString("en-IN") ?? "Not delivered"}</p>
              </div>
            </div>
            <form action={saveOrderTrackingAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr]">
              <input type="hidden" name="orderId" value={order.id} />
              <input name="courierName" defaultValue={order.courierName ?? ""} placeholder="Courier placeholder" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <input name="trackingNumber" defaultValue={order.trackingNumber ?? ""} placeholder="Tracking placeholder" className="h-10 rounded-md border border-slate-300 px-3 text-sm" />
              <textarea name="fulfillmentNote" defaultValue={order.fulfillmentNote ?? ""} placeholder="Internal fulfilment note" rows={3} className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2" />
              <button className="w-fit rounded-md border border-omd-ops px-3 py-2 text-sm font-semibold text-omd-ops hover:bg-slate-50">
                Save tracking placeholder
              </button>
            </form>
          </AdminPanel>

          <AdminPanel>
            <h2 className="text-lg font-semibold">Timeline & Notes</h2>
            <form action={addOrderActivityNoteAction} className="mt-4 grid gap-3">
              <input type="hidden" name="orderId" value={order.id} />
              <textarea
                name="message"
                required
                rows={3}
                placeholder="Add an internal admin note"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button className="w-fit rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
                Add note
              </button>
            </form>
            <div className="mt-5 grid gap-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-950">Order draft created</p>
                <p className="text-xs text-slate-500">{order.createdAt.toLocaleString("en-IN")}</p>
              </div>
              {order.activities.map((activity) => (
                <div key={activity.id} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-semibold text-slate-950">{statusLabel(activity.type)}</p>
                    <p className="text-xs text-slate-500">{activity.createdAt.toLocaleString("en-IN")}</p>
                  </div>
                  <p className="mt-1 text-slate-700">{activity.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{activity.actor?.name ?? activity.actor?.email ?? "System"}</p>
                </div>
              ))}
            </div>
          </AdminPanel>
        </div>

        <AdminPanel className="h-fit lg:sticky lg:top-6">
          <h2 className="text-lg font-semibold">Total</h2>
          <p className="mt-2 text-3xl font-semibold">{formatMoney(order.totalAmount, order.currency)}</p>
          <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4">
            <p className="text-sm font-semibold text-slate-950">Admin Actions</p>
            {!isPaid ? <p className="rounded-md border border-amber-100 bg-amber-50 p-2 text-xs text-amber-800">Unpaid orders cannot be shipped or delivered.</p> : null}
            {canProcess ? (
              <form action={markOrderProcessingAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-omd-ops">Mark processing</button>
              </form>
            ) : null}
            {canReady ? (
              <form action={markOrderReadyToShipAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold hover:border-omd-ops">Mark ready to ship</button>
              </form>
            ) : null}
            {canShip ? (
              <form action={markOrderShippedAction} className="grid gap-2">
                <input type="hidden" name="orderId" value={order.id} />
                <input type="hidden" name="courierName" value={order.courierName ?? ""} />
                <input type="hidden" name="trackingNumber" value={order.trackingNumber ?? ""} />
                <input type="hidden" name="fulfillmentNote" value={order.fulfillmentNote ?? ""} />
                <button className="w-full rounded-md bg-omd-ops px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">Mark shipped</button>
              </form>
            ) : null}
            {canDeliver ? (
              <form action={markOrderDeliveredAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="w-full rounded-md bg-omd-brown px-3 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">Mark delivered</button>
              </form>
            ) : null}
            {canCancel ? (
              <form action={cancelOperationalOrderAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Cancel order</button>
              </form>
            ) : null}
            {canRefundRequest ? (
              <form action={markRefundRequestedAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="w-full rounded-md border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50">Mark refund requested</button>
              </form>
            ) : null}
            {canRefund ? (
              <form action={markRefundedAction}>
                <input type="hidden" name="orderId" value={order.id} />
                <button className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Mark mock refunded</button>
              </form>
            ) : null}
            <p className="text-xs leading-5 text-slate-500">Refund actions are admin/mock state only. No gateway refund is executed.</p>
          </div>
          {order.status === "payment_pending" ? (
            <form action={cancelPaymentPendingOrderAction} className="mt-5 border-t border-slate-200 pt-4">
              <input type="hidden" name="orderId" value={order.id} />
              <p className="text-xs leading-5 text-slate-600">
                Cancelling only closes this payment-pending draft and releases active stock reservations. It does not refund, capture payment, or fulfil.
              </p>
              <button className="mt-3 w-full rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                Cancel draft order
              </button>
            </form>
          ) : null}
        </AdminPanel>
      </section>
    </div>
  );
}
