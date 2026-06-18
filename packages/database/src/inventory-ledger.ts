import type { PoolClient } from "pg";
import { getPool } from "./master-data";
import type { TenantContext } from "./index";

export interface InventoryListOptions {
  page: number;
  pageSize: number;
  search?: string;
  plantId?: string;
  productId?: string;
  storageLocationId?: string;
  sourceType?: string;
  lowStockOnly?: boolean;
}

export interface InventoryListResult {
  rows: Array<Record<string, unknown>>;
  total: number;
  page: number;
  pageSize: number;
}

export interface InventoryValuationResult extends InventoryListResult {
  totalQuantityBaseUnit: number;
  totalValue: number;
}

export interface InventoryAgeingResult extends InventoryListResult {
  buckets: {
    days0To7: number;
    days8To30: number;
    days31To90: number;
    daysOver90: number;
  };
}

export interface PurchaseReceiptDraft {
  plantId?: string;
  supplierId?: string;
  storageLocationId: string;
  productId: string;
  receiptDate: string;
  sourceDocumentNumber?: string;
  quantity: number;
  unit: string;
  conversionFactor?: number;
  unitCost?: number;
  notes?: string;
}

export interface StockMovementDraft {
  plantId?: string;
  fromStorageLocationId: string;
  toStorageLocationId: string;
  productId: string;
  movementDate: string;
  quantity: number;
  unit: string;
  conversionFactor?: number;
  reason: string;
  requiresApproval?: boolean;
}

export interface ProductionRunLineDraft {
  storageLocationId: string;
  productId: string;
  quantity: number;
  unit: string;
  conversionFactor?: number;
}

export interface ProductionRunDraft {
  plantId?: string;
  machineId?: string;
  runType: "crusher" | "rmc";
  productionDate: string;
  inputs: ProductionRunLineDraft[];
  outputs: ProductionRunLineDraft[];
  notes?: string;
}

export interface DispatchStockReductionDraft {
  plantId?: string;
  dispatchId?: string;
  storageLocationId: string;
  productId: string;
  dispatchDate: string;
  quantity: number;
  unit: string;
  conversionFactor?: number;
  reason?: string;
}

export interface InventoryCorrectionDraft {
  plantId?: string;
  storageLocationId: string;
  productId: string;
  correctedQuantityBaseUnit: number;
  reason: string;
}

export interface InventoryClosePeriodDraft {
  plantId?: string;
  periodStart: string;
  periodEnd: string;
  reason: string;
}

interface ProductInfo {
  id: string;
  baseUnit: string;
  name: string;
  allowNegativeStock: boolean;
}

interface StorageInfo {
  id: string;
  plantId: string;
  name: string;
  negativeStockOverrideAllowed: boolean;
}

interface StockPosting {
  plantId: string;
  storageLocationId: string;
  productId: string;
  transactionType: string;
  sourceType: string;
  sourceId?: string;
  direction: "in" | "out";
  quantityBaseUnit: number;
  unit: string;
  conversionFactor: number;
  unitCost?: number;
  totalCost?: number;
  reason?: string;
  occurredAt: string;
  idempotencyKey: string;
}

export async function listInventoryBalances(
  context: TenantContext,
  options: InventoryListOptions
): Promise<InventoryListResult> {
  return withInventoryClient(context, async (client) => {
    const where = createBalanceWhere(options);
    const limit = Math.min(Math.max(options.pageSize, 1), 100);
    const offset = (Math.max(options.page, 1) - 1) * limit;
    const rows = await client.query<Record<string, unknown>>(
      `select
        inventory_balances.organisation_id as "organisationId",
        inventory_balances.plant_id as "plantId",
        plants.name as "plantName",
        inventory_balances.storage_location_id as "storageLocationId",
        storage_locations.name as "storageLocationName",
        storage_locations.code as "storageLocationCode",
        inventory_balances.product_id as "productId",
        products.name as "productName",
        products.code as "productCode",
        products.base_unit as "baseUnit",
        products.reorder_level as "reorderLevel",
        inventory_balances.quantity_base_unit as "quantityBaseUnit",
        coalesce(reserved.quantity_base_unit, 0) as "reservedQuantityBaseUnit",
        inventory_balances.quantity_base_unit - coalesce(reserved.quantity_base_unit, 0) as "availableQuantityBaseUnit",
        inventory_balances.updated_at as "updatedAt"
      from inventory_balances
      join products on products.id = inventory_balances.product_id
      join storage_locations on storage_locations.id = inventory_balances.storage_location_id
      join plants on plants.id = inventory_balances.plant_id
      left join lateral (
        select coalesce(sum(quantity_base_unit), 0) as quantity_base_unit
        from stock_reservations
        where stock_reservations.organisation_id = inventory_balances.organisation_id
          and stock_reservations.plant_id = inventory_balances.plant_id
          and stock_reservations.product_id = inventory_balances.product_id
          and stock_reservations.storage_location_id = inventory_balances.storage_location_id
          and stock_reservations.status = 'reserved'
      ) reserved on true
      ${where.sql}
      order by products.name asc, storage_locations.name asc
      limit $${where.values.length + 1} offset $${where.values.length + 2}`,
      [...where.values, limit, offset]
    );
    const total = await client.query<{ total: string }>(
      `select count(*) as total
       from inventory_balances
       join products on products.id = inventory_balances.product_id
       join storage_locations on storage_locations.id = inventory_balances.storage_location_id
       ${where.sql}`,
      where.values
    );

    return { rows: rows.rows, total: Number(total.rows[0]?.total ?? 0), page: options.page, pageSize: limit };
  });
}

export async function listInventoryTransactions(
  context: TenantContext,
  options: InventoryListOptions
): Promise<InventoryListResult> {
  return withInventoryClient(context, async (client) => {
    const where = createTransactionWhere(options);
    const limit = Math.min(Math.max(options.pageSize, 1), 100);
    const offset = (Math.max(options.page, 1) - 1) * limit;
    const rows = await client.query<Record<string, unknown>>(
      `select
        inventory_transactions.id,
        inventory_transactions.plant_id as "plantId",
        plants.name as "plantName",
        inventory_transactions.storage_location_id as "storageLocationId",
        storage_locations.name as "storageLocationName",
        inventory_transactions.product_id as "productId",
        products.name as "productName",
        products.code as "productCode",
        inventory_transactions.transaction_type as "transactionType",
        inventory_transactions.source_type as "sourceType",
        inventory_transactions.source_id as "sourceId",
        inventory_transactions.direction,
        inventory_transactions.quantity_base_unit as "quantityBaseUnit",
        inventory_transactions.unit,
        inventory_transactions.conversion_factor as "conversionFactor",
        inventory_transactions.unit_cost as "unitCost",
        inventory_transactions.total_cost as "totalCost",
        inventory_transactions.approval_status as "approvalStatus",
        inventory_transactions.reason,
        inventory_transactions.occurred_at as "occurredAt",
        inventory_transactions.created_at as "createdAt"
      from inventory_transactions
      join products on products.id = inventory_transactions.product_id
      join storage_locations on storage_locations.id = inventory_transactions.storage_location_id
      join plants on plants.id = inventory_transactions.plant_id
      ${where.sql}
      order by inventory_transactions.occurred_at desc, inventory_transactions.created_at desc
      limit $${where.values.length + 1} offset $${where.values.length + 2}`,
      [...where.values, limit, offset]
    );
    const total = await client.query<{ total: string }>(
      `select count(*) as total
       from inventory_transactions
       join products on products.id = inventory_transactions.product_id
       join storage_locations on storage_locations.id = inventory_transactions.storage_location_id
       ${where.sql}`,
      where.values
    );

    return { rows: rows.rows, total: Number(total.rows[0]?.total ?? 0), page: options.page, pageSize: limit };
  });
}

