"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, RefreshCcw } from "lucide-react";
import type { SubscriptionSnapshot } from "../../../lib/plans";

type ReportType = "all" | "sales" | "production" | "dispatch" | "receivables" | "payments";

interface ListResult {
  rows: Array<Record<string, unknown>>;
}

interface ReportFilters {
  customerId: string;
  driverId: string;
  fromDate: string;
  productId: string;
  reportType: ReportType;
  search: string;
  status: string;
  toDate: string;
  vehicleId: string;
}

interface ReportRow {
  amount: number;
  customerName: string;
  date: string;
  productName: string;
  quantity: number;
  source: string;
  status: string;
  unit: string;
  vehicleNumber: string;
}

const defaultFilters: ReportFilters = {
  customerId: "",
  driverId: "",
  fromDate: "",
  productId: "",
  reportType: "all",
  search: "",
  status: "",
  toDate: "",
  vehicleId: ""
};

const reportTypes: Array<{ label: string; value: ReportType }> = [
  { label: "All reports", value: "all" },
  { label: "Sales report", value: "sales" },
  { label: "Production report", value: "production" },
  { label: "Dispatch report", value: "dispatch" },
  { label: "Receivables report", value: "receivables" },
  { label: "Payment report", value: "payments" }
];

const chartColors = ["#0891b2", "#16a34a", "#f59e0b", "#7c3aed", "#dc2626", "#2563eb"];

