create table if not exists purchase_receipts (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  supplier_id uuid references suppliers(id),
  storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  receipt_number text not null,
  receipt_date date not null,
  source_document_number text,
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  conversion_factor numeric(18,8) not null check (conversion_factor > 0),
  quantity_base_unit numeric(18,3) not null check (quantity_base_unit > 0),
  unit_cost numeric(18,4) check (unit_cost is null or unit_cost >= 0),
  total_cost numeric(18,4) check (total_cost is null or total_cost >= 0),
  status text not null default 'posted' check (status in ('draft', 'posted', 'cancelled')),
  inventory_transaction_id uuid references inventory_transactions(id),
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, receipt_number)
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  from_storage_location_id uuid not null references storage_locations(id),
  to_storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  movement_number text not null,
  movement_date date not null,
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  conversion_factor numeric(18,8) not null check (conversion_factor > 0),
  quantity_base_unit numeric(18,3) not null check (quantity_base_unit > 0),
  status text not null default 'posted' check (status in ('draft', 'posted', 'cancelled')),
  reason text not null,
  out_transaction_id uuid references inventory_transactions(id),
  in_transaction_id uuid references inventory_transactions(id),
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, movement_number),
  check (from_storage_location_id <> to_storage_location_id)
);

create table if not exists production_runs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  machine_id uuid references machines(id),
  run_number text not null,
  run_type text not null check (run_type in ('crusher', 'rmc')),
  production_date date not null,
  status text not null default 'completed' check (status in ('draft', 'completed', 'cancelled')),
  notes text,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (organisation_id, plant_id, run_number)
);

create table if not exists production_run_inputs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  production_run_id uuid not null references production_runs(id) on delete cascade,
  storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  conversion_factor numeric(18,8) not null check (conversion_factor > 0),
  quantity_base_unit numeric(18,3) not null check (quantity_base_unit > 0),
  inventory_transaction_id uuid references inventory_transactions(id),
  created_at timestamptz not null default now()
);

create table if not exists production_run_outputs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  production_run_id uuid not null references production_runs(id) on delete cascade,
  storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  quantity numeric(18,3) not null check (quantity > 0),
  unit text not null,
  conversion_factor numeric(18,8) not null check (conversion_factor > 0),
  quantity_base_unit numeric(18,3) not null check (quantity_base_unit > 0),
  inventory_transaction_id uuid references inventory_transactions(id),
  created_at timestamptz not null default now()
);

create table if not exists inventory_corrections (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  original_quantity_base_unit numeric(18,3) not null,
  corrected_quantity_base_unit numeric(18,3) not null check (corrected_quantity_base_unit >= 0),
  delta_quantity_base_unit numeric(18,3) not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  approval_request_id uuid references approval_requests(id),
  adjustment_transaction_id uuid references inventory_transactions(id),
  requested_by_user_id uuid not null references users(id),
  approved_by_user_id uuid references users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_purchase_receipts_scope on purchase_receipts (organisation_id, plant_id, receipt_date, status);
create index if not exists idx_stock_movements_scope on stock_movements (organisation_id, plant_id, movement_date, status);
create index if not exists idx_production_runs_scope on production_runs (organisation_id, plant_id, run_type, production_date, status);
create index if not exists idx_production_run_inputs_scope on production_run_inputs (organisation_id, plant_id, production_run_id);
create index if not exists idx_production_run_outputs_scope on production_run_outputs (organisation_id, plant_id, production_run_id);
create index if not exists idx_inventory_corrections_scope on inventory_corrections (organisation_id, plant_id, status, created_at);
create index if not exists idx_inventory_balances_product_location on inventory_balances (organisation_id, plant_id, product_id, storage_location_id);

alter table purchase_receipts enable row level security;
alter table stock_movements enable row level security;
alter table production_runs enable row level security;
alter table production_run_inputs enable row level security;
alter table production_run_outputs enable row level security;
alter table inventory_corrections enable row level security;

alter table purchase_receipts force row level security;
alter table stock_movements force row level security;
alter table production_runs force row level security;
alter table production_run_inputs force row level security;
alter table production_run_outputs force row level security;
alter table inventory_corrections force row level security;

drop policy if exists tenant_isolation_purchase_receipts on purchase_receipts;
create policy tenant_isolation_purchase_receipts on purchase_receipts
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_stock_movements on stock_movements;
create policy tenant_isolation_stock_movements on stock_movements
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_production_runs on production_runs;
create policy tenant_isolation_production_runs on production_runs
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_production_run_inputs on production_run_inputs;
create policy tenant_isolation_production_run_inputs on production_run_inputs
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_production_run_outputs on production_run_outputs;
create policy tenant_isolation_production_run_outputs on production_run_outputs
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_inventory_corrections on inventory_corrections;
create policy tenant_isolation_inventory_corrections on inventory_corrections
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