export async function listInventoryValuation(
  context: TenantContext,
  options: InventoryListOptions
): Promise<InventoryValuationResult> {
  return withInventoryClient(context, async (client) => {
    const where = createBalanceWhere(options);
    const limit = Math.min(Math.max(options.pageSize, 1), 100);
    const offset = (Math.max(options.page, 1) - 1) * limit;
    const rows = await client.query<Record<string, unknown>>(
      `select
        inventory_balances.plant_id as "plantId",
        plants.name as "plantName",
        inventory_balances.storage_location_id as "storageLocationId",
        storage_locations.name as "storageLocationName",
        products.id as "productId",
        products.code as "productCode",
        products.name as "productName",
        products.base_unit as "baseUnit",
        inventory_balances.quantity_base_unit as "quantityBaseUnit",
        coalesce(cost_summary.weighted_unit_cost, products.standard_cost, products.default_selling_price, latest_cost.unit_cost, 0) as "valuationRate",
        inventory_balances.quantity_base_unit * coalesce(cost_summary.weighted_unit_cost, products.standard_cost, products.default_selling_price, latest_cost.unit_cost, 0) as "valuationAmount",
        coalesce(cost_summary.fifo_value, 0) as "fifoValue",
        coalesce(cost_summary.weighted_unit_cost, 0) as "weightedAverageRate",
        inventory_balances.updated_at as "updatedAt"
      from inventory_balances
      join products on products.id = inventory_balances.product_id
      join storage_locations on storage_locations.id = inventory_balances.storage_location_id
      join plants on plants.id = inventory_balances.plant_id
      left join lateral (
        select unit_cost
        from inventory_transactions
        where inventory_transactions.organisation_id = inventory_balances.organisation_id
          and inventory_transactions.plant_id = inventory_balances.plant_id
          and inventory_transactions.product_id = inventory_balances.product_id
          and inventory_transactions.unit_cost is not null
        order by occurred_at desc
        limit 1
      ) latest_cost on true
      left join lateral (
        select
          coalesce(sum(remaining_quantity_base_unit * unit_cost), 0) as fifo_value,
          case when coalesce(sum(remaining_quantity_base_unit), 0) > 0
            then coalesce(sum(remaining_quantity_base_unit * unit_cost), 0) / sum(remaining_quantity_base_unit)
            else null
          end as weighted_unit_cost
        from inventory_cost_layers
        where inventory_cost_layers.organisation_id = inventory_balances.organisation_id
          and inventory_cost_layers.plant_id = inventory_balances.plant_id
          and inventory_cost_layers.storage_location_id = inventory_balances.storage_location_id
          and inventory_cost_layers.product_id = inventory_balances.product_id
          and inventory_cost_layers.status = 'open'
      ) cost_summary on true
      ${where.sql}
      order by "valuationAmount" desc, products.name asc
      limit $${where.values.length + 1} offset $${where.values.length + 2}`,
      [...where.values, limit, offset]
    );
    const aggregate = await client.query<{ total: string; quantity: string; value: string }>(
      `select
        count(*) as total,
        coalesce(sum(inventory_balances.quantity_base_unit), 0) as quantity,
        coalesce(sum(inventory_balances.quantity_base_unit * coalesce(cost_summary.weighted_unit_cost, products.standard_cost, products.default_selling_price, latest_cost.unit_cost, 0)), 0) as value
      from inventory_balances
      join products on products.id = inventory_balances.product_id
      join storage_locations on storage_locations.id = inventory_balances.storage_location_id
      left join lateral (
        select unit_cost
        from inventory_transactions
        where inventory_transactions.organisation_id = inventory_balances.organisation_id
          and inventory_transactions.plant_id = inventory_balances.plant_id
          and inventory_transactions.product_id = inventory_balances.product_id
          and inventory_transactions.unit_cost is not null
        order by occurred_at desc
        limit 1
      ) latest_cost on true
      left join lateral (
        select
          coalesce(sum(remaining_quantity_base_unit * unit_cost), 0) as fifo_value,
          case when coalesce(sum(remaining_quantity_base_unit), 0) > 0
            then coalesce(sum(remaining_quantity_base_unit * unit_cost), 0) / sum(remaining_quantity_base_unit)
            else null
          end as weighted_unit_cost
        from inventory_cost_layers
        where inventory_cost_layers.organisation_id = inventory_balances.organisation_id
          and inventory_cost_layers.plant_id = inventory_balances.plant_id
          and inventory_cost_layers.storage_location_id = inventory_balances.storage_location_id
          and inventory_cost_layers.product_id = inventory_balances.product_id
          and inventory_cost_layers.status = 'open'
      ) cost_summary on true
      ${where.sql}`,
      where.values
    );

    return {
      rows: rows.rows,
      total: Number(aggregate.rows[0]?.total ?? 0),
      totalQuantityBaseUnit: Number(aggregate.rows[0]?.quantity ?? 0),
      totalValue: Number(aggregate.rows[0]?.value ?? 0),
      page: options.page,
      pageSize: limit
    };
  });
}

