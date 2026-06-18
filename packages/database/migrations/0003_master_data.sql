alter table products add column if not exists local_language_name text;
alter table products add column if not exists description text;
alter table products add column if not exists bulk_density numeric(14,4);
alter table products add column if not exists max_stock numeric(14,3);
alter table products add column if not exists standard_cost numeric(18,4);

alter table storage_locations add column if not exists active boolean not null default true;
alter table storage_locations add column if not exists updated_at timestamptz not null default now();

alter table product_unit_conversions add column if not exists active boolean not null default true;
alter table product_unit_conversions add column if not exists created_by_user_id uuid references users(id);
alter table product_unit_conversions add column if not exists updated_by_user_id uuid references users(id);
alter table product_unit_conversions add column if not exists updated_at timestamptz not null default now();
alter table product_unit_conversions add column if not exists deleted_at timestamptz;

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  code text not null,
  customer_type text not null,
  legal_name text not null,
  trade_name text not null,
  contact_person text not null,
  phone text not null,
  whatsapp_number text,
  email text,
  gstin text,
  pan text,
  billing_address text not null,
  state text not null,
  district text not null,
  pincode text not null,
  credit_limit numeric(18,2) not null default 0,
  credit_days integer not null default 0,
  active boolean not null default true,
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, code)
);

create table if not exists customer_sites (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  customer_id uuid not null references customers(id),
  site_code text not null,
  site_name text not null,
  contact_person text not null,
  phone text not null,
  address text not null,
  state text not null,
  district text not null,
  pincode text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  location geography(point, 4326),
  active boolean not null default true,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, customer_id, site_code)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  code text not null,
  supplier_type text not null,
  legal_name text not null,
  trade_name text not null,
  contact_person text not null,
  phone text not null,
  email text,
  gstin text,
  pan text,
  address text not null,
  state text not null,
  district text not null,
  pincode text not null,
  credit_days integer not null default 0,
  active boolean not null default true,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, code)
);

create table if not exists product_prices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  product_id uuid not null references products(id),
  price_type text not null,
  unit text not null,
  rate numeric(18,4) not null check (rate >= 0),
  effective_from date not null,
  effective_to date,
  active boolean not null default true,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, product_id, price_type, unit, effective_from)
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  registration_number text not null,
  vehicle_type text not null,
  owner_type text not null,
  owner_name text not null,
  capacity_tonne numeric(14,3),
  capacity_cubic_metre numeric(14,3),
  active boolean not null default true,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, registration_number)
);

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  code text not null,
  name text not null,
  phone text not null,
  licence_number text not null,
  licence_expiry date,
  active boolean not null default true,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, code),
  unique (organisation_id, licence_number)
);

create table if not exists machines (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  code text not null,
  name text not null,
  machine_type text not null,
  make text,
  model text,
  serial_number text,
  active boolean not null default true,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, code)
);

create index if not exists idx_customers_search on customers (organisation_id, active, legal_name, trade_name);
create index if not exists idx_customer_sites_customer on customer_sites (organisation_id, customer_id, active);
create index if not exists idx_suppliers_search on suppliers (organisation_id, active, legal_name, trade_name);
create index if not exists idx_product_prices_product on product_prices (organisation_id, product_id, price_type, active);
create index if not exists idx_vehicles_search on vehicles (organisation_id, active, registration_number);
create index if not exists idx_drivers_search on drivers (organisation_id, active, name);
create index if not exists idx_machines_scope on machines (organisation_id, plant_id, active);

alter table customers enable row level security;
alter table customer_sites enable row level security;
alter table suppliers enable row level security;
alter table product_prices enable row level security;
alter table vehicles enable row level security;
alter table drivers enable row level security;
alter table machines enable row level security;
alter table product_unit_conversions enable row level security;

alter table customers force row level security;
alter table customer_sites force row level security;
alter table suppliers force row level security;
alter table product_prices force row level security;
alter table vehicles force row level security;
alter table drivers force row level security;
alter table machines force row level security;
alter table product_unit_conversions force row level security;

drop policy if exists tenant_isolation_customers on customers;
create policy tenant_isolation_customers on customers
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_customer_sites on customer_sites;
create policy tenant_isolation_customer_sites on customer_sites
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_suppliers on suppliers;
create policy tenant_isolation_suppliers on suppliers
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_product_unit_conversions on product_unit_conversions;
create policy tenant_isolation_product_unit_conversions on product_unit_conversions
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_product_prices on product_prices;
create policy tenant_isolation_product_prices on product_prices
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_vehicles on vehicles;
create policy tenant_isolation_vehicles on vehicles
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_drivers on drivers;
create policy tenant_isolation_drivers on drivers
  using (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid)
  with check (organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid);

drop policy if exists tenant_isolation_machines on machines;
create policy tenant_isolation_machines on machines
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

grant select, insert, update on all tables in schema public to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
