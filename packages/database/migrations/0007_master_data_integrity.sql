create table if not exists units (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references organisations(id),
  code text not null,
  name text not null,
  unit_type text not null default 'quantity',
  decimal_places integer not null default 3 check (decimal_places between 0 and 8),
  is_system_unit boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uniq_units_scope_code_ci
  on units (coalesce(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid), upper(trim(code)))
  where deleted_at is null;

insert into units (code, name, unit_type, decimal_places, is_system_unit)
values
  ('tonne', 'Tonne', 'mass', 3, true),
  ('kilogram', 'Kilogram', 'mass', 3, true),
  ('cubic_metre', 'Cubic metre', 'volume', 3, true),
  ('cubic_foot', 'Cubic foot', 'volume', 3, true),
  ('brass', 'Brass', 'volume', 3, true),
  ('litre', 'Litre', 'volume', 3, true),
  ('bag', 'Bag', 'count', 0, true),
  ('piece', 'Piece', 'count', 0, true),
  ('hour', 'Hour', 'time', 2, true),
  ('kilometre', 'Kilometre', 'distance', 3, true),
  ('trip', 'Trip', 'count', 0, true),
  ('electricity_unit', 'Electricity unit', 'energy', 2, true)
on conflict do nothing;

alter table customers add column if not exists deactivated_at timestamptz;
alter table customers add column if not exists deactivated_by_user_id uuid references users(id);
alter table customers add column if not exists deactivate_reason text;
alter table customers add column if not exists default_price_list text;
alter table customers add column if not exists account_manager text;

alter table customer_sites add column if not exists deactivated_at timestamptz;
alter table customer_sites add column if not exists deactivated_by_user_id uuid references users(id);
alter table customer_sites add column if not exists deactivate_reason text;
alter table customer_sites add column if not exists delivery_instructions text;
alter table customer_sites add column if not exists default_unloading_minutes integer check (default_unloading_minutes is null or default_unloading_minutes >= 0);

alter table suppliers add column if not exists whatsapp_number text;
alter table suppliers add column if not exists payment_terms text;
alter table suppliers add column if not exists material_categories text[] not null default '{}';
alter table suppliers add column if not exists notes text;
alter table suppliers add column if not exists deactivated_at timestamptz;
alter table suppliers add column if not exists deactivated_by_user_id uuid references users(id);
alter table suppliers add column if not exists deactivate_reason text;

alter table products add column if not exists default_selling_price numeric(18,4) check (default_selling_price is null or default_selling_price >= 0);
alter table products add column if not exists track_inventory boolean not null default true;
alter table products add column if not exists allow_negative_stock boolean not null default false;
alter table products add column if not exists deactivated_at timestamptz;
alter table products add column if not exists deactivated_by_user_id uuid references users(id);
alter table products add column if not exists deactivate_reason text;
alter table products add constraint products_stock_thresholds_valid
  check (
    (min_stock is null or min_stock >= 0)
    and (max_stock is null or max_stock >= 0)
    and (reorder_level is null or reorder_level >= 0)
    and (standard_cost is null or standard_cost >= 0)
    and (bulk_density is null or bulk_density > 0)
    and (max_stock is null or min_stock is null or min_stock <= max_stock)
  ) not valid;
alter table products validate constraint products_stock_thresholds_valid;

alter table product_unit_conversions add column if not exists effective_from date not null default current_date;
alter table product_unit_conversions add column if not exists effective_to date;
alter table product_unit_conversions add column if not exists notes text;
alter table product_unit_conversions add column if not exists deactivated_at timestamptz;
alter table product_unit_conversions add column if not exists deactivated_by_user_id uuid references users(id);
alter table product_unit_conversions add column if not exists deactivate_reason text;
alter table product_unit_conversions add constraint product_unit_distinct_units
  check (lower(trim(from_unit)) <> lower(trim(to_unit))) not valid;
alter table product_unit_conversions validate constraint product_unit_distinct_units;

alter table vehicles add column if not exists plant_id uuid references plants(id);
alter table vehicles add column if not exists vehicle_code text;
alter table vehicles add column if not exists capacity numeric(14,3) check (capacity is null or capacity > 0);
alter table vehicles add column if not exists capacity_unit text;
alter table vehicles add column if not exists manufacturer text;
alter table vehicles add column if not exists model text;
alter table vehicles add column if not exists manufacturing_year integer check (manufacturing_year is null or manufacturing_year between 1950 and 2100);
alter table vehicles add column if not exists fuel_type text;
alter table vehicles add column if not exists chassis_number text;
alter table vehicles add column if not exists engine_number text;
alter table vehicles add column if not exists deactivated_at timestamptz;
alter table vehicles add column if not exists deactivated_by_user_id uuid references users(id);
alter table vehicles add column if not exists deactivate_reason text;

alter table drivers add column if not exists alternate_phone text;
alter table drivers add column if not exists licence_type text;
alter table drivers add column if not exists address text;
alter table drivers add column if not exists plant_id uuid references plants(id);
alter table drivers add column if not exists assigned_vehicle_id uuid references vehicles(id);
alter table drivers add column if not exists emergency_contact text;
alter table drivers add column if not exists deactivated_at timestamptz;
alter table drivers add column if not exists deactivated_by_user_id uuid references users(id);
alter table drivers add column if not exists deactivate_reason text;

alter table product_prices add column if not exists deactivated_at timestamptz;
alter table product_prices add column if not exists deactivated_by_user_id uuid references users(id);
alter table product_prices add column if not exists deactivate_reason text;

alter table machines add column if not exists asset_type text;
alter table machines add column if not exists parent_machine_id uuid references machines(id);
alter table machines add column if not exists manufacturer text;
alter table machines add column if not exists commissioning_date date;
alter table machines add column if not exists capacity numeric(14,3) check (capacity is null or capacity > 0);
alter table machines add column if not exists capacity_unit text;
alter table machines add column if not exists meter_type text;
alter table machines add column if not exists initial_meter_value numeric(18,3) check (initial_meter_value is null or initial_meter_value >= 0);
alter table machines add column if not exists warranty_expiry date;
alter table machines add column if not exists notes text;
alter table machines add column if not exists deactivated_at timestamptz;
alter table machines add column if not exists deactivated_by_user_id uuid references users(id);
alter table machines add column if not exists deactivate_reason text;

alter table storage_locations add column if not exists parent_location_id uuid references storage_locations(id);
alter table storage_locations add column if not exists capacity numeric(14,3) check (capacity is null or capacity >= 0);
alter table storage_locations add column if not exists capacity_unit text;
alter table storage_locations add column if not exists inventory_allowed boolean not null default true;
alter table storage_locations add column if not exists negative_stock_override_allowed boolean not null default false;
alter table storage_locations add column if not exists notes text;
alter table storage_locations add column if not exists deactivated_at timestamptz;
alter table storage_locations add column if not exists deactivated_by_user_id uuid references users(id);
alter table storage_locations add column if not exists deactivate_reason text;
alter table storage_locations add column if not exists created_by_user_id uuid references users(id);
alter table storage_locations add column if not exists updated_by_user_id uuid references users(id);

create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  code text not null,
  name text not null,
  start_time time not null,
  end_time time not null,
  crosses_midnight boolean not null default false,
  break_duration_minutes integer not null default 0 check (break_duration_minutes >= 0),
  active_days text[] not null default array['mon','tue','wed','thu','fri','sat','sun'],
  active boolean not null default true,
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  deactivated_at timestamptz,
  deactivated_by_user_id uuid references users(id),
  deactivate_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint shifts_cross_midnight_valid check (
    (crosses_midnight = false and start_time < end_time)
    or (crosses_midnight = true and start_time > end_time)
  )
);