export async function listInventoryAgeing(
  context: TenantContext,
  options: InventoryListOptions
): Promise<InventoryAgeingResult> {
  return withInventoryClient(context, async (client) => {
    const where = createBalanceWhere(options);
    const limit = Math.min(Math.max(options.pageSize, 1), 100);
    const offset = (Math.max(options.page, 1) - 1) * limit;
    const rows = await client.query<Record<string, unknown>>(
      `select
        inventory_balances.plant_id as "plantId",
        plants.name as "plantName",
        products.code as "productCode",
        products.name as "productName",
        storage_locations.name as "storageLocationName",
        products.base_unit as "baseUnit",
        inventory_balances.quantity_base_unit as "quantityBaseUnit",
        coalesce(reserved.quantity_base_unit, 0) as "reservedQuantityBaseUnit",
        inventory_balances.quantity_base_unit - coalesce(reserved.quantity_base_unit, 0) as "availableQuantityBaseUnit",
        latest_in.occurred_at as "latestInwardAt",
        greatest(0, extract(day from now() - coalesce(latest_in.occurred_at, inventory_balances.updated_at)))::int as "ageDays",
        case
          when greatest(0, extract(day from now() - coalesce(latest_in.occurred_at, inventory_balances.updated_at))) <= 7 then '0-7 days'
          when greatest(0, extract(day from now() - coalesce(latest_in.occurred_at, inventory_balances.updated_at))) <= 30 then '8-30 days'
          when greatest(0, extract(day from now() - coalesce(latest_in.occurred_at, inventory_balances.updated_at))) <= 90 then '31-90 days'
          else 'Over 90 days'
        end as "ageBucket"
      from inventory_balances
      join products on products.id = inventory_balances.product_id
      join storage_locations on storage_locations.id = inventory_balances.storage_location_id
      join plants on plants.id = inventory_balances.plant_id
      left join lateral (
        select max(occurred_at) as occurred_at
        from inventory_transactions
        where inventory_transactions.organisation_id = inventory_balances.organisation_id
          and inventory_transactions.plant_id = inventory_balances.plant_id
          and inventory_transactions.product_id = inventory_balances.product_id
          and inventory_transactions.storage_location_id = inventory_balances.storage_location_id
          and inventory_transactions.direction = 'in'
      ) latest_in on true
      left join lateral (
        select coalesce(sum(quantity_base_unit), 0) as quantity_base_unit
        from stock_reservations
        where stock_reservations.organisation_id = inventory_balances.organisation_id
          and stock_reservations.plant_id = inventory_balances.plant_id
          and stock_reservations.product_id = inventory_balances.product_id
          and stock_reservations.storage_location_id = inventory_balances.storage_location_id
          and stock_reservations.status = 'reserved'
      ) reserved on true
      ${where.sql}
      order by "ageDays" desc, products.name asc
      limit $${where.values.length + 1} offset $${where.values.length + 2}`,
      [...where.values, limit, offset]
    );
    const total = await client.query<{ total: string }>(
      `select count(*) as total
       from inventory_balances
       join products on products.id = inventory_balances.product_id
       join storage_locations on storage_locations.id = inventory_balances.storage_location_id
       ${where.sql}`,
      where.values
    );
    const bucketResult = await client.query<InventoryAgeingResult["buckets"]>(
      `with aged as (
        select
          inventory_balances.quantity_base_unit,
          greatest(0, extract(day from now() - coalesce(latest_in.occurred_at, inventory_balances.updated_at)))::int as age_days
        from inventory_balances
        join products on products.id = inventory_balances.product_id
        join storage_locations on storage_locations.id = inventory_balances.storage_location_id
        left join lateral (
          select max(occurred_at) as occurred_at
          from inventory_transactions
          where inventory_transactions.organisation_id = inventory_balances.organisation_id
            and inventory_transactions.plant_id = inventory_balances.plant_id
            and inventory_transactions.product_id = inventory_balances.product_id
            and inventory_transactions.storage_location_id = inventory_balances.storage_location_id
            and inventory_transactions.direction = 'in'
        ) latest_in on true
        ${where.sql}
      )
      select
        coalesce(sum(quantity_base_unit) filter (where age_days <= 7), 0) as "days0To7",
        coalesce(sum(quantity_base_unit) filter (where age_days > 7 and age_days <= 30), 0) as "days8To30",
        coalesce(sum(quantity_base_unit) filter (where age_days > 30 and age_days <= 90), 0) as "days31To90",
        coalesce(sum(quantity_base_unit) filter (where age_days > 90), 0) as "daysOver90"
      from aged`,
      where.values
    );
    const buckets = {
      days0To7: Number(bucketResult.rows[0]?.days0To7 ?? 0),
      days8To30: Number(bucketResult.rows[0]?.days8To30 ?? 0),
      days31To90: Number(bucketResult.rows[0]?.days31To90 ?? 0),
      daysOver90: Number(bucketResult.rows[0]?.daysOver90 ?? 0)
    };

    return { rows: rows.rows, total: Number(total.rows[0]?.total ?? 0), page: options.page, pageSize: limit, buckets };
  });
}

export async function createPurchaseReceipt(
  context: TenantContext,
  draft: PurchaseReceiptDraft
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const plantId = resolvePlantId(context, draft.plantId);
    const product = await assertProduct(client, draft.productId);
    const storage = await assertStorageLocation(client, draft.storageLocationId, plantId);
    await assertOptionalReference(client, "suppliers", draft.supplierId);
    const conversionFactor = await resolveConversionFactor(client, product, draft.unit, draft.conversionFactor);
    const quantityBaseUnit = toBaseQuantity(draft.quantity, conversionFactor);
    const totalCost = draft.unitCost === undefined ? undefined : roundMoney(draft.unitCost * draft.quantity);
    const receiptNumber = createDocumentNumber("PRC");
    const receipt = await client.query<Record<string, unknown>>(
      `insert into purchase_receipts (
        organisation_id, plant_id, supplier_id, storage_location_id, product_id, receipt_number,
        receipt_date, source_document_number, quantity, unit, conversion_factor,
        quantity_base_unit, unit_cost, total_cost, status, notes, created_by_user_id, updated_by_user_id
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'posted',$15,$16,$16)
      returning id, receipt_number as "receiptNumber", receipt_date as "receiptDate",
        quantity, unit, quantity_base_unit as "quantityBaseUnit", total_cost as "totalCost", status`,
      [
        context.organisationId,
        plantId,
        draft.supplierId ?? null,
        storage.id,
        product.id,
        receiptNumber,
        draft.receiptDate,
        draft.sourceDocumentNumber ?? null,
        draft.quantity,
        draft.unit,
        conversionFactor,
        quantityBaseUnit,
        draft.unitCost ?? null,
        totalCost ?? null,
        draft.notes ?? null,
        context.userId
      ]
    );
    const row = requireRow(receipt.rows[0]);
    const transactionId = await postInventoryTransaction(client, context, {
      plantId,
      storageLocationId: storage.id,
      productId: product.id,
      transactionType: "purchase_receipt",
      sourceType: "purchase_receipt",
      sourceId: String(row.id),
      direction: "in",
      quantityBaseUnit,
      unit: draft.unit,
      conversionFactor,
      unitCost: draft.unitCost,
      totalCost,
      reason: draft.notes,
      occurredAt: draft.receiptDate,
      idempotencyKey: `purchase_receipt:${row.id}:in`
    });
    await client.query("update purchase_receipts set inventory_transaction_id = $1 where id = $2", [transactionId, row.id]);
    await insertInventoryAudit(client, context, "inventory.purchase_receipt.post", "purchase_receipts", String(row.id), undefined, row);
    return { ...row, inventoryTransactionId: transactionId };
  });
}

