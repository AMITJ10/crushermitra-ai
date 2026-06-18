# CrusherMitra AI Environment Assessment

## Scope

Phase 0 assessment for repository, runtime services, package scripts, test infrastructure and known local blockers.

## Required Versions

- Node.js: `>=20.11.0` from `package.json`
- pnpm: `>=9.0.0`, project pins `pnpm@9.15.4`
- Python: README says Python 3.12+; CI uses Python 3.13 for the AI service
- Docker Desktop: required for PostgreSQL, Redis, MinIO and containerised app services

## Current Observed Versions And State

- Web app health endpoint on `localhost:3000` responded successfully.
- AI service on `localhost:8000` was not reachable during the audit.
- Docker Desktop Linux engine was not reachable from this environment.
- Root pnpm command was blocked by package-manager signature verification requiring network access.
- Vitest runs through the escalated local pnpm command path; direct non-escalated sandbox runs can still hit Windows subprocess restrictions.
- Playwright configuration exists, `@playwright/test` is installed, and Chromium was installed for local E2E runs.

## Service Ports

| Service | Port | Status |
|---|---:|---|
| Web | 3000 | Running during audit |
| AI service | 8000 | Not reachable |
| PostgreSQL | 5432 | Docker unavailable |
| Redis | 6379 | Docker unavailable |
| MinIO API | 9000 | Docker unavailable |
| MinIO console | 9001 | Docker unavailable |

## Environment Variables

Configured through `.env.example` and `.env`:

- `APP_ENV`
- `AUTH_SECRET`
- `ADMIN_AUTH_SECRET`
- `AUTH_URL`
- `PASSWORD_PEPPER`
- `DATABASE_URL`
- PostgreSQL variables
- Redis URL
- MinIO/S3 variables
- AI service URL
- provider toggles for WhatsApp, SMS and email
- Razorpay keys
- SMTP settings
- rate-limit and signed-url settings

No secret values are recorded here.

## Startup Commands

Expected normal-development commands:

```powershell
pnpm install
pnpm docker:up
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm dev:ai
pnpm dev:worker
```

Current blocker: Docker Desktop must be running before `pnpm docker:up`, migrations and database-backed tests can succeed.

## Migration Commands

```powershell
pnpm db:migrate
pnpm db:seed
pnpm db:migrate:phase2
pnpm db:migrate:workflows
pnpm db:migrate:phase3
pnpm db:migrate:phase4
```

Database migration execution was not verified in this environment because PostgreSQL was unavailable.

Phase 2 live database proof command:

```powershell
pnpm test:postgres
```

This command runs `packages/database/scripts/verify-postgres.mjs`. It expects migrations and seeds to have already been applied to the `DATABASE_URL` database and verifies required tables, seeded rows, organisation RLS and plant RLS through the `crushermitra_app` role.

## Test Commands

Required commands:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm test:unit
pnpm test:integration
pnpm test:postgres
pnpm test:e2e
pnpm build
```

Commands verified directly with local binaries where pnpm was blocked:

```powershell
node_modules\.bin\tsc.CMD --noEmit -p apps/web/tsconfig.json
node_modules\.bin\tsc.CMD --noEmit -p packages/database/tsconfig.json
node_modules\.bin\tsc.CMD --noEmit -p packages/domain/tsconfig.json
node_modules\.bin\tsc.CMD --noEmit -p packages/validation/tsconfig.json
node_modules\.bin\tsc.CMD --noEmit -p packages/permissions/tsconfig.json
cd apps/ai-service; ..\..\.venv\Scripts\python -m ruff check .
cd apps/ai-service; ..\..\.venv\Scripts\python -m pytest -p no:cacheprovider
```

## Existing Routes

User pages:

- `/[locale]`
- `/[locale]/login`
- `/[locale]/dashboard`
- `/[locale]/master-data`
- `/[locale]/orders`
- `/[locale]/dispatch`
- `/[locale]/operations`
- `/[locale]/reports`
- `/[locale]/profile`
- `/[locale]/billing`
- `/[locale]/plans`
- `/[locale]/more`
- `/[locale]/about`
- `/[locale]/contact`
- `/[locale]/privacy`
- `/[locale]/terms`

Admin pages:

- `/admin/login`
- `/admin/dashboard`
- `/admin/users`
- `/admin/plans`
- `/admin/payments`
- `/admin/reports`
- `/admin/leads`
- `/admin/settings`

API routes:

- `/api/v1/health`
- `/api/v1/auth/login`
- `/api/v1/auth/logout`
- `/api/v1/session-context`
- `/api/v1/dashboard/summary`
- `/api/v1/master-data/[resource]`
- `/api/v1/master-data/[resource]/[id]`
- `/api/v1/workflows/[resource]`
- `/api/v1/workflows/[resource]/[id]`
- `/api/v1/billing/razorpay/order`
- `/api/v1/billing/razorpay/verify`
- `/api/v1/admin/auth/login`
- `/api/v1/admin/auth/logout`
- `/api/v1/leads`
- `/api/v1/leads/[id]`

## Runtime Data Source Policy

Runtime in-memory fallback for protected business data has been removed.

- Deleted: `apps/web/lib/local-dev-store.ts`
- Dashboard summary, master-data APIs and workflow APIs now require PostgreSQL for operational reads/writes.
- When PostgreSQL is unavailable, protected API routes return an explicit `503` instead of fabricated local data.
- Seed/sample records must live in PostgreSQL seed files or explicit test fixtures, not runtime process memory.

Browser local-storage usage:

- profile data
- subscription state
- payment records
- admin payment/user/report projections

Phase 14 must replace subscription/payment local storage with server-backed tables and verified gateway events.

## Authentication Fallbacks

Confirmed unsafe behavior before Phase 1 fix:

- `apps/web/lib/session.ts` returned `getDemoSessionContext()` when no or invalid cookie existed and `APP_ENV=local`.

Phase 1 fix removes automatic demo-session creation from protected API/UI session resolution. Seeded demo accounts must log in normally.

## Incomplete Adapters

- Email notification adapter logs locally and says SMTP implementation is pending.
- WhatsApp/SMS providers are configuration placeholders.
- AI service safe-tool registry is static and not connected to authenticated tenant data.
- Razorpay order/verify endpoints exist, but gateway keys and full webhook reconciliation were not verified.

## Known Environment Blockers

- Docker Desktop not running or unavailable.
- pnpm package-manager shim needs network/signature verification in this sandbox.
- Direct Vitest/Vite subprocess creation can be blocked by `spawn EPERM` in this sandbox; `pnpm test` succeeded through the escalated command path.
- E2E tests start the web app automatically through Playwright `webServer`; database-backed cases still require PostgreSQL migrations and seeds.
- Inaccessible pytest cache directories exist under `apps/ai-service`; they are gitignored and Ruff now excludes them from scans.

## Immediate Recovery Actions

- Start Docker Desktop.
- Run `pnpm install` in a normal network-enabled development environment.
- Remove local denied pytest cache folders if safe, or ensure tooling excludes them.
- Install Playwright dependencies through pnpm.
- Run migrations and seeds against PostgreSQL.
- Run `pnpm test:postgres` after migrations and seed data.
- Run full lint/typecheck/test/build in CI or a non-sandboxed local terminal.
