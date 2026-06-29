import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/catalog";
import { requireCurrentUser } from "@/lib/auth/session";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { buildAddressText } from "@/lib/checkout-maturity";
import { createOrderRequestAction } from "@/lib/order-request-actions";
import { BreadcrumbHeader, Panel, StatusBadge, SummaryRow } from "@/components/ui";
import { MockPaymentPanel } from "@/components/mock-payment-panel";
import { CustomerDocumentList } from "@/components/customer-document-list";
import { getCustomerVisibleDocuments } from "@/lib/documents";
import { getChecklistMilestones } from "@/lib/checklists";
import { CustomerChecklistMilestones } from "@/components/customer-checklist-milestones";

type OrderPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ pay?: string; paymentResult?: string }>;
};

export default async function OrderPage({ params, searchParams }: OrderPageProps) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const query = await searchParams;
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: {
      items: true,
      paymentAttempts: { orderBy: { createdAt: "desc" }, take: 1 },
      offerRedemptions: { include: { offerRule: { select: { title: true, ruleType: true } } }, orderBy: { createdAt: "asc" } },
      membershipSubscriptions: { orderBy: { createdAt: "desc" } },
      requests: { include: { orderItem: { select: { titleSnapshot: true } } }, orderBy: { createdAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!order) {
    notFound();
  }
  const [customerAssignments, customerDocuments, checklistMilestones] = await Promise.all([
    prisma.assignment.findMany({
      where: { tenantId: order.tenantId, workType: "ORDER", workId: order.id, customerVisibleNote: { not: null }, status: { in: ["ASSIGNED", "IN_PROGRESS", "COMPLETED"] } },
      orderBy: [{ updatedAt: "desc" }]
    }),
    getCustomerVisibleDocuments("ORDER", order.id, order.tenantId),
    getChecklistMilestones(order.tenantId, "ORDER_FULFILMENT", order.id)
  ]);

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
  const canCancel = !["shipped", "delivered", "cancelled", "refunded"].includes(order.fulfillmentStatus) && !["cancelled", "refunded"].includes(order.status);
  const canReturn = order.fulfillmentStatus === "delivered" && !["cancelled", "refunded"].includes(order.status);
  const canRefund = order.paymentStatus === "succeeded" && !["cancelled", "refunded"].includes(order.status);
  const canRequest = canCancel || canReturn || canRefund;

  return (
    <div className="grid gap-6">
      <BreadcrumbHeader
        items={[{ label: "Orders", href: "/orders" }, { label: order.orderNumber }]}
        title={order.orderNumber}
        actions={
          <>
            <StatusBadge tone={statusTone(order.status)}>{statusLabel(order.status)}</StatusBadge>
            <StatusBadge tone={statusTone(order.paymentStatus)}>Payment {statusLabel(order.paymentStatus)}</StatusBadge>
          </>
        }
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          <MockPaymentPanel
            orderId={order.id}
            orderNumber={order.orderNumber}
            orderStatus={order.status}
            paymentStatus={order.paymentStatus}
            latestAttempt={latestAttempt}
            redirectTo={`/orders/${order.id}`}
            customerName={order.customerName}
            customerEmail={order.customerEmail}
            autoOpen={query.pay === "1"}
            result={query.paymentResult}
          />

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Order Status</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Order</p>
                <p className="mt-1 font-semibold text-omd-brown">{statusLabel(order.status)}</p>
              </div>
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Payment</p>
                <p className="mt-1 font-semibold text-omd-brown">{statusLabel(order.paymentStatus)}</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Items</h2>
            <div className="mt-4 grid gap-3">
              {order.items.map((item) => (
                <article key={item.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">{item.itemType}</p>
                      <h3 className="mt-2 font-semibold text-omd-brown">{item.titleSnapshot}</h3>
                    <p className="mt-1 text-sm text-omd-muted">
                      SKU {item.skuSnapshot ?? "-"} - Qty {item.quantity} - Unit {formatMoney(item.unitPrice, order.currency)}
                    </p>
                    {Number(item.taxAmount) > 0 ? (
                      <p className="mt-1 text-xs text-omd-muted">
                        GST snapshot: {item.taxPercent ? `${Number(item.taxPercent)}% - ` : ""}{formatMoney(item.taxAmount, order.currency)}
                      </p>
                    ) : null}
                    {item.metadataJson && typeof item.metadataJson === "object" && !Array.isArray(item.metadataJson) && "kitComponents" in item.metadataJson ? (
                      <div className="mt-3 rounded-md border border-omd-sand bg-white px-3 py-2 text-sm text-omd-muted">
                        <p className="font-semibold text-omd-brown">Kit contents snapshot</p>
                        <pre className="mt-2 whitespace-pre-wrap text-xs">
                          {JSON.stringify(item.metadataJson.kitComponents, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    </div>
                    <p className="font-semibold text-omd-brown">{formatMoney(item.lineTotal, order.currency)}</p>
                  </div>
                </article>
              ))}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Customer Details</h2>
            <p className="mt-3 text-sm text-omd-muted">{order.customerName}</p>
            <p className="mt-1 text-sm text-omd-muted">{order.customerEmail} - {order.customerPhone}</p>
            <p className="mt-3 text-sm leading-6 text-omd-muted">{buildAddressText(order.shippingAddressJson)}</p>
          </Panel>

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Delivery & Invoice</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                <p className="font-semibold text-omd-brown">Delivery estimate</p>
                <p className="mt-1 text-omd-muted">
                  {order.shippingEstimateDays ? `${order.shippingEstimateDays} day(s)` : order.shippingNote ?? "Manual review / standard delivery placeholder."}
                </p>
              </div>
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                <p className="font-semibold text-omd-brown">Invoice placeholder</p>
                <p className="mt-1 text-omd-muted">
                  {order.invoiceNumber ? `${order.invoiceNumber} - ${order.invoiceDate?.toLocaleDateString("en-IN") ?? "Date pending"}` : "Invoice number will appear after mock payment success."}
                </p>
              </div>
            </div>
          </Panel>

          <CustomerDocumentList title="Fulfilment / Proof Documents" documents={customerDocuments} />

          <CustomerChecklistMilestones title="Fulfilment Milestones" milestones={checklistMilestones} />

          {customerAssignments.length > 0 ? (
            <Panel>
              <h2 className="text-xl font-semibold text-omd-brown">Operations Update</h2>
              <div className="mt-4 grid gap-3">
                {customerAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm text-omd-muted">
                    <p className="font-semibold text-omd-brown">{statusLabel(assignment.status)}</p>
                    <p className="mt-1">{assignment.customerVisibleNote}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Cancellation, Return & Refund Requests</h2>
            {order.requests.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {order.requests.map((request) => (
                  <div key={request.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-omd-brown">
                        {statusLabel(request.requestType)} request {request.orderItem ? `for ${request.orderItem.titleSnapshot}` : "for order"}
                      </p>
                      <StatusBadge tone={statusTone(request.status)}>{statusLabel(request.status)}</StatusBadge>
                    </div>
                    <p className="mt-2 text-omd-muted">Reason: {request.reason}</p>
                    {request.customerNote ? <p className="mt-1 text-omd-muted">Your note: {request.customerNote}</p> : null}
                    {request.adminDecisionNote ? <p className="mt-1 text-omd-muted">Admin note: {request.adminDecisionNote}</p> : null}
                    <p className="mt-2 text-xs text-omd-muted">
                      {request.status === "submitted"
                        ? "Next step: OMD operations will review this request."
                        : request.status === "under_review"
                          ? "Next step: Request is under review."
                          : request.status === "approved"
                            ? "Next step: Approved as mock/admin decision. No gateway refund is executed yet."
                            : request.status === "rejected"
                              ? "Request was rejected. Please contact support if needed."
                              : "Request is closed."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-omd-muted">No cancellation, return, or refund request has been raised for this order.</p>
            )}

            {canRequest ? (
              <form action={createOrderRequestAction} className="mt-5 grid gap-3 rounded-md border border-omd-sand bg-white p-4">
                <input type="hidden" name="orderId" value={order.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="requestType" required className="h-10 rounded-md border border-omd-sand px-3 text-sm">
                    {canCancel ? <option value="cancel">Cancellation request</option> : null}
                    {canReturn ? <option value="return">Return request</option> : null}
                    {canRefund ? <option value="refund">Refund request</option> : null}
                  </select>
                  <select name="orderItemId" className="h-10 rounded-md border border-omd-sand px-3 text-sm">
                    <option value="">Whole order</option>
                    {order.items.map((item) => (
                      <option key={item.id} value={item.id}>{item.titleSnapshot}</option>
                    ))}
                  </select>
                </div>
                <select name="reason" required className="h-10 rounded-md border border-omd-sand px-3 text-sm">
                  <option value="">Choose reason</option>
                  <option value="Changed my mind">Changed my mind</option>
                  <option value="Ordered by mistake">Ordered by mistake</option>
                  <option value="Delivery concern">Delivery concern</option>
                  <option value="Item issue">Item issue</option>
                  <option value="Need help from support">Need help from support</option>
                </select>
                <textarea name="customerNote" rows={3} placeholder="Optional note for OMD operations" className="rounded-md border border-omd-sand px-3 py-2 text-sm" />
                <button className="w-fit rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
                  Submit request
                </button>
                <p className="text-xs leading-5 text-omd-muted">This creates a support request only. No real payment refund, courier pickup, wallet reversal, or notification is triggered.</p>
              </form>
            ) : (
              <p className="mt-4 rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm text-omd-muted">
                Requests are not available for this order state.
              </p>
            )}
          </Panel>

          {order.membershipSubscriptions.length > 0 ? (
            <Panel>
              <h2 className="text-xl font-semibold text-omd-brown">Membership</h2>
              <div className="mt-4 grid gap-3">
                {order.membershipSubscriptions.map((membership) => (
                  <div key={membership.id} className="rounded-md border border-omd-sand bg-omd-ivory/30 p-4 text-sm text-omd-muted">
                    <p className="font-semibold text-omd-brown">{statusLabel(membership.status)}</p>
                    <p className="mt-1">
                      Active from {membership.startsAt.toLocaleDateString("en-IN")} to {membership.endsAt.toLocaleDateString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          <Panel>
            <h2 className="text-xl font-semibold text-omd-brown">Timeline</h2>
            <div className="mt-4 grid gap-3">
              <div className="rounded-md border border-omd-sand bg-omd-ivory/30 p-3 text-sm">
                <p className="font-semibold text-omd-brown">Order created</p>
                <p className="mt-1 text-omd-muted">{order.createdAt.toLocaleString("en-IN")}</p>
              </div>
              {order.activities.map((activity) => (
                <div key={activity.id} className="rounded-md border border-omd-sand bg-white p-3 text-sm">
                  <p className="font-semibold text-omd-brown">{statusLabel(activity.type)}</p>
                  <p className="mt-1 text-omd-muted">{activity.message}</p>
                  <p className="mt-1 text-xs text-omd-muted">{activity.createdAt.toLocaleString("en-IN")}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="h-fit lg:sticky lg:top-6">
          <h2 className="text-xl font-semibold text-omd-brown">Totals</h2>
          <div className="mt-4 grid gap-3">
            <SummaryRow label="Subtotal" value={formatMoney(order.subtotalAmount, order.currency)} />
            <SummaryRow label="Discount" value={formatMoney(order.discountAmount, order.currency)} />
            {order.couponCode ? <SummaryRow label="Coupon" value={order.couponCode} /> : null}
            {order.offerRedemptions.map((redemption) => (
              <SummaryRow
                key={redemption.id}
                label={redemption.code ? `${redemption.offerRule.title} (${redemption.code})` : redemption.offerRule.title}
                value={
                  Number(redemption.discountAmount) > 0
                    ? `-${formatMoney(redemption.discountAmount, order.currency)}`
                    : `${formatMoney(redemption.cashbackAmount, order.currency)} promised`
                }
              />
            ))}
            {Number(order.cashbackPromiseAmount) > 0 ? (
              <SummaryRow label="Cashback promised" value={formatMoney(order.cashbackPromiseAmount, order.currency)} />
            ) : null}
            <SummaryRow label="Shipping" value={formatMoney(order.shippingAmount, order.currency)} />
            <SummaryRow label="Tax" value={formatMoney(order.taxAmount, order.currency)} />
            {Number(order.taxableAmount) > 0 ? <SummaryRow label="Taxable value" value={formatMoney(order.taxableAmount, order.currency)} /> : null}
            <div className="border-t border-omd-sand pt-3">
              <SummaryRow label="Total" value={formatMoney(order.totalAmount, order.currency)} strong />
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}
