# Thrive OS architecture and delivery plan

Status: foundation decision record, 22 July 2026. This document is the implementation contract for the internal Thrive Dev CRM. It deliberately separates the runnable MVP from later integrations.

## 1. Product architecture

Thrive OS is a workspace-scoped modular monolith. A single Next.js application owns the web UI, server actions and versioned HTTP API. PostgreSQL is the system of record; a separate worker process consumes durable jobs from PostgreSQL. Object storage holds attachments. Adapters isolate email, calendar, lead-source, AI and speech providers.

The modular monolith keeps transactions, permissions and deployment simple while preserving boundaries that can later become services. Each domain follows `UI -> action/API -> application service -> repository/Prisma`. UI code never queries Prisma directly. Every mutation validates input, resolves workspace membership, checks a granular capability and writes its audit event in the same transaction.

Runtime units:

- `web`: Next.js App Router, Auth.js sessions, React server components and route handlers.
- `worker`: leased PostgreSQL jobs with retry, exponential backoff, idempotency keys and dead-letter state.
- `postgres`: transactional data, full-text/trigram search and job queue.
- `object-store`: S3-compatible private attachments with short-lived signed URLs.
- optional local services: Ollama, faster-whisper and Piper. Core CRM never depends on them.

Tenancy is workspace-first: every business row carries `workspaceId`; compound constraints include it; repositories require a workspace context. Dates are stored as UTC and rendered in the user's timezone. Money is stored as integer minor units plus ISO currency.

## 2. Module map

| Module | Owns | Depends on |
| --- | --- | --- |
| Identity | authentication, sessions, users | audit |
| Access | roles, capabilities, memberships | identity, audit |
| CRM | companies, contacts, notes, tags, activity | access, files, audit |
| Lead Radar | sources, raw records, normalization, scoring, review | CRM, dedupe, jobs |
| Dedupe | match candidates, merge plans, suppression checks | CRM, audit |
| Pipeline | opportunities, stages, next-action policy | CRM, tasks |
| Tasks & Calendar | tasks, calls, meetings | CRM, pipeline |
| Communication | accounts, threads, messages, composer, inbox | CRM, jobs, files |
| Automation | triggers, conditions, actions, run log | all domains through commands |
| Analytics | event-derived aggregates and exports | activity, pipeline, jobs |
| Thrive AI | conversations, read tools, confirmed command previews | access, domain commands |
| Platform | search, notifications, saved views, import/export, settings | jobs, audit |

## 3. User-role matrix

Capabilities are stored, not hardcoded. Roles below are seed templates; founders can make custom roles.

| Area | Founder | Sales manager | Salesperson | Researcher | Viewer |
| --- | --- | --- | --- | --- | --- |
| Assigned CRM read/write | yes | yes | yes | lead/enrichment | read selected |
| All workspace records | yes | team | shared only | review pool | selected |
| Business communication | all authorised | team | owned/shared | no send | selected read |
| Assign leads / merge | yes | yes | no | propose/merge | no |
| Pipeline and tasks | all | team | owned | read | read |
| Analytics | all | team | personal | limited | selected |
| Automations/sources/scoring | manage | selected | run only | sources review | no |
| Users/roles/security | manage | no system security | no | no | no |
| Export | all | approved | owned only | no personal export | no |
| Audit | all | team events | own events | relevant events | no |

Server capabilities use names such as `company.read.all`, `company.update.owned`, `lead.assign`, `email.send`, `analytics.read.team`, and `settings.security.manage`. Record-level policy additionally checks ownership, team and confidential-note flags.

## 4. Entity relationships

`Workspace` has memberships (`UserRole`) connecting users and roles; roles have permissions through `RolePermission`. Workspace owns all CRM data. A company has contacts, leads, opportunities and activities. A lead preserves one immutable `RawLeadRecord`, can resolve to a company/contact, and produces score reasons. Opportunities have one stage, many contacts, and linked tasks/activities. Activity is the chronological projection linking communication, calls, meetings, tasks and manual events.

Email accounts own threads and messages; matching tables link threads to CRM records. Attachments use polymorphic link rows. Tags use `RecordTag`. Duplicate candidates point to two same-type records and retain evidence and resolution. `AuditLog` is append-only. Suppression records are checked by canonical email, domain and phone hashes before outreach. Automations produce immutable runs. AI conversations produce proposed/confirmed actions, never direct database access.

The full proposed Prisma model is in `prisma/schema.prisma`. Later-phase entities are included early so identifiers and relationship boundaries remain stable; only Phase 1 tables are exposed by the initial UI.

## 5. Page and route structure

Public: `/login`, `/forgot-password`. Authenticated shell: `/dashboard`, `/lead-radar`, `/companies`, `/contacts`, `/opportunities`, `/inbox`, `/tasks`, `/calendar`, `/analytics`, `/automations`, `/team`, `/settings`. Detail routes use UUIDs (`/companies/[id]`) and server-side authorization. `/settings` contains profile, workspace, roles, scoring, sources, mailbox scope, retention, suppression, integrations and audit.

