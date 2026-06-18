import type { PoolClient } from "pg";
import { getPool } from "./master-data";
import {
  postDispatchCancellationReversalInTransaction,
  postDispatchStockReductionInTransaction
} from "./inventory-ledger";
import type { TenantContext } from "./index";

export type WorkflowResource = "orders" | "dispatches" | "operations" | "billing";

interface WorkflowField {
  property: string;
  column: string;
  writable?: boolean;
}

interface WorkflowConfig {
  table: string;
  numberColumn: string;
  numberPrefix: string;
  dateColumn: string;
  fields: WorkflowField[];
  searchColumns: string[];
  joins: string;
  selectExtras: string[];
  references: Array<{ property: string; table: string; plantScoped?: boolean }>;
}

export interface WorkflowListOptions {
  page: number;
  pageSize: number;
  search?: string;
  fromDate?: string;
  toDate?: string;
  status?: string;
  customerId?: string;
  productId?: string;
  vehicleId?: string;
  driverId?: string;
  operationType?: string;
}

export interface WorkflowListResult {
  resource: WorkflowResource;
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
}

const commonFields: WorkflowField[] = [
  { property: "id", column: "id" },
  { property: "plantId", column: "plant_id" },
  { property: "status", column: "status", writable: true },
  { property: "notes", column: "notes", writable: true },
  { property: "createdAt", column: "created_at" },
  { property: "updatedAt", column: "updated_at" }
];

