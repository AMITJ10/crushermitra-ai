# CrusherMitra AI Remediation Plan

## Status Legend

- Open: not started
- In progress: implementation underway
- Fixed pending verification: code changed; full normal-environment verification still required
- Blocked: needs external service/tooling
- Deferred: belongs to a later requested phase

## Current Remediation Scope

Current implementation scope is limited to:

- Repository and environment assessment
- Remediation tracking
- Removal of unsafe local demo-session fallback
- Removal of runtime in-memory fallback as protected API source of truth
- PostgreSQL integration proof command for migrations/seeds/RLS
- Login error hardening
- Unauthenticated API read/write tests
- Tenant permission tests
- Permanent security rules in `AGENTS.md`
- Phase 3 master-data integrity hardening for customers, sites, suppliers, products,
  unit conversions, vehicles, drivers, machines, storage locations and shifts

Later phases remain documented but are not implemented in this pass.

## Finding Map

| Bug ID | Severity | Root cause | Files involved | Required fix | Database changes | API changes | UI changes | Test requirements | Status | Verification evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| BUG-001 | Critical | `getCurrentSession()` created demo tenant context without a cookie in local mode | `apps/web/lib/session.ts`, protected page/API routes | Return `null` unless a valid signed session cookie is present | None | Protected APIs return 401 with no cookie | Protected pages redirect to login | Unit test for missing/invalid token; E2E unauthenticated GET | Fixed pending full test run | Live probe: `GET /api/v1/session-context` and `GET /api/v1/master-data/customers` returned 401; dashboard returned 307 redirect |
| BUG-002 | Critical | Same demo fallback allowed writes to run as owner | `apps/web/lib/session.ts`, master-data/workflow routes | Same as BUG-001 | None | Protected POST routes see no session and return 401 | None | E2E unauthenticated POST test | Fixed pending full test run | Live probe: unauthenticated `POST /api/v1/master-data/customers` returned 401 |
| BUG-003 | High | Duplicate handling must be proven against PostgreSQL constraints | Database constraints, master-data repositories | Return explicit duplicate/constraint errors from PostgreSQL | Add/verify unique indexes | Catch unique violations | Field-level duplicate errors | Integration + E2E duplicate tests | Deferred to Phase 3 | Runtime in-memory fallback removed; DB proof still blocked by local PostgreSQL availability |
| BUG-004 | High | Login route assumed form-data and leaked detailed failure reasons | `apps/web/app/api/v1/auth/login/route.ts` | Safely parse JSON/form; generic 401/redirect for auth failure | Future login audit table | JSON returns 401; form redirects with generic error | Existing login page can show generic error | JSON invalid login API test; UI invalid login | Fixed pending full test run | Live probe: invalid JSON login returned 401; valid JSON login returned 200 and set a cookie |
| BUG-005 | High | Runtime in-memory fallback creates inconsistent source data | Dashboard, master-data and workflow APIs | Remove runtime fallback as source of truth; use PostgreSQL seeds | Required in Phase 2/13 | Return DB unavailable errors instead of fake success | Consistent loading/error states | Dashboard/report/list integration tests | Fixed pending PostgreSQL verification | `apps/web/lib/local-dev-store.ts` deleted; protected APIs now return 503 when PostgreSQL is unavailable |
| BUG-006 | High | Client reports sum orders and invoices together | `apps/web/app/[locale]/reports/reports-client.tsx` | Server-side report definitions with explicit formulas | Report export tables | Report API | Formula notes and source basis | Report formula tests | Deferred to Phase 13 | Open |
| BUG-007 | High | Generic CRUD updates allow completed/approved records to change | Workflow route handlers and DB repositories | Add workflow state machine and correction services | Workflow history/correction tables | Transition/correction APIs | Hide direct edit/delete; correction flow | Transition/immutability tests | Deferred to Phase 4 | Open |
| BUG-008 | High | Major domain workflows absent | Routes, packages, migrations | Implement phased domain modules | Multiple later migrations | Multiple APIs | New workflows | Unit/integration/E2E | Deferred to Phases 5-12 | Open |
| BUG-009 | High | Payment state not fully server-backed; Razorpay unconfigured | Billing UI/API, admin local data | DB payment lifecycle and Razorpay webhooks | Subscription/payment tables | Order/webhook/reconcile APIs | Server-backed billing/admin | Webhook/idempotency tests | Deferred to Phase 14 | Open |
| BUG-010 | Medium | Reports feature gating from local storage | Reports client, billing/subscription code | Server-side entitlements | Subscription tables | Entitlement API | Upgrade path | Gating tests | Deferred to Phase 14 | Open |
| BUG-011 | Medium | Layout width overflow on small mobile | Master-data UI/layout | Responsive table/cards/action menus | None | None | Mobile layout fix | Responsive Playwright tests | Deferred to Phase 17 | Open |
| BUG-012 | Medium | Icon-only buttons missing accessible names | Master-data and workflow table components | Add `aria-label`, tooltips and focus states | None | None | Accessibility fix | Axe/manual keyboard tests | Deferred to Phase 17 | Open |
| BUG-013 | Medium | AI service not running; no assistant UI | AI service, web routes | Add `/en/ai-assistant`, auth-scoped tools | AI logs/tool tables | AI proxy/tool APIs | Assistant UI | AI safety E2E | Deferred to Phase 16 | Open |
| BUG-014 | Medium | Notification adapter only logs | Notification lib, provider configs | Queue, provider adapters, delivery logs | Notification tables | Notification APIs/jobs | Preferences/status UI | Delivery tests | Deferred to Phase 15 | Open |
| BUG-015 | Medium | Current sandbox can block direct JS worker subprocesses | Tooling/package scripts/cache dirs | Add deterministic scripts; exclude bad caches; run in normal environment | None | None | None | CI/local test verification | Fixed pending CI verification | `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` passed through the escalated local command path |
| BUG-016 | High | Master-data duplicate checks were case-sensitive and surfaced raw persistence errors | `packages/database/src/master-data.ts`, master-data migrations and API routes | Add PostgreSQL expression unique indexes, input normalisation and user-safe 409 mapping | Add Phase 3 integrity migration | Structured conflict errors | Field-level duplicate messages | Validation, API and E2E duplicate tests | In progress | Phase 3 implementation underway |
| BUG-017 | High | Shift master data was absent, blocking plant production schedules | Database, validation, master-data repository, UI | Add tenant/plant-scoped shifts with RLS, validation and UI | Add `shifts` table and indexes | Add resource under `/api/v1/master-data/shifts` | Add Master Data tab/form | Unit + E2E shift tests | In progress | Phase 3 implementation underway |
| BUG-018 | Medium | Product unit conversion rules were incomplete | Validation and database constraints | Prevent identical units and duplicate active conversions; seed common exact units | Add `units` table and conversion constraints | Validate conversion payload | Unit conversion form validation | Unit tests | In progress | Phase 3 implementation underway |

