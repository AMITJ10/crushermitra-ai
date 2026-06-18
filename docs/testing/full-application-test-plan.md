# CrusherMitra AI Full Application Test Plan

## Scope

This plan covers exploratory, functional, security, data-integrity, accessibility, responsive, API, database, reporting, AI, notification, billing, and administration testing for the CrusherMitra AI Stone Crusher + RMC management application at `http://localhost:3000/en/dashboard`.

The audit evaluates whether the application is genuinely usable and production-ready for stone-crusher, quarry, RMC, transport, accounting, quality, maintenance, compliance, and platform administration teams.

## Assumptions

- Testing is performed in a local development environment.
- No real customer, plant, payment, or production data is intentionally modified.
- Seeded PostgreSQL data is treated as test data only, not evidence of production workflow completion.
- A feature is marked working only when a complete user workflow and the relevant API/data behavior are verified.
- PostgreSQL, Redis, MinIO, AI service, and worker availability are verified separately from UI availability.
- Browser extension interference and local sandbox process restrictions are recorded as environmental limitations where observed.

## Test Environment

- Operating system: Windows local development machine.
- Web framework: Next.js App Router.
- Backend/API: Next.js route handlers under `/api/v1`.
- AI service: FastAPI application under `apps/ai-service`.
- Worker: TypeScript worker shell under `apps/worker`.
- Database: PostgreSQL migrations under `packages/database/migrations`.
- Cache/queue/object storage: Redis and MinIO via Docker Compose.
- Package manager: pnpm declared in `package.json`.
- Browser target: `http://localhost:3000/en/dashboard`.

## User Roles

- Organisation Owner
- Crusher Plant Manager
- RMC Plant Manager
- Weighbridge Operator
- Dispatch Manager
- Accountant
- Quality Engineer
- Maintenance Engineer
- Compliance Manager
- Restricted User
- Platform Super Admin

## Functional Test Areas

- Authentication and session handling
- Organisation, plant, membership, role and permission handling
- Dashboard metrics and drill-downs
- Master data: customers, sites, suppliers, products, units, prices, vehicles, drivers, machines, storage locations
- Inventory and stock ledger
- Purchase workflow
- Crusher production
- RMC production and mix design
- Weighbridge
- Sales orders
- Dispatch
- Fleet and driver management
- Quality control
- Maintenance
- Compliance
- Finance: invoices, receipts, ledgers, GST
- Reports and exports
- AI assistant and advisory actions
- Notifications
- Billing/subscriptions/payments
- Platform administration

## End-to-End Workflows

- Login, create customer, create product, create order, dispatch, invoice, receipt, dashboard/report verification.
- Purchase receipt through weighment and supplier payable.
- Crusher production run from raw stock consumption to finished stock increase.
- RMC order through mix design, batch, dispatch, proof of delivery, invoice.
- Weighbridge first/second weight through slip generation and correction.
- Customer payment recording and ledger update.
- Maintenance breakdown through work-order closure.
- Compliance document upload through renewal alert.
- AI read-only query and AI draft action requiring human confirmation.
- Subscription checkout through payment confirmation and admin reporting.

## Negative Tests

- Empty required fields.
- Invalid GSTIN, PAN, email, phone, PIN, vehicle number and date values.
- Duplicate customer/product/vehicle/payment submissions.
- Negative, zero, and impossible weights or quantities.
- Gross below tare.
- Output greater than possible input.
- End date/time before start date/time.
- Rate below floor and credit limit exceeded.
- Editing or deleting approved/immutable records.
- Browser refresh or duplicate click during save.
- Direct API payload tampering, including `organisation_id` and `plant_id`.
- Unauthenticated and unauthorised route/API access.

## Security Tests

- Broken access control and direct object reference checks.
- Cross-tenant read, write, update, delete, search, report, export, and AI retrieval checks.
- Server-side permission checks for restricted actions.
- Mass assignment checks.
- SQL injection and XSS input probes.
- CSRF exposure on state-changing endpoints.
- Reset-password and session management gaps.
- Rate-limit behavior for sensitive endpoints.
- Webhook signature validation.
- Sensitive values in frontend bundles, source maps, logs, or reports.
- File upload validation, signed URLs, path traversal, and malware-scanning adapter presence where applicable.

