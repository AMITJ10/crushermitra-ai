import { Pool, type PoolClient } from "pg";
import type { TenantContext } from "./index";

export type MasterDataResource =
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

export interface MasterDataListOptions {
  search?: string;
  page: number;
  pageSize: number;
  status?: "active" | "inactive" | "all";
  plantId?: string;
  type?: string;
  sort?: string;
}

export interface MasterDataListResult {
  resource: MasterDataResource;
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
}

export interface MasterDataAuditEvent {
  id: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId: string | null;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  createdAt: Date;
}

interface ResourceField {
  property: string;
  column: string;
  writable?: boolean;
}

interface ResourceConfig {
  resource: MasterDataResource;
  table: string;
  label: string;
  fields: ResourceField[];
  searchColumns: string[];
  plantScoped?: boolean;
  typeColumn?: string;
  referenceChecks?: Array<{
    property: string;
    table: string;
  }>;
}

const commonFields: ResourceField[] = [
  { property: "id", column: "id" },
  { property: "active", column: "active", writable: true },
  { property: "createdAt", column: "created_at" },
  { property: "updatedAt", column: "updated_at" }
];

export const masterDataResources: Record<MasterDataResource, ResourceConfig> = {
  customers: {
    resource: "customers",
    table: "customers",
    label: "Customers",
    searchColumns: ["code", "legal_name", "trade_name", "phone", "gstin"],
    fields: [
      { property: "code", column: "code", writable: true },
      { property: "customerType", column: "customer_type", writable: true },
      { property: "legalName", column: "legal_name", writable: true },
      { property: "tradeName", column: "trade_name", writable: true },
      { property: "contactPerson", column: "contact_person", writable: true },
      { property: "phone", column: "phone", writable: true },
      { property: "whatsappNumber", column: "whatsapp_number", writable: true },
      { property: "email", column: "email", writable: true },
      { property: "gstin", column: "gstin", writable: true },
      { property: "pan", column: "pan", writable: true },
      { property: "billingAddress", column: "billing_address", writable: true },
      { property: "state", column: "state", writable: true },
      { property: "district", column: "district", writable: true },
      { property: "pincode", column: "pincode", writable: true },
      { property: "creditLimit", column: "credit_limit", writable: true },
      { property: "creditDays", column: "credit_days", writable: true },
      { property: "defaultPriceList", column: "default_price_list", writable: true },
      { property: "accountManager", column: "account_manager", writable: true },
      { property: "notes", column: "notes", writable: true },
      ...commonFields
    ]
  },
  customerSites: {
    resource: "customerSites",
    table: "customer_sites",
    label: "Customer Sites",
    searchColumns: ["site_code", "site_name", "contact_person", "phone"],
    referenceChecks: [{ property: "customerId", table: "customers" }],
    fields: [
      { property: "customerId", column: "customer_id", writable: true },
      { property: "siteCode", column: "site_code", writable: true },
      { property: "siteName", column: "site_name", writable: true },
      { property: "contactPerson", column: "contact_person", writable: true },
      { property: "phone", column: "phone", writable: true },
      { property: "address", column: "address", writable: true },
      { property: "state", column: "state", writable: true },
      { property: "district", column: "district", writable: true },
      { property: "pincode", column: "pincode", writable: true },
      { property: "latitude", column: "latitude", writable: true },
      { property: "longitude", column: "longitude", writable: true },
      { property: "deliveryInstructions", column: "delivery_instructions", writable: true },
      { property: "defaultUnloadingMinutes", column: "default_unloading_minutes", writable: true },
      ...commonFields
    ]
  },
  suppliers: {
    resource: "suppliers",
    table: "suppliers",
    label: "Suppliers",
    searchColumns: ["code", "legal_name", "trade_name", "phone", "gstin"],
    typeColumn: "supplier_type",
    fields: [
      { property: "code", column: "code", writable: true },
      { property: "supplierType", column: "supplier_type", writable: true },
      { property: "legalName", column: "legal_name", writable: true },
      { property: "tradeName", column: "trade_name", writable: true },
      { property: "contactPerson", column: "contact_person", writable: true },
      { property: "phone", column: "phone", writable: true },
      { property: "whatsappNumber", column: "whatsapp_number", writable: true },
      { property: "email", column: "email", writable: true },
      { property: "gstin", column: "gstin", writable: true },
      { property: "pan", column: "pan", writable: true },
      { property: "address", column: "address", writable: true },
      { property: "state", column: "state", writable: true },
      { property: "district", column: "district", writable: true },
      { property: "pincode", column: "pincode", writable: true },
      { property: "creditDays", column: "credit_days", writable: true },
      { property: "paymentTerms", column: "payment_terms", writable: true },
      { property: "materialCategories", column: "material_categories", writable: true },
      { property: "notes", column: "notes", writable: true },
      ...commonFields
    ]
  },
  products: {
    resource: "products",
    table: "products",
    label: "Products",
    searchColumns: ["code", "name", "category", "hsn_or_sac_code"],
    typeColumn: "category",
    fields: [
      { property: "code", column: "code", writable: true },
      { property: "name", column: "name", writable: true },
      { property: "localLanguageName", column: "local_language_name", writable: true },
      { property: "category", column: "category", writable: true },
      { property: "description", column: "description", writable: true },
      { property: "hsnOrSacCode", column: "hsn_or_sac_code", writable: true },
      { property: "gstRate", column: "gst_rate", writable: true },
      { property: "baseUnit", column: "base_unit", writable: true },
      { property: "purchaseUnit", column: "purchase_unit", writable: true },
      { property: "salesUnit", column: "sales_unit", writable: true },
      { property: "bulkDensity", column: "bulk_density", writable: true },
      { property: "minStock", column: "min_stock", writable: true },
      { property: "maxStock", column: "max_stock", writable: true },
      { property: "reorderLevel", column: "reorder_level", writable: true },
      { property: "standardCost", column: "standard_cost", writable: true },
      { property: "defaultSellingPrice", column: "default_selling_price", writable: true },
      { property: "trackInventory", column: "track_inventory", writable: true },
      { property: "allowNegativeStock", column: "allow_negative_stock", writable: true },
      ...commonFields
    ]
  },
  productUnits: {
    resource: "productUnits",
    table: "product_unit_conversions",
    label: "Product Units",
    searchColumns: ["from_unit", "to_unit"],
    referenceChecks: [{ property: "productId", table: "products" }],
    fields: [
      { property: "productId", column: "product_id", writable: true },
      { property: "fromUnit", column: "from_unit", writable: true },
      { property: "toUnit", column: "to_unit", writable: true },
      { property: "factor", column: "factor", writable: true },
      { property: "effectiveFrom", column: "effective_from", writable: true },
      { property: "effectiveTo", column: "effective_to", writable: true },
      { property: "notes", column: "notes", writable: true },
      ...commonFields
    ]
  },
  productPrices: {
    resource: "productPrices",
    table: "product_prices",
    label: "Product Prices",
    searchColumns: ["price_type", "unit"],
    referenceChecks: [{ property: "productId", table: "products" }],
    fields: [
      { property: "productId", column: "product_id", writable: true },
      { property: "priceType", column: "price_type", writable: true },
      { property: "unit", column: "unit", writable: true },
      { property: "rate", column: "rate", writable: true },
      { property: "effectiveFrom", column: "effective_from", writable: true },
      { property: "effectiveTo", column: "effective_to", writable: true },
      ...commonFields
    ]
  },
  vehicles: {
    resource: "vehicles",
    table: "vehicles",
    label: "Vehicles",
    searchColumns: ["registration_number", "vehicle_type", "owner_name", "model"],
    typeColumn: "vehicle_type",
    fields: [
      { property: "registrationNumber", column: "registration_number", writable: true },
      { property: "vehicleCode", column: "vehicle_code", writable: true },
      { property: "vehicleType", column: "vehicle_type", writable: true },
      { property: "ownerType", column: "owner_type", writable: true },
      { property: "ownerName", column: "owner_name", writable: true },
      { property: "plantId", column: "plant_id", writable: true },
      { property: "capacity", column: "capacity", writable: true },
      { property: "capacityUnit", column: "capacity_unit", writable: true },
      { property: "capacityTonne", column: "capacity_tonne", writable: true },
      { property: "capacityCubicMetre", column: "capacity_cubic_metre", writable: true },
      { property: "manufacturer", column: "manufacturer", writable: true },
      { property: "model", column: "model", writable: true },
      { property: "manufacturingYear", column: "manufacturing_year", writable: true },
      { property: "fuelType", column: "fuel_type", writable: true },
      { property: "chassisNumber", column: "chassis_number", writable: true },
      { property: "engineNumber", column: "engine_number", writable: true },
      ...commonFields
    ]
  },
  drivers: {
    resource: "drivers",
    table: "drivers",
    label: "Drivers",
    searchColumns: ["code", "name", "phone", "licence_number"],
    referenceChecks: [{ property: "assignedVehicleId", table: "vehicles" }],
    fields: [
      { property: "code", column: "code", writable: true },
      { property: "name", column: "name", writable: true },
      { property: "phone", column: "phone", writable: true },
      { property: "alternatePhone", column: "alternate_phone", writable: true },
      { property: "licenceNumber", column: "licence_number", writable: true },
      { property: "licenceType", column: "licence_type", writable: true },
      { property: "licenceExpiry", column: "licence_expiry", writable: true },
      { property: "address", column: "address", writable: true },
      { property: "plantId", column: "plant_id", writable: true },
      { property: "assignedVehicleId", column: "assigned_vehicle_id", writable: true },
      { property: "emergencyContact", column: "emergency_contact", writable: true },
      ...commonFields
    ]
  },
  machines: {
    resource: "machines",
    table: "machines",
    label: "Machines",
    searchColumns: ["code", "name", "machine_type", "make", "model"],
    plantScoped: true,
    typeColumn: "machine_type",
    referenceChecks: [{ property: "parentMachineId", table: "machines" }],
    fields: [
      { property: "plantId", column: "plant_id", writable: true },
      { property: "code", column: "code", writable: true },
      { property: "name", column: "name", writable: true },
      { property: "machineType", column: "machine_type", writable: true },
      { property: "assetType", column: "asset_type", writable: true },
      { property: "parentMachineId", column: "parent_machine_id", writable: true },
      { property: "make", column: "make", writable: true },
      { property: "manufacturer", column: "manufacturer", writable: true },
      { property: "model", column: "model", writable: true },
      { property: "serialNumber", column: "serial_number", writable: true },
      { property: "commissioningDate", column: "commissioning_date", writable: true },
      { property: "capacity", column: "capacity", writable: true },
      { property: "capacityUnit", column: "capacity_unit", writable: true },
      { property: "meterType", column: "meter_type", writable: true },
      { property: "initialMeterValue", column: "initial_meter_value", writable: true },
      { property: "warrantyExpiry", column: "warranty_expiry", writable: true },
      { property: "notes", column: "notes", writable: true },
      ...commonFields
    ]
  },
  storageLocations: {
    resource: "storageLocations",
    table: "storage_locations",
    label: "Storage Locations",
    searchColumns: ["code", "name", "location_type"],
    plantScoped: true,
    typeColumn: "location_type",
    referenceChecks: [{ property: "parentLocationId", table: "storage_locations" }],
    fields: [
      { property: "plantId", column: "plant_id", writable: true },
      { property: "code", column: "code", writable: true },
      { property: "name", column: "name", writable: true },
      { property: "locationType", column: "location_type", writable: true },
      { property: "parentLocationId", column: "parent_location_id", writable: true },
      { property: "capacity", column: "capacity", writable: true },
      { property: "capacityUnit", column: "capacity_unit", writable: true },
      { property: "inventoryAllowed", column: "inventory_allowed", writable: true },
      { property: "negativeStockOverrideAllowed", column: "negative_stock_override_allowed", writable: true },
      { property: "notes", column: "notes", writable: true },
      ...commonFields
    ]
  },
  shifts: {
    resource: "shifts",
    table: "shifts",
    label: "Shifts",
    searchColumns: ["code", "name"],
    plantScoped: true,
    fields: [
      { property: "plantId", column: "plant_id", writable: true },
      { property: "code", column: "code", writable: true },
      { property: "name", column: "name", writable: true },
      { property: "startTime", column: "start_time", writable: true },
      { property: "endTime", column: "end_time", writable: true },
      { property: "crossesMidnight", column: "crosses_midnight", writable: true },
      { property: "breakDurationMinutes", column: "break_duration_minutes", writable: true },
      { property: "activeDays", column: "active_days", writable: true },
      { property: "notes", column: "notes", writable: true },
      ...commonFields
    ]
  }
};

