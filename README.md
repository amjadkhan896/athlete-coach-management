# Pace | Athlete & Coach Management

A Next.js and PostgreSQL starter for the Athlete & Coach Management Platform case study. The repository includes an interactive dashboard prototype, tenant-aware APIs, a relational data model, and a technical proposal.

## Capacity Baseline

The initial design target is approximately **5,000 athletes**, **300 coaches**, and **100–200 concurrent users**. The architecture should support 5–10× growth; the proposal describes the 50,000-athlete scenario and scaling path. These are planning assumptions, not live dashboard counts.

## Stack

- Next.js App Router and TypeScript for the web app and REST API.
- PostgreSQL for relational data, constraints, historical assignments, and row-level security.
- Prisma for the typed data model and migration workflow; custom SQL migrations add PostgreSQL RLS and partial indexes.
- Zod for request validation and signed, HTTP-only session cookies for the initial authentication boundary.

## Local Setup

Requirements: Node.js 20.9 or newer, npm, and Docker Compose or a local PostgreSQL 16+ instance.

```powershell
Copy-Item .env.example .env
```

Set a private `SESSION_SECRET` with at least 32 characters and a private `DEMO_ADMIN_PASSWORD` with at least 12 characters in `.env`. Do not commit `.env`.

Start PostgreSQL if Docker is available:

```powershell
docker compose up -d db
```

Then install, migrate, seed, and run the web app:

```powershell
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open `http://localhost:3000`. If PostgreSQL is already running locally, use the `DATABASE_URL` in `.env.example` or adjust it to match your local credentials.

The dashboard currently uses clearly marked in-memory sample records. Create forms update the current browser view only. Sign-in is available at `/login`; after database setup and seeding, use the `DEMO_ADMIN_EMAIL` and `DEMO_ADMIN_PASSWORD` values from `.env`. The authenticated API and PostgreSQL schema are implemented separately and can be exercised with a session obtained from `POST /api/auth/login`.

## API Overview

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/session`
- `GET /api/athletes`, `POST /api/athletes`, `PATCH /api/athletes/:id`
- `POST /api/athletes/:id/teams` to append an effective-dated team assignment
- `GET /api/coaches`, `POST /api/coaches`, `POST/PATCH /api/coaches/:id/teams`
- `GET /api/teams`, `POST /api/teams`
- `GET /api/sessions`, `POST /api/sessions`, `PATCH /api/sessions/:id`
- `POST /api/attendance` (idempotent per session and athlete)
- `GET /api/performance`, `POST /api/performance`

All business API routes require a valid session and academy membership. Academy IDs come from the verified session, never from request bodies. PostgreSQL RLS requires API queries to run inside the `withAcademyContext` transaction helper.

## Modular Monolith

The app is one deployable Next.js application and one PostgreSQL database. HTTP route handlers under `src/app/api` handle request parsing, authentication/authorization, and HTTP response mapping. Domain rules, validation schemas, and tenant-scoped persistence live in `src/modules`:

- `identity`: credential verification and active academy membership lookup.
- `athletes`: athlete records and effective-dated athlete/team assignments.
- `coaches`: coach profiles and coach/team assignments.
- `teams`: team lifecycle and academy-scoped team queries.
- `training`: sessions, coach access checks, and attendance.
- `performance`: athlete assessment history and coach authorization.

Modules can depend on shared infrastructure in `src/lib` (session, API, and database helpers), but should not import route handlers or depend on another domain module's internals. Keep cross-domain workflows explicit in an application use case rather than introducing service-to-service HTTP calls. This preserves a single deployable while making future extraction possible if a domain needs independent ownership or scaling.

## Checks

```powershell
npm run lint
npx tsc --noEmit
npm run build
```

See [the technical proposal](docs/technical-proposal.md) for the architecture diagrams, data model, deployment, cost assumptions, and decision trade-offs.

## Production Notes

The repository is a case-study MVP, not a production-ready service. Before handling real athlete data, add a browser login flow, verified email and password reset, rate limiting, audit events, automated authorization/integration tests, monitoring and alerting, and a documented tested restore procedure. Apply the migrations with a non-superuser database role; roles with `BYPASSRLS` can bypass tenant policies.