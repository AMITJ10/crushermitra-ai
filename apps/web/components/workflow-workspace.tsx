"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Plus, RefreshCcw, Trash2 } from "lucide-react";
import type { SubscriptionSnapshot } from "../lib/plans";

type WorkflowResource = "orders" | "dispatches" | "operations" | "billing";
type ReferenceResource = "customers" | "customerSites" | "products" | "vehicles" | "drivers" | "machines" | "storageLocations";
type FieldType = "date" | "number" | "select" | "text" | "textarea";

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  referenceResource?: ReferenceResource | "orders";
}

interface WorkflowConfig {
  resource: WorkflowResource;
  title: string;
  missingMasterData: string;
  columns: string[];
  fields: FieldConfig[];
  filters: FieldConfig[];
}

interface ListResult {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
}

const pageSize = 10;

const configs: Record<WorkflowResource, WorkflowConfig> = {
  orders: {
    resource: "orders",
    title: "Orders",
    missingMasterData: "Please add customers, customer sites and products from Master Data first.",
    columns: ["orderNumber", "customerName", "productName", "quantity", "unit", "rate", "totalAmount", "paidAmount", "balanceAmount", "status"],
    fields: [
      ref("customerId", "Customer", "customers", true),
      ref("customerSiteId", "Site", "customerSites"),
      ref("productId", "Product/material", "products", true),
      number("quantity", "Quantity", true),
      text("unit", "Unit", true),
      number("rate", "Rate", true),
      number("paidAmount", "Paid amount"),
      date("orderDate", "Order date", true),
      date("expectedDispatchDate", "Expected dispatch date"),
      select("status", "Status", ["draft", "confirmed", "approved", "ready", "completed", "cancelled"], true),
      textarea("notes", "Notes")
    ],
    filters: [
      date("fromDate", "From date"),
      date("toDate", "To date"),
      ref("customerId", "Customer", "customers"),
      ref("productId", "Product/material", "products"),
      select("status", "Status", ["draft", "confirmed", "approved", "ready", "completed", "cancelled"])
    ]
  },
  dispatches: {
    resource: "dispatches",
    title: "Dispatch",
    missingMasterData: "Please add customers, vehicles, drivers and products from Master Data first.",
    columns: ["dispatchNumber", "orderNumber", "customerName", "sourceStorageLocationName", "vehicleNumber", "quantity", "netWeight", "rate", "dispatchAmount", "paidAmount", "balanceAmount", "paymentStatus", "status"],
    fields: [
      ref("orderId", "Order", "orders"),
      ref("customerId", "Customer", "customers", true),
      ref("customerSiteId", "Site", "customerSites"),
      ref("vehicleId", "Vehicle", "vehicles"),
      ref("driverId", "Driver", "drivers"),
      ref("productId", "Material/product", "products", true),
      ref("sourceStorageLocationId", "Source stock location", "storageLocations", true),
      number("quantity", "Quantity", true),
      text("unit", "Unit", true),
      date("dispatchDate", "Dispatch date", true),
      number("firstWeight", "First weight", true),
      number("secondWeight", "Second weight", true),
      number("rate", "Rate per unit"),
      select("paymentStatus", "Payment status", ["pending", "partial", "paid", "failed"]),
      number("paidAmount", "Paid amount"),
      select("status", "Status", ["draft", "ready", "dispatched", "delivered", "cancelled"], true),
      text("deliveryChallanNumber", "Delivery challan number"),
      textarea("notes", "Notes")
    ],
    filters: [
      date("fromDate", "From date"),
      date("toDate", "To date"),
      ref("customerId", "Customer", "customers"),
      ref("vehicleId", "Vehicle", "vehicles"),
      ref("driverId", "Driver", "drivers"),
      ref("sourceStorageLocationId", "Source stock location", "storageLocations"),
      select("status", "Status", ["draft", "ready", "dispatched", "delivered", "cancelled"])
    ]
  },
  operations: {
    resource: "operations",
    title: "Operations",
    missingMasterData: "Please add products and machines from Master Data first.",
    columns: ["operationNumber", "operationType", "productName", "machineName", "quantity", "unit", "productionCost", "materialCost", "machineCost", "status"],
    fields: [
      select("operationType", "Operation type", ["crusher_shift_run", "rmc_batch", "stock_movement", "quality_check", "machine_downtime", "approval"], true),
      ref("productId", "Material/product", "products"),
      ref("machineId", "Machine", "machines"),
      number("quantity", "Quantity"),
      text("unit", "Unit"),
      number("productionCost", "Production cost"),
      number("materialCost", "Material cost"),
      number("machineCost", "Machine/downtime cost"),
      date("operationDate", "Operation date", true),
      select("status", "Status", ["draft", "pending", "approved", "completed", "cancelled"], true),
      textarea("notes", "Notes")
    ],
    filters: [
      date("fromDate", "From date"),
      date("toDate", "To date"),
      select("operationType", "Operation type", ["crusher_shift_run", "rmc_batch", "stock_movement", "quality_check", "machine_downtime", "approval"]),
      select("status", "Status", ["draft", "pending", "approved", "completed", "cancelled"]),
      ref("productId", "Material/product", "products")
    ]
  },
  billing: {
    resource: "billing",
    title: "Billing",
    missingMasterData: "Please add customers from Master Data first.",
    columns: ["invoiceNumber", "customerName", "billingDate", "dueDate", "amount", "planAmount", "paymentAmount", "paymentMethod", "paymentStatus", "status"],
    fields: [
      ref("customerId", "Customer", "customers", true),
      text("invoiceNumber", "Invoice number", true),
      date("billingDate", "Billing date", true),
      date("dueDate", "Due date"),
      number("amount", "Amount", true),
      number("planAmount", "Plan amount"),
      number("paymentAmount", "Payment amount"),
      select("paymentMethod", "Payment method", ["upi", "upi_autopay", "debit_card", "credit_card", "net_banking", "bank_transfer"]),
      select("paymentStatus", "Payment status", ["pending", "paid", "failed"]),
      select("status", "Status", ["draft", "sent", "paid", "overdue", "cancelled"], true),
      textarea("notes", "Notes")
    ],
    filters: [
      date("fromDate", "From date"),
      date("toDate", "To date"),
      ref("customerId", "Customer", "customers"),
      select("status", "Status", ["draft", "sent", "paid", "overdue", "cancelled"])
    ]
  }
};

