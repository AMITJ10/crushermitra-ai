"use client";

import { useEffect, useState } from "react";

interface DashboardSummary {
  cards: Record<string, number>;
  recentActivity: Array<Record<string, unknown>>;
  aiAlerts: Array<Record<string, unknown>>;
  receivablesFormula?: string;
  receivablesEstimated?: boolean;
}

const cardLabels: Array<[string, string, string]> = [
  ["totalCustomers", "Total customers", ""],
  ["activeOrders", "Total active orders", ""],
  ["todayDispatchQuantity", "Today dispatch quantity", "t"],
  ["pendingDispatches", "Pending dispatches", ""],
  ["crusherProduction", "Crusher production", "t"],
  ["rmcProduction", "RMC production", "m3"],
  ["receivables", "Receivables", "Rs."],
  ["pendingApprovals", "Pending approvals", ""]
];

export function DashboardClient({ locale }: { locale: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const response = await fetch("/api/v1/dashboard/summary", { cache: "no-store" });
        const body = (await response.json()) as DashboardSummary | { error: string };
        if (!response.ok || "error" in body) {
          throw new Error("error" in body ? body.error : "Unable to load dashboard");
        }
        setSummary(body);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    void loadSummary();
  }, []);

  if (loading) {
    return (
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 xl:grid-cols-4">
        {cardLabels.map(([key]) => (
          <div className="h-28 animate-pulse border border-slate-200 bg-white" key={key} />
        ))}
      </section>
    );
  }

  if (error) {
    return <DashboardMessage message={error} />;
  }

  const cards = summary?.cards ?? {};
  const hasData = Object.values(cards).some((value) => Number(value) > 0);

  return (
    <div className="pb-24 lg:pb-8">
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:grid-cols-2 xl:grid-cols-4">
        {cardLabels.map(([key, label, suffix]) => (
          <article className="border border-slate-200 bg-white p-4" key={key}>
            <p className="text-sm font-semibold text-slate-500">{label}</p>
            <p className="mt-3 text-2xl font-bold" title={key === "receivables" ? summary?.receivablesFormula : undefined}>
              {suffix === "Rs." ? "Rs. " : ""}
              {Number(cards[key] ?? 0).toLocaleString("en-IN")}
              {suffix && suffix !== "Rs." ? ` ${suffix}` : ""}
            </p>
            {key === "receivables" ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {summary?.receivablesFormula}
                {summary?.receivablesEstimated ? " (estimated)" : ""}
              </p>
            ) : null}
          </article>
        ))}
      </section>

      {!hasData ? (
        <section className="mx-auto max-w-7xl px-4">
          <div className="border border-slate-200 bg-white p-6">
            <p className="text-sm font-semibold text-slate-700">
              No data available yet. Add records from Master Data.
            </p>
            <a
              className="mt-4 inline-flex min-h-10 items-center rounded-md bg-cyan-700 px-4 text-sm font-bold text-white"
              href={`/${locale}/master-data`}
            >
              Add Master Data
            </a>
          </div>
        </section>
      ) : null}

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-2">
        <DashboardPanel title="Order trend" value={Number(cards.activeOrders ?? 0)} />
        <DashboardPanel title="Dispatch trend" value={Number(cards.pendingDispatches ?? 0)} />
        <DashboardPanel title="Production summary" value={Number(cards.crusherProduction ?? 0) + Number(cards.rmcProduction ?? 0)} />
        <DashboardPanel title="Customer-wise order summary" value={Number(cards.totalCustomers ?? 0)} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 lg:grid-cols-2">
        <ActivityList title="Recent activity" rows={summary?.recentActivity ?? []} />
        <ActivityList title="AI alerts/recommendations" rows={summary?.aiAlerts ?? []} />
      </section>
    </div>
  );
}

function DashboardPanel({ title, value }: { title: string; value: number }) {
  const width = Math.min(100, Math.max(4, value));
  return (
    <article className="border border-slate-200 bg-white p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-4 h-3 rounded bg-slate-100">
        <div className="h-3 rounded bg-cyan-700" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-600">{value.toLocaleString("en-IN")} records or quantity units</p>
    </article>
  );
}

function ActivityList({ rows, title }: { rows: Array<Record<string, unknown>>; title: string }) {
  return (
    <article className="border border-slate-200 bg-white p-4">
      <h2 className="font-bold">{title}</h2>
      <div className="mt-3 grid gap-2">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No data available yet. Add records from Master Data.</p>
        ) : (
          rows.slice(0, 4).map((row, index) => (
            <div className="rounded-md border border-slate-200 p-3 text-sm" key={String(row.id ?? index)}>
              <p className="font-semibold text-slate-800">{describeActivity(row)}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(row.createdAt)}</p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function describeActivity(row: Record<string, unknown>): string {
  const eventType = String(row.eventType ?? "Activity");
  const entityType = String(row.entityType ?? "record").replaceAll("_", " ");
  const value = typeof row.newValue === "object" && row.newValue !== null ? (row.newValue as Record<string, unknown>) : {};
  const customer = String(value.customerName ?? value.legalName ?? "");
  const product = String(value.productName ?? "");
  const vehicle = String(value.vehicleNumber ?? "");
  const quantity = value.quantity ? `${String(value.quantity)} ${String(value.unit ?? "")}`.trim() : "";

  if (eventType.includes("orders.create")) {
    return `New order created${customer ? ` for ${customer}` : ""}${product ? ` - ${product}` : ""}${quantity ? ` - ${quantity}` : ""}`;
  }
  if (eventType.includes("dispatches")) {
    return `Dispatch updated${vehicle ? ` for Vehicle ${vehicle}` : ""}${quantity ? ` - ${quantity}` : ""}`;
  }
  if (eventType.includes("billing")) {
    return `Payment or invoice activity recorded${value.amount ? ` - Rs. ${Number(value.amount).toLocaleString("en-IN")}` : ""}`;
  }
  return `${eventType.replaceAll(".", " ")} on ${entityType}`;
}

function formatDateTime(value: unknown): string {
  if (!value) return "";
  return new Date(String(value)).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function DashboardMessage({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div>
    </section>
  );
}
