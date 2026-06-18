# CrusherMitra AI Phased Task Checklist

## Phase 0: Discovery And Architecture

Status: Complete for initial planning and re-assessment of existing scaffold.

- [x] Inspect current repository.
- [x] Explain existing structure.
- [x] Identify reusable code.
- [x] Identify conflicts with requested architecture.
- [x] Create `docs/architecture/system-design.md`.
- [x] Create `docs/architecture/database-design.md`.
- [x] Create `docs/architecture/security-model.md`.
- [x] Create `docs/architecture/phase-0-assessment.md`.
- [x] Create `docs/workflows/core-workflows.md`.
- [x] Create `AGENTS.md`.
- [x] Create phased task checklist.
- [ ] Review Phase 0 documents with product owner.

## Phase 1: Foundation

Status: Implemented and verified for foundation scope.

- [x] Scaffold monorepo.
- [x] Add package manager and workspace configuration.
- [x] Add Next.js web app shell.
- [x] Add FastAPI AI service shell.
- [x] Add worker service shell.
- [x] Add PostgreSQL, PostGIS, pgvector, Redis, and MinIO local Docker setup.
- [x] Add typed environment configuration and `.env.example`.
- [x] Add authentication foundation.
- [x] Add organisation, plant, user, role, and permission model SQL foundation.
- [x] Add tenant context helpers.
- [x] Add audit logging foundation.
- [x] Add app shell, navigation, and layout preview.
- [x] Add English, Hindi, and Marathi i18n namespaces.
- [x] Add prepared Gujarati, Kannada, Telugu, and Tamil namespaces.
- [x] Add seed data foundation.
- [x] Add CI pipeline.
- [x] Add initial tests for permissions and tenant isolation.
- [x] Install dependencies.
- [x] Run database migrations against local PostgreSQL.
- [x] Implement credential login foundation and password hashing.
- [x] Implement signed session tenant context and protected session API.
- [x] Implement allowed-plant switching API foundation.
- [x] Replace static-only preview with live authenticated Next.js runtime.
- [x] Run linting, type checking, tests, and build.

## Phase 2: Master Data

Status: Not started.

- [ ] Customers and customer sites.
- [ ] Suppliers.
- [ ] Products.
- [ ] Units and conversions.
- [ ] Prices.
- [ ] Vehicles.
- [ ] Drivers.
- [ ] Machines.
- [ ] Storage locations.
- [ ] Search, filter, pagination, export.
- [ ] Audit history.
- [ ] Mobile layouts.
- [ ] Tenant isolation tests.

## Phase 3: Inventory And Purchases

Status: Not started.

- [ ] Purchase orders.
- [ ] Purchase receipts.
- [ ] Inventory ledger.
- [ ] Opening stock.
- [ ] Stock adjustments.
- [ ] Physical stock count.
- [ ] Internal transfers.
- [ ] Negative stock controls.
- [ ] Correction approval workflow.
- [ ] Inventory transaction tests.

## Phase 4: Stone-Crusher Operations

Status: Not started.

- [ ] Shifts.
- [ ] Crusher production runs.
- [ ] Product outputs.
- [ ] Downtime.
- [ ] Energy and diesel usage.
- [ ] Material balance.
- [ ] Cost per tonne.
- [ ] Crusher reports.
- [ ] Approval workflow.
- [ ] Report exports.

## Phase 5: Weighbridge And Dispatch

Status: Not started.

- [ ] Weighment workflow.
- [ ] Device simulator.
- [ ] Vehicle images.
- [ ] First and second weight capture.
- [ ] Sales dispatch.
- [ ] Purchase weighment.
- [ ] Internal transfer weighment.
- [ ] Offline queue simulation.
- [ ] Fraud/anomaly rules.
- [ ] Print layout.
- [ ] Idempotency tests.

## Phase 6: Sales And Finance

Status: Not started.

- [ ] Quotations.
- [ ] Sales orders.
- [ ] Pricing.
- [ ] Credit checks.
- [ ] Invoices.
- [ ] Receipts.
- [ ] Outstanding ageing.
- [ ] Customer ledger.
- [ ] GST-ready fields.
- [ ] Financial calculation tests.

## Phase 7: RMC Operations

Status: Not started.

- [ ] Concrete grades.
- [ ] Mix-design versioning.
- [ ] RMC orders.
- [ ] Scheduling.
- [ ] Batch records.
- [ ] Ingredient usage.
- [ ] Moisture correction.
- [ ] Transit-mixer dispatch.
- [ ] Site delivery.
- [ ] Returned concrete.
- [ ] Override approval tests.

## Phase 8: Quality, Maintenance And Compliance

Status: Not started.

- [ ] Quality-test definitions.
- [ ] Crusher quality tests.
- [ ] Slump tests.
- [ ] Cube register.
- [ ] Work orders.
- [ ] Preventive schedules.
- [ ] Breakdowns.
- [ ] Compliance calendar.
- [ ] Expiry reminders.
- [ ] Documents.
- [ ] Permission and document access tests.

## Phase 9: AI Assistant

Status: Not started.

- [ ] Safe AI tool registry.
- [ ] Organisation-scoped read tools.
- [ ] Draft action tools.
- [ ] Confirmation workflow.
- [ ] RAG over organisation documents.
- [ ] Source references.
- [ ] AI feedback.
- [ ] Tool-call logging.
- [ ] Tenant isolation tests.

## Phase 10: Predictive AI

Status: Not started.

- [ ] Production anomaly rules.
- [ ] Weighment anomaly rules.
- [ ] Delivery ETA baseline.
- [ ] Maintenance anomaly framework.
- [ ] Model registry.
- [ ] Prediction feedback.
- [ ] Feature flags.
- [ ] Clear rule-based labelling.

## Phase 11: Integrations And Hardening

Status: Not started.

- [ ] WhatsApp adapter.
- [ ] GPS adapter.
- [ ] Weighbridge edge-agent specification.
- [ ] Batching-plant import adapter.
- [ ] Sensor API.
- [ ] Security review.
- [ ] Performance review.
- [ ] Backup documentation.
- [ ] Production deployment documentation.
- [ ] Load tests.
- [ ] Accessibility review.
