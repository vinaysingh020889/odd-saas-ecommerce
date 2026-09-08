"use client";
import { useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { beginRazorpayCheckout, verifyRazorpayCheckout, checkRazorpayCheckout, type RazorpayCheckoutSubject } from "@/lib/razorpay-actions";

type Callback = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = { key: string; order_id: string; amount: number; currency: string; name: string; description: string; prefill: { name?: string; email?: string }; handler: (result: Callback) => void; modal: { ondismiss: () => void } };
declare global { interface Window { Razorpay?: new (options: CheckoutOptions) => { open: () => void; on: (name: string, callback: () => void) => void }; } }

type Props = { orderId: string; orderNumber: string; orderStatus: string; paymentStatus: string; customerName?: string | null; customerEmail?: string | null; admin?: boolean; latestAttempt?: unknown; redirectTo?: string; autoOpen?: boolean; result?: string; subjectType?: RazorpayCheckoutSubject; entityLabel?: string };

export function RazorpayPaymentPanel(props: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const opening = useRef(false);
  const subjectType = props.subjectType ?? "ORDER";
  const entityLabel = props.entityLabel ?? "order";
  const paid = props.paymentStatus === "succeeded" || props.paymentStatus === "CONFIRMED" || confirmed;
  const closed = ["cancelled", "refunded", "CANCELLED", "REFUNDED", "COMPLETED"].includes(props.orderStatus) || ["refunded", "REFUNDED"].includes(props.paymentStatus);

  function finish() {
    setConfirmed(true);
    setMessage(`Payment confirmed. Your ${entityLabel} is ready.`);
    if (props.redirectTo) router.push(props.redirectTo);
    else router.refresh();
  }
  async function check() {
    setBusy(true);
    try {
      const result = await checkRazorpayCheckout(props.orderId, subjectType);
      if (result.confirmed) finish();
      else setMessage(result.error ?? "No completed payment found yet. You can check again or resume checkout.");
    } catch { setMessage("Could not check payment. Please try again."); }
    finally { setBusy(false); }
  }
  async function pay() {
    if (opening.current || !window.Razorpay) return;
    opening.current = true; setBusy(true); setMessage("");
    let handedToCheckout = false;
    try {
      const result = await beginRazorpayCheckout(props.orderId, subjectType);
      if (!result.checkout) { setMessage(result.error ?? "Unable to start payment."); return; }
      const checkout = new window.Razorpay({ ...result.checkout, name: "OMDivyaDarshan", description: props.orderNumber,
        prefill: { name: props.customerName ?? undefined, email: props.customerEmail ?? undefined },
        handler: async (response) => {
          setBusy(true);
          try { const verified = await verifyRazorpayCheckout(response); if (verified.confirmed) finish(); else setMessage(verified.error ?? "Payment verification pending. Check payment status."); }
          catch { setMessage("Confirmation was interrupted. Check payment status before paying again."); }
          finally { opening.current = false; setBusy(false); }
        },
        modal: { ondismiss: () => { opening.current = false; setBusy(false); setMessage("Checkout closed. If you completed payment, check its status before retrying."); } }
      });
      checkout.on("payment.failed", () => setMessage("This payment attempt did not complete. You can retry inside Razorpay checkout."));
      checkout.open(); handedToCheckout = true;
    } catch { setMessage("Unable to open Razorpay. Please try again."); }
    finally { if (!handedToCheckout) { opening.current = false; setBusy(false); } }
  }

  return <section className="rounded-lg border border-omd-gold bg-omd-ivory/30 p-4">
    {!props.admin && !paid && !closed ? <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setReady(true)} onError={() => setMessage("Payment checkout could not load. Check your connection and refresh.")} /> : null}
    <h2 className="text-lg font-semibold">Payment</h2>
    <p className="mt-2 text-sm">{paid ? `Payment successful. Your ${entityLabel} is confirmed.` : closed ? `This ${entityLabel} is closed for payment.` : "Razorpay Test Mode — no real money is charged."}</p>
    {message ? <p role="status" aria-live="polite" className="mt-3 text-sm">{message}</p> : null}
    {!paid && !closed && !props.admin ? <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" disabled={!ready || busy} onClick={pay} className="rounded-md bg-omd-brown px-4 py-2 text-white disabled:opacity-50">{busy ? "Please wait…" : "Pay with Razorpay"}</button>
      <button type="button" disabled={busy} onClick={check} className="rounded-md border px-4 py-2 disabled:opacity-50">Check payment status</button>
    </div> : null}
    {props.admin && !paid && !closed ? <p className="mt-2 text-sm">Waiting for verified customer payment. Payment cannot be simulated here.</p> : null}
  </section>;
}
