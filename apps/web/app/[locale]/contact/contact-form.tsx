"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const form = event.currentTarget;
    const response = await fetch("/api/v1/leads", {
      method: "POST",
      body: new FormData(form)
    });
    const body = (await response.json()) as { message?: string; error?: string };
    setMessage(response.ok ? body.message ?? "Thank you. Our team will contact you soon." : body.error ?? "Unable to submit contact request.");
    if (response.ok) form.reset();
    setSubmitting(false);
  }

  return (
    <form className="grid gap-3" onSubmit={(event) => void submit(event)}>
      {message ? <div className="border border-cyan-200 bg-cyan-50 p-3 text-sm font-bold text-cyan-900">{message}</div> : null}
      {["name", "email", "phone", "company"].map((name) => (
        <input className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" key={name} name={name} placeholder={name[0]!.toUpperCase() + name.slice(1)} required={name !== "company"} type={name === "email" ? "email" : "text"} />
      ))}
      <select className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" name="selectedPlanInterest">
        <option value="">Plan interest</option>
        <option value="starter">Starter</option>
        <option value="growth">Growth</option>
        <option value="enterprise">Enterprise</option>
      </select>
      <textarea className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-sm" name="message" placeholder="Message" />
      <input name="pageVisited" type="hidden" value="/contact" />
      <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white disabled:opacity-60" disabled={submitting} type="submit">
        {submitting ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
}
