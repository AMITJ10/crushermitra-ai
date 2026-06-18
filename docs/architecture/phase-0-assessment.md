# CrusherMitra AI Phase 0 Assessment

## 1. Repository Assessment

Workspace inspected: `C:\Users\Amit Jadhav\Documents\New project`.

The repository is no longer empty. It already contains a monorepo scaffold with:

- Root workspace files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `.env.example`, `.gitignore`, `docker-compose.yml`, and `README.md`.
- Application shells: `apps/web`, `apps/ai-service`, and `apps/worker`.
- Shared packages: `packages/ui`, `packages/database`, `packages/validation`, `packages/config`, `packages/auth`, `packages/permissions`, `packages/i18n`, `packages/integrations`, `packages/reporting`, and `packages/domain`.
- Infrastructure files: Dockerfiles and a preview server under `infrastructure`.
- Documentation: architecture and workflow documents under `docs`.
- Initial database SQL: `packages/database/migrations/0001_foundation.sql`.
- Initial seed SQL: `packages/database/seeds/demo.sql`.
- Initial unit tests for domain and permission helpers.

This scaffold is useful, but it should be treated as foundation work, not a production-ready application. Several acceptance criteria for Phase 1 remain incomplete, including dependency installation, executed migrations, full Auth.js credential flow, password hashing, live organisation and plant selection, and full lint/type/test/build verification.

## 2. Existing Reusable Code

Reusable pieces that should be preserved and expanded:

- `packages/domain`: pure TypeScript helpers for unit conversion, inventory balance movement, and weighment gross/tare/net calculations.
- `packages/permissions`: permission context and server-side access checks.
- `packages/validation`: Zod schemas for Indian mobile numbers, PAN, GSTIN, pincode, and onboarding basics.
- `packages/ui`: early reusable UI primitives such as metric cards and status badges.
- `packages/i18n`: message namespaces for English, Hindi, Marathi, and prepared regional languages.
- `packages/database/migrations/0001_foundation.sql`: useful first pass for tenancy, products, inventory, weighment, AI, devices, RLS policies, and audit logs.
- `apps/ai-service`: FastAPI shell with health and AI tool routes.
- `docker-compose.yml`: local PostgreSQL/PostGIS/pgvector, Redis, MinIO, web, and AI-service topology.

## 3. Conflicts And Gaps

Current conflicts or gaps against the requested architecture:

- The existing `system-design.md` previously described the repository as empty; that is now stale.
- The database SQL is a foundation slice, not the complete normalised entity set requested for all modules.
- RLS policies exist for selected tables only and need complete coverage plus `with check` policies for writes.
- The web app is mostly a static dashboard shell, not authenticated production UI.
- The AI service has route scaffolding but no full safe tool registry, RAG, approval workflow, or tenant-scoped retrieval.
- The worker shell is present but queue semantics, retry, idempotency, and dead-letter handling are not implemented.
- Tests exist for a few helpers only; critical workflow coverage is not yet implemented.
- No command should be considered verified until dependencies are installed and commands are actually run.

## 4. Proposed Monorepo Architecture

Keep the current monorepo structure and mature it incrementally:

```text
apps/
  web/
  ai-service/
  worker/
packages/
  ui/
  database/
  validation/
  config/
  auth/
  permissions/
  i18n/
  integrations/
  reporting/
  domain/
infrastructure/
  docker/
  scripts/
docs/
  architecture/
  api/
  database/
  workflows/
  compliance/
  deployment/
tests/
```

Ownership boundaries:

- `apps/web`: UI, route handlers, server actions, Auth.js integration, PWA, and operator workflows.
- `apps/ai-service`: AI assistant, retrieval, prediction baselines, anomaly analysis, and Python industrial processing.
- `apps/worker`: TypeScript background jobs that do not need Python.
- `packages/domain`: deterministic calculations and workflow rules.
- `packages/database`: migrations, RLS helpers, repositories, transaction helpers, seed scripts.
- `packages/permissions`: policies and permission matrix logic.
- `packages/integrations`: provider interfaces for hardware, maps, messaging, storage, malware scanning, GPS, and IoT.

## 5. Entity-Relationship Design

The database should be normalised around these domains:

