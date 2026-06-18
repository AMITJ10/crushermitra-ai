"use client";

import { FormEvent, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Landmark, QrCode, Smartphone } from "lucide-react";
import { createActivatedSubscription, planDefinitions, type PlanCode } from "../../../lib/plans";

type PaymentMethod = "card" | "net_banking" | "upi" | "upi_autopay";
type CheckoutStep = "checkout" | "failure" | "success";

const paymentMethods: Array<{ icon: typeof Smartphone; label: string; value: PaymentMethod }> = [
  { icon: Smartphone, label: "UPI", value: "upi" },
  { icon: Smartphone, label: "UPI Autopay", value: "upi_autopay" },
  { icon: CreditCard, label: "Credit/Debit Card", value: "card" },
  { icon: Landmark, label: "Net Banking", value: "net_banking" }
];

const upiApps = ["Google Pay", "PhonePe", "Paytm", "BHIM", "Any UPI app"];
const banks = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank"];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function BillingClient() {
  const [selectedPlan, setSelectedPlan] = useState<PlanCode>("starter");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("upi");
  const [upiApp, setUpiApp] = useState(upiApps[0]!);
  const [bank, setBank] = useState(banks[0]!);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("checkout");
  const [acceptedMandate, setAcceptedMandate] = useState(false);
  const [status, setStatus] = useState("");
  const plan = planDefinitions.find((item) => item.code === selectedPlan) ?? planDefinitions[0]!;
  const razorpayConfigured = Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const upiUri = useMemo(
    () =>
      `upi://pay?pa=merchant@upi&pn=CrusherMitra%20AI&am=${plan.price}&cu=INR&tn=${encodeURIComponent(`${plan.name} Plan`)}`,
    [plan.name, plan.price]
  );

  async function openCheckout() {
    setStatus("");
    if (razorpayConfigured) {
      await openRazorpayCheckout();
      return;
    }

    setCheckoutStep("checkout");
    setCheckoutOpen(true);
  }

  async function openRazorpayCheckout() {
    try {
      await loadRazorpayScript();
      const orderResponse = await fetch("/api/v1/billing/razorpay/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planCode: selectedPlan })
      });
      const order = (await orderResponse.json()) as { id?: string; error?: string };
      if (!orderResponse.ok || !order.id) {
        throw new Error(order.error ?? "Unable to create payment order.");
      }

      const checkout = new window.Razorpay!({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: plan.price * 100,
        currency: "INR",
        name: "CrusherMitra AI",
        description: `${plan.name} Plan`,
        order_id: order.id,
        method: {
          card: paymentMethod === "card",
          netbanking: paymentMethod === "net_banking",
          upi: paymentMethod === "upi" || paymentMethod === "upi_autopay"
        },
        handler: async (response: Record<string, string>) => {
          const verify = await fetch("/api/v1/billing/razorpay/verify", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(response)
          });
          if (!verify.ok) {
            setCheckoutStep("failure");
            setCheckoutOpen(true);
            return;
          }
          activatePlan("Razorpay", response.razorpay_payment_id ?? order.id ?? `razorpay-${Date.now()}`);
        },
        modal: {
          ondismiss: () => {
            setCheckoutStep("failure");
            setCheckoutOpen(true);
          }
        }
      });
      checkout.open();
    } catch (error) {
      setCheckoutStep("failure");
      setStatus(error instanceof Error ? error.message : "Payment could not be started.");
      setCheckoutOpen(true);
    }
  }

  function completeSandboxPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (paymentMethod === "upi_autopay" && !acceptedMandate) {
      setStatus("UPI Autopay requires mandate permission from the account owner.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const reference = String(form.get("reference") ?? `${paymentMethod}-${Date.now()}`);
    activatePlan(labelForMethod(paymentMethod), reference);
  }

  function activatePlan(methodLabel: string, paymentReference: string) {
    const profile = readLocalJson<Record<string, string>>("crushermitra_profile") ?? {};
    const paymentRecord = {
      id: crypto.randomUUID(),
      userName: profile.name ?? "Local user",
      userEmail: profile.email ?? "local-user@crushermitra.local",
      companyName: profile.companyName ?? "",
      planCode: selectedPlan,
      planName: plan.name,
      amount: plan.price,
      paymentMethod: methodLabel,
      paymentReference,
      paymentStatus: "paid",
      paidAt: new Date().toISOString(),
      provider: methodLabel === "Razorpay" ? "razorpay" : "local_gateway"
    };
    const records = readLocalJson<Array<typeof paymentRecord>>("crushermitra_payment_records") ?? [];
    const subscription = createActivatedSubscription(selectedPlan, methodLabel);
    window.localStorage.setItem("crushermitra_subscription", JSON.stringify(subscription));
    window.localStorage.setItem("crushermitra_payment_record", JSON.stringify(paymentRecord));
    window.localStorage.setItem("crushermitra_payment_records", JSON.stringify([paymentRecord, ...records]));
    window.localStorage.setItem(
      "crushermitra_platform_user",
      JSON.stringify({
        name: paymentRecord.userName,
        email: paymentRecord.userEmail,
        companyName: paymentRecord.companyName,
        currentPlan: plan.name,
        paymentStatus: "paid",
        activatedAt: paymentRecord.paidAt
      })
    );
    setCheckoutStep("success");
    setCheckoutOpen(true);
    setStatus("Payment successful. Your plan is active for 30 days.");
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 pb-24 lg:grid-cols-[1fr_380px] lg:pb-8">
      <div className="grid gap-4">
        {planDefinitions.map((item) => (
          <article className={`border bg-white p-5 ${selectedPlan === item.code ? "border-cyan-700" : "border-slate-200"}`} key={item.code}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-xl font-black">{item.name}</h2>
                <p className="mt-2 text-2xl font-black text-cyan-800">{item.priceLabel}</p>
                <p className="mt-2 text-sm text-slate-600">
                  Orders: {item.orderLimit ?? "Unlimited"} / Dispatch: {item.dispatchLimit ?? "Unlimited"} / Users: {item.userLimit ?? "Configured"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.features.map((feature) => (
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700" key={feature}>
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-bold text-white"
                onClick={() => {
                  setSelectedPlan(item.code);
                  setStatus(`${item.name} selected. Continue to payment to activate access.`);
                }}
                type="button"
              >
                {selectedPlan === item.code ? <CheckCircle2 size={16} /> : null}
                Choose Plan
              </button>
            </div>
          </article>
        ))}
      </div>
      <aside className="grid content-start gap-4 border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black">Payment method</h2>
        <p className="text-sm text-slate-600">
          Selected plan: <strong>{plan.name}</strong> - Rs. {plan.price.toLocaleString("en-IN")}
        </p>
        {paymentMethods.map(({ icon: Icon, label, value }) => (
          <button
            className={`flex min-h-12 items-center gap-3 rounded-md border px-3 text-left text-sm font-semibold ${
              paymentMethod === value ? "border-cyan-700 bg-cyan-50 text-cyan-900" : "border-slate-200"
            }`}
            key={value}
            onClick={() => setPaymentMethod(value)}
            type="button"
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
        {status ? <div className="border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-900">{status}</div> : null}
        <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white" onClick={() => void openCheckout()} type="button">
          Proceed to secure payment
        </button>
        <p className="text-xs leading-5 text-slate-500">
          Live Razorpay Checkout is used when Razorpay keys are configured. Otherwise this screen shows a local sandbox checkout for development only.
        </p>
      </aside>

      {checkoutOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-5 shadow-xl">
            {checkoutStep === "failure" ? (
              <PaymentFailure onClose={() => setCheckoutOpen(false)} />
            ) : checkoutStep === "success" ? (
              <PaymentSuccess onClose={() => setCheckoutOpen(false)} />
            ) : (
              <form className="grid gap-4" onSubmit={(event) => completeSandboxPayment(event)}>
                <div>
                  <h2 className="text-xl font-black">Secure payment</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {plan.name} Plan - Rs. {plan.price.toLocaleString("en-IN")}
                  </p>
                </div>
                {paymentMethod === "upi" ? (
                  <UpiPayment upiApp={upiApp} setUpiApp={setUpiApp} upiUri={upiUri} />
                ) : null}
                {paymentMethod === "upi_autopay" ? (
                  <UpiAutopay accepted={acceptedMandate} setAccepted={setAcceptedMandate} upiUri={upiUri} />
                ) : null}
                {paymentMethod === "card" ? <CardPayment /> : null}
                {paymentMethod === "net_banking" ? <NetBanking bank={bank} setBank={setBank} /> : null}
                <input name="reference" type="hidden" value={`${paymentMethod}-${Date.now()}`} />
                <div className="flex gap-2">
                  <button className="min-h-11 flex-1 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white" type="submit">
                    Confirm payment
                  </button>
                  <button className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-bold" onClick={() => setCheckoutOpen(false)} type="button">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function UpiPayment({ setUpiApp, upiApp, upiUri }: { setUpiApp: (value: string) => void; upiApp: string; upiUri: string }) {
  return (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm font-semibold text-slate-700">
        Choose UPI app
        <select className="min-h-11 rounded-md border border-slate-300 px-3" onChange={(event) => setUpiApp(event.target.value)} value={upiApp}>
          {upiApps.map((app) => <option key={app}>{app}</option>)}
        </select>
      </label>
      <div className="grid place-items-center rounded-md border border-slate-200 bg-slate-50 p-5 text-center">
        <QrCode size={92} />
        <p className="mt-3 text-sm font-bold">Scan or open with {upiApp}</p>
        <a className="mt-2 break-all text-xs font-semibold text-cyan-800" href={upiUri}>{upiUri}</a>
        <p className="mt-2 text-xs text-slate-500">Amount is locked in the payment intent.</p>
      </div>
    </div>
  );
}

function UpiAutopay({ accepted, setAccepted, upiUri }: { accepted: boolean; setAccepted: (value: boolean) => void; upiUri: string }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
        <h3 className="font-black">UPI Autopay mandate</h3>
        <p className="mt-2 text-sm text-slate-600">The account owner must approve the recurring mandate in their UPI app before access is activated.</p>
        <a className="mt-3 inline-flex rounded-md border border-slate-300 px-3 py-2 text-sm font-bold" href={upiUri}>Open UPI mandate</a>
      </div>
      <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
        <input checked={accepted} className="mt-1" onChange={(event) => setAccepted(event.target.checked)} type="checkbox" />
        I confirm the UPI account owner has approved this autopay mandate.
      </label>
    </div>
  );
}

function CardPayment() {
  return (
    <div className="grid gap-3">
      <input className="min-h-11 rounded-md border border-slate-300 px-3" inputMode="numeric" maxLength={19} placeholder="Card number" required />
      <div className="grid grid-cols-2 gap-3">
        <input className="min-h-11 rounded-md border border-slate-300 px-3" placeholder="MM/YY" required />
        <input className="min-h-11 rounded-md border border-slate-300 px-3" inputMode="numeric" maxLength={4} placeholder="CVV" required />
      </div>
      <input className="min-h-11 rounded-md border border-slate-300 px-3" placeholder="Name on card" required />
      <p className="text-xs text-slate-500">Live card entry is handled by Razorpay Checkout when configured.</p>
    </div>
  );
}

function NetBanking({ bank, setBank }: { bank: string; setBank: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      Select bank
      <select className="min-h-11 rounded-md border border-slate-300 px-3" onChange={(event) => setBank(event.target.value)} value={bank}>
        {banks.map((item) => <option key={item}>{item}</option>)}
      </select>
    </label>
  );
}

function PaymentFailure({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-black text-red-700">Payment failed</h2>
      <p className="text-sm text-slate-700">Your plan was not activated. Please check the payment app, card details, or bank authorization and try again.</p>
      <button className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-bold text-white" onClick={onClose} type="button">Close</button>
    </div>
  );
}

function PaymentSuccess({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid gap-4">
      <h2 className="text-xl font-black text-cyan-800">Payment successful</h2>
      <p className="text-sm text-slate-700">Your selected plan is active for 30 days. Admin reports and profile cards will reflect this payment.</p>
      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white" onClick={onClose} type="button">Done</button>
    </div>
  );
}

function labelForMethod(method: PaymentMethod): string {
  if (method === "upi") return "UPI";
  if (method === "upi_autopay") return "UPI Autopay";
  if (method === "card") return "Credit/Debit Card";
  return "Net Banking";
}

function readLocalJson<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Razorpay Checkout."));
    document.body.appendChild(script);
  });
}
