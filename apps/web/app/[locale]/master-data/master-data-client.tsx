"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Download,
  History,
  Pencil,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Trash2,
  X
} from "lucide-react";
import {
  defaultIndianState,
  defaultMaharashtraDistrict,
  defaultPinCodeByDistrict,
  DistrictSelect,
  PinCodeInput,
  districtsByState,
  StateSelect
} from "../../../components/india-location-selects";

type ResourceKey =
  | "customers"
  | "customerSites"
  | "suppliers"
  | "products"
  | "productUnits"
  | "productPrices"
  | "vehicles"
  | "drivers"
  | "machines"
  | "storageLocations"
  | "shifts";

type FieldType = "checkbox" | "date" | "number" | "select" | "text" | "textarea";

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  referenceResource?: ResourceKey;
}

interface ResourceConfig {
  label: string;
  description: string;
  fields: FieldConfig[];
  columns: string[];
}

interface ListResult {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
}

interface ApiErrorBody {
  error?: string | {
    code?: string;
    message?: string;
    field?: string;
    requestId?: string;
  };
}

interface AuditEvent {
  id: string;
  eventType: string;
  actorUserId: string | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: string;
}

interface MasterDataClientProps {
  activePlantId?: string;
  activePlantName?: string;
}

const pageSize = 10;

const yesNoOptions = [
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" }
];

