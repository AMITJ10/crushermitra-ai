"use client";

import { FormEvent, useEffect, useState } from "react";
import { daysRemaining, type SubscriptionSnapshot } from "../../../lib/plans";
import { DistrictSelect, PinCodeInput, StateSelect, defaultPinCodeByDistrict } from "../../../components/india-location-selects";

interface ProfileClientProps {
  initial: Record<string, string>;
  locale: string;
}

export function ProfileClient({ initial, locale }: ProfileClientProps) {
  const [profile, setProfile] = useState(initial);
  const [saved, setSaved] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("crushermitra_profile");
    if (stored) {
      const parsed = JSON.parse(stored) as Record<string, string>;
      setProfile((current) =>
        Object.fromEntries(Object.keys(current).map((key) => [key, parsed[key] ?? current[key] ?? ""]))
      );
    }
    const storedSubscription = window.localStorage.getItem("crushermitra_subscription");
    if (storedSubscription) {
      setSubscription(JSON.parse(storedSubscription) as SubscriptionSnapshot);
    }
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem("crushermitra_profile", JSON.stringify(profile));
    setSaved("Profile saved locally.");
  }

  return (
    <section className="mx-auto grid max-w-5xl gap-4 px-4 py-6 pb-24 lg:pb-8">
      <form className="grid gap-4 border border-slate-200 bg-white p-5" onSubmit={submit}>
        <h2 className="text-xl font-black">Personal details</h2>
        {saved ? <div className="border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">{saved}</div> : null}
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(profile).map(([key, value]) => (
            <label className="grid gap-1 text-sm font-semibold text-slate-700" key={key}>
              {label(key)}
              {key === "state" ? (
                <StateSelect
                  onChange={(nextState) =>
                    setProfile((current) => ({
                      ...current,
                      state: nextState,
                      district: "",
                      pinCode: ""
                    }))
                  }
                  value={value}
                />
              ) : key === "district" ? (
                <DistrictSelect
                  onChange={(nextDistrict) =>
                    setProfile((current) => ({
                      ...current,
                      district: nextDistrict,
                      pinCode: defaultPinCodeByDistrict[nextDistrict] ?? current.pinCode ?? ""
                    }))
                  }
                  state={profile.state ?? "Maharashtra"}
                  value={value}
                />
              ) : key === "pinCode" ? (
                <PinCodeInput
                  onChange={(nextPin) => setProfile((current) => ({ ...current, pinCode: nextPin }))}
                  value={value}
                />
              ) : (
                <input
                  className="min-h-11 rounded-md border border-slate-300 px-3 text-sm"
                  onChange={(event) => setProfile((current) => ({ ...current, [key]: event.target.value }))}
                  value={value}
                />
              )}
            </label>
          ))}
        </div>
        <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white" type="submit">
          Save profile
        </button>
      </form>
      <section className="grid gap-4 border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Plan and subscription</h2>
            <p className="mt-1 text-sm text-slate-600">
              {subscription ? "Your current plan details are read-only here." : "No active plan. Please choose a plan."}
            </p>
          </div>
          <a className="inline-flex min-h-11 items-center justify-center rounded-md bg-slate-950 px-4 text-sm font-bold text-white" href={`/${locale}/billing`}>
            Upgrade Plan
          </a>
        </div>
        {subscription ? (
          <div className="grid gap-3 md:grid-cols-3">
            <PlanCard label="Current Plan" value={subscription.planName} />
            <PlanCard label="Plan Price" value={subscription.planPrice} />
            <PlanCard label="Plan Status" value={subscription.status} />
            <PlanCard label="Valid From" value={formatDate(subscription.validFrom)} />
            <PlanCard label="Valid Until" value={formatDate(subscription.validUntil)} />
            <PlanCard label="Days Remaining" value={String(daysRemaining(subscription.validUntil))} />
            <PlanCard label="Orders Used / Orders Limit" value={`${subscription.ordersUsed} / ${subscription.ordersLimit ?? "Unlimited"}`} />
            <PlanCard label="Dispatch Used / Dispatch Limit" value={`${subscription.dispatchUsed} / ${subscription.dispatchLimit ?? "Unlimited"}`} />
            <PlanCard label="Payment Status" value={`${subscription.paymentStatus} via ${subscription.paymentMethod}`} />
          </div>
        ) : null}
      </section>
    </section>
  );
}

function PlanCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 break-words text-lg font-black text-slate-950">{value}</p>
    </article>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function label(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}
