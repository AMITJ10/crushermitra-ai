# Phase 4 Inventory Ledger

Phase 4 adds PostgreSQL-backed stock integrity for crusher and RMC operations.

Implemented scope:

- Purchase receipts post inbound immutable ledger transactions.
- Stock movements post paired outbound and inbound ledger transactions.
- Crusher/RMC production runs post input consumption and output production transactions.
- Dispatch reductions post outbound stock transactions.
- Storage-location balances are maintained transactionally from ledger postings.
- Negative stock is blocked unless organisation/product/location settings explicitly allow it.
- Inventory corrections create approval requests and only post adjustment transactions after approval.
- Inventory tables use tenant and plant-scoped PostgreSQL RLS.
- Inventory APIs require signed sessions and server-side permissions.
- Inventory UI exposes balances, recent ledger activity, CSV exports and posting forms.
- Seed data includes posted inventory transactions and derived balances.

Verification commands run for this phase:

- `pnpm install`
- `docker compose up -d postgres redis minio`
- `pnpm db:migrate`
- `pnpm db:seed`
- `pnpm test:postgres`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `$env:PLAYWRIGHT_PORT='3002'; pnpm.cmd test:e2e`

Known limitations:

- Dispatch stock reduction is exposed as a controlled inventory posting endpoint and UI action. Full automatic posting from every dispatch workflow should be wired when dispatch records capture a mandatory source storage location.
- Correction approval currently supports approve-only API flow. Rejection/cancellation screens can be expanded with the broader approvals module.