export const workflowResources: Record<WorkflowResource, WorkflowConfig> = {
  orders: {
    table: "customer_orders",
    numberColumn: "order_number",
    numberPrefix: "ORD",
    dateColumn: "order_date",
    searchColumns: ["customer_orders.order_number", "customers.legal_name", "products.name", "customer_orders.notes"],
    joins:
      "left join customers on customers.id = customer_orders.customer_id left join customer_sites on customer_sites.id = customer_orders.customer_site_id left join products on products.id = customer_orders.product_id",
    selectExtras: [
      "customers.legal_name as \"customerName\"",
      "customer_sites.site_name as \"siteName\"",
      "products.name as \"productName\""
    ],
    references: [
      { property: "customerId", table: "customers" },
      { property: "customerSiteId", table: "customer_sites" },
      { property: "productId", table: "products" }
    ],
    fields: [
      { property: "orderNumber", column: "order_number" },
      { property: "customerId", column: "customer_id", writable: true },
      { property: "customerSiteId", column: "customer_site_id", writable: true },
      { property: "productId", column: "product_id", writable: true },
      { property: "orderDate", column: "order_date", writable: true },
      { property: "expectedDispatchDate", column: "expected_dispatch_date", writable: true },
      { property: "quantity", column: "quantity", writable: true },
      { property: "unit", column: "unit", writable: true },
      { property: "rate", column: "rate", writable: true },
      { property: "paidAmount", column: "paid_amount", writable: true },
      { property: "totalAmount", column: "total_amount", writable: true },
      { property: "balanceAmount", column: "balance_amount" },
      ...commonFields
    ]
  },
  dispatches: {
    table: "dispatch_records",
    numberColumn: "dispatch_number",
    numberPrefix: "DSP",
    dateColumn: "dispatch_date",
    searchColumns: [
      "dispatch_records.dispatch_number",
      "dispatch_records.delivery_challan_number",
      "customers.legal_name",
      "products.name",
      "vehicles.registration_number",
      "drivers.name"
    ],
    joins:
      "left join customer_orders on customer_orders.id = dispatch_records.order_id left join customers on customers.id = dispatch_records.customer_id left join customer_sites on customer_sites.id = dispatch_records.customer_site_id left join products on products.id = dispatch_records.product_id left join vehicles on vehicles.id = dispatch_records.vehicle_id left join drivers on drivers.id = dispatch_records.driver_id left join storage_locations on storage_locations.id = dispatch_records.source_storage_location_id",
    selectExtras: [
      "customer_orders.order_number as \"orderNumber\"",
      "customers.legal_name as \"customerName\"",
      "customer_sites.site_name as \"siteName\"",
      "products.name as \"productName\"",
      "storage_locations.name as \"sourceStorageLocationName\"",
      "vehicles.registration_number as \"vehicleNumber\"",
      "drivers.name as \"driverName\""
    ],
    references: [
      { property: "orderId", table: "customer_orders" },
      { property: "customerId", table: "customers" },
      { property: "customerSiteId", table: "customer_sites" },
      { property: "vehicleId", table: "vehicles" },
      { property: "driverId", table: "drivers" },
      { property: "productId", table: "products" },
      { property: "sourceStorageLocationId", table: "storage_locations", plantScoped: true }
    ],
    fields: [
      { property: "dispatchNumber", column: "dispatch_number" },
      { property: "orderId", column: "order_id", writable: true },
      { property: "customerId", column: "customer_id", writable: true },
      { property: "customerSiteId", column: "customer_site_id", writable: true },
      { property: "vehicleId", column: "vehicle_id", writable: true },
      { property: "driverId", column: "driver_id", writable: true },
      { property: "productId", column: "product_id", writable: true },
      { property: "sourceStorageLocationId", column: "source_storage_location_id", writable: true },
      { property: "inventoryTransactionId", column: "inventory_transaction_id" },
      { property: "cancellationInventoryTransactionId", column: "cancellation_inventory_transaction_id" },
      { property: "cancellationReason", column: "cancellation_reason", writable: true },
      { property: "cancelledAt", column: "cancelled_at" },
      { property: "dispatchDate", column: "dispatch_date", writable: true },
      { property: "quantity", column: "quantity", writable: true },
      { property: "unit", column: "unit", writable: true },
      { property: "firstWeight", column: "first_weight", writable: true },
      { property: "secondWeight", column: "second_weight", writable: true },
      { property: "netWeight", column: "net_weight", writable: true },
      { property: "rate", column: "rate", writable: true },
      { property: "dispatchAmount", column: "dispatch_amount", writable: true },
      { property: "paymentStatus", column: "payment_status", writable: true },
      { property: "paidAmount", column: "paid_amount", writable: true },
      { property: "balanceAmount", column: "balance_amount" },
      { property: "deliveryChallanNumber", column: "delivery_challan_number", writable: true },
      ...commonFields
    ]
  },
  operations: {
    table: "operation_records",
    numberColumn: "operation_number",
    numberPrefix: "OPS",
    dateColumn: "operation_date",
    searchColumns: ["operation_records.operation_number", "operation_records.operation_type", "products.name", "machines.name", "operation_records.notes"],
    joins:
      "left join products on products.id = operation_records.product_id left join machines on machines.id = operation_records.machine_id",
    selectExtras: ["products.name as \"productName\"", "machines.name as \"machineName\""],
    references: [
      { property: "productId", table: "products" },
      { property: "machineId", table: "machines" }
    ],
    fields: [
      { property: "operationNumber", column: "operation_number" },
      { property: "operationType", column: "operation_type", writable: true },
      { property: "productId", column: "product_id", writable: true },
      { property: "machineId", column: "machine_id", writable: true },
      { property: "operationDate", column: "operation_date", writable: true },
      { property: "quantity", column: "quantity", writable: true },
      { property: "unit", column: "unit", writable: true },
      { property: "productionCost", column: "production_cost", writable: true },
      { property: "materialCost", column: "material_cost", writable: true },
      { property: "machineCost", column: "machine_cost", writable: true },
      ...commonFields
    ]
  },
  billing: {
    table: "billing_records",
    numberColumn: "invoice_number",
    numberPrefix: "INV",
    dateColumn: "billing_date",
    searchColumns: ["billing_records.invoice_number", "customers.legal_name", "billing_records.notes"],
    joins: "left join customers on customers.id = billing_records.customer_id",
    selectExtras: ["customers.legal_name as \"customerName\""],
    references: [{ property: "customerId", table: "customers" }],
    fields: [
      { property: "invoiceNumber", column: "invoice_number", writable: true },
      { property: "customerId", column: "customer_id", writable: true },
      { property: "billingDate", column: "billing_date", writable: true },
      { property: "dueDate", column: "due_date", writable: true },
      { property: "amount", column: "amount", writable: true },
      { property: "planAmount", column: "plan_amount", writable: true },
      { property: "paymentAmount", column: "payment_amount", writable: true },
      { property: "paymentMethod", column: "payment_method", writable: true },
      { property: "paymentStatus", column: "payment_status", writable: true },
      ...commonFields
    ]
  }
};

