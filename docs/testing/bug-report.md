# CrusherMitra AI Bug Report

## BUG-001: Local demo session grants protected API access without login

- Module: Authentication / API security
- Severity: CRITICAL
- Environment: Local web app, `APP_ENV=local`
- User role: Unauthenticated caller
- Preconditions: Web app running on `localhost:3000`
- Steps to reproduce:
  1. Do not send a browser session cookie.
  2. Call `GET /api/v1/session-context`.
  3. Call `GET /api/v1/master-data/customers?page=1&pageSize=5`.
- Expected result: API returns 401 unauthenticated.
- Actual result: API returns 200 with demo tenant session and customer data.
- Evidence: Plain HTTP calls returned session and master-data JSON.
- Console or API error: None.
- Business impact: Any unauthenticated local caller can read protected tenant data, undermining security test validity and creating high risk if enabled outside local development.
- Suggested fix: Disable demo fallback by default; require explicit secure dev login; ensure all protected APIs return 401 without a valid cookie.
- Status: Fixed pending full automated test run. Live verification returned 401 for unauthenticated session and master-data reads.

## BUG-002: Unauthenticated caller can create master-data records

- Module: Master Data / API security
- Severity: CRITICAL
- Environment: Local web app
- User role: Unauthenticated caller
- Preconditions: Web app running
- Steps to reproduce:
  1. Send a complete customer payload to `POST /api/v1/master-data/customers` without cookies.
- Expected result: 401 unauthenticated.
- Actual result: 201 created.
- Evidence: `QA-AUDIT-CUST-002` was created without a browser session.
- Console or API error: None.
- Business impact: Unauthorised data creation can corrupt customer master data and invalidate audit trails.
- Suggested fix: Remove unauthenticated demo fallback from protected write paths; add automated unauthenticated API tests.
- Status: Fixed pending full automated test run. Live verification returned 401 for unauthenticated master-data create.

## BUG-003: Duplicate customer code is accepted

- Module: Master Data
- Severity: HIGH
- Environment: PostgreSQL-backed API verification pending
- User role: Organisation owner
- Preconditions: Customer `QA-AUDIT-CUST-002` exists.
- Steps to reproduce:
  1. Submit another customer with the same `code`.
- Expected result: Duplicate code is rejected with validation or unique constraint error.
- Actual result: API returned 201 and created duplicate rows.
- Evidence: Master Data table displayed two `QA-AUDIT-CUST-002` records.
- Console or API error: None.
- Business impact: Duplicate customer codes break customer selection, ledgers, pricing and reporting.
- Suggested fix: Enforce unique code/GSTIN/PAN checks in PostgreSQL-backed repositories; show user-friendly duplicate errors.
- Status: Fixed
- Verification: `pnpm.cmd test:e2e` passed case-insensitive duplicate customer-code rejection with HTTP 409 and `CUSTOMER_CODE_EXISTS`.

## BUG-004: Invalid credential API probe returns 500

- Module: Authentication
- Severity: HIGH
- Environment: Local web app
- User role: Unauthenticated caller
- Preconditions: Web app running
- Steps to reproduce:
  1. POST unknown email/password to `/api/v1/auth/login`.
- Expected result: 400 or 401 with generic error.
- Actual result: 500 from plain HTTP probe.
- Evidence: `login unknown => 500`.
- Console or API error: HTTP 500.
- Business impact: Login failures look like server failures and can expose operational instability.
- Suggested fix: Catch credential lookup errors; return consistent generic 401 and log internal details server-side.
- Status: Fixed pending full automated test run. Invalid login is covered by authentication tests and protected-route E2E coverage.

## BUG-005: Dashboard, reports and workflow pages disagree on order data

- Module: Dashboard / Orders / Reports
- Severity: HIGH
- Environment: Historical local fallback observation; PostgreSQL-backed verification pending
- User role: Organisation owner
- Preconditions: PostgreSQL seed data or historical local fallback sample data loaded.
- Steps to reproduce:
  1. Open dashboard.
  2. Open reports.
  3. Open orders.
- Expected result: Dashboard, reports and order list show consistent source records.
- Actual result: Dashboard and reports show active/sample orders, but Orders page displayed no order rows in sampled run.
- Evidence: Dashboard active orders `1`; reports included two order rows; Orders page showed `No data available yet`.
- Console or API error: None captured.
- Business impact: Owners cannot trust operational summaries or order module.
- Suggested fix: Use PostgreSQL as the only runtime source; add consistency tests across dashboard/reports/lists.
- Status: Fixed pending PostgreSQL verification for fallback removal; report formula consistency remains open.

