create table if not exists customer_orders (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  customer_id uuid not null references customers(id),
  customer_site_id uuid references customer_sites(id),
  product_id uuid not null references products(id),
  order_number text not null,
  order_date date not null,
  expected_dispatch_date date,
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  rate numeric(18,4) not null check (rate >= 0),
  total_amount numeric(18,2) not null default 0,
  status text not null default 'draft',
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, order_number)
);

create table if not exists dispatch_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  order_id uuid references customer_orders(id),
  customer_id uuid not null references customers(id),
  customer_site_id uuid references customer_sites(id),
  vehicle_id uuid references vehicles(id),
  driver_id uuid references drivers(id),
  product_id uuid not null references products(id),
  dispatch_number text not null,
  dispatch_date date not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  first_weight numeric(14,3) not null default 0,
  second_weight numeric(14,3) not null default 0,
  net_weight numeric(14,3) not null default 0,
  status text not null default 'draft',
  delivery_challan_number text,
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, dispatch_number)
);

create table if not exists operation_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  operation_number text not null,
  operation_type text not null,
  product_id uuid references products(id),
  machine_id uuid references machines(id),
  operation_date date not null,
  quantity numeric(18,3),
  unit text,
  status text not null default 'draft',
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, operation_number)
);

create table if not exists billing_records (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  customer_id uuid not null references customers(id),
  invoice_number text not null,
  billing_date date not null,
  due_date date,
  amount numeric(18,2) not null check (amount >= 0),
  status text not null default 'draft',
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, invoice_number)
);

create table if not exists ai_safety_events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid references plants(id),
  event_type text not null,
  severity text not null default 'info',
  message text not null,
  source_type text,
  source_id uuid,
  acknowledged_at timestamptz,
  created_by_user_id uuid references users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_orders_scope on customer_orders (organisation_id, plant_id, status, order_date);
create index if not exists idx_dispatch_records_scope on dispatch_records (organisation_id, plant_id, status, dispatch_date);
create index if not exists idx_operation_records_scope on operation_records (organisation_id, plant_id, operation_type, status, operation_date);
create index if not exists idx_billing_records_scope on billing_records (organisation_id, plant_id, status, billing_date);
create index if not exists idx_ai_safety_events_scope on ai_safety_events (organisation_id, plant_id, severity, created_at);

alter table customer_orders enable row level security;
alter table dispatch_records enable row level security;
alter table operation_records enable row level security;
alter table billing_records enable row level security;
alter table ai_safety_events enable row level security;

alter table customer_orders force row level security;
alter table dispatch_records force row level security;
alter table operation_records force row level security;
alter table billing_records force row level security;
alter table ai_safety_events force row level security;

drop policy if exists tenant_isolation_customer_orders on customer_orders;
create policy tenant_isolation_customer_orders on customer_orders
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_dispatch_records on dispatch_records;
create policy tenant_isolation_dispatch_records on dispatch_records
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_operation_records on operation_records;
create policy tenant_isolation_operation_records on operation_records
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_billing_records on billing_records;
create policy tenant_isolation_billing_records on billing_records
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_ai_safety_events on ai_safety_events;
create policy tenant_isolation_ai_safety_events on ai_safety_events
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (
      plant_id is null
      or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
    )
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and (
      plant_id is null
      or plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
    )
  );

grant select, insert, update on all tables in schema public to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
