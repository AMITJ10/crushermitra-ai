import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import pg from "pg";
import { loadRootEnv } from "./load-env.mjs";

loadRootEnv();

const { Pool } = pg;
const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/run-sql-file.mjs <file>");
  process.exit(1);
}

const resolvedFilePath = resolve(filePath);

if (!existsSync(resolvedFilePath)) {
  console.error(`SQL file not found: ${resolvedFilePath}`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const local = commandExists("psql")
  ? spawnSync("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", resolvedFilePath], {
      stdio: "inherit"
    })
  : { status: 1 };

if (local.status === 0) {
  process.exit(0);
}

const direct = await runWithPg(databaseUrl, resolvedFilePath);

if (direct.status === 0) {
  process.exit(0);
}

const parsed = new URL(databaseUrl);
const user = decodeURIComponent(parsed.username);
const password = decodeURIComponent(parsed.password);
const database = parsed.pathname.replace("/", "");
const composeFile = resolve("../..", "docker-compose.yml");
const docker = spawnSync(
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
    input: readFileSync(resolvedFilePath),
    stdio: ["pipe", "inherit", "inherit"],
    env: {
      ...process.env,
      PGPASSWORD: password
    }
  }
);

process.exit(docker.status ?? 1);

async function runWithPg(databaseUrl, filePath) {
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await pool.query(readFileSync(filePath, "utf8"));
    return { status: 0 };
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    return { status: 1 };
  } finally {
    await pool.end();
  }
}

function commandExists(command) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore"
  });

  return !result.error && result.status === 0;
}