- Platform and tenancy: organisations, settings, subscription plans, subscriptions, business units, plants, departments, feature flags.
- Identity and access: users, memberships, roles, permissions, role permissions, membership roles, plant access, sessions, login history.
- Masters: customers, sites, suppliers, products, units, conversions, prices, tax codes, storage locations, machines, vehicles, drivers, employees, shifts.
- Commercial flows: quotations, sales orders, purchase orders, receipts, supplier bills, invoices, receipts, payments, debit notes, credit notes, ledger entries.
- Operations: crusher runs, crusher outputs, downtime, RMC mix designs, revisions, batches, ingredients, moisture readings.
- Inventory: immutable transactions, balances, stock counts, transfers, transfer items.
- Weighbridge and dispatch: weighbridges, devices, weighments, images, corrections, dispatches, trips, trip events, delivery proofs, vehicle locations.
- Quality, maintenance, compliance, documents, AI, IoT, notifications, integrations, background jobs, imports, exports, and audit logs.

All tenant-owned tables require `organisation_id`; plant-specific records require `plant_id` where applicable. Use organisation-scoped unique constraints for codes and business identifiers.

## 6. Tenant-Isolation Design

Tenant isolation must be enforced at four layers:

- Session: resolve active organisation and plant from authenticated server session.
- Service/repository: every query receives an explicit tenant context.
- Database: enable RLS on tenant-owned tables and use transaction-local settings for current organisation, user, and allowed plants.
- Tests: prove cross-tenant read, write, update, delete, search, export, report, and AI retrieval paths are blocked.

Client-supplied `organisation_id` must never be trusted for authorization decisions.

## 7. Role And Permission Design

Use configurable roles seeded with default role templates:

- Platform Super Admin, Organisation Owner, Organisation Admin, Plant Manager, Crusher Operator, RMC Batching Operator, Weighbridge Operator, Dispatch Manager, Sales Executive, Accountant, Quality Engineer, Maintenance Engineer, Compliance Manager, Store Manager, Driver, Read-Only Auditor, Customer Portal User, Supplier Portal User.

Permissions use `domain.action` strings such as `weighment.correct`, `inventory.adjust`, `production.approve`, `payment.approve`, and `audit.view`.

The permission matrix screen should allow organisation administrators to manage roles while preventing unsafe edits to platform-only or immutable system permissions.

## 8. Inventory-Ledger Design

Inventory must use an immutable stock ledger:

- `inventory_transactions` records every movement with product, location, direction, base-unit quantity, conversion factor, source workflow, cost, idempotency key, approval status, user, and timestamp.
- `inventory_balances` is a derived balance maintained transactionally or recalculated from the ledger.
- Corrections create reversing and replacement entries.
- Negative stock is blocked unless both organisation setting and explicit permission allow it.
- Unit conversions are product-specific and organisation-configurable.
- Stock-affecting workflows commit business event and ledger entries in one transaction.

## 9. Weighbridge Data-Integrity Design

Weighbridge records should preserve immutable facts:

- First weight, second weight, timestamps, mode, source device, operator, vehicle, product, party, images, idempotency key, and print count.
- Gross, tare, and net are calculated server-side.
- Manual weighments require permission, reason, and audit.
- Corrections retain original value, corrected value, reason, user, approver, and timestamp.
- Device submissions use signed requests, device ID, sequence number, payload hash, and replay protection.
- Anomaly rules flag suspicious records for review and do not automatically block operations unless configured.

## 10. Crusher-Production Workflow

Crusher production should flow from shift setup to approved ledger posting:

1. Open shift and select plant, operator, supervisor, and equipment.
2. Start production run.
3. Record raw input, source stockpile, runtime, downtime, fuel, electricity, water, and loader hours.
4. Record output by product and stock location.
5. Calculate total output, recovery, yield by product, tonnes per hour, cost per tonne, and material-balance variance.
6. Require reason and approval if variance exceeds configured limits.
7. On approval, create inventory consumption and output ledger entries transactionally.

Approved production runs must be immutable except through controlled corrections.

## 11. RMC-Production Workflow

RMC production should flow from commercial order to batch and delivery:

1. Enquiry, quotation, approval, credit check, and order.
2. Site schedule, vehicle planning, batch planning.
3. Select an approved mix-design revision.
4. Produce batch and record target versus actual ingredient weights, moisture readings, water corrections, operator, mixer, and transit mixer.
5. Require permission, reason, approval, and audit for manual water, admixture, mix-design, or quantity overrides.
6. Consume ingredients through inventory ledger entries.
7. Dispatch, delivery acknowledgement, invoice, and payment.

Approved mix-design revisions must never be overwritten.

## 12. AI Safety Design

AI is advisory and must operate through a safe tool registry:

- Read tools can summarize scoped operational data and cite document sources.
- Draft tools can create proposed orders, reminders, tasks, or corrective actions that require human confirmation.
- AI must not execute arbitrary SQL, access another tenant, start machinery, alter mix designs, approve compliance, or commit commercial terms without approval.
- Every conversation, message, tool call, source, estimate, draft action, feedback signal, and approval decision must be logged.

