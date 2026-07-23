# Thrive OS

Internal sales operating system for Thrive Dev s.r.o. The current repository contains the architecture contract and the runnable Phase 1 foundation: Auth.js login, protected responsive application shell, founder dashboard, capability-based RBAC policy, audit-ready PostgreSQL schema and Docker setup.

Later modules are visibly gated; they are not presented as finished. See [architecture and delivery plan](docs/architecture.md).

## Local setup

Requirements: Node.js 22, npm and Docker with Compose.

1. Copy `.env.example` to `.env` and replace `AUTH_SECRET` and the bootstrap password.
2. Start PostgreSQL: `docker compose up -d postgres`.
3. Install packages: `npm ci`.
4. Apply the schema: `npm run db:migrate -- --name foundation`.
5. Seed workspace, roles, capabilities, founder and pipeline stages: `npm run db:seed`.
6. Start the application: `npm run dev`, then open `http://localhost:3000`.

The bootstrap login uses `DEMO_FOUNDER_EMAIL` and `DEMO_FOUNDER_PASSWORD`. It is an explicit development seam. Before production, replace credential authorization with database-backed password verification or company OAuth and rotate the secret.

## Quality commands

- `npm run lint` — static checks
- `npm test` — business-policy unit tests
- `npm run build` — strict TypeScript production build
- `npm run check` — all checks
- `npx prisma validate` — schema validation

## Universal lead import API

External systems can create review-ready B2B leads through `POST /api/imports/leads`. The endpoint accepts any approved source, validates and size-limits JSON, authenticates with the server-only `IMPORT_API_KEY`, records raw provenance, and deduplicates by source identity in PostgreSQL.

Generate a long random key, set `IMPORT_API_KEY` in the server environment, and never expose it through a `NEXT_PUBLIC_` variable.

```bash
curl -X POST "${APP_URL}/api/imports/leads" \
  -H "Authorization: Bearer ${IMPORT_API_KEY}" \
  -H "Content-Type: application/json" \
  --data '{
    "source": {
      "name": "webtrh",
      "type": "marketplace",
      "externalId": "12345",
      "url": "https://example.com/item/12345"
    },
    "lead": {
      "title": "Hľadám dodávateľa webu",
      "description": "Text dopytu",
      "category": "web-development",
      "budgetMin": 1000,
      "budgetMax": 3000,
      "currency": "EUR"
    },
    "company": {
      "name": "Firma s.r.o.",
      "domain": "firma.sk",
      "ico": "12345678"
    },
    "contact": {
      "firstName": "Ján",
      "lastName": "Novák",
      "email": "jan@firma.sk"
    },
    "metadata": {
      "location": "Bratislava"
    }
  }'
```

The body limit is 256 KB and the local limiter allows 60 requests per minute per API key and forwarded client address. The in-memory limiter protects a single application process; production deployments with multiple instances must replace the implementation behind `src/lib/imports/leads/rate-limit.ts` with a shared Redis-backed limiter.

## Docker

`docker compose up --build` starts PostgreSQL and the standalone web container. Run migrations as a release step before web traffic. The future worker uses the same image with a separate command and is introduced with background jobs.

## Reset, backup and restore

Development reset (destructive): `npm run db:reset`, then `npm run db:seed`.

Backup: `docker compose exec -T postgres pg_dump -U thrive -Fc thrive_os > thrive-os.dump`

Restore into an empty database: `docker compose exec -T postgres pg_restore -U thrive -d thrive_os --clean --if-exists < thrive-os.dump`

Production backups must be encrypted, access-controlled and restore-tested. Never commit `.env`, database dumps, mailbox tokens or customer data.

## Current boundary

Phase 1 establishes architecture, identity seams, workspace isolation, roles/capabilities, navigation, dashboard, audit schema and deployment foundation. Core CRM CRUD, lead ingestion, real analytics, provider email sync, automations, AI and voice follow the phased acceptance criteria in the architecture document.
