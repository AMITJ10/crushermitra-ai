import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";

const seededOrganisationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOrganisationId = "00000000-0000-4000-8000-000000000000";
const seededUserId = "11111111-1111-4111-8111-111111111111";
const crusherPlantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

const describePostgres =
  process.env.DATABASE_INTEGRATION_TESTS === "1" ? describe : describe.skip;

describePostgres("PostgreSQL migrations, seeds and RLS", () => {
  let pool: Pool;

  beforeAll(() => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for PostgreSQL integration tests.");
    }

    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  });

  afterAll(async () => {
    await pool?.end();
  });

  it("has the Phase 1 and Phase 2 schema plus seeded demo records", async () => {
    const expectedTables = [
      "organisations",
      "plants",
      "users",
      "memberships",
      "roles",
      "storage_locations",
      "customers",
      "customer_sites",
      "suppliers",
      "vehicles",
      "drivers",
      "machines",
      "units",
      "shifts",
      "customer_orders",
      "dispatch_records",
      "operation_records",
      "billing_records",
      "purchase_receipts",
      "stock_movements",
      "production_runs",
      "production_run_inputs",
      "production_run_outputs",
      "inventory_corrections",
      "stock_reservations",
      "inventory_cost_layers",
      "inventory_close_periods"
    ];

    const tables = await pool.query<{ table_name: string }>(
      `select table_name
       from information_schema.tables
       where table_schema = 'public'
         and table_name = any($1::text[])`,
      [expectedTables]
    );

    expect(tables.rows.map((row) => row.table_name).sort()).toEqual(expectedTables.sort());

    const seedCounts = await pool.query<{
      organisations: string;
      customers: string;
      shifts: string;
      orders: string;
      dispatches: string;
      operations: string;
      inventory_transactions: string;
      inventory_balances: string;
      stock_reservations: string;
      inventory_cost_layers: string;
      inventory_close_periods: string;
    }>(
      `select
        (select count(*) from organisations where id = $1) as organisations,
        (select count(*) from customers where organisation_id = $1) as customers,
        (select count(*) from shifts where organisation_id = $1) as shifts,
        (select count(*) from customer_orders where organisation_id = $1) as orders,
        (select count(*) from dispatch_records where organisation_id = $1) as dispatches,
        (select count(*) from operation_records where organisation_id = $1) as operations,
        (select count(*) from inventory_transactions where organisation_id = $1) as inventory_transactions,
        (select count(*) from inventory_balances where organisation_id = $1) as inventory_balances,
        (select count(*) from stock_reservations where organisation_id = $1) as stock_reservations,
        (select count(*) from inventory_cost_layers where organisation_id = $1) as inventory_cost_layers,
        (select count(*) from inventory_close_periods where organisation_id = $1) as inventory_close_periods`,
      [seededOrganisationId]
    );

    const counts = seedCounts.rows[0];
    expect(Number(counts?.organisations ?? 0)).toBe(1);
    expect(Number(counts?.customers ?? 0)).toBeGreaterThan(0);
    expect(Number(counts?.shifts ?? 0)).toBeGreaterThan(0);
    expect(Number(counts?.orders ?? 0)).toBeGreaterThan(0);
    expect(Number(counts?.dispatches ?? 0)).toBeGreaterThan(0);
    expect(Number(counts?.operations ?? 0)).toBeGreaterThan(0);
    expect(Number(counts?.inventory_transactions ?? 0)).toBeGreaterThan(0);
    expect(Number(counts?.inventory_balances ?? 0)).toBeGreaterThan(0);
    expect(Number(counts?.stock_reservations ?? 0)).toBeGreaterThan(0);
  });

  it("enforces organisation and plant RLS through the application role", async () => {
    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query("set local role crushermitra_app");
      await client.query("select set_config('app.current_organisation_id', $1, true)", [seededOrganisationId]);
      await client.query("select set_config('app.current_user_id', $1, true)", [seededUserId]);
      await client.query("select set_config('app.allowed_plant_ids', $1, true)", [crusherPlantId]);
      await client.query("select set_config('app.current_plant_id', $1, true)", [crusherPlantId]);

      const visibleRows = await client.query<{
        customers: string;
        storage_locations: string;
        other_plant_storage_locations: string;
        inventory_balances: string;
        stock_reservations: string;
        inventory_cost_layers: string;
        inventory_close_periods: string;
      }>(
        `select
          (select count(*) from customers) as customers,
          (select count(*) from storage_locations) as storage_locations,
          (select count(*) from storage_locations where plant_id <> $1) as other_plant_storage_locations,
          (select count(*) from inventory_balances) as inventory_balances,
          (select count(*) from stock_reservations) as stock_reservations,
          (select count(*) from inventory_cost_layers) as inventory_cost_layers,
          (select count(*) from inventory_close_periods) as inventory_close_periods`,
        [crusherPlantId]
      );

      expect(Number(visibleRows.rows[0]?.customers ?? 0)).toBeGreaterThan(0);
      expect(Number(visibleRows.rows[0]?.storage_locations ?? 0)).toBeGreaterThan(0);
      expect(Number(visibleRows.rows[0]?.other_plant_storage_locations ?? 0)).toBe(0);
      expect(Number(visibleRows.rows[0]?.inventory_balances ?? 0)).toBeGreaterThan(0);
      expect(Number(visibleRows.rows[0]?.stock_reservations ?? 0)).toBeGreaterThan(0);

      await client.query("select set_config('app.current_organisation_id', $1, true)", [otherOrganisationId]);

      const crossTenantRows = await client.query<{
        customers: string;
        orders: string;
        inventory_transactions: string;
        stock_reservations: string;
        inventory_cost_layers: string;
        inventory_close_periods: string;
      }>(
        `select
          (select count(*) from customers) as customers,
          (select count(*) from customer_orders) as orders,
          (select count(*) from inventory_transactions) as inventory_transactions,
          (select count(*) from stock_reservations) as stock_reservations,
          (select count(*) from inventory_cost_layers) as inventory_cost_layers,
          (select count(*) from inventory_close_periods) as inventory_close_periods`
      );

      expect(Number(crossTenantRows.rows[0]?.customers ?? 0)).toBe(0);
      expect(Number(crossTenantRows.rows[0]?.orders ?? 0)).toBe(0);
      expect(Number(crossTenantRows.rows[0]?.inventory_transactions ?? 0)).toBe(0);
      expect(Number(crossTenantRows.rows[0]?.stock_reservations ?? 0)).toBe(0);
      expect(Number(crossTenantRows.rows[0]?.inventory_cost_layers ?? 0)).toBe(0);
      expect(Number(crossTenantRows.rows[0]?.inventory_close_periods ?? 0)).toBe(0);
    } finally {
      await client.query("rollback");
      client.release();
    }
  });
});