## 13. Offline Synchronisation Design

Offline-capable workflows include weighbridge capture, basic dispatch, production entry, delivery proof, machine readings, and driver updates.

Design requirements:

- Use local durable queues with client-generated IDs.
- Include idempotency keys, payload hashes, operation type, dependencies, user, device, plant, and timestamps.
- Validate tenant and permission context at sync time.
- Reject stale writes that conflict with approved or corrected records.
- Surface conflicts to users instead of silently overwriting data.
- Record sync status, last synced time, retries, and failures.

## 14. Integration Architecture

Use adapters for:

- Weighbridge indicators: RS-232, RS-485, TCP/IP, Modbus, vendor API, CSV import, simulator.
- Batching plants: PLC, CSV, API, and secure imports.
- GPS, maps, WhatsApp Business API, SMS, email, push, S3-compatible storage, malware scanning, error monitoring, and payments if added.
- IoT: MQTT, Modbus RTU/TCP, OPC UA, HTTP REST, webhooks, CSV import.

Integration records must be organisation-scoped, plant-scoped when relevant, encrypted for credentials, audited, and observable through event logs and health status.

## 15. Security Threat Assessment

Highest risks:

- Cross-tenant data exposure.
- Broken server-side permission checks.
- Weighment fraud or duplicate submissions.
- Stock, invoice, payment, or approved mix-design tampering.
- Unsafe AI actions that appear authoritative.
- Offline replay attacks or silent conflict overwrites.
- Leaked integration, storage, or device credentials.
- Compliance misstatements across jurisdictions.

Primary mitigations:

- Session-derived tenant context, RLS, scoped repositories, and tests.
- Central permission helpers and policy checks.
- Immutable ledgers, corrections, approvals, and audit logs.
- Signed URLs, webhook signatures, malware scanning adapters, and secret redaction.
- Safe AI tool allowlist, draft-only writes, human confirmation, and tool-call logging.

## 16. Implementation Phases

The requested phased delivery remains appropriate:

- Phase 0: discovery, architecture, risk assessment, file plan, database plan.
- Phase 1: foundation, local services, auth, tenancy, permissions, audit, app shell, i18n, seed data, CI.
- Phase 2: master data.
- Phase 3: inventory and purchases.
- Phase 4: crusher operations.
- Phase 5: weighbridge and dispatch.
- Phase 6: sales and finance.
- Phase 7: RMC operations.
- Phase 8: quality, maintenance, compliance, documents.
- Phase 9: AI assistant.
- Phase 10: predictive/rule-based AI baselines.
- Phase 11: integrations and hardening.

## 17. Commands Planned For Phase 1

These commands should be used once dependencies and local services are ready. Do not report success until each command is actually run.

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis minio
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm dev:ai
pnpm dev:worker
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Additional verification should include FastAPI tests from `apps/ai-service` once Python dependencies are installed.

## 18. Initial File And Folder Structure

The existing file structure already matches the requested monorepo direction. Phase 1 should refine rather than replace it.

Additional documentation folders should be populated in later phases:

- `docs/api`
- `docs/database`
- `docs/compliance`
- `docs/deployment`
- `tests/integration`
- `tests/e2e`

## 19. Important Decisions

- Continue with the existing monorepo scaffold instead of recreating it.
- Keep PostgreSQL as the source of truth with PostGIS and pgvector enabled.
- Use immutable ledgers for stock, audit-sensitive changes, weighment corrections, AI tool calls, and financial corrections.
- Keep AI write-like behavior draft-only with human confirmation.
- Use adapter interfaces for maps, WhatsApp, SMS, storage, malware scanning, GPS, weighbridge, batching, and IoT providers.
- Treat predictive AI as rule-based baselines until enough authorised tenant data exists.

## 20. Risks And Assumptions

Assumptions:

- PostgreSQL is the operational source of truth.
- Redis is available for queues, caching, idempotency windows, and rate limiting.
- S3-compatible object storage is available for protected files.
- Initial predictive AI should be rule-based until enough tenant-authorized data exists.
- Compliance templates are configurable and not legal advice.

Risks:

- The requested product is broad enough that unmanaged implementation would create shallow demos.
- Hardware integration depends on device models, vendor protocols, and field testing.
- Offline operations can corrupt data without strict idempotency and conflict handling.
- RLS can be bypassed accidentally by service roles unless conventions are strict.
- AI retrieval and reports can leak data if every path is not tenant-scoped.
