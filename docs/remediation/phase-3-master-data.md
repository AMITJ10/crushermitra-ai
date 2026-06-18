# Phase 3 Master Data Integrity

Status: implemented and verified locally.

Phase 3 hardens the PostgreSQL-backed master-data foundation for customers,
customer sites, suppliers, products, product unit conversions, vehicles,
drivers, machines/assets, storage locations and plant shifts.

## Implemented

- Added `0007_master_data_integrity.sql`.
- Added global/system unit seeds for common Indian crusher/RMC units.
- Added plant-scoped `shifts` master data with RLS.
- Added deactivation metadata across master-data records.
- Added richer Phase 3 fields for customers, sites, suppliers, products,
  vehicles, drivers, machines and storage locations.
- Added case-insensitive and normalised PostgreSQL uniqueness for business keys.
- Added vehicle registration normalisation for equivalent Indian registration
  formats.
- Added product stock-threshold, unit-conversion and cross-midnight shift
  validation.
- Added structured API error responses for validation, permission and duplicate
  conflicts.
- Added server-side status, type, plant and sort query support for master-data
  lists.
- Added CSV export permission gating through `master_data.export`.
- Added audit logging for create, update and deactivate operations.
- Added Master Data UI support for shifts and additional Phase 3 fields.
- Added unit, migration/RLS and Playwright coverage for Phase 3 behavior.

## Verified

- PostgreSQL migration and seed execution.
- PostgreSQL RLS verification through `crushermitra_app`.
- Duplicate customer code conflict with case-insensitive input.
- Equivalent vehicle registration conflict.
- Cross-midnight shift creation.
- Mobile Master Data page has no page-level horizontal overflow.
- Existing order-to-dispatch E2E baseline still passes.

## Deferred

- Inventory ledger stock checks for product/storage-location deactivation.
- Full asset maintenance schedules and compliance document workflows.
- Excel/PDF master-data exports; CSV is implemented.
- Dedicated detail pages per entity; audit history is available in the Master
  Data panel.