let pool: Pool | undefined;

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required.");
  }

  pool ??= new Pool({ connectionString });
  return pool;
}

export function isMasterDataResource(resource: string): resource is MasterDataResource {
  return Object.hasOwn(masterDataResources, resource);
}

export async function listMasterData(
  context: TenantContext,
  resource: MasterDataResource,
  options: MasterDataListOptions
): Promise<MasterDataListResult> {
  const config = masterDataResources[resource];

  return withTenantClient(context, async (client) => {
    const where = createWhereClause(config, options);
    const limit = Math.min(Math.max(options.pageSize, 1), 100);
    const offset = (Math.max(options.page, 1) - 1) * limit;
    const selectColumns = config.fields.map((field) => `${field.column} as "${field.property}"`);
    const rows = await client.query<Record<string, unknown>>(
      `select ${selectColumns.join(", ")} from ${config.table} ${where.sql} order by ${getSortSql(config, options.sort)} limit $${where.values.length + 1} offset $${where.values.length + 2}`,
      [...where.values, limit, offset]
    );
    const count = await client.query<{ total: string }>(
      `select count(*) as total from ${config.table} ${where.sql}`,
      where.values
    );

    return {
      resource,
      rows: rows.rows,
      total: Number(count.rows[0]?.total ?? 0),
      page: options.page,
      pageSize: limit
    };
  });
}

