"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  simulateMockPaymentCancelAction,
  simulateMockPaymentFailureAction,
  simulateMockPaymentSuccessAction,
  startMockPaymentAction
} from "@/lib/payment-actions";
import { statusLabel, statusTone } from "@/lib/status-labels";
import { StatusBadge } from "@/components/ui";

type PaymentAttemptSummary = {
  id: string;
  provider: string;
  providerOrderId: string;
  amount: unknown;
  currency: string;
  status: string;
  attemptNo: number;
  createdAt: string;
};

const methods = [
  { key: "upi", label: "UPI", detail: "omdivya@mock" },
  { key: "card", label: "Card", detail: "4111 xxxx xxxx 1111" },
  { key: "netbanking", label: "Netbanking", detail: "Mock bank redirect" },
  { key: "wallet", label: "Wallet", detail: "Coming later", disabled: true }
];

function formatAmount(value: unknown, currency = "INR") {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function PaymentSubmitButton({
  children,
  className
}: {
  children: string;
  className: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:cursor-not-allowed disabled:opacity-70`}>
      {pending ? "Processing..." : children}
    </button>
  );
}

export function MockPaymentPanel({
  orderId,
  orderNumber,
  orderStatus,
  paymentStatus,
  latestAttempt,
  redirectTo,
  customerName,
  customerEmail,
  autoOpen = false,
  result,
  admin = false
}: {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  latestAttempt?: PaymentAttemptSummary | null;
  redirectTo: string;
  customerName?: string | null;
  customerEmail?: string | null;
  autoOpen?: boolean;
  result?: string;
  admin?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen && Boolean(latestAttempt && ["created", "pending"].includes(latestAttempt.status)));
  const [method, setMethod] = useState("upi");
  const hasPendingAttempt = latestAttempt && ["created", "pending"].includes(latestAttempt.status);
  const canStart = paymentStatus !== "succeeded" && orderStatus !== "cancelled" && !hasPendingAttempt;
  const success = paymentStatus === "succeeded" || result === "success";
  const failed = paymentStatus === "failed" || result === "failed";
  const cancelled = paymentStatus === "cancelled" || result === "cancelled";
  const startRedirect = `${redirectTo}?pay=1`;

  return (
    <section className={`rounded-lg border p-4 ${admin ? "border-slate-200 bg-slate-50" : "border-omd-gold bg-omd-ivory/30"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className={`text-lg font-semibold ${admin ? "text-slate-950" : "text-omd-brown"}`}>Payment</h2>
          <p className={`mt-1 text-sm leading-6 ${admin ? "text-slate-600" : "text-omd-muted"}`}>
            Mock gateway events are processed on the backend, like a real payment provider integration.
          </p>
        </div>
        <StatusBadge tone={statusTone(paymentStatus)}>Payment {statusLabel(paymentStatus)}</StatusBadge>
      </div>

      {success ? (
        <div className="mt-4 rounded-md border border-green-100 bg-green-50 p-3 text-sm text-omd-success">
          <p className="font-semibold">Payment successful</p>
          <p className="mt-1">Your order is confirmed and inventory has been finalized.</p>
        </div>
      ) : null}
      {failed || cancelled ? (
        <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3 text-sm text-omd-error">
          <p className="font-semibold">{failed ? "Payment failed" : "Payment cancelled"}</p>
          <p className="mt-1">Reserved stock was released. You can retry while items remain available.</p>
        </div>
      ) : null}

      {latestAttempt ? (
        <div className="mt-4 rounded-md border border-white/70 bg-white p-3 text-sm">
          <p className="font-semibold">Attempt #{latestAttempt.attemptNo}</p>
          <p className="mt-1 text-slate-600">
            {latestAttempt.providerOrderId} - {statusLabel(latestAttempt.status)} - {formatAmount(latestAttempt.amount, latestAttempt.currency)}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {canStart ? (
          <form action={startMockPaymentAction}>
            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="redirectTo" value={startRedirect} />
            <PaymentSubmitButton className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron">
              {paymentStatus === "not_started" ? "Pay now" : "Retry payment"}
            </PaymentSubmitButton>
          </form>
        ) : null}
        {hasPendingAttempt ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-omd-brown px-4 py-2 text-sm font-semibold text-white hover:bg-omd-saffron"
          >
            Open mock gateway
          </button>
        ) : null}
      </div>

      {open && hasPendingAttempt ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 py-6">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl">
            <div className="border-b border-omd-sand bg-omd-brown px-5 py-4 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-omd-gold">OMDivyaDarshan Mock Gateway</p>
                  <h3 className="mt-1 text-xl font-semibold">Complete payment</h3>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-white/30 px-3 py-1 text-sm hover:border-omd-gold">
                  Close
                </button>
              </div>
            </div>

            <div className="grid gap-5 p-5">
              <div className="rounded-lg border border-omd-sand bg-omd-ivory/40 p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Order</p>
                    <p className="mt-1 font-semibold text-omd-brown">{orderNumber}</p>
                    {customerName || customerEmail ? (
                      <p className="mt-1 text-sm text-omd-muted">
                        {[customerName, customerEmail].filter(Boolean).join(" - ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-omd-saffron">Amount</p>
                    <p className="mt-1 text-2xl font-semibold text-omd-brown">{formatAmount(latestAttempt.amount, latestAttempt.currency)}</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-omd-brown">Choose payment method</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {methods.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      disabled={item.disabled}
                      onClick={() => setMethod(item.key)}
                      className={`rounded-md border px-3 py-3 text-left text-sm ${
                        method === item.key ? "border-omd-gold bg-omd-ivory text-omd-brown" : "border-omd-sand bg-white text-omd-muted"
                      } disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <span className="block font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs">{item.detail}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-dashed border-omd-sand bg-omd-ivory/40 p-3 text-sm text-omd-muted">
                This is a mock gateway. Every result below posts a backend event and the order is updated only after the server processes it.
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <form action={simulateMockPaymentSuccessAction}>
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="paymentAttemptId" value={latestAttempt.id} />
                  <input type="hidden" name="redirectTo" value={`${redirectTo}?paymentResult=success`} />
                  <PaymentSubmitButton className="w-full rounded-md bg-omd-success px-3 py-2 text-sm font-semibold text-white hover:opacity-90">
                    Simulate Success
                  </PaymentSubmitButton>
                </form>
                <form action={simulateMockPaymentFailureAction}>
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="paymentAttemptId" value={latestAttempt.id} />
                  <input type="hidden" name="redirectTo" value={`${redirectTo}?paymentResult=failed`} />
                  <PaymentSubmitButton className="w-full rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                    Simulate Failure
                  </PaymentSubmitButton>
                </form>
                <form action={simulateMockPaymentCancelAction}>
                  <input type="hidden" name="orderId" value={orderId} />
                  <input type="hidden" name="paymentAttemptId" value={latestAttempt.id} />
                  <input type="hidden" name="redirectTo" value={`${redirectTo}?paymentResult=cancelled`} />
                  <PaymentSubmitButton className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancel Payment
                  </PaymentSubmitButton>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
