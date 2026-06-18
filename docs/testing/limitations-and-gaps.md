# CrusherMitra AI Limitations And Gaps

## Functional

- Full purchase workflow is missing.
- Full inventory ledger UI/API workflow is missing.
- Dedicated weighbridge workflow is missing.
- Crusher production is represented as generic operation records, not a material-balance workflow.
- RMC mix design, batching, moisture correction and proof-of-delivery workflows are missing.
- Quality, maintenance and compliance modules are missing.
- Orders, dispatch and operations are basic CRUD-style workflows and do not implement required business state machines.
- Customer ledger, supplier ledger, GST invoices, receipts, credit/debit notes and ageing are missing or incomplete.

## Technical

- Local demo session fallback has been removed; full automated regression execution is still pending.
- Runtime local fallback store has been removed; PostgreSQL must be running for protected business data.
- JavaScript tests/build could not run fully in the current environment because worker child-process creation was blocked.
- Docker services were unavailable, blocking migration/seed/database verification.
- Playwright is installed and starts the web app, but DB-backed E2E cases fail until PostgreSQL is running and seeded.
- Some pytest cache folders have access-denied permissions and interfere with recursive scans.

## Business Workflow

- No stock transaction linkage from purchase, production, dispatch, invoice and returns.
- No approval workflow for rate overrides, credit exceptions, stock adjustments, weighment corrections, payment corrections or mix changes.
- No immutable approved records with controlled correction workflow.
- No vehicle document expiry, maintenance history or driver compliance workflow.
- No customer-specific/site-specific rate resolution in order workflow.
- No credit-limit enforcement.
- No proof of delivery or returned material/concrete workflow.

## AI

- No AI assistant route in the web app.
- AI service was not running during audit.
- Safe-tool registry is static and not connected to tenant data.
- No evidence of source citations, prompt-injection controls, tenant-scoped retrieval or AI tool-call audit screens.
- AI write-like actions are not implemented as confirmable drafts in the UI.

## Security

- Protected API unauthenticated access was fixed in code and live-smoke verified, but full automated regression execution remains blocked here.
- Duplicate customer code uniqueness is now PostgreSQL-backed and E2E-verified for case-insensitive conflicts.
- Runtime RLS is verified by `pnpm.cmd test:postgres` through the `crushermitra_app` role.
- CSRF protections were not evident for JSON write endpoints.
- Rate limiting was not verified.
- Admin payment/report data relies on browser local storage in current UI.
- No full role-management screens for restricted-user testing.

## Performance

- No large dataset performance test was possible.
- Reports aggregate client-side from multiple API calls.
- Potential inconsistent repeated API calls and PostgreSQL-backed report/dashboard formulas still need verification.
- No query-plan or index performance verification because PostgreSQL was unavailable.

## Mobile

- Master Data page-level horizontal overflow is fixed for the covered mobile E2E viewport.
- Tables remain dense for very long forms and need workflow-specific grouping in later UX phases.
- Long forms need sectioning or stepper-style workflows for field-heavy entry.
- Mobile navigation works at a smoke level but needs hands-on task-speed validation.

## Accessibility

- Master Data icon-only row action buttons now have accessible names verified by E2E.
- Chart alternatives are limited.
- Form validation messages are not consistently tied to specific fields.
- Modal focus management was not fully verified.
- Keyboard-only operation of all forms/tables is unproven.

## Compliance

- No compliance document workflow is available.
- No legal disclaimer flow around compliance status.
- No document versioning, renewal alerts, inspections or corrective actions.
- No evidence of signed URLs, file type/size validation or malware scanning in user-facing flows.

## Reporting

- Reports can double-count order and invoice values.
- Exports are client-side/browser-generated, not server-audited report exports.
- PDF export is print-to-PDF style, not a generated, signed, persisted PDF.
- Excel export is not present.
- Report source basis and formulas are not clearly explained.
- Admin reports are local-storage based, not PostgreSQL-backed.

## Integrations

- Razorpay keys are not configured in the audited environment.
- Razorpay webhooks and persistent reconciliation are not complete in the verified UI.
- WhatsApp/SMS/email adapters are placeholder/logging only.
- Hardware integrations for weighbridge, GPS, cameras and batching plant are absent.
- MinIO was not available for file/document storage testing.

## Production Deployment

- Docker services could not be started locally in this session.
- CI exists but was not executed remotely.
- No evidence of production secret management beyond env variables.
- No production-ready health dashboard for web, AI, worker, DB, Redis and MinIO.
- Application should not be piloted until PostgreSQL-backed workflows, payments, audit and tenant isolation are verified end to end.