const resourceConfigs: Record<ResourceKey, ResourceConfig> = {
  customers: {
    label: "Customers",
    description: "Credit, GST, contact and billing master data.",
    columns: ["code", "legalName", "phone", "gstin", "creditLimit", "active"],
    fields: [
      text("code", "Code", true),
      select("customerType", "Type", ["contractor", "builder", "dealer", "government", "individual"], true),
      text("legalName", "Legal name", true),
      text("tradeName", "Trade name", true),
      text("contactPerson", "Contact person", true),
      text("phone", "Phone", true),
      text("whatsappNumber", "WhatsApp"),
      text("email", "Email"),
      text("gstin", "GSTIN"),
      text("pan", "PAN"),
      textarea("billingAddress", "Billing address", true),
      stateField(),
      districtField(),
      pincodeField(),
      number("creditLimit", "Credit limit", true),
      number("creditDays", "Credit days", true),
      text("defaultPriceList", "Default price list"),
      text("accountManager", "Account manager"),
      textarea("notes", "Notes"),
      activeField()
    ]
  },
  customerSites: {
    label: "Customer Sites",
    description: "Delivery addresses, contacts and site coordinates.",
    columns: ["siteCode", "siteName", "customerId", "phone", "district", "active"],
    fields: [
      reference("customerId", "Customer", "customers", true),
      text("siteCode", "Site code", true),
      text("siteName", "Site name", true),
      text("contactPerson", "Contact person", true),
      text("phone", "Phone", true),
      textarea("address", "Address", true),
      stateField(),
      districtField(),
      pincodeField(),
      number("latitude", "Latitude"),
      number("longitude", "Longitude"),
      textarea("deliveryInstructions", "Delivery instructions"),
      number("defaultUnloadingMinutes", "Default unloading minutes"),
      activeField()
    ]
  },
  suppliers: {
    label: "Suppliers",
    description: "Vendor GST, credit and contact records.",
    columns: ["code", "legalName", "supplierType", "phone", "gstin", "active"],
    fields: [
      text("code", "Code", true),
      select(
        "supplierType",
        "Type",
        ["raw_stone", "cement", "fly_ash", "sand", "aggregate", "admixture", "diesel", "spare_parts", "transport", "maintenance"],
        true
      ),
      text("legalName", "Legal name", true),
      text("tradeName", "Trade name", true),
      text("contactPerson", "Contact person", true),
      text("phone", "Phone", true),
      text("whatsappNumber", "WhatsApp"),
      text("email", "Email"),
      text("gstin", "GSTIN"),
      text("pan", "PAN"),
      textarea("address", "Address", true),
      stateField(),
      districtField(),
      pincodeField(),
      number("creditDays", "Credit days", true),
      textarea("paymentTerms", "Payment terms"),
      textarea("notes", "Notes"),
      activeField()
    ]
  },
  products: {
    label: "Products",
    description: "Materials, services, units, GST and stocking thresholds.",
    columns: ["code", "name", "category", "baseUnit", "gstRate", "active"],
    fields: [
      text("code", "Code", true),
      text("name", "Name", true),
      text("localLanguageName", "Local name"),
      select(
        "category",
        "Category",
        ["raw_stone", "crusher_output", "rmc_raw_material", "finished_concrete", "spare_part", "fuel", "consumable", "service"],
        true
      ),
      textarea("description", "Description"),
      text("hsnOrSacCode", "HSN/SAC"),
      number("gstRate", "GST rate"),
      text("baseUnit", "Base unit", true),
      text("purchaseUnit", "Purchase unit", true),
      text("salesUnit", "Sales unit", true),
      number("bulkDensity", "Bulk density"),
      number("minStock", "Min stock"),
      number("maxStock", "Max stock"),
      number("reorderLevel", "Reorder level"),
      number("standardCost", "Standard cost"),
      number("defaultSellingPrice", "Default selling price"),
      activeField("trackInventory", "Track inventory"),
      activeField("allowNegativeStock", "Allow negative stock"),
      activeField()
    ]
  },
  productUnits: {
    label: "Units",
    description: "Product-specific unit conversion factors.",
    columns: ["productId", "fromUnit", "toUnit", "factor", "active"],
    fields: [
      reference("productId", "Product", "products", true),
      text("fromUnit", "From unit", true),
      text("toUnit", "To unit", true),
      number("factor", "Factor", true),
      date("effectiveFrom", "Effective from"),
      date("effectiveTo", "Effective to"),
      textarea("notes", "Notes"),
      activeField()
    ]
  },
  productPrices: {
    label: "Prices",
    description: "Sale, purchase and transport rates with effective dates.",
    columns: ["productId", "priceType", "unit", "rate", "effectiveFrom", "active"],
    fields: [
      reference("productId", "Product", "products", true),
      select("priceType", "Type", ["sale", "purchase", "transport"], true),
      text("unit", "Unit", true),
      number("rate", "Rate", true),
      date("effectiveFrom", "Effective from", true),
      date("effectiveTo", "Effective to"),
      activeField()
    ]
  },
  vehicles: {
    label: "Vehicles",
    description: "Owned, market, supplier and customer vehicle master.",
    columns: ["registrationNumber", "vehicleType", "ownerType", "ownerName", "capacityTonne", "active"],
    fields: [
      text("registrationNumber", "Registration number", true),
      text("vehicleCode", "Vehicle code"),
      select("vehicleType", "Vehicle type", ["tipper", "dumper", "truck", "transit_mixer", "loader", "excavator", "concrete_pump", "tanker", "tractor", "utility", "other"], true),
      select("ownerType", "Owner type", ["owned", "supplier", "customer", "market"], true),
      text("ownerName", "Owner name", true),
      text("plantId", "Plant ID"),
      number("capacity", "Capacity"),
      text("capacityUnit", "Capacity unit"),
      number("capacityTonne", "Capacity tonne"),
      number("capacityCubicMetre", "Capacity cubic metre"),
      text("manufacturer", "Manufacturer"),
      text("model", "Model"),
      number("manufacturingYear", "Manufacturing year"),
      text("fuelType", "Fuel type"),
      text("chassisNumber", "Chassis number"),
      text("engineNumber", "Engine number"),
      activeField()
    ]
  },
  drivers: {
    label: "Drivers",
    description: "Driver identity, phone and licence validity.",
    columns: ["code", "name", "phone", "licenceNumber", "licenceExpiry", "active"],
    fields: [
      text("code", "Code", true),
      text("name", "Name", true),
      text("phone", "Phone", true),
      text("alternatePhone", "Alternate phone"),
      text("licenceNumber", "Licence number", true),
      text("licenceType", "Licence type"),
      date("licenceExpiry", "Licence expiry"),
      textarea("address", "Address"),
      text("plantId", "Plant ID"),
      reference("assignedVehicleId", "Assigned vehicle", "vehicles"),
      text("emergencyContact", "Emergency contact"),
      activeField()
    ]
  },
  machines: {
    label: "Machines",
    description: "Plant-scoped crusher, RMC and support equipment.",
    columns: ["code", "name", "machineType", "make", "model", "active"],
    fields: [
      text("plantId", "Plant ID", true),
      text("code", "Code", true),
      text("name", "Name", true),
      select("machineType", "Machine type", ["crusher", "screen", "conveyor", "batching_plant", "loader", "weighbridge", "generator", "other"], true),
      select("assetType", "Asset type", ["jaw_crusher", "cone_crusher", "impact_crusher", "vsi", "feeder", "vibrating_screen", "conveyor", "motor", "gearbox", "bearing_assembly", "pump", "compressor", "generator", "transformer", "loader", "transit_mixer", "batching_plant", "weighbridge", "dust_control", "silo", "laboratory_equipment", "other"]),
      reference("parentMachineId", "Parent asset", "machines"),
      text("make", "Make"),
      text("manufacturer", "Manufacturer"),
      text("model", "Model"),
      text("serialNumber", "Serial number"),
      date("commissioningDate", "Commissioning date"),
      number("capacity", "Capacity"),
      text("capacityUnit", "Capacity unit"),
      text("meterType", "Meter type"),
      number("initialMeterValue", "Initial meter value"),
      date("warrantyExpiry", "Warranty expiry"),
      textarea("notes", "Notes"),
      activeField()
    ]
  },
  storageLocations: {
    label: "Storage Locations",
    description: "Plant-scoped yards, silos, bins, tanks and warehouses.",
    columns: ["code", "name", "locationType", "plantId", "active"],
    fields: [
      text("plantId", "Plant ID", true),
      text("code", "Code", true),
      text("name", "Name", true),
      select("locationType", "Location type", ["raw_material_yard", "finished_stockpile", "aggregate_bin", "cement_silo", "fly_ash_silo", "ggbs_silo", "admixture_tank", "water_tank", "spare_parts_store", "fuel_tank", "transit", "waste_area", "stockpile", "bin", "silo", "yard", "tank", "warehouse", "other"], true),
      reference("parentLocationId", "Parent location", "storageLocations"),
      number("capacity", "Capacity"),
      text("capacityUnit", "Capacity unit"),
      activeField("inventoryAllowed", "Inventory allowed"),
      activeField("negativeStockOverrideAllowed", "Negative stock override"),
      textarea("notes", "Notes"),
      activeField()
    ]
  },
  shifts: {
    label: "Shifts",
    description: "Plant shift timings for production and dispatch planning.",
    columns: ["code", "name", "startTime", "endTime", "crossesMidnight", "active"],
    fields: [
      text("plantId", "Plant ID", true),
      text("code", "Shift code", true),
      text("name", "Shift name", true),
      text("startTime", "Start time", true),
      text("endTime", "End time", true),
      activeField("crossesMidnight", "Crosses midnight"),
      number("breakDurationMinutes", "Break duration minutes"),
      text("activeDays", "Active days"),
      textarea("notes", "Notes"),
      activeField()
    ]
  }
};