export async function createMasterData(
  context: TenantContext,
  resource: MasterDataResource,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const config = masterDataResources[resource];

  return withTenantClient(context, async (client) => {
    const normalisedPayload = normalisePayload(payload);
    await assertWritableReferences(client, context, config, normalisedPayload);
    assertAllowedPlant(context, normalisedPayload);

    const writableFields = config.fields.filter((field) => field.writable && normalisedPayload[field.property] !== undefined);
    const columns = ["organisation_id", ...writableFields.map((field) => field.column), "created_by_user_id", "updated_by_user_id"];
    const values = [context.organisationId, ...writableFields.map((field) => normalisedPayload[field.property]), context.userId, context.userId];
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const returning = config.fields.map((field) => `${field.column} as "${field.property}"`);
    const result = await client.query<Record<string, unknown>>(
      `insert into ${config.table} (${columns.join(", ")}) values (${placeholders.join(", ")}) returning ${returning.join(", ")}`,
      values
    );
    const row = requireRow(result.rows[0]);
    await insertAudit(client, context, `${resource}.create`, config.table, String(row.id), undefined, row);
    return row;
  });
}

export async function updateMasterData(
  context: TenantContext,
  resource: MasterDataResource,
  id: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const config = masterDataResources[resource];

  return withTenantClient(context, async (client) => {
    const previous = await findMasterDataById(client, config, id);
    const normalisedPayload = normalisePayload(payload);
    await assertWritableReferences(client, context, config, normalisedPayload);
    assertAllowedPlant(context, normalisedPayload);
    await assertNoHierarchyCycle(client, config, id, normalisedPayload);

    const writableFields = config.fields.filter((field) => field.writable && normalisedPayload[field.property] !== undefined);
    const values = writableFields.map((field) => normalisedPayload[field.property]);
    values.push(context.userId, id);
    const assignments = writableFields.map((field, index) => `${field.column} = $${index + 1}`);
    assignments.push(`updated_by_user_id = $${writableFields.length + 1}`, "updated_at = now()");
    const returning = config.fields.map((field) => `${field.column} as "${field.property}"`);
    const result = await client.query<Record<string, unknown>>(
      `update ${config.table} set ${assignments.join(", ")} where id = $${writableFields.length + 2} and deleted_at is null returning ${returning.join(", ")}`,
      values
    );
    const row = requireRow(result.rows[0]);
    await insertAudit(client, context, `${resource}.update`, config.table, id, previous, row);
    return row;
  });
}

