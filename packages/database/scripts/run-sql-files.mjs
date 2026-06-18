import { readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { loadRootEnv } from "./load-env.mjs";

loadRootEnv();

const { Pool } = pg;
const directory = process.argv[2];

if (!directory) {
  console.error("Usage: node scripts/run-sql-files.mjs <directory>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const files = readdirSync(directory)
  .filter((file) => file.endsWith(".sql"))
  .sort((left, right) => left.localeCompare(right));
const hasLocalPsql = commandExists("psql");
const isMigrationDirectory = basename(resolve(directory)) === "migrations";

const legacyMigrationSentinels = {
  "0001_foundation.sql": [
    { kind: "type", name: "approval_status" },
    { kind: "table", name: "organisations" },
    { kind: "table", name: "products" }
  ],
  "0002_phase1_security.sql": [
    { kind: "table", name: "organisation_settings" },
    { kind: "table", name: "sessions" },
    { kind: "table", name: "login_history" }
  ],
  "0003_master_data.sql": [
    { kind: "table", name: "customers" },
    { kind: "table", name: "customer_sites" },
    { kind: "table", name: "machines" }
  ],
  "0004_workflow_modules.sql": [
    { kind: "table", name: "customer_orders" },
    { kind: "table", name: "dispatch_records" },
    { kind: "table", name: "operation_records" }
  ],
  "0005_admin_billing_ai_approvals.sql": [
    { kind: "table", name: "account_subscriptions" },
    { kind: "table", name: "ai_recommendations" },
    { kind: "table", name: "report_exports" }
  ],
  "0006_amounts_payments_leads.sql": [
    { kind: "column", table: "customer_orders", name: "paid_amount" },
    { kind: "column", table: "dispatch_records", name: "dispatch_amount" },
    { kind: "column", table: "operation_records", name: "production_cost" },
    { kind: "column", table: "billing_records", name: "payment_status" },
    { kind: "table", name: "leads" }
  ],
  "0007_master_data_integrity.sql": [
    { kind: "table", name: "units" },
    { kind: "table", name: "shifts" },
    { kind: "column", table: "customers", name: "deactivated_at" }
  ]
};

for (const file of files) {
  if (isMigrationDirectory && await isLegacyMigrationAlreadyApplied(databaseUrl, file)) {
    console.log(`Skipping ${join(directory, file)}; legacy migration appears to be applied`);
    continue;
  }

  const filePath = join(directory, file);
  console.log(`Running ${filePath}`);
  const result = hasLocalPsql
    ? runWithLocalPsql(databaseUrl, filePath)
    : { status: 1 };

  if (result.status === 0) {
    continue;
  }

  const direct = await runWithPg(databaseUrl, filePath);

  if (direct.status === 0) {
    continue;
  }

  const fallback = runWithDockerCompose(databaseUrl, filePath);

  if (fallback.status !== 0) {
    process.exit(fallback.status ?? 1);
  }
}

async function runWithPg(databaseUrl, filePath) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(readFileSync(filePath, "utf8"));
    return { status: 0 };
  } catch (error) {
    console.error(formatError(error));
    return { status: 1 };
  } finally {
    await pool.end();
  }
}

function runWithLocalPsql(databaseUrl, filePath) {
  return spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", filePath], {
    stdio: "inherit"
  });
}

function runWithDockerCompose(databaseUrl, filePath) {
  const parsed = new URL(databaseUrl);
  const user = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  const database = parsed.pathname.replace("/", "");
  const composeFile = resolve("../..", "docker-compose.yml");

  return spawnSync(
    "docker",
    [
      "compose",
      "-f",
      composeFile,
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      user,
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1"
    ],
    {
      input: readFileSync(filePath),
      stdio: ["pipe", "inherit", "inherit"],
      env: {
        ...process.env,
        PGPASSWORD: password
      }
    }
  );
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore"
  });

  return !result.error && result.status === 0;
}

async function isLegacyMigrationAlreadyApplied(databaseUrl, file) {
  const sentinels = legacyMigrationSentinels[file];

  if (!sentinels) {
    return false;
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    for (const sentinel of sentinels) {
      const exists = await sentinelExists(pool, sentinel);

      if (!exists) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

async function sentinelExists(pool, sentinel) {
  if (sentinel.kind === "table") {
    const result = await pool.query(
      "select to_regclass($1) is not null as exists",
      [`public.${sentinel.name}`]
    );

    return result.rows[0]?.exists === true;
  }

  if (sentinel.kind === "type") {
    const result = await pool.query(
      "select exists (select 1 from pg_type where typname = $1) as exists",
      [sentinel.name]
    );

    return result.rows[0]?.exists === true;
  }

  if (sentinel.kind === "column") {
    const result = await pool.query(
      `select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = $1
          and column_name = $2
      ) as exists`,
      [sentinel.table, sentinel.name]
    );

    return result.rows[0]?.exists === true;
  }

  return false;
}

function formatError(error) {
  if (error instanceof Error) {
    const code = "code" in error ? ` (${error.code})` : "";
    return `${error.message}${code}`;
  }

  return String(error);
}
