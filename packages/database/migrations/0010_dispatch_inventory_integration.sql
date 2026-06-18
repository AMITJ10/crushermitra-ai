alter table dispatch_records add column if not exists source_storage_location_id uuid references storage_locations(id);
alter table dispatch_records add column if not exists inventory_transaction_id uuid references inventory_transactions(id);

update dispatch_records
set source_storage_location_id = coalesce(
  source_storage_location_id,
  (
    select storage_locations.id
    from storage_locations
    where storage_locations.organisation_id = dispatch_records.organisation_id
      and storage_locations.plant_id = dispatch_records.plant_id
      and storage_locations.deleted_at is null
      and storage_locations.inventory_allowed = true
    order by
      case
        when storage_locations.location_type in ('finished_stockpile', 'stockpile', 'yard') then 0
        else 1
      end,
      storage_locations.created_at asc
    limit 1
  )
)
where source_storage_location_id is null;

do $$
begin
  if exists (
    select 1
    from dispatch_records
    where source_storage_location_id is null
  ) then
    raise exception 'Cannot make dispatch source storage mandatory until every dispatch has a source storage location.';
  end if;
end $$;

alter table dispatch_records alter column source_storage_location_id set not null;

create index if not exists idx_dispatch_records_inventory_posting
  on dispatch_records (organisation_id, plant_id, source_storage_location_id, inventory_transaction_id);

grant select, insert, update on all tables in schema public to crushermitra_app;
grant usage, select on all sequences in schema public to crushermitra_app;
