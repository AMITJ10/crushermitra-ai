# AGENTS.md

## Project Purpose

CrusherMitra AI is a production-ready, multi-tenant SaaS ERP and AI operations platform for Indian stone-crusher, quarry, aggregate-supply, transport, and Ready-Mixed Concrete businesses.

The product helps owners and plant teams manage production, weighbridge, dispatch, inventory, maintenance, quality, compliance, documents, payments, reports, AI insights, WhatsApp workflows, hardware integrations, and multi-plant operations.

## Architecture Rules

- Use a monorepo with `apps/`, `packages/`, `infrastructure/`, `docs/`, and `tests/`.
- Use strict TypeScript for web and shared packages.
- Keep business logic out of UI components.
- Put reusable domain calculations in `packages/domain`.
- Put validation schemas in `packages/validation`.
- Put authorization helpers in `packages/permissions`.
- Put integration provider interfaces in `packages/integrations`.
- Use server-side checks for permissions and tenant isolation.
- Use database transactions for stock, weighment, invoice, payment, transfer, and approval workflows.
- Use soft deletion for important business records.
- Keep approved records immutable except through controlled corrections.

## Phase Control Rules

- Follow the phased delivery plan in `docs/workflows/phased-task-checklist.md`.
- Do not implement a later phase until the current phase is accepted or the user explicitly asks to proceed.
- Treat existing scaffolded code as foundation work until dependencies, migrations, linting, type checking, tests, and build are actually run.
- Never claim Phase 1 or any feature is complete from static preview screens or skeleton services alone.

## Naming Conventions

- Use clear domain names: `weighments`, `crusherProductionRuns`, `inventoryTransactions`, `rmcBatches`.
- Use `organisation` spelling consistently in domain names and docs.
- Use permission strings in `domain.action` format, such as `weighment.correct`.
- Use database tables in snake_case.
- Use TypeScript variables and functions in camelCase.
- Use React components in PascalCase.
- Use API routes under `/api/v1`.

## Commands

Phase 1 command set:

- Install dependencies: `pnpm install`
- Start local services: `docker compose up -d postgres redis minio`
- Run database migrations: `pnpm db:migrate`
- Seed demo data: `pnpm db:seed`
- Start web app: `pnpm dev:web`
- Start AI service: `pnpm dev:ai`
- Start workers: `pnpm dev:worker`
- Run linting: `pnpm lint`
- Run type checking: `pnpm typecheck`
- Run TypeScript unit and foundation tests: `pnpm test`
- Run PostgreSQL migration, seed and RLS verification: `pnpm test:postgres`
- Run browser end-to-end tests: `pnpm test:e2e`
- Build all packages and apps: `pnpm build`
- Run AI service lint: `cd apps/ai-service && ..\..\.venv\Scripts\python -m ruff check .`
- Run AI service tests: `cd apps/ai-service && ..\..\.venv\Scripts\python -m pytest -p no:cacheprovider`

No command should require committed secrets.

## Testing Requirements

Critical unit tests:

- Unit conversion.
- GST calculations.
- Inventory transaction calculations.
- Crusher material balance.
- RMC ingredient variance.
- Weighment gross-tare-net calculations.
- Rate approvals.
- Credit-limit checks.
- Cost per tonne.
- Cost per cubic metre.
- Permission checks.
- Tenant isolation.

Critical integration tests:

- Purchase receipt updates stock.
- Crusher production consumes raw stock and creates output stock.
- RMC batch consumes ingredients.
- Sale reduces stock.
- Internal crusher-to-RMC transfer updates both locations.
- Weighment creates dispatch quantity.
- Invoice creates customer balance.
- Receipt reduces customer balance.
- Stock correction creates audit event.
- Weighment correction retains original value.
- Unauthorised users cannot access another plant.
- One organisation cannot access another organisation's records.

Critical end-to-end tests:

- Organisation onboarding.
- Crusher sale from order through weighment and invoice.
- RMC order through batch, dispatch, and proof of delivery.
- Customer payment recording.
- Maintenance work-order completion.
- Compliance-document renewal.
- Offline weighbridge synchronisation.
- AI read-only question.
- AI draft action with confirmation.

