import type { SessionLocale, SessionTenantContext } from "@crushermitra/auth";
import { createPasswordHash, normaliseEmail, verifyPassword } from "@crushermitra/auth";
import { getPool } from "@crushermitra/database";
import type { Permission } from "@crushermitra/permissions";
import { randomBytes, randomUUID, createHash } from "node:crypto";

export interface SignupInput {
  businessType: "stone_crusher" | "rmc_plant" | "crusher_rmc" | "quarry" | "aggregate_supplier" | "transporter";
  confirmPassword: string;
  defaultPlantName?: string;
  district: string;
  email: string;
  fullName: string;
  locale: SessionLocale;
  mobile: string;
  organisationName: string;
  pan?: string;
  password: string;
  pincode: string;
  state: string;
  termsAccepted: boolean;
}

export interface PasswordResetRequestResult {
  emailSent: boolean;
  resetUrl?: string;
}

export interface PlatformAdminStatus {
  exists: boolean;
  matchingEmailExists: boolean;
}

export async function authenticateDatabaseUser(email: string, password: string): Promise<SessionTenantContext | null> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    const normalisedEmail = normaliseEmail(email);
    const userResult = await client.query<{
      password_hash: string | null;
      disabled_at: Date | null;
    }>("select password_hash, disabled_at from users where lower(email) = $1 limit 1", [normalisedEmail]);
    const user = userResult.rows[0];

    if (!user?.password_hash || user.disabled_at || !verifyPassword(password, user.password_hash)) {
      await recordLoginHistory(normalisedEmail, "failed_login", "invalid_credentials");
      return null;
    }

    const context = await loadSessionContext(normalisedEmail, "en");
    if (!context) {
      await recordLoginHistory(normalisedEmail, "failed_login", "inactive_membership");
      return null;
    }

    await recordLoginHistory(normalisedEmail, "login", undefined, context.organisationId, context.userId);
    return context;
  } finally {
    client.release();
  }
}

export async function getPlatformAdminStatus(email: string): Promise<PlatformAdminStatus> {
  const normalisedEmail = normaliseEmail(email);
  const result = await getPool().query<{
    matching_email_exists: boolean;
    platform_admin_count: string;
  }>(
    `select
       exists(select 1 from platform_admins where lower(email) = $1) as matching_email_exists,
       count(*)::text as platform_admin_count
     from platform_admins`,
    [normalisedEmail]
  );
  const row = result.rows[0];

  return {
    exists: Number(row?.platform_admin_count ?? 0) > 0,
    matchingEmailExists: Boolean(row?.matching_email_exists)
  };
}

