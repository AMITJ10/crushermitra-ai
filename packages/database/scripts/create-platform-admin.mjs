import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { Pool } from "pg";
import { loadRootEnv } from "./load-env.mjs";

loadRootEnv();

const email = normaliseEmail(process.env.PLATFORM_ADMIN_EMAIL ?? "");
const name = (process.env.PLATFORM_ADMIN_NAME ?? "Platform Admin").trim();
const password = process.env.PLATFORM_ADMIN_PASSWORD ?? "";
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required.");
}

if (!email) {
  throw new Error("PLATFORM_ADMIN_EMAIL is required.");
}

if (password.length < 10) {
  throw new Error("PLATFORM_ADMIN_PASSWORD must be at least 10 characters.");
}

const pool = new Pool({ connectionString });
const client = await pool.connect();

try {
  await client.query("begin");

  const existingUser = await client.query("select id from users where lower(email) = $1 limit 1", [email]);
  const passwordHash = createPasswordHash(password);
  let userId = existingUser.rows[0]?.id;

  if (userId) {
    await client.query(
      "update users set name = $1, password_hash = $2, disabled_at = null, updated_at = now() where id = $3",
      [name, passwordHash, userId]
    );
  } else {
    const inserted = await client.query(
      "insert into users (name, email, password_hash) values ($1, $2, $3) returning id",
      [name, email, passwordHash]
    );
    userId = inserted.rows[0].id;
  }

  await ensureGlobalPlatformRole(client);
  await client.query("delete from platform_admins where user_id <> $1", [userId]);
  await client.query(
    `insert into platform_admins (user_id, email, role)
     values ($1, $2, 'platform_admin')
     on conflict (user_id) do update set email = excluded.email, updated_at = now()`,
    [userId, email]
  );
  await client.query(
    `insert into audit_logs (
      actor_user_id, event_type, entity_type, entity_id, reason, request_id
    ) values ($1::uuid, 'admin.platform_admin_ensured', 'platform_admin', $1::text, 'Idempotent platform admin script', $2)`,
    [userId, `platform_admin_${Date.now().toString(36)}`]
  );

  await client.query("commit");
  console.info(`Platform admin ensured for ${email}`);
} catch (error) {
  await client.query("rollback");
  throw error;
} finally {
  client.release();
  await pool.end();
}

async function ensureGlobalPlatformRole(pgClient) {
  const existing = await pgClient.query("select id from roles where organisation_id is null and code = 'platform_admin' limit 1");

  if (!existing.rowCount) {
    await pgClient.query(
      "insert into roles (organisation_id, code, name, is_system_role) values (null, 'platform_admin', 'Platform Admin', true)"
    );
  }
}

function createPasswordHash(value) {
  const salt = randomBytes(24).toString("base64url");
  const hash = pbkdf2Sync(value, salt, 310_000, 32, "sha256").toString("base64url");
  return `pbkdf2_sha256$310000$${salt}$${hash}`;
}

function normaliseEmail(value) {
  return value.trim().toLowerCase();
}
