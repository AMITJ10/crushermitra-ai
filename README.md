# CrusherMitra AI

Production, weighbridge, dispatch, maintenance, quality and compliance management for stone crushers and RMC plants.

## Current Status

Phase 3 master-data integrity is implemented on top of the Phase 1 foundation and Phase 2 PostgreSQL recovery. This repository contains the monorepo layout, application shells, database foundation SQL, environment configuration, Docker Compose, CI, deterministic seed data, authenticated web shell, tenant/session helpers, audit foundations, and PostgreSQL-backed master-data CRUD for customers, customer sites, suppliers, products, units, prices, vehicles, drivers, machines, storage locations, and shifts.

The full production app is intentionally phased. See `docs/workflows/phased-task-checklist.md`.

## Architecture

- `apps/web`: Next.js App Router web/PWA shell with credential login, signed HTTP-only session cookie, authenticated dashboard, locale routing, master-data workspace, and `/api/v1` health/session/auth/master-data routes.
- `apps/ai-service`: FastAPI AI and industrial data-processing service.
- `apps/worker`: TypeScript background worker shell.
- `packages/*`: Shared UI, auth, config, database, validation, permissions, i18n, integrations, reporting, and domain logic.
- `infrastructure/docker`: Dockerfiles and service setup.
- `infrastructure/scripts`: Local scripts, including the static preview server.
- `docs`: Architecture, workflow, database, compliance, deployment, and API documentation.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.12+
- Docker Desktop

## Local Setup

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres redis minio
pnpm db:migrate
pnpm db:seed
pnpm dev
```

On machines without a globally installed `psql`, the database scripts fall back to the PostgreSQL Docker container.

Open `http://localhost:3000/en/master-data` after signing in to manage Phase 3 master data.

## Static Preview

If JavaScript dependencies are not installed yet, run:

```bash
pnpm preview:static
```

Or use Python:

```bash
python -m http.server 3000 --directory apps/web/public
```

Then open `http://localhost:3000/phase1-preview.html`.

## Services

- Web app: `http://localhost:3000`
- AI service: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- MinIO console: `http://localhost:9001`

## Commands

```bash
pnpm dev
pnpm dev:ai
pnpm lint
pnpm typecheck
pnpm test
pnpm test:postgres
pnpm test:e2e
pnpm build
pnpm db:migrate
pnpm db:seed
```

For AI service checks:

```bash
python -m venv .venv
.venv\Scripts\python -m pip install -e "apps/ai-service[dev]"
cd apps/ai-service
..\..\.venv\Scripts\python -m ruff check .
..\..\.venv\Scripts\python -m pytest -p no:cacheprovider
```

## Demo Organisation

Seed data is prepared around:

- Shivneri Aggregates and Concrete Pvt. Ltd.
- Pune Crusher Plant
- Pune RMC Plant
- Nashik Crusher and RMC Plant
- Fictional Phase 3 customers, sites, suppliers, product prices, vehicles, drivers, machines, unit conversions, storage locations, and shifts

All sample identifiers must remain fictional.

Demo login:

- Email: `owner@shivneri.example`
- Password: `ChangeMe!123`

## Security Notes

- Never commit real secrets.
- Tenant context must come from authenticated server sessions.
- All sensitive writes require permission checks, idempotency where relevant, and audit logs.
- AI tools are advisory and draft-only for sensitive workflows.

## Known Limitations

- Authentication is a Phase 1 credential/session foundation with deterministic demo data, not a complete production identity system with password reset, OTP, 2FA, session revocation UI, or invitation emails.
- Phase 3 master data supports CRUD, search, pagination, CSV export, validation, permissions, audit history, RLS-backed tenant isolation, normalised duplicate protection, vehicles, shifts, and common unit seeds. Later workflow phases still need purchase, weighbridge, stock movement, invoice, payment, maintenance, compliance, AI action, and advanced reporting screens.
- Database migrations cover Phase 1 tenancy, identity, permissions, audit, inventory foundation, weighbridge foundation, AI logging foundation, devices, RLS, seed data, Phase 2 master-data tables, and Phase 3 master-data integrity constraints.
- AI service is a shell with health/tool route foundations; RAG, safe tool execution, draft actions, and model baselines come in later phases.
