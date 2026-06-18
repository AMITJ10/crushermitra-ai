# CrusherMitra AI Test Execution Report

## Environment

- Date: 2026-06-11
- Target URL: `http://localhost:3000/en/dashboard`
- OS: Windows local development environment
- Web app: Next.js 15 application running on port 3000
- AI service: not reachable on port 8000 during this audit
- Docker services: Docker Desktop engine unavailable; PostgreSQL, Redis and MinIO could not be started
- Database verification: blocked because Docker/PostgreSQL service was unavailable
- Browser testing: in-app browser with authenticated seeded owner session
- Package manager: `pnpm` declared, but local pnpm shim was blocked by package-manager signature/network verification

No secret values are included in this report.

## Commands

| Command | Result |
|---|---|
| `docker compose up -d postgres redis minio` | Failed: Docker Desktop Linux engine pipe not found |
| `pnpm db:migrate` | Failed: `.env` now loads; blocked because service `postgres` is not running |
| `pnpm db:seed` | Failed: `.env` now loads; blocked because service `postgres` is not running |
| `pnpm test:postgres` | Failed: verifier reached `pg`; `ECONNREFUSED` on `::1:5432` and `127.0.0.1:5432` |
| `pnpm add -Dw @playwright/test` | Passed |
| `pnpm exec playwright install chromium` | Passed |
| `pnpm test:e2e` | Ran: 8 passed, 6 failed because PostgreSQL-backed API calls returned 503 with PostgreSQL down |
| `Invoke-WebRequest http://localhost:3000/api/v1/health` | Passed: 200, web health OK |
| `Invoke-WebRequest http://localhost:8000/health` | Failed: unable to connect |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed when run standalone after build race was avoided |
| `pnpm test` | Passed: JS suites ran; PostgreSQL integration spec skipped by default |
| `pnpm build` | Passed: Next.js production build completed |
| `node_modules\.bin\tsc.CMD --noEmit -p apps/web/tsconfig.json` | Passed |
| `node_modules\.bin\tsc.CMD --noEmit -p packages/database/tsconfig.json` | Passed |
| `node_modules\.bin\tsc.CMD --noEmit -p packages/domain/tsconfig.json` | Passed |
| `node_modules\.bin\tsc.CMD --noEmit -p packages/validation/tsconfig.json` | Passed |
| `node_modules\.bin\tsc.CMD --noEmit -p packages/permissions/tsconfig.json` | Passed |
| `node_modules\.bin\tsc.CMD --noEmit -p packages/auth/tsconfig.json` | Passed |
| `cd apps/ai-service; ..\..\.venv\Scripts\python -m ruff check .` | Passed |
| `cd apps/ai-service; ..\..\.venv\Scripts\python -m pytest -p no:cacheprovider` | Passed: 1 test |

## Test Coverage

Covered:

- Repository structure, scripts, Docker Compose, CI, routes, API routes, migrations, seed data and test setup
- Login UI and invalid-login UX
- Authenticated route loading for user pages
- Admin protected-route redirects
- Dashboard metric display
- Master data list and API create behavior
- Duplicate customer code behavior
- Workflow route smoke tests for Orders, Dispatch and Operations
- Reports loading, filters, chart data and export gating
- Billing gateway configuration state
- AI service availability and safe-tool registry code
- Notifications adapter code
- Responsive smoke tests at 360 x 800, 390 x 844, 768 x 1024, 1366 x 768 and 1920 x 1080
- Static/code review for RLS, workflow immutability, billing, reports, notifications and AI shell

Not fully covered:

- Real PostgreSQL database writes and RLS execution
- Redis, MinIO, worker execution
- Real Razorpay checkout/webhooks
- Real WhatsApp/SMS/email delivery
- Hardware weighbridge integrations
- Full keyboard/screen-reader testing
- Large data performance testing
- True cross-tenant database test using two real organisations

## Passed Tests