export async function createStockMovement(
  context: TenantContext,
  draft: StockMovementDraft
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const plantId = resolvePlantId(context, draft.plantId);
    const product = await assertProduct(client, draft.productId);
    const fromStorage = await assertStorageLocation(client, draft.fromStorageLocationId, plantId);
    const toStorage = await assertStorageLocation(client, draft.toStorageLocationId, plantId);

    if (fromStorage.id === toStorage.id) {
      throw new Error("Source and destination storage locations must be different.");
    }

    const conversionFactor = await resolveConversionFactor(client, product, draft.unit, draft.conversionFactor);
    const quantityBaseUnit = toBaseQuantity(draft.quantity, conversionFactor);
    const movementNumber = createDocumentNumber("STM");
    const status = draft.requiresApproval ? "pending_approval" : "posted";
    const movement = await client.query<Record<string, unknown>>(
      `insert into stock_movements (
        organisation_id, plant_id, from_storage_location_id, to_storage_location_id, product_id,
        movement_number, movement_date, quantity, unit, conversion_factor, quantity_base_unit,
        status, reason, created_by_user_id, updated_by_user_id
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14)
      returning id, movement_number as "movementNumber", movement_date as "movementDate",
        quantity, unit, quantity_base_unit as "quantityBaseUnit", status, reason`,
      [
        context.organisationId,
        plantId,
        fromStorage.id,
        toStorage.id,
        product.id,
        movementNumber,
        draft.movementDate,
        draft.quantity,
        draft.unit,
        conversionFactor,
        quantityBaseUnit,
        status,
        draft.reason,
        context.userId
      ]
    );
    const row = requireRow(movement.rows[0]);
    if (draft.requiresApproval) {
      await insertInventoryAudit(client, context, "inventory.stock_movement.request_approval", "stock_movements", String(row.id), undefined, row);
      return row;
    }

    const outTransactionId = await postInventoryTransaction(client, context, {
      plantId,
      storageLocationId: fromStorage.id,
      productId: product.id,
      transactionType: "stock_movement",
      sourceType: "stock_movement",
      sourceId: String(row.id),
      direction: "out",
      quantityBaseUnit,
      unit: draft.unit,
      conversionFactor,
      reason: draft.reason,
      occurredAt: draft.movementDate,
      idempotencyKey: `stock_movement:${row.id}:out`
    });
    const inTransactionId = await postInventoryTransaction(client, context, {
      plantId,
      storageLocationId: toStorage.id,
      productId: product.id,
      transactionType: "stock_movement",
      sourceType: "stock_movement",
      sourceId: String(row.id),
      direction: "in",
      quantityBaseUnit,
      unit: draft.unit,
      conversionFactor,
      reason: draft.reason,
      occurredAt: draft.movementDate,
      idempotencyKey: `stock_movement:${row.id}:in`
    });
    await client.query(
      "update stock_movements set out_transaction_id = $1, in_transaction_id = $2 where id = $3",
      [outTransactionId, inTransactionId, row.id]
    );
    await insertInventoryAudit(client, context, "inventory.stock_movement.post", "stock_movements", String(row.id), undefined, row);
    return { ...row, outTransactionId, inTransactionId };
  });
}

export async function approveStockMovement(
  context: TenantContext,
  movementId: string,
  reason = "Approved stock transfer"
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const movement = await client.query<Record<string, unknown>>(
      `select
        id,
        plant_id as "plantId",
        from_storage_location_id as "fromStorageLocationId",
        to_storage_location_id as "toStorageLocationId",
        product_id as "productId",
        movement_date as "movementDate",
        quantity_base_unit as "quantityBaseUnit",
        unit,
        conversion_factor as "conversionFactor",
        status,
        reason
       from stock_movements
       where id = $1 and organisation_id = $2 and plant_id::text = any($3::text[]) and deleted_at is null
       for update`,
      [movementId, context.organisationId, context.allowedPlantIds]
    );
    const row = requireRow(movement.rows[0]);
    if (row.status !== "pending_approval") {
      throw new Error("Only pending stock transfers can be approved.");
    }

    const plantId = String(row.plantId);
    const productId = String(row.productId);
    const quantityBaseUnit = Number(row.quantityBaseUnit);
    const unit = String(row.unit);
    const conversionFactor = Number(row.conversionFactor);
    const movementDate = toDateString(row.movementDate);

    const outTransactionId = await postInventoryTransaction(client, context, {
      plantId,
      storageLocationId: String(row.fromStorageLocationId),
      productId,
      transactionType: "stock_movement",
      sourceType: "stock_movement",
      sourceId: String(row.id),
      direction: "out",
      quantityBaseUnit,
      unit,
      conversionFactor,
      reason: String(row.reason ?? reason),
      occurredAt: movementDate,
      idempotencyKey: `stock_movement:${row.id}:out`
    });
    const inTransactionId = await postInventoryTransaction(client, context, {
      plantId,
      storageLocationId: String(row.toStorageLocationId),
      productId,
      transactionType: "stock_movement",
      sourceType: "stock_movement",
      sourceId: String(row.id),
      direction: "in",
      quantityBaseUnit,
      unit,
      conversionFactor,
      reason: String(row.reason ?? reason),
      occurredAt: movementDate,
      idempotencyKey: `stock_movement:${row.id}:in`
    });
    const updated = await client.query<Record<string, unknown>>(
      `update stock_movements
       set status = 'posted',
           out_transaction_id = $1,
           in_transaction_id = $2,
           approved_by_user_id = $3,
           approved_at = now(),
           approval_reason = $4,
           updated_by_user_id = $3,
           updated_at = now()
       where id = $5
       returning id, status, out_transaction_id as "outTransactionId", in_transaction_id as "inTransactionId"`,
      [outTransactionId, inTransactionId, context.userId, reason, movementId]
    );
    const result = requireRow(updated.rows[0]);
    await insertInventoryAudit(client, context, "inventory.stock_movement.approve", "stock_movements", movementId, row, result);
    return result;
  });
}

export async function createProductionRun(
  context: TenantContext,
  draft: ProductionRunDraft
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const plantId = resolvePlantId(context, draft.plantId);
    await assertOptionalReference(client, "machines", draft.machineId, plantId);
    if (draft.inputs.length === 0 || draft.outputs.length === 0) {
      throw new Error("Production requires at least one input and one output.");
    }

    const runNumber = createDocumentNumber(draft.runType === "crusher" ? "CRP" : "RMC");
    const run = await client.query<Record<string, unknown>>(
      `insert into production_runs (
        organisation_id, plant_id, machine_id, run_number, run_type, production_date,
        status, notes, created_by_user_id, updated_by_user_id
      ) values ($1,$2,$3,$4,$5,$6,'completed',$7,$8,$8)
      returning id, run_number as "runNumber", run_type as "runType", production_date as "productionDate", status, notes`,
      [
        context.organisationId,
        plantId,
        draft.machineId ?? null,
        runNumber,
        draft.runType,
        draft.productionDate,
        draft.notes ?? null,
        context.userId
      ]
    );
    const row = requireRow(run.rows[0]);
    const inputTransactions = [];
    const outputTransactions = [];

    for (const line of draft.inputs) {
      const transactionId = await insertProductionLine(client, context, plantId, String(row.id), line, "input", draft.productionDate);
      inputTransactions.push(transactionId);
    }

    for (const line of draft.outputs) {
      const transactionId = await insertProductionLine(client, context, plantId, String(row.id), line, "output", draft.productionDate);
      outputTransactions.push(transactionId);
    }

    await insertInventoryAudit(client, context, "inventory.production_run.post", "production_runs", String(row.id), undefined, row);
    return { ...row, inputTransactionIds: inputTransactions, outputTransactionIds: outputTransactions };
  });
}

export async function createDispatchStockReduction(
  context: TenantContext,
  draft: DispatchStockReductionDraft
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    return postDispatchStockReductionInTransaction(client, context, draft);
  });
}