export async function signupOrganisation(input: SignupInput): Promise<SessionTenantContext> {
  const client = await getPool().connect();
  const email = normaliseEmail(input.email);
  const plantName = input.defaultPlantName?.trim() || `${input.organisationName.trim()} Plant`;
  const organisationCode = createCode(input.organisationName);

  try {
    await client.query("begin");

    const duplicate = await client.query("select id from users where lower(email) = $1", [email]);
    if (duplicate.rowCount) {
      throw new Error("An account already exists for this email.");
    }

    const organisation = await client.query<{ id: string }>(
      `insert into organisations (
        legal_name, trade_name, organisation_type, pan, gstin, phone, email, state, district, pincode, default_language, default_currency
      ) values ($1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'INR')
      returning id`,
      [
        input.organisationName.trim(),
        input.businessType,
        input.pan?.trim().toUpperCase() || null,
        null,
        input.mobile.trim(),
        email,
        input.state.trim(),
        input.district.trim(),
        input.pincode.trim(),
        input.locale
      ]
    );
    const organisationId = organisation.rows[0]?.id;

    const plant = await client.query<{ id: string }>(
      `insert into plants (organisation_id, name, code, plant_type, address, contact_person)
       values ($1, $2, $3, 'crusher', $4, $5)
       returning id`,
      [
        organisationId,
        plantName,
        organisationCode,
        `${input.district.trim()}, ${input.state.trim()} ${input.pincode.trim()}`,
        input.fullName.trim()
      ]
    );
    const plantId = plant.rows[0]?.id;

    const user = await client.query<{ id: string }>(
      `insert into users (name, email, mobile, password_hash)
       values ($1, $2, $3, $4)
       returning id`,
      [input.fullName.trim(), email, input.mobile.trim(), createPasswordHash(input.password)]
    );
    const userId = user.rows[0]?.id;

    const membership = await client.query<{ id: string }>(
      `insert into memberships (organisation_id, user_id, status)
       values ($1, $2, 'active')
       returning id`,
      [organisationId, userId]
    );
    const membershipId = membership.rows[0]?.id;

    const role = await client.query<{ id: string }>(
      `insert into roles (organisation_id, code, name, is_system_role)
       values ($1, 'organisation_owner', 'Organisation Owner', true)
       returning id`,
      [organisationId]
    );
    const roleId = role.rows[0]?.id;

    await client.query(
      "insert into role_permissions (role_id, permission_code) select $1, code from permissions on conflict do nothing",
      [roleId]
    );
    await client.query("insert into membership_roles (membership_id, role_id) values ($1, $2)", [membershipId, roleId]);
    await client.query("insert into user_plant_access (membership_id, plant_id) values ($1, $2)", [membershipId, plantId]);

    await client.query(
      `insert into organisation_settings (organisation_id, default_locale)
       values ($1, $2)
       on conflict (organisation_id) do update set default_locale = excluded.default_locale`,
      [organisationId, input.locale]
    );
    await client.query(
      `insert into plant_settings (plant_id, organisation_id)
       values ($1, $2)
       on conflict (plant_id) do nothing`,
      [plantId, organisationId]
    );

    await client.query(
      `insert into account_subscriptions (
        organisation_id, plan_code, status, monthly_order_limit, monthly_dispatch_limit, user_limit,
        current_period_start, current_period_end, payment_status
      ) values ($1, 'starter', 'trialing', 50, 50, 1, current_date, current_date + interval '14 days', 'pending')
      on conflict (organisation_id) do nothing`,
      [organisationId]
    );

    await client.query(
      `insert into subscriptions (organisation_id, plan_id, status, trial_ends_at, current_period_ends_at)
       select $1, id, 'trialing', now() + interval '14 days', now() + interval '14 days'
       from subscription_plans
       where code = 'starter'
       on conflict do nothing`,
      [organisationId]
    );

    await client.query(
      `insert into audit_logs (
        organisation_id, plant_id, actor_user_id, event_type, entity_type, entity_id, new_value, reason, request_id
      ) values ($1::uuid, $2::uuid, $3::uuid, 'auth.signup', 'organisation', $1::text, $4::jsonb, 'Owner self-service signup', $5)`,
      [
        organisationId,
        plantId,
        userId,
        JSON.stringify({ email, organisationName: input.organisationName.trim(), businessType: input.businessType, plantName }),
        createAuditRequestId("signup")
      ]
    );

    await client.query("commit");

    const context = await loadSessionContext(email, input.locale);
    if (!context) {
      throw new Error("Signup completed but session context could not be loaded.");
    }

    return context;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function requestPasswordReset(email: string, requestUrl: string, locale: SessionLocale, metadata: {
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<PasswordResetRequestResult> {
  const client = await getPool().connect();
  const normalisedEmail = normaliseEmail(email);

  try {
    await client.query("begin");
    const userResult = await client.query<{ id: string; organisation_id: string | null }>(
      `select users.id, memberships.organisation_id
       from users
       left join memberships on memberships.user_id = users.id and memberships.status = 'active'
       where lower(users.email) = $1 and users.disabled_at is null
       order by memberships.created_at asc nulls last
       limit 1`,
      [normalisedEmail]
    );
    const user = userResult.rows[0];

    if (!user) {
      await recordLoginHistory(normalisedEmail, "failed_login", "password_reset_unknown_email");
      await client.query("commit");
      return { emailSent: false };
    }

    const recentRequests = await client.query<{ count: string }>(
      `select count(*)::text as count
       from password_reset_tokens
       where user_id = $1 and created_at > now() - interval '15 minutes'`,
      [user.id]
    );

    if (Number(recentRequests.rows[0]?.count ?? 0) >= 5) {
      await client.query("commit");
      return { emailSent: false };
    }

    const token = randomBytes(48).toString("base64url");
    const tokenHash = hashResetToken(token);
    await client.query(
      "update password_reset_tokens set used_at = now() where user_id = $1 and used_at is null",
      [user.id]
    );
    await client.query(
      `insert into password_reset_tokens (
        organisation_id, user_id, token_hash, requested_ip, user_agent, expires_at
      ) values ($1, $2, $3, nullif($4, '')::inet, $5, now() + interval '45 minutes')`,
      [user.organisation_id, user.id, tokenHash, metadata.ipAddress ?? "", metadata.userAgent ?? null]
    );
    await client.query(
      `insert into audit_logs (
        organisation_id, actor_user_id, event_type, entity_type, entity_id, reason, request_id
      ) values ($1::uuid, $2::uuid, 'auth.password_reset_requested', 'user', $2::text, 'Password reset requested', $3)`,
      [user.organisation_id, user.id, createAuditRequestId("reset")]
    );
    await client.query("commit");

    const resetUrl = new URL(`/${locale}/reset-password`, requestUrl);
    resetUrl.searchParams.set("token", token);
    return { emailSent: true, resetUrl: resetUrl.toString() };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetPassword(token: string, password: string): Promise<boolean> {
  const client = await getPool().connect();
  const tokenHash = hashResetToken(token);

  try {
    await client.query("begin");
    const tokenResult = await client.query<{
      id: string;
      organisation_id: string | null;
      user_id: string;
    }>(
      `select id, organisation_id, user_id
       from password_reset_tokens
       where token_hash = $1 and used_at is null and expires_at > now()
       for update`,
      [tokenHash]
    );
    const reset = tokenResult.rows[0];

    if (!reset) {
      await client.query("rollback");
      return false;
    }

    await client.query("update users set password_hash = $1, updated_at = now() where id = $2", [
      createPasswordHash(password),
      reset.user_id
    ]);
    await client.query("update password_reset_tokens set used_at = now() where id = $1", [reset.id]);
    await client.query(
      `insert into audit_logs (
        organisation_id, actor_user_id, event_type, entity_type, entity_id, reason, request_id
      ) values ($1::uuid, $2::uuid, 'auth.password_reset_completed', 'user', $2::text, 'Password reset completed', $3)`,
      [reset.organisation_id, reset.user_id, createAuditRequestId("reset")]
    );
    await client.query("commit");
    return true;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function authenticatePlatformAdmin(email: string, password: string): Promise<{
  email: string;
  name: string;
} | null> {
  const normalisedEmail = normaliseEmail(email);
  const result = await getPool().query<{
    email: string;
    name: string;
    password_hash: string | null;
  }>(
    `select users.email, users.name, users.password_hash
     from users
     inner join platform_admins on platform_admins.user_id = users.id
     where lower(users.email) = $1 and users.disabled_at is null
     limit 1`,
    [normalisedEmail]
  );
  const user = result.rows[0];

  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
    await recordLoginHistory(normalisedEmail, "failed_login", "invalid_admin_credentials");
    return null;
  }

  await getPool().query(
    `insert into audit_logs (actor_user_id, event_type, entity_type, entity_id, reason, request_id)
     select users.id, 'admin.login', 'platform_admin', users.id::text, 'Platform admin login', $2
     from users
     where lower(users.email) = $1
     limit 1`,
    [normalisedEmail, createAuditRequestId("admin_login")]
  );

  return { email: normaliseEmail(user.email), name: user.name };
}

async function loadSessionContext(email: string, locale: SessionLocale): Promise<SessionTenantContext | null> {
  const result = await getPool().query<{
    user_id: string;
    user_name: string;
    user_email: string;
    membership_id: string;
    organisation_id: string;
    organisation_name: string;
    default_language: string;
    active_plant_id: string | null;
    active_plant_name: string | null;
  }>(
    `select
       users.id as user_id,
       users.name as user_name,
       users.email as user_email,
       memberships.id as membership_id,
       organisations.id as organisation_id,
       organisations.trade_name as organisation_name,
       organisations.default_language,
       plants.id as active_plant_id,
       plants.name as active_plant_name
     from users
     inner join memberships on memberships.user_id = users.id and memberships.status = 'active'
     inner join organisations on organisations.id = memberships.organisation_id and organisations.deleted_at is null
     left join user_plant_access on user_plant_access.membership_id = memberships.id
     left join plants on plants.id = user_plant_access.plant_id and plants.deleted_at is null
     where lower(users.email) = $1 and users.disabled_at is null
     order by memberships.created_at asc, plants.created_at asc nulls last
     limit 1`,
    [normaliseEmail(email)]
  );
  const row = result.rows[0];

  if (!row) {
    return null;
  }

  const plantIds = await getPool().query<{ plant_id: string }>(
    "select plant_id from user_plant_access where membership_id = $1 order by plant_id",
    [row.membership_id]
  );
  const permissions = await getPool().query<{ permission_code: Permission }>(
    `select distinct role_permissions.permission_code
     from membership_roles
     inner join role_permissions on role_permissions.role_id = membership_roles.role_id
     where membership_roles.membership_id = $1
     order by role_permissions.permission_code`,
    [row.membership_id]
  );
  const sessionLocale = isSupportedLocale(locale) ? locale : isSupportedLocale(row.default_language) ? row.default_language : "en";

  return {
    userId: row.user_id,
    membershipId: row.membership_id,
    organisationId: row.organisation_id,
    activePlantId: row.active_plant_id ?? undefined,
    allowedPlantIds: plantIds.rows.map((plant) => plant.plant_id),
    locale: sessionLocale,
    userName: row.user_name,
    userEmail: normaliseEmail(row.user_email),
    organisationName: row.organisation_name,
    activePlantName: row.active_plant_name ?? undefined,
    sessionId: randomUUID(),
    permissions: permissions.rows.map((permission) => permission.permission_code)
  };
}

async function recordLoginHistory(
  email: string,
  eventType: "failed_login" | "login",
  failureReason?: string,
  organisationId?: string,
  userId?: string
): Promise<void> {
  await getPool().query(
    `insert into login_history (organisation_id, user_id, email, event_type, failure_reason, request_id)
     values ($1, $2, $3, $4, $5, $6)`,
    [organisationId ?? null, userId ?? null, email, eventType, failureReason ?? null, createAuditRequestId("login")]
  );
}

function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createCode(value: string): string {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 10);
  return cleaned || "PLANT";
}

function createAuditRequestId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${randomBytes(6).toString("hex")}`;
}

function isSupportedLocale(value: string): value is SessionLocale {
  return value === "en" || value === "hi" || value === "mr" || value === "gu" || value === "kn" || value === "te" || value === "ta";
}
