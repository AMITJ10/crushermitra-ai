import { getPool } from "@crushermitra/database";

export interface AdminMetricSummary {
  activeSubscriptions: number;
  organisations: number;
  payments: number;
  revenue: number;
  users: number;
}

export interface AdminUserRow {
  companyName: string;
  email: string;
  name: string;
  organisationId: string;
  planCode: string;
  subscriptionStatus: string;
  userId: string;
}

export interface AdminPaymentRow {
  amount: number;
  companyName: string;
  date: string;
  method: string;
  planName: string;
  status: string;
  userEmail: string;
}

export interface AdminAuditRow {
  createdAt: string;
  entityType: string;
  eventType: string;
  organisationName: string;
  reason: string;
}

export interface AdminDataResult<T> {
  data: T;
  error?: string;
}

export async function getAdminDashboardData(): Promise<AdminDataResult<{
  audits: AdminAuditRow[];
  metrics: AdminMetricSummary;
}>> {
  try {
    const [metrics, audits] = await Promise.all([loadMetrics(), loadAuditRows(8)]);
    return { data: { audits, metrics } };
  } catch (error) {
    return unavailable({ audits: [], metrics: emptyMetrics }, error);
  }
}

export async function getAdminUsersData(): Promise<AdminDataResult<AdminUserRow[]>> {
  try {
    return { data: await loadUsers() };
  } catch (error) {
    return unavailable([], error);
  }
}

export async function getAdminPaymentsData(): Promise<AdminDataResult<AdminPaymentRow[]>> {
  try {
    return { data: await loadPayments() };
  } catch (error) {
    return unavailable([], error);
  }
}

export async function getAdminReportsData(): Promise<AdminDataResult<{
  metrics: AdminMetricSummary;
  payments: AdminPaymentRow[];
  users: AdminUserRow[];
}>> {
  try {
    const [metrics, payments, users] = await Promise.all([loadMetrics(), loadPayments(), loadUsers()]);
    return { data: { metrics, payments, users } };
  } catch (error) {
    return unavailable({ metrics: emptyMetrics, payments: [], users: [] }, error);
  }
}

const emptyMetrics: AdminMetricSummary = {
  activeSubscriptions: 0,
  organisations: 0,
  payments: 0,
  revenue: 0,
  users: 0
};

async function loadMetrics(): Promise<AdminMetricSummary> {
  const result = await getPool().query<{
    active_subscriptions: string;
    organisations: string;
    payments: string;
    revenue: string;
    users: string;
  }>(
    `select
       (select count(*) from organisations where deleted_at is null)::text as organisations,
       (select count(*) from users where disabled_at is null)::text as users,
       (select count(*) from account_subscriptions where status in ('active', 'trialing'))::text as active_subscriptions,
       (select count(*) from billing_records where payment_status in ('paid', 'pending', 'failed'))::text as payments,
       (select coalesce(sum(payment_amount), 0) from billing_records where payment_status = 'paid')::text as revenue`
  );
  const row = result.rows[0];
  return {
    activeSubscriptions: Number(row?.active_subscriptions ?? 0),
    organisations: Number(row?.organisations ?? 0),
    payments: Number(row?.payments ?? 0),
    revenue: Number(row?.revenue ?? 0),
    users: Number(row?.users ?? 0)
  };
}

async function loadUsers(): Promise<AdminUserRow[]> {
  const result = await getPool().query<{
    company_name: string;
    email: string;
    name: string;
    organisation_id: string;
    plan_code: string | null;
    subscription_status: string | null;
    user_id: string;
  }>(
    `select
       users.id as user_id,
       users.name,
       users.email,
       organisations.id as organisation_id,
       organisations.trade_name as company_name,
       account_subscriptions.plan_code,
       account_subscriptions.status as subscription_status
     from users
     inner join memberships on memberships.user_id = users.id and memberships.status = 'active'
     inner join organisations on organisations.id = memberships.organisation_id and organisations.deleted_at is null
     left join account_subscriptions on account_subscriptions.organisation_id = organisations.id
     where users.disabled_at is null
     order by users.created_at desc
     limit 100`
  );

  return result.rows.map((row) => ({
    companyName: row.company_name,
    email: row.email,
    name: row.name,
    organisationId: row.organisation_id,
    planCode: row.plan_code ?? "-",
    subscriptionStatus: row.subscription_status ?? "-",
    userId: row.user_id
  }));
}

async function loadPayments(): Promise<AdminPaymentRow[]> {
  const result = await getPool().query<{
    amount: string;
    company_name: string;
    date: string;
    method: string | null;
    plan_name: string;
    status: string;
    user_email: string;
  }>(
    `select
       billing_records.payment_amount::text as amount,
       organisations.trade_name as company_name,
       billing_records.payment_method as method,
       billing_records.payment_status as status,
       billing_records.billing_date::text as date,
       coalesce(account_subscriptions.plan_code, 'business') as plan_name,
       coalesce(users.email, organisations.email) as user_email
     from billing_records
     inner join organisations on organisations.id = billing_records.organisation_id
     left join account_subscriptions on account_subscriptions.organisation_id = organisations.id
     left join memberships on memberships.organisation_id = organisations.id and memberships.status = 'active'
     left join users on users.id = memberships.user_id
     where billing_records.deleted_at is null
     order by billing_records.created_at desc
     limit 100`
  );

  return result.rows.map((row) => ({
    amount: Number(row.amount ?? 0),
    companyName: row.company_name,
    date: row.date,
    method: row.method ?? "-",
    planName: row.plan_name,
    status: row.status,
    userEmail: row.user_email
  }));
}

async function loadAuditRows(limit: number): Promise<AdminAuditRow[]> {
  const result = await getPool().query<{
    created_at: string;
    entity_type: string;
    event_type: string;
    organisation_name: string | null;
    reason: string | null;
  }>(
    `select
       audit_logs.created_at::text,
       audit_logs.event_type,
       audit_logs.entity_type,
       audit_logs.reason,
       organisations.trade_name as organisation_name
     from audit_logs
     left join organisations on organisations.id = audit_logs.organisation_id
     order by audit_logs.created_at desc
     limit $1`,
    [limit]
  );

  return result.rows.map((row) => ({
    createdAt: row.created_at,
    entityType: row.entity_type,
    eventType: row.event_type,
    organisationName: row.organisation_name ?? "Platform",
    reason: row.reason ?? "-"
  }));
}

function unavailable<T>(data: T, error: unknown): AdminDataResult<T> {
  console.error("Admin data unavailable", error);
  return {
    data,
    error: "Database unavailable. Start PostgreSQL, run migrations and seed data before using admin screens."
  };
}