export async function postDispatchStockReductionInTransaction(
  client: PoolClient,
  context: TenantContext,
  draft: DispatchStockReductionDraft
): Promise<Record<string, unknown>> {
  const plantId = resolvePlantId(context, draft.plantId);
  const product = await assertProduct(client, draft.productId);
  const storage = await assertStorageLocation(client, draft.storageLocationId, plantId);
  await assertOptionalReference(client, "dispatch_records", draft.dispatchId, plantId);
  const existing = draft.dispatchId
    ? await client.query<Record<string, unknown>>(
      `select id as "inventoryTransactionId", quantity_base_unit as "quantityBaseUnit"
       from inventory_transactions
       where source_type = 'dispatch_record'
         and source_id = $1
         and transaction_type = 'dispatch_reduction'
       limit 1`,
      [draft.dispatchId]
    )
    : undefined;

  if (existing?.rows[0]) {
    return existing.rows[0];
  }

  const conversionFactor = await resolveConversionFactor(client, product, draft.unit, draft.conversionFactor);
  const quantityBaseUnit = toBaseQuantity(draft.quantity, conversionFactor);
  const transactionId = await postInventoryTransaction(client, context, {
    plantId,
    storageLocationId: storage.id,
    productId: product.id,
    transactionType: "dispatch_reduction",
    sourceType: "dispatch_record",
    sourceId: draft.dispatchId,
    direction: "out",
    quantityBaseUnit,
    unit: draft.unit,
    conversionFactor,
    reason: draft.reason ?? "Dispatch stock reduction",
    occurredAt: draft.dispatchDate,
    idempotencyKey: draft.dispatchId
      ? `dispatch_reduction:${draft.dispatchId}:out`
      : `dispatch_reduction:${createRequestId("manual")}:${storage.id}:${product.id}:${quantityBaseUnit}`
  });
  const row = { inventoryTransactionId: transactionId, quantityBaseUnit, productName: product.name, storageLocationName: storage.name };
  await insertInventoryAudit(client, context, "inventory.dispatch_reduction.post", "inventory_transactions", transactionId, undefined, row);
  return row;
}

export async function postDispatchCancellationReversalInTransaction(
  client: PoolClient,
  context: TenantContext,
  dispatchId: string,
  reason: string
): Promise<Record<string, unknown>> {
  const dispatch = await client.query<Record<string, unknown>>(
    `select id, plant_id as "plantId", cancellation_inventory_transaction_id as "cancellationInventoryTransactionId"
     from dispatch_records
     where id = $1 and deleted_at is null
     for update`,
    [dispatchId]
  );
  const dispatchRow = requireRow(dispatch.rows[0]);
  if (dispatchRow.cancellationInventoryTransactionId) {
    return { inventoryTransactionId: dispatchRow.cancellationInventoryTransactionId };
  }

  const original = await client.query<Record<string, unknown>>(
    `select storage_location_id as "storageLocationId", product_id as "productId",
       quantity_base_unit as "quantityBaseUnit", unit, conversion_factor as "conversionFactor"
     from inventory_transactions
     where source_type = 'dispatch_record'
       and source_id = $1
       and transaction_type = 'dispatch_reduction'
       and direction = 'out'
     order by created_at asc
     limit 1`,
    [dispatchId]
  );
  const originalRow = requireRow(original.rows[0]);
  const transactionId = await postInventoryTransaction(client, context, {
    plantId: String(dispatchRow.plantId),
    storageLocationId: String(originalRow.storageLocationId),
    productId: String(originalRow.productId),
    transactionType: "dispatch_cancellation_reversal",
    sourceType: "dispatch_record",
    sourceId: dispatchId,
    direction: "in",
    quantityBaseUnit: Number(originalRow.quantityBaseUnit),
    unit: String(originalRow.unit),
    conversionFactor: Number(originalRow.conversionFactor),
    reason,
    occurredAt: new Date().toISOString(),
    idempotencyKey: `dispatch_cancellation:${dispatchId}:in`
  });
  const row = { inventoryTransactionId: transactionId, reason };
  await insertInventoryAudit(client, context, "inventory.dispatch_cancellation.reverse", "dispatch_records", dispatchId, originalRow, row);
  return row;
}

export async function requestInventoryCorrection(
  context: TenantContext,
  draft: InventoryCorrectionDraft
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const plantId = resolvePlantId(context, draft.plantId);
    await assertProduct(client, draft.productId);
    await assertStorageLocation(client, draft.storageLocationId, plantId);
    const current = await getLockedBalance(client, context, plantId, draft.storageLocationId, draft.productId);
    const corrected = roundQuantity(draft.correctedQuantityBaseUnit);
    const delta = roundQuantity(corrected - current);
    const approval = await client.query<{ id: string }>(
      `insert into approval_requests (
        organisation_id, plant_id, request_type, source_type, original_value,
        requested_value, reason, status, requested_by_user_id
      ) values ($1,$2,'stock_adjustment','inventory_correction',$3,$4,$5,'pending',$6)
      returning id`,
      [
        context.organisationId,
        plantId,
        JSON.stringify({ quantityBaseUnit: current }),
        JSON.stringify({ quantityBaseUnit: corrected, deltaQuantityBaseUnit: delta }),
        draft.reason,
        context.userId
      ]
    );
    const correction = await client.query<Record<string, unknown>>(
      `insert into inventory_corrections (
        organisation_id, plant_id, storage_location_id, product_id, original_quantity_base_unit,
        corrected_quantity_base_unit, delta_quantity_base_unit, reason, status, approval_request_id,
        requested_by_user_id
      ) values ($1,$2,$3,$4,$5,$6,$7,$8,'pending',$9,$10)
      returning id, original_quantity_base_unit as "originalQuantityBaseUnit",
        corrected_quantity_base_unit as "correctedQuantityBaseUnit",
        delta_quantity_base_unit as "deltaQuantityBaseUnit", reason, status, approval_request_id as "approvalRequestId"`,
      [
        context.organisationId,
        plantId,
        draft.storageLocationId,
        draft.productId,
        current,
        corrected,
        delta,
        draft.reason,
        approval.rows[0]?.id,
        context.userId
      ]
    );
    const row = requireRow(correction.rows[0]);
    await client.query("update approval_requests set source_id = $1 where id = $2", [row.id, approval.rows[0]?.id]);
    await insertInventoryAudit(client, context, "inventory.correction.request", "inventory_corrections", String(row.id), undefined, row);
    return row;
  });
}