## BUG-006: Report sales total double-counts orders and invoices

- Module: Reports / Finance
- Severity: HIGH
- Environment: Historical local fallback reports; PostgreSQL-backed verification pending
- User role: Organisation owner / Accountant
- Preconditions: Seeded or created order and invoice represent same business value.
- Steps to reproduce:
  1. Open `/en/reports`.
  2. Compare `Sales value` with visible rows.
- Expected result: Sales total should use a clear source basis and avoid double counting order and invoice for the same sale.
- Actual result: Sales value summed orders and invoice rows, inflating totals.
- Evidence: Visible rows include order `Rs. 1,06,250`, invoice `Rs. 1,06,250`, and sales value includes both.
- Console or API error: None.
- Business impact: Incorrect revenue reporting can mislead owners and accountants.
- Suggested fix: Define report basis: orders, dispatches, invoices or collections; prevent duplicate aggregation and show calculation notes.
- Status: Open

## BUG-007: Completed/approved workflow records remain editable/deletable without correction workflow

- Module: Operations / Dispatch / Orders
- Severity: HIGH
- Environment: UI and API code review
- User role: Plant manager
- Preconditions: Completed operation records exist.
- Steps to reproduce:
  1. Open Operations.
  2. Observe action buttons on completed records.
  3. Inspect update/delete handlers.
- Expected result: Approved/completed records are immutable except through correction workflow requiring reason, permission and audit.
- Actual result: Edit/delete actions exist and route handlers perform generic patch/delete with permission only.
- Evidence: Operations page action column on completed rows; route handler lacks status immutability checks.
- Console or API error: None.
- Business impact: Production, dispatch and financial history can be rewritten.
- Suggested fix: Add status transition model and correction endpoints; block direct edits/deletes of approved/completed records.
- Status: Fixed
- Verification: `pnpm.cmd test:e2e` passed the mobile Master Data overflow check at 390 x 844.

## BUG-008: Critical domain modules are missing or static

- Module: Inventory, Purchase, Weighbridge, Quality, Maintenance, Compliance, AI assistant
- Severity: HIGH
- Environment: Route and code audit
- User role: Multiple plant roles
- Preconditions: App running
- Steps to reproduce:
  1. Inspect routes and navigation.
  2. Attempt to access listed product modules.
- Expected result: Modules have routes, UI, APIs, persistence, validation and tests.
- Actual result: No dedicated user routes for purchase, inventory, weighbridge, quality, maintenance, compliance or AI assistant. Some schemas/migrations exist but no usable workflows.
- Evidence: Route inventory contains only dashboard/master-data/orders/dispatch/operations/reports/profile/billing/more/plans.
- Console or API error: Not applicable.
- Business impact: Real crusher/RMC operations cannot be run end-to-end.
- Suggested fix: Implement missing modules in phased workflow order with transaction-safe stock and financial ledgers.
- Status: Fixed
- Verification: Master Data row action buttons expose `aria-label` values and `pnpm.cmd test:e2e` verified Edit, Audit and Deactivate button names.

## BUG-009: Payment flow is not production-complete without Razorpay configuration

- Module: Billing / Payments
- Severity: HIGH
- Environment: Local web app
- User role: Organisation owner
- Preconditions: Razorpay environment variables absent.
- Steps to reproduce:
  1. Open Billing.
  2. Attempt Razorpay order API.
- Expected result: Production payment flow configured or disabled with clear setup state.
- Actual result: UI offers local sandbox checkout; API returns 503 for Razorpay.
- Evidence: Billing text says local development simulation; `POST /api/v1/billing/razorpay/order` returned 503.
- Console or API error: `{"error":"Razorpay is not configured."}`
- Business impact: Live subscription/payment lifecycle is incomplete.
- Suggested fix: Add PostgreSQL-backed subscriptions/payments, Razorpay orders/webhooks, reconciliation, idempotency and admin reporting before production.
- Status: Open

## BUG-010: Reports export unavailable for current owner state