export async function deleteMasterData(
  context: TenantContext,
  resource: MasterDataResource,
  id: string
): Promise<Record<string, unknown>> {
  const config = masterDataResources[resource];

  return withTenantClient(context, async (client) => {
    const previous = await findMasterDataById(client, config, id);
    const returning = config.fields.map((field) => `${field.column} as "${field.property}"`);
    const result = await client.query<Record<string, unknown>>(
      `update ${config.table} set deleted_at = now(), active = false, deactivated_at = now(), deactivated_by_user_id = $1, updated_by_user_id = $1, updated_at = now() where id = $2 and deleted_at is null returning ${returning.join(", ")}`,
      [context.userId, id]
    );
    const row = requireRow(result.rows[0]);
    await insertAudit(client, context, `${resource}.delete`, config.table, id, previous, row);
    return row;
  });
}

export async function listMasterDataAuditHistory(
  context: TenantContext,
  resource: MasterDataResource,
  id: string
): Promise<MasterDataAuditEvent[]> {
  const config = masterDataResources[resource];

  return withTenantClient(context, async (client) => {
    const result = await client.query<{
      id: string;
      eventType: string;
      entityType: string;
      entityId: string;
      actorUserId: string | null;
      previousValue: Record<string, unknown> | null;
      newValue: Record<string, unknown> | null;
      createdAt: Date;
    }>(
      `select
        id,
        event_type as "eventType",
        entity_type as "entityType",
        entity_id as "entityId",
        actor_user_id as "actorUserId",
        previous_value as "previousValue",
        new_value as "newValue",
        created_at as "createdAt"
      from audit_logs
      where entity_type = $1 and entity_id = $2
      order by created_at desc
      limit 50`,
      [config.table, id]
    );

    return result.rows;
  });
}

