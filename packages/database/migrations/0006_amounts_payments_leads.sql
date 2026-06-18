alter table customer_orders
  add column if not exists paid_amount numeric(18,2) not null default 0,
  add column if not exists balance_amount numeric(18,2) generated always as (greatest(total_amount - paid_amount, 0)) stored;

alter table dispatch_records
  add column if not exists rate numeric(18,4) not null default 0,
  add column if not exists dispatch_amount numeric(18,2) not null default 0,
  add column if not exists payment_status text not null default 'pending',
  add column if not exists paid_amount numeric(18,2) not null default 0,
  add column if not exists balance_amount numeric(18,2) generated always as (greatest(dispatch_amount - paid_amount, 0)) stored;

alter table operation_records
  add column if not exists production_cost numeric(18,2) not null default 0,
  add column if not exists material_cost numeric(18,2) not null default 0,
  add column if not exists machine_cost numeric(18,2) not null default 0;

alter table billing_records
  add column if not exists plan_amount numeric(18,2) not null default 0,
  add column if not exists payment_amount numeric(18,2) not null default 0,
  add column if not exists payment_method text,
  add column if not exists payment_status text not null default 'pending';

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  visit_count integer not null default 1,
  first_visit_at timestamptz not null default now(),
  last_visit_at timestamptz not null default now(),
  page_visited text,
  referrer text,
  user_agent text,
  ip_address inet,
  status text not null default 'new',
  name text,
  email text,
  phone text,
  company text,
  message text,
  selected_plan_interest text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_status_updated on leads (status, updated_at desc);

grant select, insert, update, delete on leads to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