## Phase 3 Master Data Integrity Task List

Status: In progress.

- Inspect current master-data tables, repositories, APIs, validation schemas, UI and tests.
- Add a Phase 3 migration that is additive and safe on the seeded Phase 2 database.
- Enforce organisation-scoped, case-insensitive uniqueness for customer, supplier,
  product and driver codes.
- Enforce tenant-safe customer-site, vehicle-registration, machine and
  storage-location uniqueness with normalised business keys.
- Add supplier/customer GSTIN uniqueness for non-empty values.
- Add shifts as plant-scoped master data with RLS and overlap-oriented validation.
- Add seeded common unit definitions without assuming universal tonne-to-brass
  conversion.
- Strengthen validation for Indian identifiers, vehicle registration normalisation,
  product stock thresholds, unit conversions and cross-midnight shifts.
- Map database constraint failures to structured, user-safe API responses with
  409 conflicts where appropriate.
- Keep deactivation as soft deletion / inactive state and audit every create,
  update and deactivate action.
- Extend master-data UI for shifts and improved labels while preserving mobile
  card rendering and accessible row action buttons.
- Add unit, database/RLS and E2E coverage while preserving the existing 14-test
  E2E baseline.

## Phase 2 Recovery Acceptance Criteria

- Docker Compose starts PostgreSQL, Redis and MinIO.
- `pnpm db:migrate` applies all SQL migrations against PostgreSQL.
- `pnpm db:seed` inserts the demo organisation, user, plants, master data and workflow rows into PostgreSQL.
- Protected APIs do not use process memory when PostgreSQL is unavailable.
- `pnpm test:postgres` proves expected tables, seed rows and RLS filtering through the `crushermitra_app` role.
- Unauthenticated protected APIs still return 401 without a signed cookie.

## Phase 1 Security Acceptance Criteria

- Protected API without a signed cookie returns 401.
- Protected UI without a signed cookie redirects to login.
- Seeded owner still logs in normally.
- Invalid login returns controlled generic failure.
- No code path auto-creates a demo session from `APP_ENV=local`.
- Tests encode unauthenticated read/write rejection and tenant permission denial.

## Phase 1 Verification Plan

1. Restart the Next.js dev server so session code changes are active.
2. Clear browser cookies for localhost.
3. Run:
   - `GET /api/v1/session-context`
   - `GET /api/v1/master-data/customers`
   - `POST /api/v1/master-data/customers`
4. Expected result: all protected unauthenticated calls return 401.
5. Log in with seeded owner and verify dashboard loads.
6. Submit JSON invalid login and verify 401 generic response.
7. Run type checks and tests in normal environment.

## Phase 2 Entry Criteria

Do not proceed to Phase 2 until:

- Docker Desktop/PostgreSQL runs.
- Migrations and seeds execute cleanly.
- Runtime local fallback is removed as an operational source of truth.
- Phase 1 protected API checks are verified after server restart.

## Phase 2 Status

Implementation is code-complete but blocked on service verification. Runtime in-memory fallback was removed from protected API routes and the fallback source file was deleted. A PostgreSQL-backed verifier was added, but it currently fails with `ECONNREFUSED` because Docker/PostgreSQL is not running in this environment.