export function toCsv(result: MasterDataListResult): string {
  const fields = masterDataResources[result.resource].fields.map((field) => field.property);
  const lines = [fields.join(",")];

  for (const row of result.rows) {
    lines.push(fields.map((field) => csvValue(row[field])).join(","));
  }

  return lines.join("\n");
}

async function withTenantClient<T>(
  context: TenantContext,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();

  try {
    await client.query("begin");
    await client.query("set local role crushermitra_app");
    await client.query("select set_config('app.current_organisation_id', $1, true)", [context.organisationId]);
    await client.query("select set_config('app.current_user_id', $1, true)", [context.userId]);
    await client.query("select set_config('app.allowed_plant_ids', $1, true)", [context.allowedPlantIds.join(",")]);

    if (context.activePlantId) {
      await client.query("select set_config('app.current_plant_id', $1, true)", [context.activePlantId]);
    }

    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function findMasterDataById(
  client: PoolClient,
  config: ResourceConfig,
  id: string
): Promise<Record<string, unknown>> {
  const selectColumns = config.fields.map((field) => `${field.column} as "${field.property}"`);
  const result = await client.query<Record<string, unknown>>(
    `select ${selectColumns.join(", ")} from ${config.table} where id = $1 and deleted_at is null`,
    [id]
  );

  return requireRow(result.rows[0]);
}

async function assertWritableReferences(
  client: PoolClient,
  context: TenantContext,
  config: ResourceConfig,
  payload: Record<string, unknown>
): Promise<void> {
  for (const reference of config.referenceChecks ?? []) {
    const value = payload[reference.property];

    if (typeof value !== "string") {
      continue;
    }

    const result = await client.query(
      `select id from ${reference.table} where id = $1 and organisation_id = $2 and deleted_at is null`,
      [value, context.organisationId]
    );

    if (result.rowCount !== 1) {
      throw new Error(`Invalid reference for ${reference.property}.`);
    }
  }
}

function assertAllowedPlant(context: TenantContext, payload: Record<string, unknown>): void {
  const plantId = payload.plantId;

  if (typeof plantId === "string" && !context.allowedPlantIds.includes(plantId)) {
    throw new Error("Tenant isolation violation: plant access denied.");
  }
}

async function assertNoHierarchyCycle(
  client: PoolClient,
  config: ResourceConfig,
  id: string,
  payload: Record<string, unknown>
): Promise<void> {
  const hierarchy =
    config.resource === "machines"
      ? { property: "parentMachineId", column: "parent_machine_id" }
      : config.resource === "storageLocations"
        ? { property: "parentLocationId", column: "parent_location_id" }
        : undefined;

  if (!hierarchy) {
    return;
  }

  const parentId = payload[hierarchy.property];

  if (typeof parentId !== "string" || !parentId) {
    return;
  }

  if (parentId === id) {
    throw new Error("A record cannot be its own parent.");
  }

  const result = await client.query<{ id: string }>(
    `with recursive parents as (
      select id, ${hierarchy.column} as parent_id
      from ${config.table}
      where id = $1 and deleted_at is null
      union all
      select parent.id, parent.${hierarchy.column} as parent_id
      from ${config.table} parent
      join parents on parent.id = parents.parent_id
      where parent.deleted_at is null
    )
    select id from parents where id = $2 limit 1`,
    [parentId, id]
  );

  if (result.rowCount) {
    throw new Error("Parent hierarchy cannot contain a cycle.");
  }
}

function normalisePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() : value
    ])
  );
}

