create extension if not exists postgis;
create extension if not exists vector;
create extension if not exists pgcrypto;

create type approval_status as enum ('draft', 'pending_approval', 'approved', 'rejected', 'corrected', 'cancelled');
create type inventory_direction as enum ('in', 'out');
create type weighment_mode as enum ('device', 'manual', 'imported', 'simulator');

create table organisations (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text not null,
  organisation_type text not null,
  pan text not null,
  gstin text,
  phone text not null,
  email text not null,
  state text not null,
  district text not null,
  pincode text not null,
  default_language text not null default 'en',
  default_currency text not null default 'INR',
  financial_year_start_month integer not null default 4 check (financial_year_start_month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plan_id uuid not null references subscription_plans(id),
  status text not null,
  trial_ends_at timestamptz,
  current_period_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table plants (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  name text not null,
  code text not null,
  plant_type text not null,
  location geography(point, 4326),
  address text,
  capacity text,
  contact_person text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, code)
);

create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  mobile text,
  password_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  disabled_at timestamptz
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  user_id uuid not null references users(id),
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (organisation_id, user_id)
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  code text not null,
  name text not null,
  is_system_role boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create table permissions (
  code text primary key,
  description text not null,
  created_at timestamptz not null default now()
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_code text not null references permissions(code) on delete cascade,
  primary key (role_id, permission_code)
);

create table membership_roles (
  membership_id uuid not null references memberships(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (membership_id, role_id)
);

create table user_plant_access (
  membership_id uuid not null references memberships(id) on delete cascade,
  plant_id uuid not null references plants(id) on delete cascade,
  primary key (membership_id, plant_id)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  code text not null,
  name text not null,
  category text not null,
  base_unit text not null,
  purchase_unit text not null,
  sales_unit text not null,
  hsn_or_sac_code text,
  gst_rate numeric(5,2),
  min_stock numeric(14,3),
  reorder_level numeric(14,3),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, code)
);

create table product_unit_conversions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  product_id uuid not null references products(id),
  from_unit text not null,
  to_unit text not null,
  factor numeric(18,8) not null check (factor > 0),
  created_at timestamptz not null default now(),
  unique (organisation_id, product_id, from_unit, to_unit)
);

create table storage_locations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  code text not null,
  name text not null,
  location_type text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, code)
);

create table inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  transaction_type text not null,
  source_type text not null,
  source_id uuid,
  direction inventory_direction not null,
  quantity_base_unit numeric(18,3) not null check (quantity_base_unit > 0),
  unit text not null,
  conversion_factor numeric(18,8) not null check (conversion_factor > 0),
  unit_cost numeric(18,4),
  total_cost numeric(18,4),
  approval_status approval_status not null default 'draft',
  reason text,
  idempotency_key text not null,
  occurred_at timestamptz not null,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  unique (organisation_id, idempotency_key)
);

create table inventory_balances (
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  quantity_base_unit numeric(18,3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (organisation_id, plant_id, storage_location_id, product_id)
);

create table weighbridges (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  code text not null,
  name text not null,
  capacity_kg numeric(14,3) not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organisation_id, plant_id, code)
);

create table weighments (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  weighbridge_id uuid references weighbridges(id),
  weighment_number text not null,
  transaction_type text not null,
  vehicle_registration text not null,
  driver_name text,
  party_name text,
  product_id uuid references products(id),
  first_weight_kg numeric(14,3),
  first_weight_time timestamptz,
  second_weight_kg numeric(14,3),
  second_weight_time timestamptz,
  gross_weight_kg numeric(14,3),
  tare_weight_kg numeric(14,3),
  net_weight_kg numeric(14,3),
  mode weighment_mode not null,
  source_device_id text,
  manual_edit_flag boolean not null default false,
  approval_status approval_status not null default 'draft',
  print_count integer not null default 0,
  idempotency_key text not null,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, plant_id, weighment_number),
  unique (organisation_id, idempotency_key)
);

create table weighment_corrections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  weighment_id uuid not null references weighments(id),
  field_name text not null,
  original_value text not null,
  corrected_value text not null,
  reason text not null,
  corrected_by_user_id uuid not null references users(id),
  approved_by_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  plant_id uuid references plants(id),
  actor_user_id uuid references users(id),
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  previous_value jsonb,
  new_value jsonb,
  reason text,
  request_id text not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table ai_conversations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  user_id uuid not null references users(id),
  title text,
  created_at timestamptz not null default now()
);

create table ai_messages (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  conversation_id uuid not null references ai_conversations(id),
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table ai_tool_calls (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  conversation_id uuid references ai_conversations(id),
  tool_name text not null,
  request_summary jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  approval_status approval_status not null default 'draft',
  created_at timestamptz not null default now()
);

create table knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  title text not null,
  source_document_id uuid,
  created_at timestamptz not null default now()
);

create table knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  knowledge_document_id uuid not null references knowledge_documents(id),
  chunk_text text not null,
  embedding vector(1536),
  source_ref text,
  created_at timestamptz not null default now()
);

create table devices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  device_type text not null,
  code text not null,
  status text not null default 'registered',
  last_heartbeat_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organisation_id, code)
);

create index idx_plants_organisation on plants (organisation_id);
create index idx_products_organisation on products (organisation_id);
create index idx_inventory_transactions_scope on inventory_transactions (organisation_id, plant_id, product_id, occurred_at);
create index idx_weighments_scope on weighments (organisation_id, plant_id, transaction_type, approval_status);
create index idx_audit_scope on audit_logs (organisation_id, plant_id, event_type, created_at);
create index idx_ai_messages_conversation on ai_messages (organisation_id, conversation_id, created_at);
create index idx_devices_scope on devices (organisation_id, plant_id, device_type, status);

alter table organisations enable row level security;
alter table plants enable row level security;
alter table products enable row level security;
alter table inventory_transactions enable row level security;
alter table inventory_balances enable row level security;
alter table weighments enable row level security;
alter table audit_logs enable row level security;
alter table ai_conversations enable row level security;
alter table ai_messages enable row level security;
alter table ai_tool_calls enable row level security;
alter table devices enable row level security;

create policy tenant_isolation_plants on plants
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

create policy tenant_isolation_products on products
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

create policy tenant_isolation_inventory_transactions on inventory_transactions
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

create policy tenant_isolation_weighments on weighments
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

create policy tenant_isolation_audit_logs on audit_logs
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