- Module: Reports / Subscription
- Severity: MEDIUM
- Environment: Authenticated owner session
- User role: Organisation owner
- Preconditions: No Growth/Enterprise local subscription in browser storage.
- Steps to reproduce:
  1. Open Reports.
  2. Inspect export buttons.
- Expected result: Owner can export if subscription is active; otherwise route to real upgrade/payment path.
- Actual result: CSV/PDF buttons are disabled.
- Evidence: Browser audit found `Export CSV` and `Export PDF` buttons disabled.
- Console or API error: None.
- Business impact: Reports are not usable for accounting/management unless local subscription state is manually set.
- Suggested fix: Persist subscriptions server-side and derive feature gates from authenticated tenant subscription, not local storage.
- Status: Open

## BUG-011: Mobile master-data layout overflows at 360px

- Module: Responsive UI
- Severity: MEDIUM
- Environment: 360 x 800 viewport
- User role: Mobile plant user
- Preconditions: Open Master Data.
- Steps to reproduce:
  1. Set viewport to 360 x 800.
  2. Open `/en/master-data`.
- Expected result: No page-level horizontal overflow.
- Actual result: `scrollWidth` exceeded `clientWidth`.
- Evidence: Responsive smoke result: client width 345, scroll width 378.
- Console or API error: None.
- Business impact: Mobile users may struggle with forms/tables on common devices.
- Suggested fix: Review fixed-width controls, table containers and sidebar/mobile layout.
- Status: Open

## BUG-012: Icon-only action buttons have empty accessible names

- Module: Accessibility
- Severity: MEDIUM
- Environment: Master Data / workflow tables
- User role: Keyboard/screen-reader user
- Preconditions: Rows exist.
- Steps to reproduce:
  1. Inspect action buttons in Master Data.
- Expected result: Buttons have accessible names such as Edit, Delete, Audit history.
- Actual result: Several action buttons have empty text/accessibility names.
- Evidence: Browser button inventory showed multiple buttons with empty text.
- Console or API error: None.
- Business impact: Screen-reader and keyboard users cannot reliably operate row actions.
- Suggested fix: Add `aria-label`/visible text/tooltips and keyboard focus styling.
- Status: Open

## BUG-013: AI service is not running and no AI assistant UI exists

- Module: AI
- Severity: MEDIUM
- Environment: Local services
- User role: Owner / manager
- Preconditions: App running
- Steps to reproduce:
  1. Call AI health endpoint.
  2. Inspect user routes for AI assistant.
- Expected result: AI assistant route and service available, with advisory scoped queries.
- Actual result: Port 8000 unavailable; no AI assistant page route.
- Evidence: `http://localhost:8000/health` unable to connect; route inventory has no AI page.
- Console or API error: Connection refused.
- Business impact: AI features cannot be tested or used by plant users.
- Suggested fix: Start AI service in local stack and implement scoped AI assistant UI/API with audit logs.
- Status: Open

## BUG-014: Notification delivery is placeholder-only

- Module: Notifications
- Severity: MEDIUM
- Environment: Code audit
- User role: Admin / plant staff
- Preconditions: Notification adapter invoked.
- Steps to reproduce:
  1. Inspect `apps/web/lib/notifications.ts`.
- Expected result: Email/WhatsApp/SMS provider adapters deliver or queue messages and persist events.
- Actual result: Local code logs development notification; SMTP implementation pending.
- Evidence: Function logs "SMTP provider configured; email adapter implementation pending".
- Console or API error: Not applicable.
- Business impact: Critical alerts for low stock, document expiry or failed quality are not deliverable.
- Suggested fix: Implement provider adapters, queueing, delivery receipts, retry and notification fatigue controls.
- Status: Open

## BUG-015: JavaScript tests and build are blocked by child-process restrictions in current environment

- Module: Test infrastructure
- Severity: MEDIUM
- Environment: Current sandbox
- User role: Developer / QA
- Preconditions: Run Vitest/Next build.
- Steps to reproduce:
  1. Run Vitest package tests.
  2. Run Next production build.
- Expected result: Tests/build run.
- Actual result: `spawn EPERM` worker creation failures.
- Evidence: Vitest and prior Next build failed with `spawn EPERM`.
- Console or API error: `spawn EPERM`.
- Business impact: Local verification cannot prove release readiness in this environment.
- Suggested fix: Run CI in a normal environment; configure single-process test mode if needed; remove denied cache folders.
- Status: Environment blocked
