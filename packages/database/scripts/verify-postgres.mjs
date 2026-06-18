import pg from "pg";
import { loadRootEnv } from "./load-env.mjs";

loadRootEnv();

const { Pool } = pg;
const seededOrganisationId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const otherOrganisationId = "00000000-0000-4000-8000-000000000000";
const seededUserId = "11111111-1111-4111-8111-111111111111";
const crusherPlantId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required for PostgreSQL verification.");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await verifySchemaAndSeeds();
  await verifyRls();
  console.log("PostgreSQL migrations, seeds and RLS verification passed.");
} catch (error) {
  console.error(formatError(error));
  process.exitCode = 1;
} finally {
  await pool.end();
}

async function verifySchemaAndSeeds() {
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

  const tables = await pool.query(
    `select table_name
     from information_schema.tables
     where table_schema = 'public'
       and table_name = any($1::text[])`,
    [expectedTables]
  );
  const actualTables = tables.rows.map((row) => row.table_name).sort();
  assertEqualArrays(actualTables, expectedTables.sort(), "Expected migrated tables were not all present.");

  const seedCounts = await pool.query(
    `select
      (select count(*) from organisations where id = $1) as organisations,
      (select count(*) from customers where organisation_id = $1) as customers,
      (select count(*) from shifts where organisation_id = $1) as shifts,
      (select count(*) from customer_orders where organisation_id = $1) as orders,
      (select count(*) from dispatch_records where organisation_id = $1) as dispatches,
      (select count(*) from operation_records where organisation_id = $1) as operations,
      (select count(*) from inventory_transactions where organisation_id = $1) as inventory_transactions,
      (select count(*) from inventory_balances where organisation_id = $1) as inventory_balances,
      (select count(*) from stock_reservations where organisation_id = $1) as stock_reservations`,
    [seededOrganisationId]
  );
  const counts = seedCounts.rows[0];

  assert(Number(counts?.organisations ?? 0) === 1, "Seeded organisation was not found.");
  assert(Number(counts?.customers ?? 0) > 0, "Seeded customers were not found.");
  assert(Number(counts?.shifts ?? 0) > 0, "Seeded shifts were not found.");
  assert(Number(counts?.orders ?? 0) > 0, "Seeded customer orders were not found.");
  assert(Number(counts?.dispatches ?? 0) > 0, "Seeded dispatch records were not found.");
  assert(Number(counts?.operations ?? 0) > 0, "Seeded operation records were not found.");
  assert(Number(counts?.inventory_transactions ?? 0) > 0, "Seeded inventory ledger transactions were not found.");
  assert(Number(counts?.inventory_balances ?? 0) > 0, "Seeded inventory balances were not found.");
  assert(Number(counts?.stock_reservations ?? 0) > 0, "Seeded stock reservations were not found.");

  console.log("Verified migrated tables and seeded demo records.");
}

async function verifyRls() {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query("set local role crushermitra_app");
    await client.query("select set_config('app.current_organisation_id', $1, true)", [seededOrganisationId]);
    await client.query("select set_config('app.current_user_id', $1, true)", [seededUserId]);
    await client.query("select set_config('app.allowed_plant_ids', $1, true)", [crusherPlantId]);
    await client.query("select set_config('app.current_plant_id', $1, true)", [crusherPlantId]);

    const visibleRows = await client.query(
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

    assert(Number(visibleRows.rows[0]?.customers ?? 0) > 0, "RLS blocked valid tenant customers.");
    assert(Number(visibleRows.rows[0]?.storage_locations ?? 0) > 0, "RLS blocked valid tenant storage locations.");
    assert(Number(visibleRows.rows[0]?.other_plant_storage_locations ?? 0) === 0, "Plant-scoped RLS exposed storage locations outside the allowed plant.");
    assert(Number(visibleRows.rows[0]?.inventory_balances ?? 0) > 0, "RLS blocked valid tenant inventory balances.");
    assert(Number(visibleRows.rows[0]?.stock_reservations ?? 0) > 0, "RLS blocked valid tenant stock reservations.");

    await client.query("select set_config('app.current_organisation_id', $1, true)", [otherOrganisationId]);

    const crossTenantRows = await client.query(
      `select
        (select count(*) from customers) as customers,
        (select count(*) from customer_orders) as orders,
        (select count(*) from inventory_transactions) as inventory_transactions,
        (select count(*) from stock_reservations) as stock_reservations,
        (select count(*) from inventory_cost_layers) as inventory_cost_layers,
        (select count(*) from inventory_close_periods) as inventory_close_periods`
    );

    assert(Number(crossTenantRows.rows[0]?.customers ?? 0) === 0, "RLS exposed cross-tenant customers.");
    assert(Number(crossTenantRows.rows[0]?.orders ?? 0) === 0, "RLS exposed cross-tenant orders.");
    assert(Number(crossTenantRows.rows[0]?.inventory_transactions ?? 0) === 0, "RLS exposed cross-tenant inventory ledger.");
    assert(Number(crossTenantRows.rows[0]?.stock_reservations ?? 0) === 0, "RLS exposed cross-tenant reservations.");
    assert(Number(crossTenantRows.rows[0]?.inventory_cost_layers ?? 0) === 0, "RLS exposed cross-tenant cost layers.");
    assert(Number(crossTenantRows.rows[0]?.inventory_close_periods ?? 0) === 0, "RLS exposed cross-tenant close periods.");

    console.log("Verified organisation and plant RLS through crushermitra_app.");
  } finally {
    await client.query("rollback");
    client.release();
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqualArrays(actual, expected, message) {
  assert(actual.length === expected.length, `${message} Actual: ${actual.join(", ")}`);

  for (const [index, value] of expected.entries()) {
    assert(actual[index] === value, `${message} Actual: ${actual.join(", ")}`);
  }
}

function formatError(error) {
  if (error instanceof AggregateError) {
    return [
      error.message || "PostgreSQL verification failed.",
      ...error.errors.map((nestedError) => formatError(nestedError))
    ].join("\n");
  }

  if (error instanceof Error) {
    const code = "code" in error ? ` (${error.code})` : "";
    return `${error.message || error.name}${code}`;
  }

  return String(error);
}