export function WorkflowWorkspace({ readOnly = false, resource }: { readOnly?: boolean; resource: WorkflowResource }) {
  const config = configs[resource];
  const [rows, setRows] = useState<ListResult>({ rows: [], total: 0, page: 1, pageSize });
  const [references, setReferences] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [form, setForm] = useState<Record<string, string>>(createEmptyForm(config));
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [subscription, setSubscription] = useState<SubscriptionSnapshot | null>(null);

  const exportUrl = useMemo(() => {
    const params = createQuery(search, filters, 1);
    params.set("pageSize", "100");
    params.set("export", "csv");
    return `/api/v1/workflows/${resource}?${params.toString()}`;
  }, [filters, resource, search]);

  useEffect(() => {
    void loadReferences(config);
    void loadRows();
    const stored = window.localStorage.getItem("crushermitra_subscription");
    if (stored) {
      setSubscription(JSON.parse(stored) as SubscriptionSnapshot);
    }
  }, [resource, page]);

  useEffect(() => {
    setForm(createEmptyForm(config));
    setFilters({});
    setSearch("");
    setEditingId(null);
  }, [resource]);

  async function loadRows(nextSearch = search, nextFilters = filters) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/workflows/${resource}?${createQuery(nextSearch, nextFilters, page).toString()}`, {
        cache: "no-store"
      });
      const body = (await response.json()) as ListResult | { error: string };
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? body.error : "Unable to load records");
      }
      setRows(body);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load records");
    } finally {
      setLoading(false);
    }
  }

  async function loadReferences(nextConfig: WorkflowConfig) {
    const referenceNames = Array.from(
      new Set(nextConfig.fields.concat(nextConfig.filters).map((field) => field.referenceResource).filter(Boolean))
    ) as Array<ReferenceResource | "orders">;
    const next: Record<string, Array<Record<string, unknown>>> = {};

    for (const name of referenceNames) {
      const url = name === "orders" ? "/api/v1/workflows/orders?page=1&pageSize=100" : `/api/v1/master-data/${name}?page=1&pageSize=100`;
      try {
        const response = await fetch(url, { cache: "no-store" });
        const body = (await response.json()) as ListResult | { error: string };
        next[name] = response.ok && !("error" in body) ? body.rows : [];
      } catch {
        next[name] = [];
      }
    }

    setReferences(next);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    const accessError = getPlanAccessError(resource, subscription, rows.total);
    if (!editingId && accessError) {
      setMessage(accessError);
      return;
    }

    const error = validateForm(config, form);
    if (error) {
      setMessage(error);
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(
        editingId ? `/api/v1/workflows/${resource}/${editingId}` : `/api/v1/workflows/${resource}`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(stripEmpty(form))
        }
      );
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to save record");
      }
      setMessage(editingId ? "Record updated successfully." : "Record created successfully.");
      setForm(createEmptyForm(config));
      setEditingId(null);
      await loadRows();
    } catch (saveError) {
      setMessage(saveError instanceof Error ? saveError.message : "Unable to save record");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow(row: Record<string, unknown>) {
    const id = String(row.id ?? "");
    if (!id || !window.confirm("Delete this record?")) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/v1/workflows/${resource}/${id}`, { method: "DELETE" });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to delete record");
      }
      setMessage("Record deleted.");
      await loadRows();
    } catch (deleteError) {
      setMessage(deleteError instanceof Error ? deleteError.message : "Unable to delete record");
    } finally {
      setSaving(false);
    }
  }

  function editRow(row: Record<string, unknown>) {
    setEditingId(String(row.id ?? ""));
    setForm(createFormFromRow(config, row));
    setMessage(`Editing ${String(row[config.columns[0] ?? "id"] ?? "record")}.`);
  }

  const missingData = hasMissingRequiredReferences(config, references);

  return (
    <section className={`mx-auto grid max-w-7xl gap-5 px-4 py-5 pb-24 ${readOnly ? "" : "xl:grid-cols-[minmax(0,1fr)_380px]"} lg:pb-8`}>
      <div className="grid content-start gap-4">
        <div className="border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-bold">{config.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{loading ? "Loading records..." : `${rows.total} records`}</p>
            </div>
            <div className="flex gap-2">
              <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" href={exportUrl}>
                <Download size={16} />
                Export CSV
              </a>
              <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" onClick={() => void loadRows()} type="button">
                <RefreshCcw size={16} />
                Refresh
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <input
              className="min-h-11 rounded-md border border-slate-300 px-3 text-sm"
              onChange={(event) => {
                setSearch(event.target.value);
                void loadRows(event.target.value, filters);
              }}
              placeholder="Search"
              type="search"
              value={search}
            />
            {config.filters.map((field) => (
              <InputField
                field={field}
                key={field.key}
                onChange={(value) => {
                  const next = { ...filters, [field.key]: value };
                  setFilters(next);
                  void loadRows(search, next);
                }}
                references={references}
                value={filters[field.key] ?? ""}
              />
            ))}
          </div>
        </div>

        {message ? <div className="border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">{message}</div> : null}
        {missingData ? <div className="border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">{config.missingMasterData}</div> : null}

        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                {config.columns.map((column) => (
                  <th className="px-4 py-3" key={column}>{label(column)}</th>
                ))}
                {readOnly ? null : <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={config.columns.length + (readOnly ? 0 : 1)}>
                    No data available yet. Add records from Master Data.
                  </td>
                </tr>
              ) : null}
              {rows.rows.map((row) => (
                <tr className="border-t border-slate-200" key={String(row.id)}>
                  {config.columns.map((column) => (
                    <td className="px-4 py-3" key={column}>{format(row[column])}</td>
                  ))}
                  {readOnly ? null : (
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button className="rounded-md border border-slate-300 p-2" onClick={() => editRow(row)} title="Edit" type="button">
                          <Pencil size={16} />
                        </button>
                        <button className="rounded-md border border-slate-300 p-2" onClick={() => void deleteRow(row)} title="Delete" type="button">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <button className="rounded-md border border-slate-300 px-3 py-2 disabled:opacity-50" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} type="button">Previous</button>
            <span>Page {page}</span>
            <button className="rounded-md border border-slate-300 px-3 py-2 disabled:opacity-50" disabled={rows.rows.length < pageSize} onClick={() => setPage((current) => current + 1)} type="button">Next</button>
          </div>
        </div>
      </div>

      {readOnly ? null : (
      <form className="grid content-start gap-3 border border-slate-200 bg-white p-4" onSubmit={(event) => void submit(event)}>
        <h2 className="text-lg font-bold">{editingId ? "Edit record" : `Create ${config.title.slice(0, -1)}`}</h2>
        {config.fields.map((field) => (
          <InputField
            field={field}
            key={field.key}
            onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))}
            references={references}
            value={form[field.key] ?? ""}
          />
        ))}
        {resource === "dispatches" ? (
          <p className="text-sm text-slate-600">
            Net weight: {Number(form.secondWeight || 0) - Number(form.firstWeight || 0)}
          </p>
        ) : null}
        <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white disabled:opacity-60" disabled={saving} type="submit">
          <Plus size={16} />
          {saving ? "Saving..." : "Save"}
        </button>
        <button className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-bold" disabled={saving} onClick={() => {
          setEditingId(null);
          setForm(createEmptyForm(config));
        }} type="button">
          Cancel
        </button>
      </form>
      )}
    </section>
  );
}