Phase 1 ships the authenticated shell, role-sensitive dashboard, navigation, notification/AI affordances, team/access overview and audit foundation. Subsequent phases replace intentional module availability screens one domain at a time; they are never represented as completed functionality.

## 6. API structure

Browser-first mutations use typed server actions. Integrations and clients use `/api/v1` resources: `/companies`, `/contacts`, `/leads`, `/opportunities`, `/tasks`, `/activities`, `/search`, `/imports`, `/exports`, `/lead-sources`, `/email/accounts`, `/webhooks/{provider}`, `/automations`, `/ai/query` and `/ai/actions/{id}/confirm`.

All endpoints have Zod request/response contracts, cursor pagination, structured errors (`code`, `message`, `fieldErrors`, `requestId`), workspace context, capability checks and audit metadata. Webhooks verify signatures and enqueue idempotent work. Bulk changes cap batch size and report per-item outcomes. SSE at `/api/v1/events` sends notification and job-state changes.

## 7. Background jobs

Jobs live in a durable `Job` table with `type`, JSON payload, status, priority, attempts, `runAt`, lease owner/expiry and unique idempotency key. Workers claim with `FOR UPDATE SKIP LOCKED`. Categories include source collection, normalization, scoring, dedupe, imports, email sync/send, attachment scanning, automation evaluation, analytics rollups, retention and notifications. External calls retry transient errors with jitter; validation/auth errors fail permanently. Each execution has correlated logs and metrics. A scheduler only inserts jobs, so restarts do not lose timers.

## 8. Email-sync architecture

`EmailProvider` adapters implement connect, refresh, listChanges, fetchThread, send, schedule and disconnect. Gmail uses OAuth and history IDs; Microsoft Graph uses OAuth and delta links; generic IMAP uses UIDVALIDITY/UID cursors and SMTP sending. Tokens are envelope-encrypted with a rotated application key. Initial OAuth sync imports only configured company accounts/folders and messages matching known contacts or explicit rules. MIME is parsed in the worker, HTML is sanitised, attachments are scanned and stored privately. Message-ID, provider ID and account form idempotency constraints. Matching ranks exact recipient email, thread links, company domain and open opportunity; ambiguous matches enter review. Sending writes an outbox row transactionally and a worker sends it. Open pixels are opt-in and labelled unreliable.

## 9. Lead-source adapters

Adapters implement `describe()`, `validateConfig()`, `collect(cursor)`, and `normalize(raw)`. Metadata declares collection method, cadence, rate limit, robots/terms notes and whether manual review is required. The collector stores the unmodified payload and provenance before normalization. It never bypasses authentication, CAPTCHA, access controls or paywalls. Phase 5 begins with manual/CSV and one explicitly approved public source. Failures update run state and alert without discarding earlier items.

## 10. Deduplication strategy

Canonicalization produces registrable domain, normalized email, E.164 phone, normalized registration number, URL and accent-folded company name/address. Deterministic identifiers are checked first under workspace-scoped unique constraints. Probabilistic candidates then combine trigram name similarity, city/address, social URL and domain evidence. Scores above a high threshold block creation and require linking/merge; medium scores create a warning; low scores proceed. A merge preview selects field winners, reparents relations in one transaction, preserves an alias/tombstone, never deletes communication, and emits a detailed audit event. Suppression and contact-recency checks run again at send time to prevent race conditions.

## 11. Security model

- Auth.js sessions in secure, HTTP-only, SameSite cookies; password hashes use bcrypt only for local development/bootstrap, with OAuth/SSO preferred later.
- Every request resolves user, active workspace, membership and capability server-side. Repository methods require that context, preventing IDOR and cross-workspace reads.
- Zod allowlists prevent mass assignment; Prisma parameterization prevents SQL injection; React escaping and strict HTML sanitization address XSS.
- CSRF protections use same-site cookies and origin checks for mutations. Rate limits apply per account/IP and more strictly to login, search, exports and AI.
- Secrets remain outside the database where possible; provider tokens use envelope encryption. Logs redact message bodies, credentials and personal data.
- Uploads have size/type allowlists, signature inspection, malware quarantine and authorized signed download URLs.
- Audit rows are append-only to application roles. Destructive workflows are soft-delete/anonymize plus retention policy; audit is retained and minimized.
- Backups are encrypted, restore-tested, access-logged and covered by documented RPO/RTO. Dependency and container scans gate deployment.

## 12. Phased implementation plan