function createWhereClause(config: ResourceConfig, options: MasterDataListOptions): { sql: string; values: string[] } {
  const clauses = ["deleted_at is null"];
  const values: string[] = [];

  if (options.status !== "all") {
    clauses.push(`active = ${options.status === "inactive" ? "false" : "true"}`);
  }

  if (config.plantScoped && options.plantId) {
    values.push(options.plantId);
    clauses.push(`plant_id = $${values.length}`);
  }

  if (config.typeColumn && options.type) {
    values.push(options.type);
    clauses.push(`${config.typeColumn} = $${values.length}`);
  }

  if (options.search?.trim()) {
    values.push(`%${options.search.trim()}%`);
    const searchSql = config.searchColumns
      .map((column) => `${column}::text ilike $${values.length}`)
      .join(" or ");
    clauses.push(`(${searchSql})`);
  }

  return {
    sql: `where ${clauses.join(" and ")}`,
    values
  };
}

function getSortSql(config: ResourceConfig, sort?: string): string {
  if (sort === "code" && config.fields.some((field) => field.column === "code")) {
    return "code asc";
  }

  if (sort === "name" && config.fields.some((field) => field.column === "name")) {
    return "name asc";
  }

  if (sort === "createdAt") {
    return "created_at desc";
  }

  return "updated_at desc nulls last, created_at desc";
}

async function insertAudit(
  client: PoolClient,
  context: TenantContext,
  eventType: string,
  entityType: string,
  entityId: string,
  previousValue: Record<string, unknown> | undefined,
  newValue: Record<string, unknown>
): Promise<void> {
  await client.query(
    `insert into audit_logs (
      organisation_id,
      plant_id,
      actor_user_id,
      event_type,
      entity_type,
      entity_id,
      previous_value,
      new_value,
      request_id
    ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      context.organisationId,
      context.activePlantId ?? null,
      context.userId,
      eventType,
      entityType,
      entityId,
      previousValue ? JSON.stringify(previousValue) : null,
      JSON.stringify(newValue),
      createLocalRequestId("audit")
    ]
  );
}

function createLocalRequestId(prefix = "req"): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

function requireRow(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) {
    throw new Error("Record not found.");
  }

  return row;
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
