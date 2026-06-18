"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeadRecord, LeadStatus } from "../../../lib/leads-store";

const statuses: LeadStatus[] = ["new", "contacted", "interested", "converted", "not_interested"];

export function AdminLeadsClient() {
  const [rows, setRows] = useState<LeadRecord[]>([]);
  const [message, setMessage] = useState("");

  const exportHref = useMemo(() => {
    const headers = ["Name", "Email", "Phone", "Company", "Status", "First Visit", "Last Visit"];
    const lines = rows.map((row) =>
      [row.name, row.email, row.phone, row.company, row.status, row.firstVisitAt, row.lastVisitAt].map(csv).join(",")
    );
    return `data:text/csv;charset=utf-8,${encodeURIComponent([headers.join(","), ...lines].join("\n"))}`;
  }, [rows]);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const response = await fetch("/api/v1/leads", { cache: "no-store" });
    const body = (await response.json()) as { rows?: LeadRecord[]; error?: string };
    if (!response.ok) {
      setMessage(body.error ?? "Unable to load leads");
      return;
    }
    setRows(body.rows ?? []);
  }

  async function update(id: string, patch: { notes?: string; status?: LeadStatus }) {
    const response = await fetch(`/api/v1/leads/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (response.ok) await load();
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this lead?")) return;
    const response = await fetch(`/api/v1/leads/${id}`, { method: "DELETE" });
    if (response.ok) await load();
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
      <div className="flex items-center justify-between border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-600">{rows.length} leads</p>
        <a className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold" download="crushermitra-leads.csv" href={exportHref}>
          Export leads
        </a>
      </div>
      {message ? <div className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</div> : null}
      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {["Lead", "Company", "Status", "Visits", "Last visit", "Notes", "Actions"].map((heading) => (
                <th className="px-4 py-3" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>No data available yet. Add records from Master Data.</td>
              </tr>
            ) : null}
            {rows.map((lead) => (
              <tr className="border-t border-slate-200" key={lead.id}>
                <td className="px-4 py-3">
                  <strong>{lead.name || "-"}</strong>
                  <p className="text-xs text-slate-500">{lead.email || "-"} / {lead.phone || "-"}</p>
                </td>
                <td className="px-4 py-3">{lead.company || "-"}</td>
                <td className="px-4 py-3">
                  <select className="min-h-10 rounded-md border border-slate-300 px-2" onChange={(event) => void update(lead.id, { status: event.target.value as LeadStatus })} value={lead.status}>
                    {statuses.map((status) => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">{lead.visitCount}</td>
                <td className="px-4 py-3">{new Date(lead.lastVisitAt).toLocaleString("en-IN")}</td>
                <td className="px-4 py-3">
                  <input className="min-h-10 rounded-md border border-slate-300 px-2" defaultValue={lead.notes ?? ""} onBlur={(event) => void update(lead.id, { notes: event.target.value })} placeholder="Add notes" />
                </td>
                <td className="px-4 py-3">
                  <button className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold" onClick={() => void remove(lead.id)} type="button">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function csv(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