export async function approveInventoryCorrection(
  context: TenantContext,
  correctionId: string
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const correction = await client.query<Record<string, unknown>>(
      `select id, plant_id as "plantId", storage_location_id as "storageLocationId", product_id as "productId",
        original_quantity_base_unit as "originalQuantityBaseUnit",
        corrected_quantity_base_unit as "correctedQuantityBaseUnit",
        delta_quantity_base_unit as "deltaQuantityBaseUnit",
        reason, approval_request_id as "approvalRequestId", status
       from inventory_corrections
       where id = $1 and status = 'pending'
       for update`,
      [correctionId]
    );
    const row = requireRow(correction.rows[0]);
    const plantId = String(row.plantId);
    const storageLocationId = String(row.storageLocationId);
    const productId = String(row.productId);
    const current = await getLockedBalance(client, context, plantId, storageLocationId, productId);
    const original = Number(row.originalQuantityBaseUnit);

    if (roundQuantity(current) !== roundQuantity(original)) {
      throw new Error("Correction is stale because the stock balance changed after request.");
    }

    const delta = Number(row.deltaQuantityBaseUnit);
    let transactionId: string | undefined;
    if (delta !== 0) {
      transactionId = await postInventoryTransaction(client, context, {
        plantId,
        storageLocationId,
        productId,
        transactionType: "stock_correction",
        sourceType: "inventory_correction",
        sourceId: correctionId,
        direction: delta > 0 ? "in" : "out",
        quantityBaseUnit: Math.abs(delta),
        unit: "base",
        conversionFactor: 1,
        reason: String(row.reason),
        occurredAt: new Date().toISOString(),
        idempotencyKey: `inventory_correction:${correctionId}:adjustment`
      });
    }

    const updated = await client.query<Record<string, unknown>>(
      `update inventory_corrections
       set status = 'approved',
           approved_by_user_id = $1,
           decided_at = now(),
           updated_at = now(),
           adjustment_transaction_id = $2
       where id = $3
       returning id, status, adjustment_transaction_id as "adjustmentTransactionId"`,
      [context.userId, transactionId ?? null, correctionId]
    );
    await client.query(
      "update approval_requests set status = 'approved', approved_by_user_id = $1, decided_at = now() where id = $2",
      [context.userId, row.approvalRequestId]
    );
    const result = requireRow(updated.rows[0]);
    await insertInventoryAudit(client, context, "inventory.correction.approve", "inventory_corrections", correctionId, row, result);
    return result;
  });
}

export async function rejectInventoryCorrection(
  context: TenantContext,
  correctionId: string,
  reason: string
): Promise<Record<string, unknown>> {
  return decideInventoryCorrection(context, correctionId, "rejected", reason);
}

export async function cancelInventoryCorrection(
  context: TenantContext,
  correctionId: string,
  reason: string
): Promise<Record<string, unknown>> {
  return decideInventoryCorrection(context, correctionId, "cancelled", reason);
}

export async function closeInventoryPeriod(
  context: TenantContext,
  draft: InventoryClosePeriodDraft
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const plantId = resolvePlantId(context, draft.plantId);
    const result = await client.query<Record<string, unknown>>(
      `insert into inventory_close_periods (
        organisation_id, plant_id, period_start, period_end, status, reason, closed_by_user_id
      ) values ($1,$2,$3,$4,'closed',$5,$6)
      returning id, plant_id as "plantId", period_start as "periodStart", period_end as "periodEnd", status, reason, created_at as "createdAt"`,
      [context.organisationId, plantId, draft.periodStart, draft.periodEnd, draft.reason, context.userId]
    );
    const row = requireRow(result.rows[0]);
    await insertInventoryAudit(client, context, "inventory.close_period.close", "inventory_close_periods", String(row.id), undefined, row);
    return row;
  });
}

export async function listInventoryClosePeriods(
  context: TenantContext,
  options: InventoryListOptions
): Promise<InventoryListResult> {
  return withInventoryClient(context, async (client) => {
    const plantId = resolvePlantId(context, options.plantId);
    const limit = Math.min(Math.max(options.pageSize, 1), 100);
    const offset = (Math.max(options.page, 1) - 1) * limit;
    const rows = await client.query<Record<string, unknown>>(
      `select
        inventory_close_periods.id,
        inventory_close_periods.plant_id as "plantId",
        plants.name as "plantName",
        period_start as "periodStart",
        period_end as "periodEnd",
        status,
        reason,
        created_at as "createdAt"
      from inventory_close_periods
      join plants on plants.id = inventory_close_periods.plant_id
      where inventory_close_periods.organisation_id = $1
        and inventory_close_periods.plant_id = $2
      order by period_start desc, created_at desc
      limit $3 offset $4`,
      [context.organisationId, plantId, limit, offset]
    );
    const total = await client.query<{ total: string }>(
      `select count(*) as total
       from inventory_close_periods
       where organisation_id = $1 and plant_id = $2`,
      [context.organisationId, plantId]
    );
    return { rows: rows.rows, total: Number(total.rows[0]?.total ?? 0), page: options.page, pageSize: limit };
  });
}

export function inventoryToCsv(result: InventoryListResult): string {
  const headers = result.rows[0] ? Object.keys(result.rows[0]) : ["id"];
  return [
    headers.join(","),
    ...result.rows.map((row) => headers.map((header) => csvValue(row[header])).join(","))
  ].join("\n");
}

