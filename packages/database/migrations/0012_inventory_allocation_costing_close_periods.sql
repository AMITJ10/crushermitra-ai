alter table stock_reservations
  add column if not exists storage_location_id uuid references storage_locations(id),
  add column if not exists reserved_until timestamptz,
  add column if not exists allocation_status text not null default 'allocated',
  add column if not exists allocation_notes text;

update stock_reservations reservation
set storage_location_id = coalesce(
  storage_location_id,
  (
    select balance.storage_location_id
    from inventory_balances balance
    where balance.organisation_id = reservation.organisation_id
      and balance.plant_id = reservation.plant_id
      and balance.product_id = reservation.product_id
    order by balance.quantity_base_unit desc, balance.updated_at asc
    limit 1
  ),
  (
    select location.id
    from storage_locations location
    where location.organisation_id = reservation.organisation_id
      and location.plant_id = reservation.plant_id
      and location.inventory_allowed = true
      and location.deleted_at is null
    order by location.created_at asc
    limit 1
  )
)
where storage_location_id is null;

delete from stock_reservations where storage_location_id is null;

alter table stock_reservations
  alter column storage_location_id set not null;

alter table stock_reservations
  drop constraint if exists stock_reservations_organisation_id_plant_id_source_order_id_product_id_key;

alter table stock_reservations
  drop constraint if exists stock_reservations_organisation_id_plant_id_source_order_id_key;

alter table stock_reservations
  drop constraint if exists stock_reservations_status_check;

alter table stock_reservations
  add constraint stock_reservations_status_check
  check (status in ('reserved', 'released', 'fulfilled', 'cancelled', 'expired'));

alter table stock_reservations
  drop constraint if exists stock_reservations_allocation_status_check;

alter table stock_reservations
  add constraint stock_reservations_allocation_status_check
  check (allocation_status in ('allocated', 'partial', 'short', 'reallocated'));

create unique index if not exists idx_stock_reservations_order_location_unique
  on stock_reservations (organisation_id, plant_id, source_order_id, product_id, storage_location_id);

create index if not exists idx_stock_reservations_location
  on stock_reservations (organisation_id, plant_id, storage_location_id, product_id, status, reserved_until);

create table if not exists inventory_cost_layers (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  storage_location_id uuid not null references storage_locations(id),
  product_id uuid not null references products(id),
  source_inventory_transaction_id uuid not null references inventory_transactions(id),
  source_type text not null,
  original_quantity_base_unit numeric(18,3) not null check (original_quantity_base_unit > 0),
  remaining_quantity_base_unit numeric(18,3) not null check (remaining_quantity_base_unit >= 0),
  unit_cost numeric(18,4) not null check (unit_cost >= 0),
  total_cost_remaining numeric(18,4) not null check (total_cost_remaining >= 0),
  received_at timestamptz not null,
  status text not null default 'open' check (status in ('open', 'depleted', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organisation_id, source_inventory_transaction_id)
);

create index if not exists idx_inventory_cost_layers_fifo
  on inventory_cost_layers (organisation_id, plant_id, storage_location_id, product_id, status, received_at, created_at);

create table if not exists inventory_close_periods (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id),
  plant_id uuid not null references plants(id),
  period_start date not null,
  period_end date not null,
  status text not null default 'closed' check (status in ('closed', 'reopened')),
  reason text not null,
  closed_by_user_id uuid not null references users(id),
  reopened_by_user_id uuid references users(id),
  reopened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create unique index if not exists idx_inventory_close_periods_unique_closed
  on inventory_close_periods (organisation_id, plant_id, period_start, period_end)
  where status = 'closed';

create index if not exists idx_inventory_close_periods_scope
  on inventory_close_periods (organisation_id, plant_id, status, period_start, period_end);

alter table inventory_cost_layers enable row level security;
alter table inventory_close_periods enable row level security;

alter table inventory_cost_layers force row level security;
alter table inventory_close_periods force row level security;

drop policy if exists tenant_isolation_inventory_cost_layers on inventory_cost_layers;
create policy tenant_isolation_inventory_cost_layers on inventory_cost_layers
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

drop policy if exists tenant_isolation_inventory_close_periods on inventory_close_periods;
create policy tenant_isolation_inventory_close_periods on inventory_close_periods
  using (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  )
  with check (
    organisation_id = nullif(current_setting('app.current_organisation_id', true), '')::uuid
    and plant_id::text = any(string_to_array(current_setting('app.allowed_plant_ids', true), ','))
  );

alter table stock_movements
  drop constraint if exists stock_movements_status_check;

alter table stock_movements
  add constraint stock_movements_status_check
  check (status in ('draft', 'pending_approval', 'posted', 'rejected', 'cancelled'));

alter table stock_movements
  add column if not exists approved_by_user_id uuid references users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists approval_reason text;

grant select, insert, update on all tables in schema public to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