const resourceOrder = Object.keys(resourceConfigs) as ResourceKey[];

export function MasterDataClient({
  activePlantId,
  activePlantName
}: MasterDataClientProps) {
  const [resource, setResource] = useState<ResourceKey>("customers");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<ListResult>({ rows: [], total: 0, page: 1, pageSize });
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditTitle, setAuditTitle] = useState("");
  const [referenceRows, setReferenceRows] = useState<Record<string, Array<Record<string, unknown>>>>({});
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const config = resourceConfigs[resource];
  const totalPages = Math.max(1, Math.ceil(result.total / pageSize));

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams({ page: "1", pageSize: "100", export: "csv" });
    if (search.trim()) {
      params.set("search", search.trim());
    }
    return `/api/v1/master-data/${resource}?${params.toString()}`;
  }, [resource, search]);

  useEffect(() => {
    setFormData(createEmptyForm(resource, activePlantId));
    setEditingId(null);
    setAuditEvents([]);
    setAuditTitle("");
    void loadReferences(resource);
  }, [activePlantId, resource]);

  useEffect(() => {
    void loadRows();
  }, [resource, page]);

  async function loadRows(nextSearch = search) {
    setLoading(true);
    setStatus("");
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize)
    });
    if (nextSearch.trim()) {
      params.set("search", nextSearch.trim());
    }

    try {
      const response = await fetch(`/api/v1/master-data/${resource}?${params.toString()}`, {
        cache: "no-store"
      });
      const body = (await response.json()) as ListResult | ApiErrorBody;
      if (!response.ok || "error" in body) {
        throw new Error("error" in body ? getApiErrorMessage(body) : "Unable to load master data");
      }
      if (!isListResult(body)) {
        throw new Error("Unable to load master data");
      }
      setResult(body);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load master data");
    } finally {
      setLoading(false);
    }
  }

  async function loadReferences(nextResource: ResourceKey) {
    const references = resourceConfigs[nextResource].fields
      .map((field) => field.referenceResource)
      .filter((value): value is ResourceKey => Boolean(value));

    if (references.length === 0) {
      setReferenceRows({});
      return;
    }

    const nextRows: Record<string, Array<Record<string, unknown>>> = {};

    for (const reference of references) {
      try {
        const response = await fetch(`/api/v1/master-data/${reference}?page=1&pageSize=100`, {
          cache: "no-store"
        });
        const body = (await response.json()) as ListResult | { error: string };
        if (response.ok && !("error" in body)) {
          nextRows[reference] = body.rows;
        }
      } catch {
        nextRows[reference] = [];
      }
    }

    setReferenceRows(nextRows);
    setFormData((current) => {
      const next = { ...current };

      for (const field of resourceConfigs[nextResource].fields) {
        if (!field.referenceResource || next[field.key]) {
          continue;
        }

        const firstReference = nextRows[field.referenceResource]?.[0];
        if (firstReference?.id) {
          next[field.key] = String(firstReference.id);
        }
      }

      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    const validationError = validateClientForm(resource, formData);
    if (validationError) {
      setStatus(validationError);
      return;
    }

    setSaving(true);
    setStatus("");
    const payload = serialiseForm(resource, formData, activePlantId);
    const url = editingId
      ? `/api/v1/master-data/${resource}/${editingId}`
      : `/api/v1/master-data/${resource}`;
    const method = editingId ? "PATCH" : "POST";

    try {
      const response = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const body = (await response.json()) as ApiErrorBody;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(body, "Unable to save master data"));
      }
      setStatus(editingId ? "Record updated successfully." : "Record created successfully.");
      setFormData(createEmptyForm(resource, activePlantId));
      setEditingId(null);
      await loadRows();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save master data");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(row: Record<string, unknown>) {
    const id = String(row.id ?? "");
    if (!id || !window.confirm("Deactivate this record?")) {
      return;
    }

    setSaving(true);
    setStatus("");
    try {
      const response = await fetch(`/api/v1/master-data/${resource}/${id}`, { method: "DELETE" });
      const body = (await response.json()) as ApiErrorBody;
      if (!response.ok) {
        throw new Error(getApiErrorMessage(body, "Unable to delete master data"));
      }
      setStatus("Record deactivated.");
      await loadRows();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to delete master data");
    } finally {
      setSaving(false);
    }
  }

  async function loadAudit(row: Record<string, unknown>) {
    const id = String(row.id ?? "");
    if (!id) {
      return;
    }

    setAuditTitle(getRowTitle(row));
    setAuditEvents([]);
    try {
      const response = await fetch(`/api/v1/master-data/${resource}/${id}?history=audit`, {
        cache: "no-store"
      });
      const body = (await response.json()) as { events?: AuditEvent[]; error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Unable to load audit history");
      }
      setAuditEvents(body.events ?? []);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load audit history");
    }
  }

  function startEdit(row: Record<string, unknown>) {
    const id = String(row.id ?? "");
    setEditingId(id);
    setFormData(createFormFromRow(resource, row, activePlantId));
    setStatus(`Editing ${getRowTitle(row)}.`);
  }

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-5">
        <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Master data resources">
          {resourceOrder.map((key) => (
            <button
              aria-selected={resource === key}
              className={`min-h-10 shrink-0 rounded-md border px-3 text-sm font-semibold ${
                resource === key
                  ? "border-cyan-700 bg-cyan-700 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
              key={key}
              onClick={() => {
                setResource(key);
                setPage(1);
              }}
              type="button"
            >
              {resourceConfigs[key].label}
            </button>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid gap-4">
          <div className="border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-bold">{config.label}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{config.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  href={exportUrl}
                >
                  <Download size={16} />
                  Export
                </a>
                <button
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                    void loadRows("");
                  }}
                  type="button"
                >
                  <RefreshCcw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            <form
              className="mt-4 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                setPage(1);
                void loadRows(search);
              }}
            >
              <label className="sr-only" htmlFor="master-data-search">
                Search
              </label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18} />
                <input
                  className="min-h-11 w-full rounded-md border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
                  id="master-data-search"
                  onChange={(event) => {
                    const nextSearch = event.target.value;
                    setSearch(nextSearch);
                    setPage(1);
                    void loadRows(nextSearch);
                  }}
                  placeholder="Search by code, name, phone or type"
                  value={search}
                />
              </div>
              <button className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white" type="submit">
                Search
              </button>
            </form>
          </div>

          <div className="border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
              {loading ? "Loading..." : `${result.total} records`}
              {status ? <span className="ml-3 font-semibold text-cyan-800">{status}</span> : null}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full border-collapse text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-600">
                  <tr>
                    {config.columns.map((column) => (
                      <th className="px-4 py-3 font-bold" key={column}>
                        {labelFor(config, column)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={config.columns.length + 1}>
                        {search.trim() ? "No matching records found." : "No data available yet. Add a new record."}
                      </td>
                    </tr>
                  ) : null}
                  {result.rows.map((row) => (
                    <tr className="border-t border-slate-200" key={String(row.id)}>
                      {config.columns.map((column) => (
                        <td className="max-w-[220px] px-4 py-3 align-top" key={column}>
                          {formatValue(row[column])}
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <IconButton label="Edit" onClick={() => startEdit(row)}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton label="Audit" onClick={() => void loadAudit(row)}>
                            <History size={16} />
                          </IconButton>
                          <IconButton label="Deactivate" onClick={() => void handleDelete(row)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 p-3 md:hidden">
              {result.rows.length === 0 ? (
                <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-500">
                  {search.trim() ? "No matching records found." : "No data available yet. Add a new record."}
                </p>
              ) : null}
              {result.rows.map((row) => (
                <article className="rounded-md border border-slate-200 p-3" key={String(row.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{getRowTitle(row)}</h3>
                      <p className="mt-1 text-xs text-slate-600">{String(row.id ?? "")}</p>
                    </div>
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold">
                      {formatValue(row.active)}
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm">
                    {config.columns.slice(0, 5).map((column) => (
                      <div className="grid grid-cols-[120px_1fr] gap-2" key={column}>
                        <dt className="text-slate-500">{labelFor(config, column)}</dt>
                        <dd className="break-words font-medium">{formatValue(row[column])}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex gap-2">
                    <IconButton label="Edit" onClick={() => startEdit(row)}>
                      <Pencil size={16} />
                    </IconButton>
                    <IconButton label="Audit" onClick={() => void loadAudit(row)}>
                      <History size={16} />
                    </IconButton>
                    <IconButton label="Deactivate" onClick={() => void handleDelete(row)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </article>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
              <button
                className="min-h-9 rounded-md border border-slate-300 px-3 font-semibold disabled:opacity-50"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                type="button"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button
                className="min-h-9 rounded-md border border-slate-300 px-3 font-semibold disabled:opacity-50"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <aside className="grid content-start gap-4">
          <form className="border border-slate-200 bg-white p-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">{editingId ? "Edit record" : "New record"}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {activePlantId ? `Plant context: ${activePlantName ?? activePlantId}` : "Organisation scoped"}
                </p>
              </div>
              {editingId ? (
                <button
                  aria-label="Cancel editing"
                  className="rounded-md border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
                  onClick={() => {
                    setEditingId(null);
                    setFormData(createEmptyForm(resource, activePlantId));
                  }}
                  type="button"
                >
                  <X size={18} />
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              {config.fields.map((field) =>
                field.key === "plantId" && activePlantId ? null : (
                  <FormField
                    field={field}
                    key={field.key}
                    onChange={(value) =>
                      setFormData((current) => ({
                        ...current,
                        [field.key]: value,
                        ...(field.key === "state"
                          ? {
                              district: getDefaultDistrict(String(value)),
                              pincode: defaultPinCodeByDistrict[getDefaultDistrict(String(value))] ?? current.pincode
                            }
                          : {}),
                        ...(field.key === "district"
                          ? { pincode: defaultPinCodeByDistrict[String(value)] ?? current.pincode }
                          : {})
                      }))
                    }
                    referenceRows={referenceRows}
                    values={formData}
                    value={formData[field.key] ?? ""}
                  />
                )
              )}
            </div>

            <button
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-cyan-700 px-4 text-sm font-bold text-white disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {editingId ? <Save size={17} /> : <Plus size={17} />}
              {editingId ? "Save changes" : "Create record"}
            </button>
            <button
              className="mt-2 min-h-11 w-full rounded-md border border-slate-300 px-4 text-sm font-bold text-slate-700 hover:bg-slate-100"
              disabled={saving}
              onClick={() => {
                setEditingId(null);
                setFormData(createEmptyForm(resource, activePlantId));
                setStatus("");
              }}
              type="button"
            >
              Cancel
            </button>
          </form>

          <section className="border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-bold">Audit history</h2>
            <p className="mt-1 text-sm text-slate-600">{auditTitle || "Select a row to view recent changes."}</p>
            <div className="mt-4 grid gap-3">
              {auditEvents.length === 0 ? (
                <p className="text-sm text-slate-500">No audit events loaded.</p>
              ) : (
                auditEvents.map((event) => (
                  <article className="rounded-md border border-slate-200 p-3 text-sm" key={event.id}>
                    <div className="flex items-center justify-between gap-2">
                      <strong>{event.eventType}</strong>
                      <span className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 break-words text-xs text-slate-600">Actor: {event.actorUserId ?? "system"}</p>
                  </article>
                ))
              )}
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}

function FormField({
  field,
  onChange,
  referenceRows,
  values,
  value
}: {
  field: FieldConfig;
  onChange: (value: string | boolean) => void;
  referenceRows: Record<string, Array<Record<string, unknown>>>;
  values: Record<string, string | boolean>;
  value: string | boolean;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-300 px-3 text-sm font-semibold">
        <input
          checked={value === true || value === "true"}
          className="h-4 w-4"
          onChange={(event) => onChange(event.target.checked)}
          type="checkbox"
        />
        {field.label}
      </label>
    );
  }

  if (field.key === "state") {
    return (
      <FieldLabel field={field}>
        <StateSelect onChange={onChangeString(onChange)} required={field.required} value={String(value)} />
      </FieldLabel>
    );
  }

  if (field.key === "district") {
    return (
      <FieldLabel field={field}>
        <DistrictSelect
          onChange={onChangeString(onChange)}
          required={field.required}
          state={String(values.state || defaultIndianState)}
          value={String(value)}
        />
      </FieldLabel>
    );
  }

  if (field.referenceResource) {
    const rows = referenceRows[field.referenceResource] ?? [];

    return (
      <FieldLabel field={field}>
        <select
          className="min-h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          value={String(value)}
        >
          <option value="">Select {field.label.toLowerCase()}</option>
          {rows.map((row) => (
            <option key={String(row.id)} value={String(row.id)}>
              {getReferenceLabel(row)}
            </option>
          ))}
        </select>
      </FieldLabel>
    );
  }

  if (field.key === "pincode") {
    return (
      <FieldLabel field={field}>
        <PinCodeInput onChange={onChangeString(onChange)} required={field.required} value={String(value)} />
        <span className="text-xs font-medium text-slate-500">Enter valid 6 digit PIN code.</span>
      </FieldLabel>
    );
  }

  return (
    <FieldLabel field={field}>
      {field.type === "select" ? (
        <select
          className="min-h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
          onChange={(event) => onChange(event.target.value)}
          required={field.required}
          value={String(value)}
        >
          <option value="">Select</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" ? (
        <textarea
          className="min-h-24 rounded-md border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          value={String(value)}
        />
      ) : (
        <input
          className="min-h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
          onChange={(event) => onChange(event.target.value)}
          pattern={field.key === "pincode" ? "\\d{6}" : undefined}
          placeholder={field.placeholder}
          required={field.required}
          step={field.type === "number" ? "any" : undefined}
          type={field.type}
          value={String(value)}
        />
      )}
    </FieldLabel>
  );
}

function FieldLabel({ children, field }: { children: ReactNode; field: FieldConfig }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-slate-700">
      <span>
        {field.label}
        {field.required ? <span className="text-red-600"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function IconButton({
  children,
  label,
  onClick
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}

function text(key: string, label: string, required = false): FieldConfig {
  return { key, label, type: "text", required, placeholder: `Enter ${label.toLowerCase()}` };
}

function textarea(key: string, label: string, required = false): FieldConfig {
  return { key, label, type: "textarea", required, placeholder: `Enter ${label.toLowerCase()}` };
}

function number(key: string, label: string, required = false): FieldConfig {
  return { key, label, type: "number", required, placeholder: "0" };
}

function date(key: string, label: string, required = false): FieldConfig {
  return { key, label, type: "date", required };
}

function select(key: string, label: string, values: string[], required = false): FieldConfig {
  return {
    key,
    label,
    type: "select",
    required,
    options: values.map((value) => ({ label: value.replaceAll("_", " "), value }))
  };
}

function activeFieldWithKey(key: string, label: string): FieldConfig {
  return {
    key,
    label,
    type: "checkbox",
    options: yesNoOptions
  };
}

function activeField(key?: string, label?: string): FieldConfig {
  return activeFieldWithKey(key ?? "active", label ?? "Active");
}

function reference(
  key: string,
  label: string,
  referenceResource: ResourceKey,
  required = false
): FieldConfig {
  return { key, label, type: "select", required, referenceResource };
}

function stateField(): FieldConfig {
  return { key: "state", label: "State", type: "select", required: true };
}

function districtField(): FieldConfig {
  return { key: "district", label: "District", type: "select", required: true };
}

function pincodeField(): FieldConfig {
  return {
    key: "pincode",
    label: "PIN code",
    type: "text",
    required: true,
    placeholder: "Enter 6 digit PIN code"
  };
}

function createEmptyForm(resource: ResourceKey, activePlantId?: string): Record<string, string | boolean> {
  const form: Record<string, string | boolean> = {};

  for (const field of resourceConfigs[resource].fields) {
    if (field.type === "checkbox") {
      form[field.key] = true;
      if (field.key === "allowNegativeStock" || field.key === "negativeStockOverrideAllowed" || field.key === "crossesMidnight") {
        form[field.key] = false;
      }
    } else if (field.key === "state") {
      form[field.key] = defaultIndianState;
    } else if (field.key === "district") {
      form[field.key] = defaultMaharashtraDistrict;
    } else if (field.key === "pincode") {
      form[field.key] = defaultPinCodeByDistrict[defaultMaharashtraDistrict] ?? "411001";
    } else if (field.key === "creditLimit" || field.key === "creditDays") {
      form[field.key] = "0";
    } else if (field.key === "breakDurationMinutes") {
      form[field.key] = "0";
    } else if (field.key === "startTime") {
      form[field.key] = "06:00";
    } else if (field.key === "endTime") {
      form[field.key] = "14:00";
    } else if (field.key === "activeDays") {
      form[field.key] = "mon,tue,wed,thu,fri,sat,sun";
    } else if (field.key === "effectiveFrom") {
      form[field.key] = new Date().toISOString().slice(0, 10);
    } else if (field.key === "plantId" && activePlantId) {
      form[field.key] = activePlantId;
    } else {
      form[field.key] = "";
    }
  }

  return form;
}

function createFormFromRow(
  resource: ResourceKey,
  row: Record<string, unknown>,
  activePlantId?: string
): Record<string, string | boolean> {
  const form = createEmptyForm(resource, activePlantId);

  for (const field of resourceConfigs[resource].fields) {
    const value = row[field.key];
    if (typeof value === "boolean") {
      form[field.key] = value;
    } else if (value !== null && value !== undefined) {
      form[field.key] = String(value).slice(0, field.type === "date" ? 10 : undefined);
    }
  }

  return form;
}

function serialiseForm(
  resource: ResourceKey,
  formData: Record<string, string | boolean>,
  activePlantId?: string
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of resourceConfigs[resource].fields) {
    const value = field.key === "plantId" && activePlantId ? activePlantId : formData[field.key];
    if (value === "" || value === undefined) {
      continue;
    }
    payload[field.key] = value;
  }

  if (resource === "shifts" && typeof payload.activeDays === "string") {
    return {
      ...payload,
      activeDays: payload.activeDays.split(",").map((day) => day.trim()).filter(Boolean)
    };
  }

  return payload;
}

function validateClientForm(resource: ResourceKey, formData: Record<string, string | boolean>): string | undefined {
  for (const field of resourceConfigs[resource].fields) {
    if (field.required && !formData[field.key]) {
      return `${field.label} is required.`;
    }
  }

  const pincode = formData.pincode;
  if (typeof pincode === "string" && pincode && !/^\d{6}$/.test(pincode)) {
    return "Enter valid 6 digit PIN code.";
  }

  return undefined;
}

function getDefaultDistrict(state: string): string {
  return state === defaultIndianState
    ? defaultMaharashtraDistrict
    : districtsByState[state]?.[0] ?? "";
}

function getReferenceLabel(row: Record<string, unknown>): string {
  return String(
    [
      row.code,
      row.legalName ?? row.name ?? row.tradeName,
      row.registrationNumber
    ]
      .filter(Boolean)
      .join(" - ") || row.id
  );
}

function onChangeString(callback: (value: string | boolean) => void): (value: string) => void {
  return (value: string) => callback(value);
}

function labelFor(config: ResourceConfig, key: string): string {
  return config.fields.find((field) => field.key === key)?.label ?? key;
}

function formatValue(value: unknown): string {
  if (value === true) {
    return "Active";
  }
  if (value === false) {
    return "Inactive";
  }
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function getApiErrorMessage(body: ApiErrorBody, fallback = "Unable to load master data"): string {
  if (!body.error) {
    return fallback;
  }

  if (typeof body.error === "string") {
    return body.error;
  }

  return body.error.message ?? fallback;
}

function isListResult(value: ListResult | ApiErrorBody): value is ListResult {
  return Array.isArray((value as ListResult).rows);
}

function getRowTitle(row: Record<string, unknown>): string {
  return String(row.legalName ?? row.name ?? row.siteName ?? row.registrationNumber ?? row.code ?? row.id ?? "Record");
}