function getPlanAccessError(resource: WorkflowResource, subscription: SubscriptionSnapshot | null, currentCount: number): string | undefined {
  if (!subscription) {
    return undefined;
  }
  if (resource === "operations" && subscription.planCode === "starter") {
    return "Operations is available on Growth and Enterprise plans. Please upgrade your plan.";
  }
  if (resource === "orders" && subscription.ordersLimit !== null && currentCount >= subscription.ordersLimit) {
    return "Monthly limit reached. Please upgrade your plan.";
  }
  if (resource === "dispatches" && subscription.dispatchLimit !== null && currentCount >= subscription.dispatchLimit) {
    return "Monthly limit reached. Please upgrade your plan.";
  }
  return undefined;
}

function InputField({ field, onChange, references, value }: {
  field: FieldConfig;
  onChange: (value: string) => void;
  references: Record<string, Array<Record<string, unknown>>>;
  value: string;
}) {
  const baseClass = "min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";

  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      <span>{field.label}{field.required ? <span className="text-red-600"> *</span> : null}</span>
      {field.referenceResource ? (
        <select className={baseClass} onChange={(event) => onChange(event.target.value)} required={field.required} value={value}>
          <option value="">Select {field.label.toLowerCase()}</option>
          {(references[field.referenceResource] ?? []).map((row) => (
            <option key={String(row.id)} value={String(row.id)}>
              {referenceLabel(row)}
            </option>
          ))}
        </select>
      ) : field.type === "select" ? (
        <select className={baseClass} onChange={(event) => onChange(event.target.value)} required={field.required} value={value}>
          <option value="">Select</option>
          {(field.options ?? []).map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
        </select>
      ) : field.type === "textarea" ? (
        <textarea className={`${baseClass} min-h-24 py-2`} onChange={(event) => onChange(event.target.value)} value={value} />
      ) : (
        <input className={baseClass} onChange={(event) => onChange(event.target.value)} required={field.required} step={field.type === "number" ? "any" : undefined} type={field.type} value={value} />
      )}
    </label>
  );
}