export function ReportsClient() {
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);
  const [customers, setCustomers] = useState<Array<Record<string, unknown>>>([]);
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [vehicles, setVehicles] = useState<Array<Record<string, unknown>>>([]);
  const [drivers, setDrivers] = useState<Array<Record<string, unknown>>>([]);
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [dispatches, setDispatches] = useState<Array<Record<string, unknown>>>([]);
  const [operations, setOperations] = useState<Array<Record<string, unknown>>>([]);
  const [billing, setBilling] = useState<Array<Record<string, unknown>>>([]);
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const allowed = true;

  useEffect(() => {
    const stored = window.localStorage.getItem("crushermitra_subscription");
    if (stored) setSubscription(JSON.parse(stored) as SubscriptionSnapshot);
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      const [nextCustomers, nextProducts, nextVehicles, nextDrivers, nextOrders, nextDispatches, nextOperations, nextBilling] =
        await Promise.all([
          fetchRows("/api/v1/master-data/customers?page=1&pageSize=100"),
          fetchRows("/api/v1/master-data/products?page=1&pageSize=100"),
          fetchRows("/api/v1/master-data/vehicles?page=1&pageSize=100"),
          fetchRows("/api/v1/master-data/drivers?page=1&pageSize=100"),
          fetchRows("/api/v1/workflows/orders?page=1&pageSize=100"),
          fetchRows("/api/v1/workflows/dispatches?page=1&pageSize=100"),
          fetchRows("/api/v1/workflows/operations?page=1&pageSize=100"),
          fetchRows("/api/v1/workflows/billing?page=1&pageSize=100")
        ]);
      setCustomers(nextCustomers);
      setProducts(nextProducts);
      setVehicles(nextVehicles);
      setDrivers(nextDrivers);
      setOrders(nextOrders);
      setDispatches(nextDispatches);
      setOperations(nextOperations);
      setBilling(nextBilling);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load reports.");
    } finally {
      setLoading(false);
    }
  }

  const reportRows = useMemo(
    () => filterRows(createReportRows(orders, dispatches, operations, billing, customers, products, vehicles), filters),
    [billing, customers, dispatches, filters, operations, orders, products, vehicles]
  );
  const customerSales = useMemo(() => groupRows(reportRows.filter((row) => row.source === "Order"), "customerName", "amount"), [reportRows]);
  const monthlySales = useMemo(() => groupRows(reportRows.filter((row) => row.source === "Order" || row.source === "Invoice"), "month", "amount"), [reportRows]);
  const dispatchQuantity = useMemo(() => groupRows(reportRows.filter((row) => row.source === "Dispatch"), "productName", "quantity"), [reportRows]);
  const productionQuantity = useMemo(() => groupRows(reportRows.filter((row) => row.source === "Operation"), "productName", "quantity"), [reportRows]);
  const totals = useMemo(() => calculateTotals(reportRows), [reportRows]);

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function exportCsv() {
    if (!allowed) return;
    window.location.href = `/api/v1/reports/export?${createExportQuery(filters, "csv").toString()}`;
  }

  function exportPdf() {
    if (!allowed) return;
    window.location.href = `/api/v1/reports/export?${createExportQuery(filters, "pdf").toString()}`;
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-6 pb-24 lg:pb-8">
      {subscription && subscription.planCode === "starter" ? (
        <div className="border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          Reports and PDF export are Growth features. Upgrade from Billing to export reports.
        </div>
      ) : null}
      {message ? <div className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</div> : null}

      <div className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-4">
        <DateField label="From date" onChange={(value) => updateFilter("fromDate", value)} value={filters.fromDate} />
        <DateField label="To date" onChange={(value) => updateFilter("toDate", value)} value={filters.toDate} />
        <SelectField label="Customer" onChange={(value) => updateFilter("customerId", value)} rows={customers} value={filters.customerId} />
        <SelectField label="Product/material" onChange={(value) => updateFilter("productId", value)} rows={products} value={filters.productId} />
        <SelectField label="Vehicle" labelKey="registrationNumber" onChange={(value) => updateFilter("vehicleId", value)} rows={vehicles} value={filters.vehicleId} />
        <SelectField label="Driver" onChange={(value) => updateFilter("driverId", value)} rows={drivers} value={filters.driverId} />
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Status
          <select className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => updateFilter("status", event.target.value)} value={filters.status}>
            <option value="">All</option>
            {["draft", "approved", "completed", "dispatched", "delivered", "pending", "paid", "overdue", "cancelled"].map((status) => (
              <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Report type
          <select className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => updateFilter("reportType", event.target.value as ReportType)} value={filters.reportType}>
            {reportTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
          Search
          <input
            className="min-h-11 rounded-md border border-slate-300 px-3 text-sm"
            onChange={(event) => updateFilter("search", event.target.value)}
            placeholder="Search customer, product, status or vehicle"
            type="search"
            value={filters.search}
          />
        </label>
        <div className="flex flex-wrap items-end gap-2 md:col-span-2">
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold" onClick={() => void loadData()} type="button">
            <RefreshCcw size={16} />
            Refresh
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold disabled:opacity-50" disabled={!allowed} onClick={exportCsv} type="button">
            <Download size={16} />
            Export CSV
          </button>
          <button className="inline-flex min-h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-bold disabled:opacity-50" disabled={!allowed} onClick={exportPdf} type="button">
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Sales value" prefix="Rs. " value={totals.salesAmount} />
        <Metric label="Dispatch quantity" suffix=" t" value={totals.dispatchQuantity} />
        <Metric label="Crusher production" suffix=" t" value={totals.crusherProduction} />
        <Metric label="RMC production" suffix=" m3" value={totals.rmcProduction} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard groups={customerSales} title="Customer-wise sales" type="pie" />
        <ChartCard groups={monthlySales} title="Monthly sales trend" type="line" />
        <ChartCard groups={dispatchQuantity} title="Dispatch quantity by product" type="bar" />
        <ChartCard groups={productionQuantity} title="Production quantity" type="bar" />
      </div>

      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {["Date", "Source", "Customer", "Product/material", "Vehicle", "Quantity", "Amount", "Status"].map((header) => (
                <th className="px-4 py-3" key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={8}>Loading reports...</td></tr>
            ) : reportRows.length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={8}>No data available yet. Add records from Master Data.</td></tr>
            ) : (
              reportRows.map((row, index) => (
                <tr className="border-t border-slate-200" key={`${row.source}-${row.date}-${index}`}>
                  <td className="px-4 py-3">{row.date || "-"}</td>
                  <td className="px-4 py-3">{row.source}</td>
                  <td className="px-4 py-3">{row.customerName || "-"}</td>
                  <td className="px-4 py-3">{row.productName || "-"}</td>
                  <td className="px-4 py-3">{row.vehicleNumber || "-"}</td>
                  <td className="px-4 py-3">{row.quantity ? `${row.quantity.toLocaleString("en-IN")} ${row.unit}` : "-"}</td>
                  <td className="px-4 py-3">{row.amount ? `Rs. ${row.amount.toLocaleString("en-IN")}` : "-"}</td>
                  <td className="px-4 py-3">{row.status || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function fetchRows(url: string): Promise<Array<Record<string, unknown>>> {
  const response = await fetch(url, { cache: "no-store" });
  const body = (await response.json()) as ListResult | { error?: string };
  if (!response.ok || "error" in body || !("rows" in body)) {
    throw new Error("error" in body ? body.error ?? "Unable to load data" : "Unable to load data");
  }
  return body.rows;
}

function createReportRows(
  orders: Array<Record<string, unknown>>,
  dispatches: Array<Record<string, unknown>>,
  operations: Array<Record<string, unknown>>,
  billing: Array<Record<string, unknown>>,
  customers: Array<Record<string, unknown>>,
  products: Array<Record<string, unknown>>,
  vehicles: Array<Record<string, unknown>>
): ReportRow[] {
  const customerById = new Map(customers.map((row) => [String(row.id), referenceLabel(row)]));
  const productById = new Map(products.map((row) => [String(row.id), referenceLabel(row)]));
  const vehicleById = new Map(vehicles.map((row) => [String(row.id), referenceLabel(row, "registrationNumber")]));

  return [
    ...orders.map((row) => ({
      amount: number(row.totalAmount),
      customerName: string(row.customerName) || customerById.get(String(row.customerId)) || "",
      date: dateString(row.orderDate ?? row.createdAt),
      productName: string(row.productName) || productById.get(String(row.productId)) || "",
      quantity: number(row.quantity),
      source: "Order",
      status: string(row.status),
      unit: string(row.unit),
      vehicleNumber: ""
    })),
    ...dispatches.map((row) => ({
      amount: number(row.dispatchAmount),
      customerName: string(row.customerName) || customerById.get(String(row.customerId)) || "",
      date: dateString(row.dispatchDate ?? row.createdAt),
      productName: string(row.productName) || productById.get(String(row.productId)) || "",
      quantity: number(row.quantity || row.netWeight),
      source: "Dispatch",
      status: string(row.status),
      unit: string(row.unit) || "t",
      vehicleNumber: string(row.vehicleNumber) || vehicleById.get(String(row.vehicleId)) || ""
    })),
    ...operations.map((row) => ({
      amount: number(row.productionCost),
      customerName: "",
      date: dateString(row.operationDate ?? row.createdAt),
      productName: string(row.productName) || productById.get(String(row.productId)) || string(row.operationType),
      quantity: number(row.quantity),
      source: "Operation",
      status: string(row.status || row.operationType),
      unit: string(row.unit),
      vehicleNumber: ""
    })),
    ...billing.map((row) => ({
      amount: number(row.amount),
      customerName: string(row.customerName) || customerById.get(String(row.customerId)) || "",
      date: dateString(row.billingDate ?? row.createdAt),
      productName: string(row.invoiceNumber),
      quantity: 0,
      source: "Invoice",
      status: string(row.paymentStatus || row.status),
      unit: "",
      vehicleNumber: ""
    }))
  ].sort((a, b) => b.date.localeCompare(a.date));
}

function filterRows(rows: ReportRow[], filters: ReportFilters): ReportRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.fromDate && row.date < filters.fromDate) return false;
    if (filters.toDate && row.date > filters.toDate) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.reportType === "sales" && row.source !== "Order") return false;
    if (filters.reportType === "production" && row.source !== "Operation") return false;
    if (filters.reportType === "dispatch" && row.source !== "Dispatch") return false;
    if (filters.reportType === "receivables" && !(row.source === "Invoice" && row.status !== "paid")) return false;
    if (filters.reportType === "payments" && !(row.source === "Invoice" && row.status === "paid")) return false;
    if (filters.customerId && !row.customerName.toLowerCase().includes(filters.customerId.toLowerCase())) return false;
    if (filters.productId && !row.productName.toLowerCase().includes(filters.productId.toLowerCase())) return false;
    if (filters.vehicleId && !row.vehicleNumber.toLowerCase().includes(filters.vehicleId.toLowerCase())) return false;
    if (search && !Object.values(row).some((value) => String(value).toLowerCase().includes(search))) return false;
    return true;
  });
}

function calculateTotals(rows: ReportRow[]) {
  const operationRows = rows.filter((row) => row.source === "Operation");
  return {
    crusherProduction: sum(operationRows.filter((row) => row.unit.toLowerCase() === "t" || row.productName.toLowerCase().includes("aggregate")), "quantity"),
    dispatchQuantity: sum(rows.filter((row) => row.source === "Dispatch"), "quantity"),
    rmcProduction: sum(operationRows.filter((row) => row.unit.toLowerCase() === "m3" || row.productName.toLowerCase().includes("rmc")), "quantity"),
    salesAmount: sum(rows.filter((row) => row.source === "Order" || row.source === "Invoice"), "amount")
  };
}

function groupRows(rows: ReportRow[], key: "customerName" | "month" | "productName", metric: "amount" | "quantity") {
  const groups = new Map<string, number>();
  for (const row of rows) {
    const label = key === "month" ? row.date.slice(0, 7) || "Unknown" : row[key] || "Unknown";
    groups.set(label, (groups.get(label) ?? 0) + row[metric]);
  }
  return Array.from(groups.entries())
    .map(([label, value]) => ({ label, value }))
    .filter((item) => item.value > 0)
    .slice(0, 6);
}

function Metric({ label, prefix = "", suffix = "", value }: { label: string; prefix?: string; suffix?: string; value: number }) {
  return (
    <article className="border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{prefix}{value.toLocaleString("en-IN")}{suffix}</p>
    </article>
  );
}

function ChartCard({ groups, title, type }: { groups: Array<{ label: string; value: number }>; title: string; type: "bar" | "line" | "pie" }) {
  const max = Math.max(...groups.map((group) => group.value), 1);
  const total = groups.reduce((sumValue, group) => sumValue + group.value, 0);
  const pieStops = groups.reduce(
    (state, group, index) => {
      const start = state.offset;
      const end = start + (group.value / Math.max(total, 1)) * 100;
      state.parts.push(`${chartColors[index % chartColors.length]} ${start}% ${end}%`);
      state.offset = end;
      return state;
    },
    { offset: 0, parts: [] as string[] }
  );

  return (
    <article className="border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <BarChart3 size={18} />
        <h2 className="font-black">{title}</h2>
      </div>
      {groups.length === 0 ? (
        <div className="mt-5 grid h-44 place-items-center rounded-md bg-slate-50 text-sm font-semibold text-slate-500">
          No data available yet. Add records from Master Data.
        </div>
      ) : type === "pie" ? (
        <div className="mt-5 grid gap-4 rounded-md bg-slate-50 p-5 md:grid-cols-[160px_1fr]">
          <div className="size-36 rounded-full" style={{ background: `conic-gradient(${pieStops.parts.join(",")})` }} />
          <Legend groups={groups} />
        </div>
      ) : (
        <div className="mt-5 rounded-md bg-slate-50 p-4">
          <div className="flex h-40 items-end gap-3">
            {groups.map((group, index) => (
              <div className="grid flex-1 gap-2" key={group.label}>
                <span
                  className="rounded-t"
                  style={{ backgroundColor: chartColors[index % chartColors.length], height: `${Math.max(6, (group.value / max) * 100)}%` }}
                  title={`${group.label}: ${group.value.toLocaleString("en-IN")}`}
                />
              </div>
            ))}
          </div>
          <Legend groups={groups} />
        </div>
      )}
    </article>
  );
}

function Legend({ groups }: { groups: Array<{ label: string; value: number }> }) {
  return (
    <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-700">
      {groups.map((group, index) => (
        <div className="flex items-center justify-between gap-3" key={group.label}>
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-3 rounded-sm" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
            <span className="truncate">{group.label}</span>
          </span>
          <span>{group.value.toLocaleString("en-IN")}</span>
        </div>
      ))}
    </div>
  );
}

function SelectField({
  label,
  labelKey,
  onChange,
  rows,
  value
}: {
  label: string;
  labelKey?: string;
  onChange: (value: string) => void;
  rows: Array<Record<string, unknown>>;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <select className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => onChange(event.target.value)} value={value}>
        <option value="">All</option>
        {rows.map((row) => (
          <option key={String(row.id)} value={referenceLabel(row, labelKey)}>{referenceLabel(row, labelKey)}</option>
        ))}
      </select>
    </label>
  );
}

function DateField({ label, onChange, value }: { label: string; onChange: (value: string) => void; value: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      {label}
      <input className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" onChange={(event) => onChange(event.target.value)} type="date" value={value} />
    </label>
  );
}

function createExportQuery(filters: ReportFilters, format: "csv" | "pdf"): URLSearchParams {
  const params = new URLSearchParams({ format, reportType: filters.reportType });
  for (const [key, value] of Object.entries(filters)) {
    if (value && key !== "search") {
      params.set(key, value);
    }
  }
  return params;
}

function referenceLabel(row: Record<string, unknown>, preferred?: string): string {
  return string(
    (preferred ? row[preferred] : undefined) ??
      row.legalName ??
      row.siteName ??
      row.name ??
      row.registrationNumber ??
      row.code ??
      row.invoiceNumber ??
      row.id
  );
}

function dateString(value: unknown): string {
  return value ? String(value).slice(0, 10) : "";
}

function number(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function string(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function sum(rows: ReportRow[], key: "amount" | "quantity"): number {
  return rows.reduce((total, row) => total + row[key], 0);
}
