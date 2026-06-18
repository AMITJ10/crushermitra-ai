"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowRightLeft, Download, Factory, Lock, RefreshCcw, ShieldCheck, Truck } from "lucide-react";

type ActionKey = "receipt" | "movement" | "production" | "dispatch" | "correction" | "closePeriod";

interface ListResult {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
}

interface ValuationResult extends ListResult {
  totalQuantityBaseUnit?: number;
  totalValue?: number;
}

const pageSize = 10;
const today = () => new Date().toISOString().slice(0, 10);

export function InventoryClient({ permissions }: { permissions: string[] }) {
  const [balances, setBalances] = useState<ListResult>({ rows: [], total: 0, page: 1, pageSize });
  const [transactions, setTransactions] = useState<ListResult>({ rows: [], total: 0, page: 1, pageSize });
  const [valuation, setValuation] = useState<ValuationResult>({ rows: [], total: 0, page: 1, pageSize });
  const [ageing, setAgeing] = useState<ListResult & { buckets?: Record<string, number> }>({ rows: [], total: 0, page: 1, pageSize });
  const [references, setReferences] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [activeAction, setActiveAction] = useState<ActionKey>("receipt");
  const [filters, setFilters] = useState({ search: "", productId: "", storageLocationId: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Record<string, string>>(emptyForm());

  const balanceExportUrl = useMemo(() => {
    const params = createQuery(filters);
    params.set("export", "csv");
    params.set("pageSize", "100");
    return `/api/v1/inventory/balances?${params.toString()}`;
  }, [filters]);

  const transactionExportUrl = useMemo(() => {
    const params = createQuery(filters);
    params.set("export", "csv");
    params.set("pageSize", "100");
    return `/api/v1/inventory/transactions?${params.toString()}`;
  }, [filters]);

  const valuationExportUrl = useMemo(() => {
    const params = createQuery(filters);
    params.set("export", "csv");
    params.set("pageSize", "100");
    return `/api/v1/inventory/valuation?${params.toString()}`;
  }, [filters]);

  const valuationPdfUrl = useMemo(() => {
    const params = createQuery(filters);
    params.set("format", "pdf");
    params.set("pageSize", "100");
    return `/api/v1/inventory/valuation?${params.toString()}`;
  }, [filters]);

  const ageingExportUrl = useMemo(() => {
    const params = createQuery(filters);
    params.set("export", "csv");
    params.set("pageSize", "100");
    return `/api/v1/inventory/ageing?${params.toString()}`;
  }, [filters]);

  const ageingPdfUrl = useMemo(() => {
    const params = createQuery(filters);
    params.set("format", "pdf");
    params.set("pageSize", "100");
    return `/api/v1/inventory/ageing?${params.toString()}`;
  }, [filters]);

  useEffect(() => {
    void loadReferences();
    void loadInventory();
  }, []);

  async function loadInventory(nextFilters = filters) {
    setLoading(true);
    setMessage("");
    try {
      const params = createQuery(nextFilters);
      const [balanceResponse, transactionResponse, valuationResponse, ageingResponse] = await Promise.all([
        fetch(`/api/v1/inventory/balances?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/v1/inventory/transactions?page=1&pageSize=${pageSize}`, { cache: "no-store" }),
        fetch(`/api/v1/inventory/valuation?${params.toString()}`, { cache: "no-store" }),
        fetch(`/api/v1/inventory/ageing?${params.toString()}`, { cache: "no-store" })
      ]);
      const balanceBody = await readJson<ListResult>(balanceResponse);
      const transactionBody = await readJson<ListResult>(transactionResponse);
      const valuationBody = await readJson<ValuationResult>(valuationResponse);
      const ageingBody = await readJson<ListResult & { buckets?: Record<string, number> }>(ageingResponse);
      setBalances(balanceBody);
      setTransactions(transactionBody);
      setValuation(valuationBody);
      setAgeing(ageingBody);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load inventory.");
    } finally {
      setLoading(false);
    }
  }

  async function loadReferences() {
    const names = ["suppliers", "products", "storageLocations", "machines"];
    const next: Record<string, Array<Record<string, unknown>>> = {};
    for (const name of names) {
      try {
        const response = await fetch(`/api/v1/master-data/${name}?page=1&pageSize=100`, { cache: "no-store" });
        const body = await readJson<ListResult>(response);
        next[name] = body.rows;
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

    const error = validate(activeAction, form);
    if (error) {
      setMessage(error);
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(actionEndpoint(activeAction), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(actionPayload(activeAction, form))
      });
      await readJson<Record<string, unknown>>(response);
      setMessage(successMessage(activeAction));
      setForm(emptyForm());
      await loadInventory();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save inventory action.");
    } finally {
      setSaving(false);
    }
  }

  const products = references.products ?? [];
  const locations = references.storageLocations ?? [];
  const canAdjustInventory = permissions.includes("inventory.adjust");

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-5 pb-32 lg:pb-8">
      <div className="grid gap-3 border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Stock balances</h2>
            <p className="mt-1 text-sm text-slate-600">{loading ? "Loading live balances..." : `${balances.total} product-location balances`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" href={balanceExportUrl}>
              <Download size={16} />
              Export balances CSV
            </a>
            <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" href={transactionExportUrl}>
              <Download size={16} />
              Export ledger CSV
            </a>
            <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" href={valuationExportUrl}>
              <Download size={16} />
              Export valuation CSV
            </a>
            <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" href={valuationPdfUrl} target="_blank">
              <Download size={16} />
              Export valuation PDF
            </a>
            <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" href={ageingExportUrl}>
              <Download size={16} />
              Export ageing CSV
            </a>
            <a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" href={ageingPdfUrl} target="_blank">
              <Download size={16} />
              Export ageing PDF
            </a>
            <button className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold" onClick={() => void loadInventory()} type="button">
              <RefreshCcw size={16} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="min-h-11 rounded-md border border-slate-300 px-3 text-sm"
            onChange={(event) => {
              const next = { ...filters, search: event.target.value };
              setFilters(next);
              void loadInventory(next);
            }}
            placeholder="Search product or location"
            type="search"
            value={filters.search}
          />
          <ReferenceSelect
            label="Product"
            onChange={(value) => {
              const next = { ...filters, productId: value };
              setFilters(next);
              void loadInventory(next);
            }}
            rows={products}
            value={filters.productId}
          />
          <ReferenceSelect
            label="Storage location"
            onChange={(value) => {
              const next = { ...filters, storageLocationId: value };
              setFilters(next);
              void loadInventory(next);
            }}
            rows={locations}
            value={filters.storageLocationId}
          />
        </div>
      </div>

      {message ? <div className="border border-cyan-200 bg-cyan-50 p-3 text-sm font-semibold text-cyan-800">{message}</div> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Metric label="Valuation rows" value={valuation.total} />
        <Metric label="Total base quantity" value={formatNumber(valuation.totalQuantityBaseUnit ?? 0)} />
        <Metric label="Inventory value" value={`Rs. ${formatNumber(valuation.totalValue ?? 0)}`} />
        <Metric label="Reserved stock" value={formatNumber(sumColumn(balances.rows, "reservedQuantityBaseUnit"))} />
        <Metric label="Available stock" value={formatNumber(sumColumn(balances.rows, "availableQuantityBaseUnit"))} />
        <Metric label="Over 90 days" value={formatNumber(ageing.buckets?.daysOver90 ?? 0)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid content-start gap-5">
          <DataTable
            columns={["productCode", "productName", "storageLocationName", "quantityBaseUnit", "baseUnit", "weightedAverageRate", "fifoValue", "valuationRate", "valuationAmount"]}
            emptyText="No inventory valuation available yet."
            rows={valuation.rows}
            title="Inventory valuation"
          />
          <DataTable
            columns={["productCode", "productName", "storageLocationName", "quantityBaseUnit", "reservedQuantityBaseUnit", "availableQuantityBaseUnit", "baseUnit", "reorderLevel", "updatedAt"]}
            emptyText="No inventory balances yet. Post a purchase receipt or production output."
            rows={balances.rows}
            title="Location balances"
          />
          <DataTable
            columns={["productCode", "productName", "storageLocationName", "quantityBaseUnit", "reservedQuantityBaseUnit", "availableQuantityBaseUnit", "ageBucket", "ageDays"]}
            emptyText="No inventory ageing data yet."
            rows={ageing.rows}
            title="Inventory ageing"
          />
          <DataTable
            columns={["transactionType", "productName", "storageLocationName", "direction", "quantityBaseUnit", "unit", "sourceType", "occurredAt"]}
            emptyText="No ledger transactions yet."
            rows={transactions.rows}
            title="Recent immutable ledger"
          />
        </div>

        {canAdjustInventory ? (
        <form className="grid content-start gap-4 border border-slate-200 bg-white p-4" onSubmit={(event) => void submit(event)}>
          <div>
            <h2 className="text-lg font-bold">Post inventory action</h2>
            <p className="mt-1 text-sm text-slate-600">Every save posts through PostgreSQL and audit logging.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {actionTabs.map((action) => (
              <button
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-2 text-sm font-bold ${
                  activeAction === action.key ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 bg-white"
                }`}
                key={action.key}
                onClick={() => {
                  setActiveAction(action.key);
                  setForm(emptyForm());
                  setMessage("");
                }}
                type="button"
              >
                <action.icon size={16} />
                {action.label}
              </button>
            ))}
          </div>

          <ActionFields action={activeAction} form={form} references={references} setForm={setForm} />

          <button className="min-h-11 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white disabled:opacity-60" disabled={saving} type="submit">
            {saving ? "Saving..." : actionSaveLabel(activeAction)}
          </button>
          <button className="min-h-11 rounded-md border border-slate-300 px-4 text-sm font-bold" disabled={saving} onClick={() => setForm(emptyForm())} type="button">
            Cancel
          </button>
        </form>
        ) : (
          <div className="grid content-start gap-3 border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold">Inventory actions</h2>
            <p className="text-sm text-slate-600">Your role can view balances, valuation and exports. Stock posting requires inventory adjustment permission.</p>
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function ActionFields({
  action,
  form,
  references,
  setForm
}: {
  action: ActionKey;
  form: Record<string, string>;
  references: Record<string, Array<Record<string, unknown>>>;
  setForm: (value: Record<string, string>) => void;
}) {
  const update = (key: string, value: string) => setForm({ ...form, [key]: value });
  const fieldValue = (key: string) => form[key] ?? "";
  const products = references.products ?? [];
  const locations = references.storageLocations ?? [];

  if (action === "movement") {
    return (
      <>
        <ReferenceSelect label="Product *" onChange={(value) => update("productId", value)} required rows={products} value={fieldValue("productId")} />
        <ReferenceSelect label="From location *" onChange={(value) => update("fromStorageLocationId", value)} required rows={locations} value={fieldValue("fromStorageLocationId")} />
        <ReferenceSelect label="To location *" onChange={(value) => update("toStorageLocationId", value)} required rows={locations} value={fieldValue("toStorageLocationId")} />
        <TextInput label="Quantity *" onChange={(value) => update("quantity", value)} type="number" value={fieldValue("quantity")} />
        <TextInput label="Unit *" onChange={(value) => update("unit", value)} placeholder="tonne" value={fieldValue("unit")} />
        <TextInput label="Movement date *" onChange={(value) => update("movementDate", value)} type="date" value={fieldValue("movementDate")} />
        <TextInput label="Reason *" onChange={(value) => update("reason", value)} placeholder="Transfer to RMC bins" value={fieldValue("reason")} />
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <input checked={fieldValue("requiresApproval") === "true"} onChange={(event) => update("requiresApproval", event.target.checked ? "true" : "")} type="checkbox" />
          Request approval before posting
        </label>
      </>
    );
  }

  if (action === "closePeriod") {
    return (
      <>
        <TextInput label="Period start *" onChange={(value) => update("periodStart", value)} type="date" value={fieldValue("periodStart")} />
        <TextInput label="Period end *" onChange={(value) => update("periodEnd", value)} type="date" value={fieldValue("periodEnd")} />
        <TextArea label="Close reason *" onChange={(value) => update("reason", value)} placeholder="Monthly inventory close after reconciliation" value={fieldValue("reason")} />
      </>
    );
  }

  if (action === "production") {
    return (
      <>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          <span>Run type *</span>
          <select className={inputClass} onChange={(event) => update("runType", event.target.value)} value={fieldValue("runType")}>
            <option value="crusher">Crusher</option>
            <option value="rmc">RMC</option>
          </select>
        </label>
        <ReferenceSelect label="Machine" onChange={(value) => update("machineId", value)} rows={references.machines ?? []} value={fieldValue("machineId")} />
        <TextInput label="Production date *" onChange={(value) => update("productionDate", value)} type="date" value={fieldValue("productionDate")} />
        <ReferenceSelect label="Input product *" onChange={(value) => update("inputProductId", value)} required rows={products} value={fieldValue("inputProductId")} />
        <ReferenceSelect label="Input location *" onChange={(value) => update("inputStorageLocationId", value)} required rows={locations} value={fieldValue("inputStorageLocationId")} />
        <TextInput label="Input quantity *" onChange={(value) => update("inputQuantity", value)} type="number" value={fieldValue("inputQuantity")} />
        <TextInput label="Input unit *" onChange={(value) => update("inputUnit", value)} placeholder="tonne" value={fieldValue("inputUnit")} />
        <ReferenceSelect label="Output product *" onChange={(value) => update("outputProductId", value)} required rows={products} value={fieldValue("outputProductId")} />
        <ReferenceSelect label="Output location *" onChange={(value) => update("outputStorageLocationId", value)} required rows={locations} value={fieldValue("outputStorageLocationId")} />
        <TextInput label="Output quantity *" onChange={(value) => update("outputQuantity", value)} type="number" value={fieldValue("outputQuantity")} />
        <TextInput label="Output unit *" onChange={(value) => update("outputUnit", value)} placeholder="tonne" value={fieldValue("outputUnit")} />
        <TextArea label="Notes" onChange={(value) => update("notes", value)} value={fieldValue("notes")} />
      </>
    );
  }

  if (action === "dispatch") {
    return (
      <>
        <ReferenceSelect label="Product *" onChange={(value) => update("productId", value)} required rows={products} value={fieldValue("productId")} />
        <ReferenceSelect label="Stock location *" onChange={(value) => update("storageLocationId", value)} required rows={locations} value={fieldValue("storageLocationId")} />
        <TextInput label="Quantity *" onChange={(value) => update("quantity", value)} type="number" value={fieldValue("quantity")} />
        <TextInput label="Unit *" onChange={(value) => update("unit", value)} placeholder="tonne" value={fieldValue("unit")} />
        <TextInput label="Dispatch date *" onChange={(value) => update("dispatchDate", value)} type="date" value={fieldValue("dispatchDate")} />
        <TextInput label="Reason" onChange={(value) => update("reason", value)} placeholder="Dispatch stock reduction" value={fieldValue("reason")} />
      </>
    );
  }

  if (action === "correction") {
    return (
      <>
        <ReferenceSelect label="Product *" onChange={(value) => update("productId", value)} required rows={products} value={fieldValue("productId")} />
        <ReferenceSelect label="Storage location *" onChange={(value) => update("storageLocationId", value)} required rows={locations} value={fieldValue("storageLocationId")} />
        <TextInput label="Corrected base-unit quantity *" onChange={(value) => update("correctedQuantityBaseUnit", value)} type="number" value={fieldValue("correctedQuantityBaseUnit")} />
        <TextArea label="Correction reason *" onChange={(value) => update("reason", value)} placeholder="Physical stock verification difference" value={fieldValue("reason")} />
      </>
    );
  }

  return (
    <>
      <ReferenceSelect label="Supplier" onChange={(value) => update("supplierId", value)} rows={references.suppliers ?? []} value={fieldValue("supplierId")} />
      <ReferenceSelect label="Product *" onChange={(value) => update("productId", value)} required rows={products} value={fieldValue("productId")} />
      <ReferenceSelect label="Storage location *" onChange={(value) => update("storageLocationId", value)} required rows={locations} value={fieldValue("storageLocationId")} />
      <TextInput label="Receipt date *" onChange={(value) => update("receiptDate", value)} type="date" value={fieldValue("receiptDate")} />
      <TextInput label="Quantity *" onChange={(value) => update("quantity", value)} type="number" value={fieldValue("quantity")} />
      <TextInput label="Unit *" onChange={(value) => update("unit", value)} placeholder="tonne" value={fieldValue("unit")} />
      <TextInput label="Unit cost" onChange={(value) => update("unitCost", value)} type="number" value={fieldValue("unitCost")} />
      <TextInput label="Supplier document" onChange={(value) => update("sourceDocumentNumber", value)} placeholder="Bill or challan number" value={fieldValue("sourceDocumentNumber")} />
      <TextArea label="Notes" onChange={(value) => update("notes", value)} value={fieldValue("notes")} />
    </>
  );
}

function DataTable({ columns, emptyText, rows, title }: { columns: string[]; emptyText: string; rows: Array<Record<string, unknown>>; title: string }) {
  return (
    <div className="overflow-x-auto border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-100 text-xs uppercase text-slate-600">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" key={column}>{label(column)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>{emptyText}</td>
            </tr>
          ) : null}
          {rows.map((row, index) => (
            <tr className="border-t border-slate-200" key={String(row.id ?? `${row.productId}-${row.storageLocationId}-${index}`)}>
              {columns.map((column) => (
                <td className="px-4 py-3" key={column}>{format(row[column])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReferenceSelect({ label, onChange, required, rows, value }: {
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  rows: Array<Record<string, unknown>>;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <select className={inputClass} onChange={(event) => onChange(event.target.value)} required={required} value={value}>
        <option value="">All / select</option>
        {rows.map((row) => (
          <option key={String(row.id)} value={String(row.id)}>{referenceLabel(row)}</option>
        ))}
      </select>
    </label>
  );
}

function TextInput({ label, onChange, placeholder, type = "text", value }: {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "date" | "number" | "text";
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <input className={inputClass} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} step={type === "number" ? "any" : undefined} type={type} value={value} />
    </label>
  );
}

function TextArea({ label, onChange, placeholder, value }: { label: string; onChange: (value: string) => void; placeholder?: string; value: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      <span>{label}</span>
      <textarea className={`${inputClass} min-h-24 py-2`} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
    </label>
  );
}

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as unknown;
  if (!response.ok || isErrorBody(body)) {
    throw new Error(isErrorBody(body) && body.error ? body.error : "Request failed");
  }
  return body as T;
}

function isErrorBody(value: unknown): value is { error?: string } {
  return typeof value === "object" && value !== null && "error" in value;
}

function validate(action: ActionKey, form: Record<string, string>): string | undefined {
  const required = requiredFields[action];
  const missing = required.find((field) => !form[field]);
  if (missing) {
    return `${label(missing)} is required.`;
  }
  if (action === "movement" && form.fromStorageLocationId === form.toStorageLocationId) {
    return "Destination must be different from source.";
  }
  return undefined;
}

function actionPayload(action: ActionKey, form: Record<string, string>): Record<string, unknown> {
  const compact = stripEmpty(form);
  if (action === "production") {
    return {
      runType: compact.runType,
      productionDate: compact.productionDate,
      machineId: compact.machineId,
      notes: compact.notes,
      inputs: [{
        productId: compact.inputProductId,
        storageLocationId: compact.inputStorageLocationId,
        quantity: compact.inputQuantity,
        unit: compact.inputUnit
      }],
      outputs: [{
        productId: compact.outputProductId,
        storageLocationId: compact.outputStorageLocationId,
        quantity: compact.outputQuantity,
        unit: compact.outputUnit
      }]
    };
  }
  return compact;
}

function actionEndpoint(action: ActionKey): string {
  const endpoints: Record<ActionKey, string> = {
    closePeriod: "/api/v1/inventory/close-periods",
    correction: "/api/v1/inventory/corrections",
    dispatch: "/api/v1/inventory/dispatch-reductions",
    movement: "/api/v1/inventory/stock-movements",
    production: "/api/v1/inventory/production-runs",
    receipt: "/api/v1/inventory/purchase-receipts"
  };
  return endpoints[action];
}

function emptyForm(): Record<string, string> {
  return {
    receiptDate: today(),
    movementDate: today(),
    productionDate: today(),
    dispatchDate: today(),
    periodStart: today(),
    periodEnd: today(),
    runType: "crusher",
    unit: "tonne",
    inputUnit: "tonne",
    outputUnit: "tonne"
  };
}

function createQuery(filters: { search: string; productId: string; storageLocationId: string }): URLSearchParams {
  const params = new URLSearchParams({ page: "1", pageSize: String(pageSize) });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.productId) params.set("productId", filters.productId);
  if (filters.storageLocationId) params.set("storageLocationId", filters.storageLocationId);
  return params;
}

function stripEmpty(form: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(form).filter(([, value]) => value !== ""));
}

function label(value: string): string {
  return value.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
}

function format(value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return value.slice(0, 16).replace("T", " ");
  if (typeof value === "number") return formatNumber(value);
  return String(value);
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function sumColumn(rows: Array<Record<string, unknown>>, key: string): number {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function referenceLabel(row: Record<string, unknown>): string {
  return String(
    row.code ??
      row.legalName ??
      row.tradeName ??
      row.name ??
      row.siteName ??
      row.registrationNumber ??
      row.id
  );
}

function actionSaveLabel(action: ActionKey): string {
  const labels: Record<ActionKey, string> = {
    closePeriod: "Close inventory period",
    correction: "Request correction approval",
    dispatch: "Post dispatch reduction",
    movement: "Post movement",
    production: "Post production",
    receipt: "Post receipt"
  };
  return labels[action];
}

function successMessage(action: ActionKey): string {
  const messages: Record<ActionKey, string> = {
    closePeriod: "Inventory period closed.",
    correction: "Correction approval request created.",
    dispatch: "Dispatch stock reduction posted.",
    movement: "Stock movement posted.",
    production: "Production consumption and output posted.",
    receipt: "Purchase receipt posted."
  };
  return messages[action];
}

const requiredFields: Record<ActionKey, string[]> = {
  closePeriod: ["periodStart", "periodEnd", "reason"],
  correction: ["productId", "storageLocationId", "correctedQuantityBaseUnit", "reason"],
  dispatch: ["productId", "storageLocationId", "quantity", "unit", "dispatchDate"],
  movement: ["productId", "fromStorageLocationId", "toStorageLocationId", "quantity", "unit", "movementDate", "reason"],
  production: ["runType", "productionDate", "inputProductId", "inputStorageLocationId", "inputQuantity", "inputUnit", "outputProductId", "outputStorageLocationId", "outputQuantity", "outputUnit"],
  receipt: ["productId", "storageLocationId", "receiptDate", "quantity", "unit"]
};

const actionTabs: Array<{ key: ActionKey; label: string; icon: typeof ArrowDownToLine }> = [
  { key: "receipt", label: "Receipt", icon: ArrowDownToLine },
  { key: "movement", label: "Move", icon: ArrowRightLeft },
  { key: "production", label: "Produce", icon: Factory },
  { key: "dispatch", label: "Dispatch", icon: Truck },
  { key: "correction", label: "Correct", icon: ShieldCheck },
  { key: "closePeriod", label: "Close", icon: Lock }
];

const inputClass = "min-h-11 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100";