Never claim tests passed unless they were actually run.

## Security Rules

- Never store secrets in the repository.
- Use environment variables and a checked-in `.env.example`.
- Never auto-authenticate a protected UI or API request from `APP_ENV=local`.
- Seeded demo users must log in through the normal authentication flow.
- Test-only authentication bypasses must be disabled by default, impossible in production, explicit in environment naming, and covered by tests.
- Validate every input.
- Encode output where relevant.
- Use secure password hashing.
- Use secure sessions.
- Protect against CSRF where applicable.
- Rate-limit sensitive endpoints.
- Use signed URLs for protected files.
- Validate file type and size.
- Add malware scanning through an adapter.
- Validate webhook signatures.
- Use idempotency keys for sensitive writes.
- Avoid mass assignment with explicit DTO mapping.
- Never expose unrestricted AI SQL execution.
- Do not use browser local storage as the source of truth for authentication, tenant identity, subscriptions, payments, reports, inventory, orders, financial balances, or plan access.
- Do not let runtime in-memory fallback stores pretend PostgreSQL reads or writes succeeded. Offline behavior must be an explicit queue or test fixture, not a silent operational substitute.

## Tenant-Isolation Rules

- Every tenant-owned table must contain `organisation_id`.
- Plant-specific tables must contain `plant_id` where applicable.
- Never trust `organisation_id` sent by a client.
- Resolve organisation and plant context from the authenticated server session.
- Scope repository queries by organisation and plant context.
- Use PostgreSQL Row-Level Security where practical.
- Test cross-tenant read, write, update, delete, search, report, export, and AI retrieval paths.
- Protected APIs must return `401` without a valid signed session cookie.
- Tenant-owned exports, reports, notifications, documents, and AI tool calls must use the same server-side tenant checks as CRUD operations.

## Stock-Accounting Rules

- Use an immutable stock-ledger architecture.
- Never store only a manually editable current-stock number.
- Current stock must be calculated from ledger entries or transactionally maintained derived balances.
- Corrections must create reversing and replacement entries.
- Stock-affecting workflows must use database transactions.
- Negative stock is blocked unless an explicit permission and organisation setting allow it.
- Unit conversions must be product-specific and organisation-configurable.
- Do not assume one universal tonne-to-brass conversion.

## Weighbridge Rules

- Capture first and second weights as immutable facts.
- Calculate gross, tare, and net server-side.
- Manual weighments require permission, reason, and audit.
- Corrections must retain original value, corrected value, reason, timestamp, and user.
- Device readings need source device, mode, timestamp, and idempotency metadata.
- Track vehicle image, number-plate image, material image, print count, and cancellation state where relevant.
- Anomaly rules should flag suspicious transactions for review and must not automatically block operations unless configured.

## Approval Rules

- Sensitive actions require permission, reason, identity of approving user, timestamp, original value, changed value, and audit entry.
- Important records become immutable after approval.
- Corrections must use controlled workflows.
- Rate overrides, credit-limit exceptions, stock adjustments, payment corrections, weighment corrections, invoice cancellations, mix-design changes, and manual water/admixture additions require explicit controls.

## AI Safety Restrictions

- AI may recommend, explain, summarize, and draft.
- AI must not directly alter concrete mixes.
- AI must not start, stop, or control machinery.
- AI must not declare legal compliance as final.
- AI must not execute arbitrary SQL.
- AI must not access another tenant's data.
- AI must clearly label estimates.
- AI must cite sources for document-based answers.
- AI write-like actions must create drafts that require human confirmation.
- Every AI tool call must be logged.

## Definition Of Done

A feature is complete only when:

- UI is implemented.
- API is implemented.
- Database is implemented.
- Validation is implemented.
- Permissions are implemented.
- Tenant isolation is implemented.
- Loading and error states are implemented.
- Audit requirements are implemented.
- Tests are implemented.
- Tests pass.
- Documentation is updated.
- Mobile layout works.
- Accessibility is considered.
- No secrets are committed.
- No critical TODO remains.
