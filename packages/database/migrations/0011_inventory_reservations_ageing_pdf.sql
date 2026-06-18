create table if not exists stock_reservations (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  source_order_id uuid not null references customer_orders(id),
  product_id uuid not null references products(id),
  quantity_base_unit numeric(18,3) not null check (quantity_base_unit >= 0),
  unit text not null,
  conversion_factor numeric(18,6) not null default 1,
  status text not null default 'reserved' check (status in ('reserved', 'released', 'fulfilled', 'cancelled')),
  reserved_at timestamptz not null default now(),
  released_at timestamptz,
  created_by_user_id uuid references users(id),
  updated_by_user_id uuid references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, plant_id, source_order_id, product_id)
);

alter table dispatch_records add column if not exists cancellation_inventory_transaction_id uuid references inventory_transactions(id);
alter table dispatch_records add column if not exists cancellation_reason text;
alter table dispatch_records add column if not exists cancelled_at timestamptz;

create index if not exists idx_stock_reservations_scope
  on stock_reservations (organisation_id, plant_id, product_id, status, reserved_at);

create index if not exists idx_dispatch_records_cancellation_posting
  on dispatch_records (organisation_id, plant_id, cancellation_inventory_transaction_id, status);

alter table stock_reservations enable row level security;
alter table stock_reservations force row level security;

drop policy if exists tenant_isolation_stock_reservations on stock_reservations;
create policy tenant_isolation_stock_reservations on stock_reservations
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
