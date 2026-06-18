create table if not exists account_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plan_code text not null default 'starter',
  status text not null default 'active',
  monthly_order_limit integer not null default 500,
  monthly_dispatch_limit integer not null default 500,
  user_limit integer not null default 3,
  current_period_start date not null default current_date,
  current_period_end date,
  payment_status text not null default 'not_configured',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id)
);

create table if not exists ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  recommendation_type text not null,
  title text not null,
  summary text not null,
  estimated_impact text,
  status text not null default 'draft',
  human_confirmation_required boolean not null default true,
  source_refs jsonb not null default '[]'::jsonb,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  request_type text not null,
  source_type text,
  source_id uuid,
  original_value jsonb,
  requested_value jsonb,
  reason text not null,
  status text not null default 'pending',
  requested_by_user_id uuid references users(id),
  approved_by_user_id uuid references users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists notification_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  channel text not null check (channel in ('whatsapp', 'sms', 'email')),
  recipient text not null,
  template_key text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  provider_message_id text,
  error_message text,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table if not exists report_exports (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  module_name text not null,
  export_format text not null check (export_format in ('csv', 'pdf')),
  title text not null,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'created',
  file_url text,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_account_subscriptions_scope on account_subscriptions (organisation_id, status);
create index if not exists idx_ai_recommendations_scope on ai_recommendations (organisation_id, plant_id, status, created_at);
create index if not exists idx_approval_requests_scope on approval_requests (organisation_id, plant_id, status, created_at);
create index if not exists idx_notification_events_scope on notification_events (organisation_id, plant_id, channel, status, created_at);
create index if not exists idx_report_exports_scope on report_exports (organisation_id, plant_id, module_name, created_at);

alter table account_subscriptions enable row level security;
alter table ai_recommendations enable row level security;
alter table approval_requests enable row level security;
alter table notification_events enable row level security;
alter table report_exports enable row level security;

alter table account_subscriptions force row level security;
alter table ai_recommendations force row level security;
alter table approval_requests force row level security;
alter table notification_events force row level security;
alter table report_exports force row level security;

drop policy if exists tenant_isolation_account_subscriptions on account_subscriptions;
create policy tenant_isolation_account_subscriptions on account_subscriptions
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_ai_recommendations on ai_recommendations;
create policy tenant_isolation_ai_recommendations on ai_recommendations
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  );

drop policy if exists tenant_isolation_approval_requests on approval_requests;
create policy tenant_isolation_approval_requests on approval_requests
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  );

drop policy if exists tenant_isolation_notification_events on notification_events;
create policy tenant_isolation_notification_events on notification_events
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  );

drop policy if exists tenant_isolation_report_exports on report_exports;
create policy tenant_isolation_report_exports on report_exports
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (plant_id is null or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ',')))
  );

grant select, insert, update on all tables in schema public to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
