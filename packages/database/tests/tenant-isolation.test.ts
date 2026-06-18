import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertTenantScopedAccess,
  canAccessTenantResource,
  createAuditLogRecord,
  createRlsSessionSettings,
  createTenantScopedWhere,
  masterDataResources,
  toCsv,
  type TenantContext
} from "../src";

const context: TenantContext = {
  organisationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userId: "11111111-1111-4111-8111-111111111111",
  activePlantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
  allowedPlantIds: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"]
};

describe("tenant isolation helpers", () => {
  it("creates repository scopes from authenticated context only", () => {
    expect(createTenantScopedWhere(context)).toEqual({
      organisationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      plantId: {
        in: ["bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"]
      }
    });
  });

  it("blocks cross-tenant resources", () => {
    expect(
      canAccessTenantResource(context, {
        organisationId: "00000000-0000-4000-8000-000000000000",
        plantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1"
      })
    ).toBe(false);
  });

  it("blocks plants outside the session allow-list", () => {
    expect(() =>
      assertTenantScopedAccess(context, {
        organisationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        plantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2"
      })
    ).toThrow("plant access denied");
  });

  it("creates RLS session settings for PostgreSQL transactions", () => {
    expect(createRlsSessionSettings(context)).toEqual([
      "select set_config('app.current_organisation_id', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);",
      "select set_config('app.current_user_id', '11111111-1111-4111-8111-111111111111', true);",
      "select set_config('app.allowed_plant_ids', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', true);",
      "select set_config('app.current_plant_id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', true);"
    ]);
  });
});

describe("phase 1 RLS migration", () => {
  it("forces RLS and grants through a non-superuser app role", () => {
    const migration = readFileSync("migrations/0002_phase1_security.sql", "utf8");

    expect(migration).toContain("create role crushermitra_app nologin");
    expect(migration).toContain("force row level security");
    expect(migration).toContain("grant select, insert, update on all tables");
  });
});

describe("phase 2 master data tenant isolation", () => {
  it("keeps every master data resource tenant-owned", () => {
    const migration = readFileSync("migrations/0003_master_data.sql", "utf8");
    const tenantTables = [
      "customers",
      "customer_sites",
      "suppliers",
      "product_prices",
      "vehicles",
      "drivers",
      "machines"
    ];

    for (const table of tenantTables) {
      expect(migration).toContain(`create table if not exists ${table}`);
      expect(migration).toContain("organisation_id uuid not null references organisations(id)");
      expect(migration).toContain(`alter table ${table} force row level security`);
    }
  });

  it("plant-scopes machine and storage location policies", () => {
    const phase1 = readFileSync("migrations/0002_phase1_security.sql", "utf8");
    const phase2 = readFileSync("migrations/0003_master_data.sql", "utf8");

    expect(phase1).toContain("tenant_isolation_storage_locations");
    expect(phase1).toContain("plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))");
    expect(phase2).toContain("tenant_isolation_machines");
    expect(phase2).toContain("plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))");
  });

  it("escapes master data CSV exports", () => {
    const csv = toCsv({
      resource: "customers",
      rows: [
        {
          id: "customer-1",
          code: "CUST-1",
          legalName: "Acme, Demo",
          active: true
        }
      ],
      total: 1,
      page: 1,
      pageSize: 10
    });

    expect(masterDataResources.customers.table).toBe("customers");
    expect(csv).toContain('"Acme, Demo"');
  });
});

describe("phase 3 master data integrity migration", () => {
  it("adds shifts, units and normalised business-key constraints", () => {
    const migration = readFileSync("migrations/0007_master_data_integrity.sql", "utf8");

    expect(migration).toContain("create table if not exists units");
    expect(migration).toContain("create table if not exists shifts");
    expect(migration).toContain("alter table shifts force row level security");
    expect(migration).toContain("uniq_customers_org_code_ci");
    expect(migration).toContain("uniq_vehicles_org_registration_normalised");
    expect(migration).toContain("uniq_shifts_plant_code_ci");
  });

  it("includes shifts in the master data resource registry", () => {
    expect(masterDataResources.shifts.table).toBe("shifts");
    expect(masterDataResources.shifts.plantScoped).toBe(true);
  });
});