function createQuery(search: string, filters: Record<string, string>, page: number): URLSearchParams {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search.trim()) params.set("search", search.trim());
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  return params;
}

function createEmptyForm(config: WorkflowConfig): Record<string, string> {
  const today = new Date().toISOString().slice(0, 10);
  const form: Record<string, string> = {};
  for (const field of config.fields) {
    if (field.type === "date") form[field.key] = today;
    else if (field.key === "status") form[field.key] = field.options?.[0] ?? "";
    else form[field.key] = "";
  }
  return form;
}

function createFormFromRow(config: WorkflowConfig, row: Record<string, unknown>): Record<string, string> {
  const form = createEmptyForm(config);
  for (const field of config.fields) {
    const value = row[field.key];
    if (value !== null && value !== undefined) form[field.key] = String(value).slice(0, field.type === "date" ? 10 : undefined);
  }
  return form;
}

function validateForm(config: WorkflowConfig, form: Record<string, string>): string | undefined {
  for (const field of config.fields) {
    if (field.required && !form[field.key]) return `${field.label} is required.`;
  }
  return undefined;
}

function hasMissingRequiredReferences(config: WorkflowConfig, references: Record<string, Array<Record<string, unknown>>>): boolean {
  return config.fields.some((field) => field.required && field.referenceResource && (references[field.referenceResource] ?? []).length === 0);
}

function stripEmpty(form: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
}

function ref(key: string, labelText: string, referenceResource: ReferenceResource | "orders", required = false): FieldConfig {
  return { key, label: labelText, type: "select", referenceResource, required };
}

function text(key: string, labelText: string, required = false): FieldConfig {
  return { key, label: labelText, type: "text", required };
}

function number(key: string, labelText: string, required = false): FieldConfig {
  return { key, label: labelText, type: "number", required };
}

function date(key: string, labelText: string, required = false): FieldConfig {
  return { key, label: labelText, type: "date", required };
}

function textarea(key: string, labelText: string, required = false): FieldConfig {
  return { key, label: labelText, type: "textarea", required };
}

function select(key: string, labelText: string, options: string[], required = false): FieldConfig {
  return { key, label: labelText, type: "select", options, required };
}

function label(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function format(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function referenceLabel(row: Record<string, unknown>): string {
  return String(
    row.orderNumber ??
      row.code ??
      row.legalName ??
      row.siteName ??
      row.name ??
      row.registrationNumber ??
      row.invoiceNumber ??
      row.id
  );
}