1. Foundation: repository, identity/session seams, workspace, capability RBAC, navigation, founder/sales dashboard, audit service, PostgreSQL, Docker and CI-quality checks.
2. Core CRM: company/contact/lead CRUD, timelines, notes, tasks, full-text search, saved filters, import, deterministic/probabilistic dedupe.
3. Pipeline: stages, opportunity detail, table/Kanban, mandatory next action, conversion events.
4. Communication: provider adapters, scoped sync, matching review, inbox, composer/outbox and attachments.
5. Lead Radar: adapters, raw provenance, normalization, explainable scoring and first approved collector.
6. Automations: constrained triggers/conditions/actions, templates, idempotent execution and emergency disable.
7. Thrive AI: permission-aware read tools, structured mutation previews, confirmations, local/OpenAI-compatible adapters.
8. Voice: push-to-talk, local transcription, displayed command and optional speech output.
9. Analytics/optimization: rollups, funnels, quality dashboards, authorised CSV exports and source attribution.

Each phase requires unit tests for policies/business rules, integration tests for transactions/APIs, Playwright for core workflows, loading/empty/error/forbidden states, audit coverage and a data migration/rollback note.

## 13. MVP definition

The MVP is complete only when a founder and salesperson can authenticate; manually/CSV import a lead with raw provenance; see dedupe evidence and explainable score; review/assign it; inspect prior company outreach; create a logged email/outbox event and follow-up; receive and match a reply through an adapter test account; qualify an opportunity; move it through enforced stages; and see founder activity analytics. It also includes companies, contacts, tasks, notes, saved views, audit, responsive UI and permission tests. AI, voice, advanced collectors and visual automation are explicitly outside MVP.

## 14. Assumptions

- One Thrive Dev workspace at launch, with multi-workspace isolation retained in the schema.
- Internal users use verified work email; Slovak is the initial UI language, with English-ready message keys planned. Demo UI currently uses English.
- EUR is the workspace default; GBP/CZK values retain their currency and analytics never sum currencies without an explicit conversion snapshot.
- VPS/Railway-style persistent worker deployment is the reference; Vercel requires an external worker/scheduler.
- Source collection and mailbox access require a documented founder approval and privacy/terms review per adapter/account.
- PostgreSQL 16 and S3-compatible storage are available in production. Local object storage can be added when attachment work begins.
- The company determines lawful basis, retention windows and employee mailbox policy with qualified Slovak/EU counsel; software enforces the configured policy but is not legal advice.

## 15. Technical risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Email providers diverge and throttle | isolated adapters, delta cursors, backoff, replayable jobs |
| Cross-tenant/overbroad visibility | mandatory workspace context, capability + ownership policies, authorization tests |
| Duplicate false merges | deterministic-first matching, review thresholds, transactional reversible merge plan |
| Scraping terms/privacy violations | source approval registry, adapter metadata, kill switch, raw provenance and retention |
| Search slows as email grows | Postgres FTS/trigram initially, async indexing and retention; external search only when measured |
| Automation loops/double execution | event causation chain, depth limit, idempotency keys and transaction outbox |
| AI performs unsafe actions | no DB access, capability-scoped tools, previews, explicit confirmation and audit |
| Multi-currency analytics misleads | minor units + ISO currency; conversion snapshots and per-currency totals |
| Secrets or private mail leak | scoped sync, encryption, redaction, private files, least privilege and access audit |
| Modular monolith erodes | enforced domain imports, application services and architecture tests before scale forces extraction |

## 16. First workflow acceptance trace

The 20-step core workflow crosses Lead Radar (`RawLeadRecord -> Lead`), Dedupe, Scoring, Review/Assignment, dashboard, company activity, Communication/outbox, Tasks, reply matching, Pipeline and Analytics. A shared correlation ID follows ingestion through every job and audit event. Phase 2–5 implementation order will keep this workflow executable end-to-end behind adapter test doubles before any advanced module is started.

## 17. Company-wide operating system extension

Thrive OS is the operational system of record for Thrive Dev, not only a deal tracker. Sales CRM remains the shared identity and relationship layer; the following bounded modules extend it without turning the application into generic ERP software:

- Client delivery: projects, milestones, requirements, change requests, risks, handover and project health.
- Service desk: client requests, incidents, priorities, SLA targets and communication linked to company/project.
- Commercial documents: estimates, proposals, statements of work, contracts, renewals and approval status.
- Finance operations: invoices, payment state, recurring revenue, project costs, margin and cash-flow forecast; accounting remains an integration rather than duplicated bookkeeping.
- Team operations: employees/contractors, skills, availability, project allocation, time entries, leave visibility and capacity forecast. Sensitive HR records remain outside the CRM unless strictly necessary.
- Knowledge and files: templates, technical decisions, meeting outputs, reusable delivery checklists and controlled client files.
- Management: company health, sales-to-delivery conversion, utilization, profitability, outstanding invoices, delivery risk and client concentration.

The common `Company`, `Contact`, `User`, `Activity`, `Task`, `Attachment`, `AuditLog` and permission models prevent duplicate silos. Financial and HR capabilities are separate and founder-restricted by default. Payroll, statutory accounting, source code hosting and password storage are explicitly integrated systems—not rebuilt inside Thrive OS.