export async function listWorkflowData(
  context: TenantContext,
  resource: WorkflowResource,
  options: WorkflowListOptions
): Promise<WorkflowListResult> {
  const config = workflowResources[resource];

  return withWorkflowClient(context, async (client) => {
    const where = createWhere(config, options);
    const limit = Math.min(Math.max(options.pageSize, 1), 100);
    const offset = (Math.max(options.page, 1) - 1) * limit;
    const selectColumns = [
      ...config.fields.map((field) => `${config.table}.${field.column} as "${field.property}"`),
      ...config.selectExtras
    ];
    const rows = await client.query<Record<string, unknown>>(
      `select ${selectColumns.join(", ")} from ${config.table} ${config.joins} ${where.sql} order by ${config.table}.updated_at desc limit $${where.values.length + 1} offset $${where.values.length + 2}`,
      [...where.values, limit, offset]
    );
    const count = await client.query<{ total: string }>(
      `select count(*) as total from ${config.table} ${config.joins} ${where.sql}`,
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

export async function createWorkflowData(
  context: TenantContext,
  resource: WorkflowResource,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const config = workflowResources[resource];

  return withWorkflowClient(context, async (client) => {
    await assertReferences(client, context, config, payload);
    const enriched = enrichPayload(config, payload);
    const writableFields = config.fields.filter((field) => field.writable && enriched[field.property] !== undefined);
    const columns = [
      "organisation_id",
      "plant_id",
      config.numberColumn,
      ...writableFields.map((field) => field.column),
      "created_by_user_id",
      "updated_by_user_id"
    ];
    const values = [
      context.organisationId,
      context.activePlantId ?? context.allowedPlantIds[0],
      createDocumentNumber(config.numberPrefix),
      ...writableFields.map((field) => enriched[field.property]),
      context.userId,
      context.userId
    ];
    const returning = config.fields.map((field) => `${field.column} as "${field.property}"`);
    const result = await client.query<Record<string, unknown>>(
      `insert into ${config.table} (${columns.join(", ")}) values (${values.map((_, index) => `$${index + 1}`).join(", ")}) returning ${returning.join(", ")}`,
      values
    );
    const row = requireRow(result.rows[0]);
    if (resource === "dispatches") {
      await postDispatchStockIfReady(client, context, row);
    }
    if (resource === "orders") {
      await syncOrderReservation(client, context, row);
    }
    await insertWorkflowAudit(client, context, `${resource}.create`, config.table, String(row.id), undefined, row);
    return row;
  });
}

export async function updateWorkflowData(
  context: TenantContext,
  resource: WorkflowResource,
  id: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const config = workflowResources[resource];

  return withWorkflowClient(context, async (client) => {
    const previous = await findWorkflowRow(client, config, id);
    if (config.table === "operation_records" && previous.status === "completed") {
      throw new Error("Completed production records require a correction workflow.");
    }
    const cancellingPostedDispatch = config.table === "dispatch_records" && previous.inventoryTransactionId && payload.status === "cancelled";
    if (config.table === "dispatch_records" && previous.inventoryTransactionId && !cancellingPostedDispatch) {
      throw new Error("Dispatched records with posted stock are immutable. Use a correction workflow.");
    }

    await assertReferences(client, context, config, payload);
    const enriched = enrichPayload(config, payload);
    const writableFields = config.fields.filter((field) => field.writable && enriched[field.property] !== undefined);
    const values = [...writableFields.map((field) => enriched[field.property]), context.userId, id];
    const assignments = writableFields.map((field, index) => `${field.column} = $${index + 1}`);
    assignments.push(`updated_by_user_id = $${writableFields.length + 1}`, "updated_at = now()");
    const returning = config.fields.map((field) => `${field.column} as "${field.property}"`);
    const result = await client.query<Record<string, unknown>>(
      `update ${config.table} set ${assignments.join(", ")} where id = $${writableFields.length + 2} and deleted_at is null returning ${returning.join(", ")}`,
      values
    );
    const row = requireRow(result.rows[0]);
    if (resource === "dispatches") {
      await postDispatchStockIfReady(client, context, row);
      if (cancellingPostedDispatch) {
        await postDispatchCancellationReversal(client, context, row, String(payload.notes ?? payload.cancellationReason ?? "Dispatch cancelled"));
      }
    }
    if (resource === "orders") {
      await syncOrderReservation(client, context, row);
    }
    await insertWorkflowAudit(client, context, `${resource}.update`, config.table, id, previous, row);
    return row;
  });
}

async function syncOrderReservation(
  client: PoolClient,
  context: TenantContext,
  row: Record<string, unknown>
): Promise<void> {
  const orderId = String(row.id ?? "");
  const plantId = String(row.plantId ?? context.activePlantId ?? context.allowedPlantIds[0]);
  const productId = String(row.productId ?? "");
  const status = String(row.status ?? "");

  if (!orderId || !plantId || !productId) {
    return;
  }

  await releaseOrderReservations(client, context, orderId, status === "approved" ? "reallocated" : "released");

  if (status !== "approved") {
    return;
  }

  const conversionFactor = await resolveOrderConversionFactor(client, productId, String(row.unit ?? ""));
  const quantityBaseUnit = roundQuantity(Number(row.quantity ?? 0) * conversionFactor);
  await allocateOrderReservations(client, context, {
    plantId,
    orderId,
    productId,
    quantityBaseUnit,
    unit: String(row.unit ?? ""),
    conversionFactor
  });
  await insertWorkflowAudit(client, context, "inventory.reservation.sync", "stock_reservations", orderId, undefined, {
    orderId,
    productId,
    quantityBaseUnit,
    status: "reserved"
  });
}

export async function expireStockReservations(
  context: TenantContext,
  options: { plantId?: string; now?: string } = {}
): Promise<Record<string, unknown>> {
  return withWorkflowClient(context, async (client) => {
    const plantId = options.plantId ?? context.activePlantId ?? context.allowedPlantIds[0];
    if (!plantId) {
      throw new Error("Reservation expiry requires an active plant.");
    }
    const result = await client.query<{ count: string }>(
      `update stock_reservations
       set status = 'expired',
           released_at = coalesce(released_at, now()),
           updated_by_user_id = $1,
           updated_at = now()
       where organisation_id = $2
         and plant_id = $3
         and status = 'reserved'
         and reserved_until is not null
         and reserved_until < coalesce($4::timestamptz, now())
       returning id`,
      [context.userId, context.organisationId, plantId, options.now ?? null]
    );
    const row = { expiredCount: result.rowCount ?? 0, plantId };
    await insertWorkflowAudit(client, context, "inventory.reservation.expire", "stock_reservations", plantId, undefined, row);
    return row;
  });
}

export async function reallocateOrderReservations(
  context: TenantContext,
  orderId: string,
  options: { reservedUntil?: string } = {}
): Promise<Record<string, unknown>> {
  return withWorkflowClient(context, async (client) => {
    const order = await client.query<Record<string, unknown>>(
      `select
        id,
        plant_id as "plantId",
        product_id as "productId",
        quantity,
        unit,
        status
       from customer_orders
       where id = $1 and organisation_id = $2 and plant_id::text = any($3::text[]) and deleted_at is null
       for update`,
      [orderId, context.organisationId, context.allowedPlantIds]
    );
    const row = requireRow(order.rows[0]);
    if (row.status !== "approved") {
      throw new Error("Only approved orders can be reallocated.");
    }
    await releaseOrderReservations(client, context, orderId, "reallocated");
    const conversionFactor = await resolveOrderConversionFactor(client, String(row.productId), String(row.unit ?? ""));
    const quantityBaseUnit = roundQuantity(Number(row.quantity ?? 0) * conversionFactor);
    const allocations = await allocateOrderReservations(client, context, {
      plantId: String(row.plantId),
      orderId,
      productId: String(row.productId),
      quantityBaseUnit,
      unit: String(row.unit ?? ""),
      conversionFactor,
      reservedUntil: options.reservedUntil
    });
    const result = { orderId, allocations };
    await insertWorkflowAudit(client, context, "inventory.reservation.reallocate", "stock_reservations", orderId, row, result);
    return result;
  });
}

async function releaseOrderReservations(
  client: PoolClient,
  context: TenantContext,
  orderId: string,
  allocationStatus: "released" | "reallocated"
): Promise<void> {
  await client.query(
    `update stock_reservations
     set status = case when status = 'reserved' then 'released' else status end,
         allocation_status = $1,
         released_at = coalesce(released_at, now()),
         updated_by_user_id = $2,
         updated_at = now()
     where organisation_id = $3 and source_order_id = $4 and status = 'reserved'`,
    [allocationStatus, context.userId, context.organisationId, orderId]
  );
}

async function allocateOrderReservations(
  client: PoolClient,
  context: TenantContext,
  allocation: {
    plantId: string;
    orderId: string;
    productId: string;
    quantityBaseUnit: number;
    unit: string;
    conversionFactor: number;
    reservedUntil?: string;
  }
): Promise<Array<Record<string, unknown>>> {
  let remaining = allocation.quantityBaseUnit;
  const candidates = await client.query<{
    storageLocationId: string;
    availableQuantityBaseUnit: string;
  }>(
    `select
      inventory_balances.storage_location_id as "storageLocationId",
      inventory_balances.quantity_base_unit - coalesce(reserved.quantity_base_unit, 0) as "availableQuantityBaseUnit"
     from inventory_balances
     join storage_locations on storage_locations.id = inventory_balances.storage_location_id
     left join lateral (
       select coalesce(sum(quantity_base_unit), 0) as quantity_base_unit
       from stock_reservations
       where stock_reservations.organisation_id = inventory_balances.organisation_id
         and stock_reservations.plant_id = inventory_balances.plant_id
         and stock_reservations.storage_location_id = inventory_balances.storage_location_id
         and stock_reservations.product_id = inventory_balances.product_id
         and stock_reservations.status = 'reserved'
     ) reserved on true
     where inventory_balances.organisation_id = $1
       and inventory_balances.plant_id = $2
       and inventory_balances.product_id = $3
       and storage_locations.inventory_allowed = true
       and storage_locations.deleted_at is null
     order by "availableQuantityBaseUnit" desc, inventory_balances.updated_at asc
     for update of inventory_balances`,
    [context.organisationId, allocation.plantId, allocation.productId]
  );

  const allocations: Array<Record<string, unknown>> = [];
  for (const candidate of candidates.rows) {
    if (remaining <= 0) break;
    const available = Number(candidate.availableQuantityBaseUnit);
    if (available <= 0) continue;
    const reservedQuantity = roundQuantity(Math.min(available, remaining));
    remaining = roundQuantity(remaining - reservedQuantity);
    const inserted = await client.query<Record<string, unknown>>(
      `insert into stock_reservations (
        organisation_id, plant_id, storage_location_id, source_order_id, product_id,
        quantity_base_unit, unit, conversion_factor, status, allocation_status,
        reserved_until, released_at, created_by_user_id, updated_by_user_id
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,'reserved',$9,$10,null,$11,$11)
      on conflict (organisation_id, plant_id, source_order_id, product_id, storage_location_id) do update set
        quantity_base_unit = excluded.quantity_base_unit,
        unit = excluded.unit,
        conversion_factor = excluded.conversion_factor,
        status = 'reserved',
        allocation_status = excluded.allocation_status,
        reserved_until = excluded.reserved_until,
        released_at = null,
        updated_by_user_id = excluded.updated_by_user_id,
        updated_at = now()
      returning id, storage_location_id as "storageLocationId", quantity_base_unit as "quantityBaseUnit", status, allocation_status as "allocationStatus"`,
      [
        context.organisationId,
        allocation.plantId,
        candidate.storageLocationId,
        allocation.orderId,
        allocation.productId,
        reservedQuantity,
        allocation.unit,
        allocation.conversionFactor,
        remaining > 0 ? "partial" : "allocated",
        allocation.reservedUntil ?? null,
        context.userId
      ]
    );
    allocations.push(requireRow(inserted.rows[0]));
  }

  if (remaining > 0) {
    throw new Error("Insufficient available stock to reserve this approved order.");
  }

  return allocations;
}

async function postDispatchCancellationReversal(
  client: PoolClient,
  context: TenantContext,
  row: Record<string, unknown>,
  reason: string
): Promise<void> {
  const dispatchId = String(row.id ?? "");
  if (!dispatchId) {
    throw new Error("Dispatch cancellation requires a dispatch id.");
  }
  const reversal = await postDispatchCancellationReversalInTransaction(client, context, dispatchId, reason);
  await client.query(
    `update dispatch_records
     set cancellation_inventory_transaction_id = $1,
         cancellation_reason = $2,
         cancelled_at = coalesce(cancelled_at, now()),
         updated_at = now()
     where id = $3 and cancellation_inventory_transaction_id is null`,
    [reversal.inventoryTransactionId, reason, dispatchId]
  );
  row.cancellationInventoryTransactionId = reversal.inventoryTransactionId;
  row.cancellationReason = reason;
}

async function resolveOrderConversionFactor(client: PoolClient, productId: string, unit: string): Promise<number> {
  const product = await client.query<{ baseUnit: string }>(
    "select base_unit as \"baseUnit\" from products where id = $1 and deleted_at is null",
    [productId]
  );
  const baseUnit = product.rows[0]?.baseUnit;
  if (!baseUnit) {
    throw new Error("Invalid product for stock reservation.");
  }
  if (normaliseUnit(unit) === normaliseUnit(baseUnit)) {
    return 1;
  }
  const conversion = await client.query<{ factor: string }>(
    `select factor
     from product_unit_conversions
     where product_id = $1
       and lower(trim(from_unit)) = lower(trim($2))
       and lower(trim(to_unit)) = lower(trim($3))
       and deleted_at is null
       and active = true
     order by effective_from desc
     limit 1`,
    [productId, unit, baseUnit]
  );
  if (!conversion.rows[0]) {
    throw new Error(`No active unit conversion from ${unit} to ${baseUnit}.`);
  }
  return Number(conversion.rows[0].factor);
}

export async function deleteWorkflowData(
  context: TenantContext,
  resource: WorkflowResource,
  id: string
): Promise<Record<string, unknown>> {
  const config = workflowResources[resource];

  return withWorkflowClient(context, async (client) => {
    const previous = await findWorkflowRow(client, config, id);
    const returning = config.fields.map((field) => `${field.column} as "${field.property}"`);
    const result = await client.query<Record<string, unknown>>(
      `update ${config.table} set deleted_at = now(), updated_by_user_id = $1, updated_at = now() where id = $2 and deleted_at is null returning ${returning.join(", ")}`,
      [context.userId, id]
    );
    const row = requireRow(result.rows[0]);
    await insertWorkflowAudit(client, context, `${resource}.delete`, config.table, id, previous, row);
    return row;
  });
}

export async function getDashboardSummary(context: TenantContext): Promise<Record<string, unknown>> {
  return withWorkflowClient(context, async (client) => {
    const customers = await scalar(client, "select count(*) from customers where deleted_at is null and active = true");
    const activeOrders = await scalar(client, "select count(*) from customer_orders where deleted_at is null and status in ('draft','confirmed','approved','ready')");
    const dispatchQuantity = await scalar(client, "select coalesce(sum(quantity), 0) from dispatch_records where deleted_at is null and dispatch_date = current_date");
    const pendingDispatches = await scalar(client, "select count(*) from dispatch_records where deleted_at is null and status in ('draft','ready')");
    const crusherProduction = await scalar(client, "select coalesce(sum(quantity), 0) from operation_records where deleted_at is null and operation_type = 'crusher_shift_run' and operation_date = current_date");
    const rmcProduction = await scalar(client, "select coalesce(sum(quantity), 0) from operation_records where deleted_at is null and operation_type = 'rmc_batch' and operation_date = current_date");
    const receivables = await scalar(client, "select coalesce(sum(total_amount), 0) + coalesce((select sum(dispatch_amount) from dispatch_records where deleted_at is null), 0) + coalesce((select sum(amount) from billing_records where deleted_at is null), 0) from customer_orders where deleted_at is null");
    const paid = await scalar(client, "select coalesce(sum(paid_amount), 0) + coalesce((select sum(paid_amount) from dispatch_records where deleted_at is null), 0) + coalesce((select sum(payment_amount) from billing_records where deleted_at is null), 0) from customer_orders where deleted_at is null");
    const approvals = await scalar(client, "select count(*) from operation_records where deleted_at is null and status = 'pending'");
    const activity = await client.query<Record<string, unknown>>(
      `select event_type as "eventType", entity_type as "entityType", new_value as "newValue", created_at as "createdAt"
       from audit_logs order by created_at desc limit 4`
    );
    const alerts = await client.query<Record<string, unknown>>(
      `select severity, message, created_at as "createdAt"
       from ai_safety_events order by created_at desc limit 5`
    );

    return {
      cards: {
        totalCustomers: Number(customers),
        activeOrders: Number(activeOrders),
        todayDispatchQuantity: Number(dispatchQuantity),
        pendingDispatches: Number(pendingDispatches),
        crusherProduction: Number(crusherProduction),
        rmcProduction: Number(rmcProduction),
        receivables: Math.max(Number(receivables) - Number(paid), 0),
        pendingApprovals: Number(approvals)
      },
      recentActivity: activity.rows,
      aiAlerts: alerts.rows,
      receivablesFormula: "Receivables = Total billable amount - Payments received",
      receivablesEstimated: true
    };
  });
}

export function workflowsToCsv(result: WorkflowListResult, moduleName: string, filters: Record<string, unknown>): string {
  const rows = result.rows;
  const headers = rows[0] ? Object.keys(rows[0]) : ["id"];
  const meta = [
    ["App name", "CrusherMitra AI"],
    ["Module name", moduleName],
    ["Export date/time", new Date().toISOString()],
    ["Applied filters", JSON.stringify(filters)]
  ];
  return [
    ...meta.map((row) => row.map(csvValue).join(",")),
    "",
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(","))
  ].join("\n");
}

async function withWorkflowClient<T>(context: TenantContext, callback: (client: PoolClient) => Promise<T>): Promise<T> {
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

function createWhere(config: WorkflowConfig, options: WorkflowListOptions): { sql: string; values: unknown[] } {
  const clauses = [`${config.table}.deleted_at is null`];
  const values: unknown[] = [];

  if (options.search?.trim()) {
    values.push(`%${options.search.trim()}%`);
    clauses.push(`(${config.searchColumns.map((column) => `${column}::text ilike $${values.length}`).join(" or ")})`);
  }

  const filters: Array<[string, string | undefined]> = [
    [`${config.table}.status`, options.status],
    [`${config.table}.customer_id`, options.customerId],
    [`${config.table}.product_id`, options.productId],
    [`${config.table}.vehicle_id`, options.vehicleId],
    [`${config.table}.driver_id`, options.driverId],
    [`${config.table}.operation_type`, options.operationType]
  ];

  for (const [column, value] of filters) {
    if (!value) {
      continue;
    }
    values.push(value);
    clauses.push(`${column} = $${values.length}`);
  }

  if (options.fromDate) {
    values.push(options.fromDate);
    clauses.push(`${config.table}.${config.dateColumn} >= $${values.length}`);
  }

  if (options.toDate) {
    values.push(options.toDate);
    clauses.push(`${config.table}.${config.dateColumn} <= $${values.length}`);
  }

  return {
    sql: `where ${clauses.join(" and ")}`,
    values
  };
}

async function assertReferences(client: PoolClient, context: TenantContext, config: WorkflowConfig, payload: Record<string, unknown>): Promise<void> {
  for (const reference of config.references) {
    const value = payload[reference.property];

    if (typeof value !== "string" || !value) {
      continue;
    }

    const plantSql = reference.plantScoped ? " and plant_id = $3" : "";
    const values = reference.plantScoped
      ? [value, context.organisationId, context.activePlantId ?? context.allowedPlantIds[0]]
      : [value, context.organisationId];
    const result = await client.query(
      `select id from ${reference.table} where id = $1 and organisation_id = $2${plantSql} and deleted_at is null`,
      values
    );

    if (result.rowCount !== 1) {
      throw new Error(`Invalid reference for ${reference.property}.`);
    }
  }
}

async function postDispatchStockIfReady(
  client: PoolClient,
  context: TenantContext,
  row: Record<string, unknown>
): Promise<void> {
  const status = String(row.status ?? "");
  const dispatchId = String(row.id ?? "");
  const storageLocationId = String(row.sourceStorageLocationId ?? "");
  const productId = String(row.productId ?? "");
  const dispatchDate = toDateOnly(row.dispatchDate ?? row.createdAt ?? new Date());
  const quantity = Number(row.quantity ?? 0);
  const unit = String(row.unit ?? "");

  if (!["dispatched", "delivered"].includes(status)) {
    return;
  }

  if (!dispatchId || !storageLocationId || !productId || !quantity || !unit) {
    throw new Error("Dispatched records require source storage, product, quantity and unit for stock posting.");
  }

  const posting = await postDispatchStockReductionInTransaction(client, context, {
    plantId: String(row.plantId ?? context.activePlantId ?? context.allowedPlantIds[0]),
    dispatchId,
    storageLocationId,
    productId,
    dispatchDate,
    quantity,
    unit,
    reason: "Automatic dispatch stock reduction"
  });

  await client.query(
    "update dispatch_records set inventory_transaction_id = $1, updated_at = now() where id = $2 and inventory_transaction_id is null",
    [posting.inventoryTransactionId, dispatchId]
  );
  row.inventoryTransactionId = posting.inventoryTransactionId;
}

function enrichPayload(config: WorkflowConfig, payload: Record<string, unknown>): Record<string, unknown> {
  const next = { ...payload };

  if (config.table === "customer_orders") {
    next.totalAmount = Number(next.quantity ?? 0) * Number(next.rate ?? 0);
  }

  if (config.table === "dispatch_records") {
    next.netWeight = Number(next.secondWeight ?? 0) - Number(next.firstWeight ?? 0);
    const quantity = Number(next.quantity ?? next.netWeight ?? 0);
    next.dispatchAmount = quantity * Number(next.rate ?? 0);
  }

  return next;
}

async function findWorkflowRow(client: PoolClient, config: WorkflowConfig, id: string): Promise<Record<string, unknown>> {
  const returning = config.fields.map((field) => `${field.column} as "${field.property}"`);
  const result = await client.query<Record<string, unknown>>(
    `select ${returning.join(", ")} from ${config.table} where id = $1 and deleted_at is null`,
    [id]
  );
  return requireRow(result.rows[0]);
}

async function scalar(client: PoolClient, sql: string): Promise<number> {
  const result = await client.query<{ count?: string; coalesce?: string }>(sql);
  return Number(Object.values(result.rows[0] ?? { value: 0 })[0] ?? 0);
}

async function insertWorkflowAudit(
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
      organisation_id, plant_id, actor_user_id, event_type, entity_type, entity_id,
      previous_value, new_value, request_id
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
      createRequestId("audit")
    ]
  );
}

function createDocumentNumber(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createRequestId(prefix = "req"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function normaliseUnit(value: string): string {
  return value.trim().toLowerCase();
}

function requireRow(row: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!row) {
    throw new Error("Record not found.");
  }

  return row;
}

function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
    return text.slice(0, 10);
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  throw new Error("Invalid dispatch date for stock posting.");
}

function csvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