- Web health endpoint returned 200.
- Seeded owner login succeeded and redirected to dashboard.
- Invalid login showed a generic UI error message.
- User routes loaded: dashboard, master-data, orders, dispatch, operations, reports, profile, billing, more, plans, about, contact.
- Admin routes redirected to `/admin/login` without an admin session.
- TypeScript checks passed for web, database, domain, validation and permissions packages.
- AI service lint passed.
- AI service health unit test passed.
- Runtime in-memory fallback was removed; dashboard/report/workflow data now requires PostgreSQL.
- Razorpay order endpoint returned 503 when gateway keys were not configured, avoiding fake live payment creation.

## Failed Tests

- Unauthenticated plain HTTP calls returned a demo session and protected tenant data in local mode.
- Unauthenticated plain HTTP POST created a customer record successfully.
- Duplicate customer code was accepted.
- Invalid credential API probe returned HTTP 500 instead of a controlled 401/400.
- Orders page showed no rows while dashboard/reports showed order data.
- Dashboard showed local sample values while recent activity still said no data.
- Reports sales total double-counted order and invoice value in local sample data.
- Reports export buttons were disabled for the owner account without a Growth/Enterprise local subscription.
- More page is only an empty placeholder.
- Billing page still describes local development simulation and is not production payment-complete without Razorpay keys.
- Workflow pages expose edit/delete action buttons for completed operations; correction/immutability flow is missing.
- 360px mobile master-data layout has horizontal overflow.
- Several icon-only action buttons have empty accessible names.

## Blocked Tests

- Docker service startup and database verification: Docker engine unavailable.
- PostgreSQL migrations and seeds: blocked by unavailable PostgreSQL.
- End-to-end database persistence checks: blocked by unavailable PostgreSQL.
- Playwright execution: harness runs and starts the web app; DB-dependent tests fail until PostgreSQL is running and seeded.
- AI endpoint runtime checks: AI service was not running on port 8000.
- Real payment gateway flow: Razorpay credentials not configured and real money capture is out of scope.
- WhatsApp/SMS/email delivery: providers are adapters/placeholders and no real credentials were configured.

## Screenshots And Browser Evidence

Screenshots were available in the active browser context, and DOM/browser evidence was collected through automation. Key observations:

- Dashboard displayed total customers `1`, active orders `1`, dispatch `42 t`, crusher production `164 t`, RMC production `58 m3`, receivables `Rs. 2,15,400`.
- Reports showed rows for `Local sample customer`, `20 mm aggregate`, `M25 RMC`, dispatch, operations and invoice data after loading.
- Master Data showed QA records created through unauthenticated API calls.
- At 360 x 800, master-data page had horizontal overflow.

## Console Errors

No browser console errors were captured on the dashboard during the sampled browser session.

## API Errors And Findings

- `GET /api/v1/session-context` without browser cookie returned 200 and a demo session.
- `GET /api/v1/master-data/customers` without browser cookie returned 200 and tenant data.
- `POST /api/v1/master-data/customers` without browser cookie returned 201 for a complete QA payload.
- `POST /api/v1/master-data/customers` accepted a duplicate `code`.
- `POST /api/v1/auth/login` with unknown credentials returned 500 in the plain HTTP probe.
- `POST /api/v1/billing/razorpay/order` returned 503 because Razorpay was not configured.

## Database Verification

Blocked in this sandbox. PostgreSQL could not be started because Docker Desktop was unavailable. A live PostgreSQL verifier now exists at `packages/database/scripts/verify-postgres.mjs`; it verifies expected tables, seeded demo rows, organisation RLS and plant-scoped storage-location RLS through the `crushermitra_app` role after migrations and seeds run. A mirrored skipped-by-default Vitest spec also exists at `packages/database/tests/postgres-rls.integration.test.ts`.

## Overall Readiness

The application is not production-ready. It is suitable only for internal testing and limited UI/product exploration. The largest blockers are local demo-session fallback bypassing authentication, incomplete production/RMC/inventory/weighbridge/finance workflows, mock/local payment behavior, inconsistent reporting/dashboard data, lack of runtime DB verification, and missing production-grade approval/audit/correction flows.