export function inventoryValuationToPdfHtml(result: InventoryValuationResult): string {
  const rows = result.rows
    .map((row) => `<tr><td>${escapeHtml(row.productCode)}</td><td>${escapeHtml(row.productName)}</td><td>${escapeHtml(row.storageLocationName)}</td><td>${escapeHtml(row.quantityBaseUnit)}</td><td>${escapeHtml(row.baseUnit)}</td><td>${escapeHtml(row.valuationRate)}</td><td>${escapeHtml(row.valuationAmount)}</td></tr>`)
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Inventory valuation</title><style>body{font-family:Arial,sans-serif;color:#0f172a;padding:24px}h1{margin:0 0 8px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}.card{border:1px solid #cbd5e1;padding:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}</style></head><body><h1>Inventory valuation</h1><p>Generated from tenant-scoped PostgreSQL inventory balances.</p><div class="cards"><div class="card">Rows<br><strong>${result.total}</strong></div><div class="card">Quantity<br><strong>${result.totalQuantityBaseUnit.toLocaleString("en-IN")}</strong></div><div class="card">Value<br><strong>Rs. ${result.totalValue.toLocaleString("en-IN")}</strong></div></div><table><thead><tr><th>Code</th><th>Product</th><th>Location</th><th>Qty</th><th>Unit</th><th>Rate</th><th>Value</th></tr></thead><tbody>${rows || "<tr><td colspan='7'>No inventory valuation data.</td></tr>"}</tbody></table></body></html>`;
}

async function decideInventoryCorrection(
  context: TenantContext,
  correctionId: string,
  status: "rejected" | "cancelled",
  reason: string
): Promise<Record<string, unknown>> {
  return withInventoryClient(context, async (client) => {
    const previous = await client.query<Record<string, unknown>>(
      `select id, approval_request_id as "approvalRequestId", status, reason
       from inventory_corrections
       where id = $1 and status = 'pending'
       for update`,
      [correctionId]
    );
    const previousRow = requireRow(previous.rows[0]);
    const updated = await client.query<Record<string, unknown>>(
      `update inventory_corrections
       set status = $1, approved_by_user_id = $2, decided_at = now(), updated_at = now()
       where id = $3
       returning id, status`,
      [status, context.userId, correctionId]
    );
    await client.query(
      `update approval_requests
       set status = $1, approved_by_user_id = $2, decided_at = now(), requested_value = coalesce(requested_value, '{}'::jsonb) || $3::jsonb
       where id = $4`,
      [status, context.userId, JSON.stringify({ decisionReason: reason }), previousRow.approvalRequestId]
    );
    const result = requireRow(updated.rows[0]);
    await insertInventoryAudit(client, context, `inventory.correction.${status}`, "inventory_corrections", correctionId, previousRow, result);
    return result;
  });
}

async function insertProductionLine(
  client: PoolClient,
  context: TenantContext,
  plantId: string,
  productionRunId: string,
  line: ProductionRunLineDraft,
  kind: "input" | "output",
  occurredAt: string
): Promise<string> {
  const product = await assertProduct(client, line.productId);
  const storage = await assertStorageLocation(client, line.storageLocationId, plantId);
  const conversionFactor = await resolveConversionFactor(client, product, line.unit, line.conversionFactor);
  const quantityBaseUnit = toBaseQuantity(line.quantity, conversionFactor);
  const table = kind === "input" ? "production_run_inputs" : "production_run_outputs";
  const sourceLine = await client.query<{ id: string }>(
    `insert into ${table} (
      organisation_id, plant_id, production_run_id, storage_location_id, product_id,
      quantity, unit, conversion_factor, quantity_base_unit
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id`,
    [context.organisationId, plantId, productionRunId, storage.id, product.id, line.quantity, line.unit, conversionFactor, quantityBaseUnit]
  );
  const lineId = String(sourceLine.rows[0]?.id);
  const transactionId = await postInventoryTransaction(client, context, {
    plantId,
    storageLocationId: storage.id,
    productId: product.id,
    transactionType: kind === "input" ? "production_consumption" : "production_output",
    sourceType: table,
    sourceId: lineId,
    direction: kind === "input" ? "out" : "in",
    quantityBaseUnit,
    unit: line.unit,
    conversionFactor,
    reason: kind === "input" ? "Production consumption" : "Production output",
    occurredAt,
    idempotencyKey: `production_run:${productionRunId}:${kind}:${lineId}`
  });
  await client.query(`update ${table} set inventory_transaction_id = $1 where id = $2`, [transactionId, lineId]);
  return transactionId;
}

async function postInventoryTransaction(
  client: PoolClient,
  context: TenantContext,
  posting: StockPosting
): Promise<string> {
  await assertInventoryPeriodOpen(client, context, posting.plantId, posting.occurredAt);
  await client.query(
    `insert into inventory_balances (organisation_id, plant_id, storage_location_id, product_id, quantity_base_unit)
     values ($1, $2, $3, $4, 0)
     on conflict (organisation_id, plant_id, storage_location_id, product_id) do nothing`,
    [context.organisationId, posting.plantId, posting.storageLocationId, posting.productId]
  );

  const current = await getLockedBalance(client, context, posting.plantId, posting.storageLocationId, posting.productId);
  const delta = posting.direction === "in" ? posting.quantityBaseUnit : -posting.quantityBaseUnit;
  const nextQuantity = roundQuantity(current + delta);
  const fifoCost = posting.direction === "out"
    ? await consumeFifoCostLayers(client, context, posting.plantId, posting.storageLocationId, posting.productId, posting.quantityBaseUnit)
    : undefined;

  if (nextQuantity < 0) {
    const allowed = await isNegativeStockAllowed(client, posting.productId, posting.storageLocationId);
    if (!allowed) {
      throw new Error("Insufficient stock. Negative stock is not allowed for this product and location.");
    }
  }

  const transaction = await client.query<{ id: string }>(
    `insert into inventory_transactions (
      organisation_id, plant_id, storage_location_id, product_id, transaction_type, source_type,
      source_id, direction, quantity_base_unit, unit, conversion_factor, unit_cost, total_cost,
      approval_status, reason, idempotency_key, occurred_at, created_by_user_id
    ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'approved',$14,$15,$16,$17)
    returning id`,
    [
      context.organisationId,
      posting.plantId,
      posting.storageLocationId,
      posting.productId,
      posting.transactionType,
      posting.sourceType,
      posting.sourceId ?? null,
      posting.direction,
      posting.quantityBaseUnit,
      posting.unit,
      posting.conversionFactor,
      posting.unitCost ?? null,
      posting.totalCost ?? fifoCost ?? null,
      posting.reason ?? null,
      posting.idempotencyKey,
      posting.occurredAt,
      context.userId
    ]
  );

  await client.query(
    `update inventory_balances
     set quantity_base_unit = $1, updated_at = now()
     where organisation_id = $2 and plant_id = $3 and storage_location_id = $4 and product_id = $5`,
    [nextQuantity, context.organisationId, posting.plantId, posting.storageLocationId, posting.productId]
  );

  if (posting.direction === "in" && posting.unitCost !== undefined) {
    await createCostLayer(client, context, {
      plantId: posting.plantId,
      storageLocationId: posting.storageLocationId,
      productId: posting.productId,
      sourceInventoryTransactionId: String(transaction.rows[0]?.id),
      sourceType: posting.sourceType,
      quantityBaseUnit: posting.quantityBaseUnit,
      unitCost: posting.unitCost,
      receivedAt: posting.occurredAt
    });
  }

  return String(transaction.rows[0]?.id);
}

async function assertInventoryPeriodOpen(
  client: PoolClient,
  context: TenantContext,
  plantId: string,
  occurredAt: string
): Promise<void> {
  const result = await client.query<{ id: string }>(
    `select id
     from inventory_close_periods
     where organisation_id = $1
       and plant_id = $2
       and status = 'closed'
       and $3::date between period_start and period_end
     limit 1`,
    [context.organisationId, plantId, occurredAt]
  );
  if (result.rows[0]) {
    throw new Error("Inventory period is closed. Reopen the period before posting stock.");
  }
}

async function createCostLayer(
  client: PoolClient,
  context: TenantContext,
  layer: {
    plantId: string;
    storageLocationId: string;
    productId: string;
    sourceInventoryTransactionId: string;
    sourceType: string;
    quantityBaseUnit: number;
    unitCost: number;
    receivedAt: string;
  }
): Promise<void> {
  const totalCost = roundMoney(layer.quantityBaseUnit * layer.unitCost);
  await client.query(
    `insert into inventory_cost_layers (
      organisation_id, plant_id, storage_location_id, product_id, source_inventory_transaction_id,
      source_type, original_quantity_base_unit, remaining_quantity_base_unit, unit_cost,
      total_cost_remaining, received_at
    ) values ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10)
    on conflict (organisation_id, source_inventory_transaction_id) do nothing`,
    [
      context.organisationId,
      layer.plantId,
      layer.storageLocationId,
      layer.productId,
      layer.sourceInventoryTransactionId,
      layer.sourceType,
      layer.quantityBaseUnit,
      layer.unitCost,
      totalCost,
      layer.receivedAt
    ]
  );
}

async function consumeFifoCostLayers(
  client: PoolClient,
  context: TenantContext,
  plantId: string,
  storageLocationId: string,
  productId: string,
  quantityBaseUnit: number
): Promise<number> {
  let remaining = quantityBaseUnit;
  let consumedCost = 0;
  const layers = await client.query<{
    id: string;
    remainingQuantityBaseUnit: string;
    unitCost: string;
  }>(
    `select id,
            remaining_quantity_base_unit as "remainingQuantityBaseUnit",
            unit_cost as "unitCost"
     from inventory_cost_layers
     where organisation_id = $1
       and plant_id = $2
       and storage_location_id = $3
       and product_id = $4
       and status = 'open'
       and remaining_quantity_base_unit > 0
     order by received_at asc, created_at asc
     for update`,
    [context.organisationId, plantId, storageLocationId, productId]
  );

  for (const layer of layers.rows) {
    if (remaining <= 0) break;
    const available = Number(layer.remainingQuantityBaseUnit);
    const take = Math.min(available, remaining);
    const nextRemaining = roundQuantity(available - take);
    const cost = roundMoney(take * Number(layer.unitCost));
    consumedCost = roundMoney(consumedCost + cost);
    remaining = roundQuantity(remaining - take);
    await client.query(
      `update inventory_cost_layers
       set remaining_quantity_base_unit = $1,
           total_cost_remaining = $2,
           status = case when $1::numeric = 0 then 'depleted' else 'open' end,
           updated_at = now()
       where id = $3`,
      [nextRemaining, roundMoney(nextRemaining * Number(layer.unitCost)), layer.id]
    );
  }

  return consumedCost;
}

async function getLockedBalance(
  client: PoolClient,
  context: TenantContext,
  plantId: string,
  storageLocationId: string,
  productId: string
): Promise<number> {
  const result = await client.query<{ quantity_base_unit: string }>(
    `select quantity_base_unit
     from inventory_balances
     where organisation_id = $1 and plant_id = $2 and storage_location_id = $3 and product_id = $4
     for update`,
    [context.organisationId, plantId, storageLocationId, productId]
  );

  return Number(result.rows[0]?.quantity_base_unit ?? 0);
}

async function assertProduct(client: PoolClient, productId: string): Promise<ProductInfo> {
  const result = await client.query<{
    id: string;
    baseUnit: string;
    name: string;
    allowNegativeStock: boolean;
  }>(
    `select id, base_unit as "baseUnit", name, allow_negative_stock as "allowNegativeStock"
     from products
     where id = $1 and deleted_at is null and active = true and track_inventory = true`,
    [productId]
  );

  if (!result.rows[0]) {
    throw new Error("Invalid inventory product.");
  }

  return result.rows[0];
}

async function assertStorageLocation(client: PoolClient, storageLocationId: string, plantId: string): Promise<StorageInfo> {
  const result = await client.query<{
    id: string;
    plantId: string;
    name: string;
    negativeStockOverrideAllowed: boolean;
  }>(
    `select id, plant_id as "plantId", name, negative_stock_override_allowed as "negativeStockOverrideAllowed"
     from storage_locations
     where id = $1 and plant_id = $2 and deleted_at is null and inventory_allowed = true`,
    [storageLocationId, plantId]
  );

  if (!result.rows[0]) {
    throw new Error("Invalid storage location for the active plant.");
  }

  return result.rows[0];
}

async function assertOptionalReference(
  client: PoolClient,
  table: "dispatch_records" | "machines" | "suppliers",
  id?: string,
  plantId?: string
): Promise<void> {
  if (!id) {
    return;
  }

  const plantClause = plantId && table !== "suppliers" ? " and plant_id = $2" : "";
  const values = plantClause ? [id, plantId] : [id];
  const result = await client.query(`select id from ${table} where id = $1${plantClause} and deleted_at is null`, values);
  if (result.rowCount !== 1) {
    throw new Error(`Invalid reference for ${table}.`);
  }
}

async function resolveConversionFactor(
  client: PoolClient,
  product: ProductInfo,
  unit: string,
  provided?: number
): Promise<number> {
  if (provided !== undefined) {
    return provided;
  }

  if (normaliseUnit(unit) === normaliseUnit(product.baseUnit)) {
    return 1;
  }

  const result = await client.query<{ factor: string }>(
    `select factor
     from product_unit_conversions
     where product_id = $1
       and lower(trim(from_unit)) = lower(trim($2))
       and lower(trim(to_unit)) = lower(trim($3))
       and deleted_at is null
       and active = true
       and effective_from <= current_date
       and (effective_to is null or effective_to >= current_date)
     order by effective_from desc
     limit 1`,
    [product.id, unit, product.baseUnit]
  );

  if (!result.rows[0]) {
    throw new Error(`No active unit conversion from ${unit} to ${product.baseUnit}.`);
  }

  return Number(result.rows[0].factor);
}

async function isNegativeStockAllowed(
  client: PoolClient,
  productId: string,
  storageLocationId: string
): Promise<boolean> {
  const result = await client.query<{
    organisation: boolean;
    product: boolean;
    storage: boolean;
  }>(
    `select
      coalesce((select allow_negative_stock from organisation_settings limit 1), false) as organisation,
      coalesce((select allow_negative_stock from products where id = $1), false) as product,
      coalesce((select negative_stock_override_allowed from storage_locations where id = $2), false) as storage`,
    [productId, storageLocationId]
  );
  const row = result.rows[0];
  return Boolean(row?.organisation || row?.product || row?.storage);
}

function createBalanceWhere(options: InventoryListOptions): { sql: string; values: unknown[] } {
  const clauses = ["products.deleted_at is null", "storage_locations.deleted_at is null"];
  const values: unknown[] = [];

  addFilter(clauses, values, "inventory_balances.plant_id", options.plantId);
  addFilter(clauses, values, "inventory_balances.product_id", options.productId);
  addFilter(clauses, values, "inventory_balances.storage_location_id", options.storageLocationId);

  if (options.lowStockOnly) {
    clauses.push("products.reorder_level is not null and inventory_balances.quantity_base_unit <= products.reorder_level");
  }

  if (options.search?.trim()) {
    values.push(`%${options.search.trim()}%`);
    clauses.push(`(products.name ilike $${values.length} or products.code ilike $${values.length} or storage_locations.name ilike $${values.length})`);
  }

  return { sql: `where ${clauses.join(" and ")}`, values };
}

function createTransactionWhere(options: InventoryListOptions): { sql: string; values: unknown[] } {
  const clauses = ["products.deleted_at is null", "storage_locations.deleted_at is null"];
  const values: unknown[] = [];

  addFilter(clauses, values, "inventory_transactions.plant_id", options.plantId);
  addFilter(clauses, values, "inventory_transactions.product_id", options.productId);
  addFilter(clauses, values, "inventory_transactions.storage_location_id", options.storageLocationId);
  addFilter(clauses, values, "inventory_transactions.source_type", options.sourceType);

  if (options.search?.trim()) {
    values.push(`%${options.search.trim()}%`);
    clauses.push(`(products.name ilike $${values.length} or products.code ilike $${values.length} or inventory_transactions.transaction_type ilike $${values.length} or inventory_transactions.reason ilike $${values.length})`);
  }

  return { sql: `where ${clauses.join(" and ")}`, values };
}

function addFilter(clauses: string[], values: unknown[], column: string, value?: string): void {
  if (!value) {
    return;
  }
  values.push(value);
  clauses.push(`${column} = $${values.length}`);
}

async function withInventoryClient<T>(context: TenantContext, callback: (client: PoolClient) => Promise<T>): Promise<T> {
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

function resolvePlantId(context: TenantContext, requestedPlantId?: string): string {
  const plantId = requestedPlantId ?? context.activePlantId ?? context.allowedPlantIds[0];

  if (!plantId || !context.allowedPlantIds.includes(plantId)) {
    throw new Error("Tenant isolation violation: plant access denied.");
  }

  return plantId;
}

async function insertInventoryAudit(
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

function toBaseQuantity(quantity: number, conversionFactor: number): number {
  return roundQuantity(quantity * conversionFactor);
}

function roundQuantity(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundMoney(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function createDocumentNumber(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function createRequestId(prefix = "req"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
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

function csvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