create unique index if not exists uniq_customers_org_code_ci
  on customers (organisation_id, upper(trim(code))) where deleted_at is null;
create unique index if not exists uniq_customers_org_gstin_ci
  on customers (organisation_id, upper(trim(gstin))) where deleted_at is null and nullif(trim(gstin), '') is not null;
create unique index if not exists uniq_customer_sites_org_customer_code_ci
  on customer_sites (organisation_id, customer_id, upper(trim(site_code))) where deleted_at is null;
create unique index if not exists uniq_suppliers_org_code_ci
  on suppliers (organisation_id, upper(trim(code))) where deleted_at is null;
create unique index if not exists uniq_suppliers_org_gstin_ci
  on suppliers (organisation_id, upper(trim(gstin))) where deleted_at is null and nullif(trim(gstin), '') is not null;
create unique index if not exists uniq_products_org_code_ci
  on products (organisation_id, upper(trim(code))) where deleted_at is null;
create unique index if not exists uniq_product_unit_active_scope_ci
  on product_unit_conversions (organisation_id, product_id, lower(trim(from_unit)), lower(trim(to_unit)))
  where deleted_at is null and active = true;
create unique index if not exists uniq_vehicles_org_registration_normalised
  on vehicles (organisation_id, regexp_replace(upper(registration_number), '[^A-Z0-9]', '', 'g'))
  where deleted_at is null;
create unique index if not exists uniq_drivers_org_code_ci
  on drivers (organisation_id, upper(trim(code))) where deleted_at is null;
create unique index if not exists uniq_drivers_org_licence_ci
  on drivers (organisation_id, upper(trim(licence_number))) where deleted_at is null;
create unique index if not exists uniq_machines_org_plant_code_ci
  on machines (organisation_id, plant_id, upper(trim(code))) where deleted_at is null;
create unique index if not exists uniq_storage_locations_plant_code_ci
  on storage_locations (organisation_id, plant_id, upper(trim(code))) where deleted_at is null;
create unique index if not exists uniq_shifts_plant_code_ci
  on shifts (organisation_id, plant_id, upper(trim(code))) where deleted_at is null;

create index if not exists idx_customers_code_ci on customers (organisation_id, upper(trim(code)));
create index if not exists idx_suppliers_code_ci on suppliers (organisation_id, upper(trim(code)));
create index if not exists idx_products_code_ci on products (organisation_id, upper(trim(code)));
create index if not exists idx_vehicles_registration_normalised on vehicles (organisation_id, regexp_replace(upper(registration_number), '[^A-Z0-9]', '', 'g'));
create index if not exists idx_shifts_scope on shifts (organisation_id, plant_id, active);

alter table units enable row level security;
alter table shifts enable row level security;
alter table units force row level security;
alter table shifts force row level security;

drop policy if exists tenant_or_system_units on units;
create policy tenant_or_system_units on units
  using (
    organisation_id is null
    or organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
  );

drop policy if exists tenant_isolation_shifts on shifts;
create policy tenant_isolation_shifts on shifts
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

grant select, insert, update on all tables in schema public to crushermitra_app;