## Accessibility Tests

- Keyboard-only navigation.
- Visible focus states.
- Form labels and error association.
- Modal focus trapping.
- Screen-reader names for icon buttons and charts.
- Table headers and responsive table access.
- Colour contrast and non-colour status cues.
- Touch target size.
- Language attributes for English, Hindi and Marathi pages.
- Heading hierarchy and landmark structure.

## Responsive Tests

Viewports:

- 360 x 800 mobile
- 390 x 844 mobile
- 768 x 1024 tablet
- 1366 x 768 laptop
- 1920 x 1080 desktop

Components tested:

- Sidebar and mobile navigation
- Tables and pagination
- Forms and dialogs
- Charts and legends
- Date pickers and filters
- Long text in English, Hindi and Marathi
- Billing checkout and admin tables

## Performance Tests

- Initial page load.
- Dashboard load and repeated refreshes.
- Large table/search performance.
- Report generation and export.
- Order, dispatch, and operation creation.
- Inventory and financial calculation response.
- AI service response.
- Repeated API calls and N+1 query risks.
- Bundle and build behavior.

## Data-Integrity Tests

- Ledger-based stock updates.
- Immutable approved records.
- Correction entries preserving originals.
- Server-side gross/tare/net calculations.
- GST, invoice, receipt, receivable and payable calculations.
- Idempotency for sensitive writes.
- Audit entries for create, update, delete, approvals, corrections, AI actions, payments and notifications.
- PostgreSQL RLS and server-side tenant scoping.

## AI Tests

- Read-only data questions with source verification.
- Missing-data responses without invented values.
- Hindi and Marathi query handling.
- Plant and organisation scope.
- Refusal/safe restriction for destructive requests.
- Draft-only behavior for write-like recommendations.
- Prompt-injection resistance through uploaded/document content.
- AI tool-call audit logging.

## Out-of-Scope Items

- Destructive load testing or denial-of-service testing.
- Real money payment capture.
- Real WhatsApp/SMS/email delivery to external recipients.
- Production credential or secret validation.
- Real hardware weighbridge, GPS, camera, PLC, or batching-plant integration.

## Test-Data Strategy

- Prefer dedicated local test records with names prefixed `QA`.
- Do not delete unknown existing data.
- Use seeded fictional data only for environment orientation.
- Verify created records through UI, API responses, and database where services permit.
- Record when database verification is blocked by missing services or credentials.

## Severity Definitions

### Critical

- Cross-tenant data exposure.
- Authentication bypass.
- Incorrect inventory or financial records.
- Data loss.
- Unauthorised payment or price changes.
- Dangerous automatic machinery or concrete-quality actions.
- Application cannot start.
- Core workflow completely unusable.

### High

- Major feature cannot be completed.
- Incorrect stock, invoice, weight or production calculation.
- Permission bypass.
- Duplicate transaction creation.
- Approval workflow bypass.
- Significant mobile usability failure.
- Important API failure.

### Medium

- Feature works partially.
- Validation is missing.
- Confusing workflow.
- Report data is incomplete.
- Filters do not work correctly.
- Poor empty or error states.
- Missing audit entry.
- Accessibility problem affecting usage.

### Low

- Visual inconsistency.
- Typographical issue.
- Minor spacing problem.
- Non-critical wording issue.
- Small usability improvement.

## Acceptance Criteria

- Every claimed feature has UI, API, validation, permission, audit, persistence, tenant-isolation, loading/error state, mobile, accessibility, and test evidence.
- Critical stone-crusher and RMC workflows complete end-to-end without mock-only steps.
- Financial, stock, weight and production calculations match independent calculations.
- Unauthorised and cross-tenant access is rejected server-side.
- Reports and exports match source transactions.
- AI is advisory, scoped, audited, and refuses unsafe actions.
- No critical or high-severity blocker remains for controlled pilot.