describe("workflow module RLS migration", () => {
  it("forces RLS on order-to-dispatch workflow tables", () => {
    const migration = readFileSync("migrations/0004_workflow_modules.sql", "utf8");

    for (const table of [
      "customer_orders",
      "dispatch_records",
      "operation_records",
      "billing_records",
      "ai_safety_events"
    ]) {
      expect(migration).toContain(`create table if not exists ${table}`);
      expect(migration).toContain(`alter table ${table} force row level security`);
    }

    expect(migration).toContain("plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))");
  });
});

describe("phase 4 inventory ledger migration", () => {
  it("creates source documents for immutable stock postings with RLS", () => {
    const migration = readFileSync("migrations/0008_inventory_ledger_phase4.sql", "utf8");

    for (const table of [
      "purchase_receipts",
      "stock_movements",
      "production_runs",
      "production_run_inputs",
      "production_run_outputs",
      "inventory_corrections"
    ]) {
      expect(migration).toContain(`create table if not exists ${table}`);
      expect(migration).toContain(`alter table ${table} force row level security`);
    }

    expect(migration).toContain("tenant_isolation_purchase_receipts");
    expect(migration).toContain("plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))");
    expect(migration).toContain("inventory_transaction_id uuid references inventory_transactions(id)");
    expect(migration).toContain("check (from_storage_location_id <> to_storage_location_id)");
  });
});

describe("inventory reservations and ageing migration", () => {
  it("creates stock reservations with tenant RLS and dispatch cancellation linkage", () => {
    const migration = readFileSync("migrations/0011_inventory_reservations_ageing_pdf.sql", "utf8");

    expect(migration).toContain("create table if not exists stock_reservations");
    expect(migration).toContain("organisation_id uuid not null references organisations(id)");
    expect(migration).toContain("alter table stock_reservations force row level security");
    expect(migration).toContain("tenant_isolation_stock_reservations");
    expect(migration).toContain("cancellation_inventory_transaction_id uuid references inventory_transactions(id)");
  });
});

describe("inventory allocation, costing and close-period migration", () => {
  it("adds location-level reservations, cost layers and closed periods with RLS", () => {
    const migration = readFileSync("migrations/0012_inventory_allocation_costing_close_periods.sql", "utf8");

    expect(migration).toContain("storage_location_id uuid references storage_locations(id)");
    expect(migration).toContain("idx_stock_reservations_order_location_unique");

    for (const table of ["inventory_cost_layers", "inventory_close_periods"]) {
      expect(migration).toContain(`create table if not exists ${table}`);
      expect(migration).toContain(`alter table ${table} force row level security`);
      expect(migration).toContain(`tenant_isolation_${table}`);
    }

    expect(migration).toContain("stock_movements_status_check");
    expect(migration).toContain("pending_approval");
  });
});

describe("audit logging foundation", () => {
  it("requires audit metadata for sensitive events", () => {
    expect(() =>
      createAuditLogRecord({
        organisationId: context.organisationId,
        actorUserId: context.userId,
        eventType: "",
        entityType: "role",
        entityId: "role-1",
        requestId: "req_1"
      })
    ).toThrow("Audit event");
  });

  it("creates append-ready audit log records", () => {
    const audit = createAuditLogRecord({
      organisationId: context.organisationId,
      plantId: context.activePlantId,
      actorUserId: context.userId,
      eventType: "role.change",
      entityType: "role",
      entityId: "role-1",
      requestId: "req_1",
      reason: "Phase 1 test"
    });

    expect(audit.createdAt).toBeInstanceOf(Date);
    expect(audit.organisationId).toBe(context.organisationId);
  });
});
