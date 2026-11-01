# Athlete & Coach Management Platform

A platform for sports academies to manage athletes, coaches, teams, training sessions, attendance and performance records. Many academies share one installation, and each academy only ever sees its own data.

This README follows the structure of the case study. It explains how to run the project, then goes through each requirement: **what we built** and **why we chose that approach**. The full reasoning, with diagrams and costs, is in the **[technical proposal](docs/technical-proposal.md)**.

**Contents**

1. [Setup](#1-setup)
2. [Business requirements: what we built and why](#2-business-requirements-what-we-built-and-why)
3. [Initial assumptions and how they shape the design](#3-initial-assumptions-and-how-they-shape-the-design)
4. [Assignment A–E: our answers](#4-assignment-ae-our-answers)
5. [Technical discussion scenarios](#5-technical-discussion-scenarios)
6. [Deliverables checklist](#6-deliverables-checklist)
7. [Repository layout](#7-repository-layout)
8. [CI/CD and tests](#8-cicd-and-tests)

---

## 1. Setup

### Prerequisites

- **Docker** with Compose v2. Everything runs in containers.
- **Node.js 22+**, only if you want to run a project outside Docker with hot reload. See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

### Start

From the project folder:

```bash
./start.sh     # start database, API and web app (first run builds the images, a few minutes)
./stop.sh      # stop everything (data is kept)
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:5000 |
| API | http://localhost:5001/api |
| API docs (Swagger, 47 endpoints) | http://localhost:5001/docs |
| PostgreSQL | `localhost:5433`, database `acm` |

**Two ways to try it**

- **Create your own academy:** on the sign-in page click **Create an account**. You become the academy's administrator and land on a dashboard with a setup checklist:
  1. create teams;
  2. add coaches and athletes;
  3. put them on teams;
  4. schedule training;
  5. invite coaches.
- **Explore the demo academies**, which are loaded automatically on first start:

| Academy | Role | Email | Password |
| --- | --- | --- | --- |
| Desert Falcons Academy | Admin | `admin@falcons.test` | `ChangeMe123!` |
| Desert Falcons Academy | Coach | `coach@falcons.test` | `ChangeMe123!` |
| Desert Falcons Academy | Athlete | `athlete@falcons.test` | `ChangeMe123!` |
| Gulf Stars Academy | Admin | `admin@gulfstars.test` | `ChangeMe123!` |
| Gulf Stars Academy | Coach | `coach@gulfstars.test` | `ChangeMe123!` |
| Gulf Stars Academy | Athlete | `athlete@gulfstars.test` | `ChangeMe123!` |

Sign in to both academies to see that neither can see the other's data.

**Database logins** (local development values from `backend/.env.example`):

| User | Password | Used for |
| --- | --- | --- |
| `acm_owner` | `change-me-owner` | Owner: migrations, seeds, database tools |
| `acm_app` | `change-me-app` | The API's restricted user (row-level security always applies) |

Example: `psql -h localhost -p 5433 -U acm_owner acm`.

### Manual steps (what `start.sh` does)

Start the backend first. It creates the Docker network the frontend joins.

```bash
cd backend
cp .env.example .env                          # values work as-is locally
docker compose up -d --build                  # postgres → migrations → api
docker compose --profile seed run --rm seed   # demo data

cd ../frontend
cp .env.example .env
docker compose up -d --build                  # web app
```

Every setting is listed with a comment in `backend/.env.example` and `frontend/.env.example`. Change all passwords and `JWT_SECRET` outside your own machine.

To **reset** the database: `./stop.sh`, then `cd backend && docker compose down -v`, then `./start.sh`.

### Troubleshooting

| Problem | Fix |
| --- | --- |
| `network acm-network declared as external, but could not be found` | Start the backend before the frontend. |
| Port 5000, 5001 or 5433 already in use | Change `WEB_PORT` in `frontend/.env`, or `PORT` / `DB_PORT` in `backend/.env`. |
| "Too many attempts" at sign-in | Sign-in is limited to 5 attempts per minute. Wait a minute. |
| The web page doesn't load right after `./start.sh` | Give the web app a few seconds to start, then refresh. |

---

## 2. Business requirements: what we built and why

### 2.1 Multiple sports academies, with appropriate separation of their data

**What we built**
- **One database shared by all academies.** Every academy-owned row carries an `academy_id`.
- **Separation is enforced in three independent layers:**
  1. **Token:** the academy comes only from the signed-in user's token, and the user's access is re-checked on every request. A request that sends its own `academyId` is rejected.
  2. **Database row-level security:** PostgreSQL itself filters every query to the current academy. The API connects with a database user that **cannot switch this off**. With no academy set, it sees zero rows.
  3. **Academy-scoped foreign keys:** links between records include the academy, so a team in one academy can never contain an athlete from another, even through direct SQL.
- **Onboarding:** academies **sign up themselves** (the person signing up becomes the admin), or a platform operator creates them.

**Why this approach**
- **Isolation lives in the database, not only in code.** A forgotten filter, a custom report query or a bug cannot leak data between academies.
- **Why not a database or schema per academy?** At this scale (dozens of academies) that multiplies migrations, backups, connection pools and cost.
- **There is an exit route:** a very large academy could later move to its own database, because every row is already keyed by academy.

*Proof:* end-to-end tests try cross-academy reads, writes and links, and all are refused. Details: [proposal §4.2](docs/technical-proposal.md#42-keeping-academies-apart-three-independent-layers).

### 2.2 Management of athletes, coaches, teams and assignments

**What we built**
- Create, edit, search and archive athletes, coaches and teams.
- Add athletes and coaches (head or assistant) to teams from a date.
- Transfer athletes between teams, and end assignments.
- Give coaches and athletes **logins linked to their profiles**.
- All of this is available as REST endpoints and as screens in the web app.

**Why this approach**
- **Profiles exist without logins.** Most young athletes never sign in, so a person can be managed before (or without) having an account.
- **Assignments are records with dates, not a "team" field on the athlete.** This is what makes history and multi-team membership possible (see 2.5).
- **Nothing is hard-deleted.** Records are archived with a status, so history and reports stay complete.

### 2.3 Scheduling and managing training sessions

**What we built**
- Schedule single sessions or a **weekly series** (for example every Monday and Wednesday at 17:30 until June).
- Edit, complete, cancel or reopen sessions.
- Filter by team, date range and status. Coaches get a "my teams" view.

**Why this approach**
- **The database rejects double-booking** of a team (overlapping sessions), so two coaches scheduling at once cannot create a clash.
- **A recurring series is all-or-nothing:** if one date clashes, none are created, so there are no half-created schedules.
- **Times are entered in the academy's local time.** Each academy has a timezone (default Asia/Dubai), so "which day was this session" is always correct.

### 2.4 Recording attendance and athlete performance assessments

**What we built**
- A one-click **attendance sheet** per session.
- Attendance history per athlete, and an **attendance-rate report** per team.
- **Assessments** with an overall score, sport-specific measurements and notes.
- Corrections that keep the original.

**Why this approach**
- **Resubmitting attendance is safe.** It updates rather than duplicates, so two coaches or a retry never create double records.
- **Attendance is only accepted for athletes who were on the team on the session date.**
- **Measurements are flexible.** Different sports measure different things (sprint time, shooting percentage), so they are stored as flexible key/value data, alongside a common score column for reporting.
- **Assessments are never edited.** A correction is a new record pointing to the original, so a disputed score always has a full trail.

### 2.5 Maintaining historical records when athletes or coaches change teams

**What we built**
- Every team membership has a **start and end date**.
- **A transfer closes the old membership and opens the new one in a single step**, with no gap and no overlap.
- You can view **any team's roster on any past date**, plus full history per athlete, coach and team.
- An **audit log** records who changed what, when, with the values before and after.

**Why this approach**
- **History is the data itself**, not a side table that can drift out of sync.
- **The database guarantees integrity:**
  - overlapping memberships are rejected;
  - a closed membership cannot be edited;
  - the API has no permission to delete history or to write to the audit log.
- **Why not event sourcing?** It adds projections and replay tooling. Dated records plus an audit log meet the requirement with plain SQL.

Details: [proposal §4.4](docs/technical-proposal.md#44-historical-records).

### 2.6 Secure access to information based on user roles and responsibilities

**What we built**

| Role | Can do |
| --- | --- |
| **Academy admin** | Everything in their academy: people, teams, sessions, users and roles, settings, audit log |
| **Coach** | View the academy. Create sessions, take attendance and record assessments **only for the teams they are currently assigned to** |
| **Athlete** | See **only their own** profile, team history, attendance and assessments |

- Logins can be created, re-roled or removed by admins. **Removing access takes effect immediately**, not when the token expires.
- Passwords are hashed with bcrypt. Sign-in is rate-limited. The token is kept in an httpOnly cookie that browser JavaScript can't read.

**Why this approach**
- **Responsibility, not just role:** a coach's permission depends on their current team assignments, so it changes automatically when they move teams.
- **One place for the rule:** the team-based check lives in a single place (`TeamAccessService`) that every module asks.

---

## 3. Initial assumptions and how they shape the design

| Assumption in the brief | Impact on the design |
| --- | --- |
| ~5,000 athletes, 300 coaches | Small data volumes (about 0.8 M attendance rows a year), comfortable for one PostgreSQL database for years |
| 100–200 concurrent users | About 20–50 requests per second at peak, so two small API containers are enough |
| 5–10× growth | Up to about 500 req/s: add API containers, a connection pooler and a read replica. **No re-architecture** |
| Small development team | Fewest moving parts: one language (TypeScript), one deployable API, managed database and containers, no Kubernetes or microservices |
| Cloud hosting in the UAE | AWS **me-central-1 (UAE)** for all data, backups and logs: data residency under the UAE data protection law, which matters because the data includes minors |

**Assumptions we added**

- **Academies sign up themselves.** Sign-up only accepts a new email, so it can never return a session for someone else's account. It can be turned off (`ALLOW_ACADEMY_SIGNUP=false`) so that only the platform operator onboards academies.
- **One person may belong to several academies**, for example a coach at two academies. They choose an academy at sign-in.
- **Targets:**
  - **99.9% availability**;
  - **maximum 5 minutes of data loss** (RPO);
  - **recovery within 1 hour** (RTO) for a database failure;
  - multi-region active-active is not justified for this domain.
- **History must be trustworthy:** records are corrected by adding, never by overwriting.

---

## 4. Assignment A–E: our answers

### A. Technology selection

| Choice | Why (alternatives in brackets) |
| --- | --- |
| **TypeScript** everywhere | One language for a small team, front to back. (Java/Spring and .NET were equally valid but add a second ecosystem.) |
| **NestJS 12** API | Its modules, guards and interceptors map directly onto a modular monolith and cross-cutting rules such as login and academy separation. (Plain Express would mean hand-building that structure.) |
| **PostgreSQL 17** | Relational data with strict integrity. Uniquely gives **row-level security** and **constraints that forbid overlapping date ranges**. (MySQL lacks both; MongoDB would push integrity into code.) |
| **TypeORM** | Fits NestJS. Hand-written migrations let us add security policies, triggers and constraints. (Prisma has stronger typing; we offset that with validation and tests.) |
| **Next.js 16** web app | Server-side data fetching keeps the login token out of the browser. The brief weights backend over UI, so the web app stays thin. |
| **Docker, AWS ECS Fargate, RDS** | The same containers run locally, in CI and in production, with no servers or clusters to manage. (Kubernetes is too much to operate for a small team.) |

**Deliberately not used yet:** Redis, a message broker, microservices, Kubernetes and Elasticsearch. Each one is listed in the proposal with the condition that would justify adding it. → [proposal §2](docs/technical-proposal.md#2-technology-selection-a)

### B. Architecture design

- **Modular monolith:** one API and one database, split into domain modules:
  - identity;
  - academies;
  - athletes;
  - coaches;
  - teams;
  - training;
  - performance;
  - audit;
  - platform.
- **Each module owns its tables** and exposes services; other modules never read its tables directly.
- **Each request:** rate limit, then token and access check, then role check, then **one database transaction tagged with the academy**, then the module's business logic.
- **Why:** cross-module operations (such as a transfer) need one transaction; a small team can understand the whole system; and the module boundaries mark where a service could be split out later.
- **Limitations (stated in the proposal):**
  - shared fate (a fault in one module affects all of them);
  - no per-module scaling;
  - boundaries depend on code review;
  - the per-request transaction holds a database connection for the length of the request.

→ [proposal §3](docs/technical-proposal.md#3-architecture-b), with architecture and request-flow diagrams.

### C. Data and backend design

| Concern | Our approach |
| --- | --- |
| **Data model** | Academies, users and memberships, athletes, coaches, teams, dated team assignments, sessions, attendance, assessments, audit log. See the [ERD](docs/technical-proposal.md#41-core-data-model). |
| **Data integrity** | Database constraints: no overlapping memberships, no double-booked teams, one attendance record per athlete per session, score range checks, academy-scoped foreign keys. |
| **Historical records** | Dated assignments that can only be closed, never rewritten; append-only assessments; a trigger-written audit log. |
| **Concurrent updates** | Editable records carry a **version number**. If two people edit at once, the second gets **409 Conflict** instead of silently overwriting. Attendance submissions are repeat-safe, transfers lock the athlete, and constraints catch the remaining races. |
| **Access between academies** | The three layers in 2.1: token, row-level security, academy-scoped foreign keys. |
| **APIs** | 47 REST endpoints, all documented in Swagger: request fields, responses and errors. Lists are paginated. Errors share one format. |

→ [proposal §4](docs/technical-proposal.md#4-data-and-backend-design-c)

### D. Scalability and reliability

- **Scaling:** the API is stateless, so add containers. Then, in order: a connection pooler (RDS Proxy), a larger database, a read replica for reports, and partitioning of the large history tables.
- **If the database becomes the bottleneck**, cheapest first:
  1. fix slow queries and indexes;
  2. pool connections;
  3. scale up;
  4. move reads to a replica;
  5. cache hot reads;
  6. partition;
  7. last resort: move a large academy to its own database.
- **Main risks and mitigations:**

| Risk | Mitigation |
| --- | --- |
| Data leaking between academies | Three-layer isolation plus tests |
| A database change breaking production | CI tests rolling every change back, a snapshot before each deploy, expand/contract changes |
| Account takeover | bcrypt, rate limiting, instant revocation; MFA planned |
| Timezone mistakes | All times stored as UTC instants; each academy has a timezone |
| Small team | Managed services, one-command setup, documentation |

→ [proposal §5](docs/technical-proposal.md#5-scalability-and-reliability-d)

### E. Deployment strategy

- **Hosting:** AWS **me-central-1 (UAE)**:
  - containers on ECS Fargate across 2 availability zones;
  - PostgreSQL on RDS Multi-AZ;
  - a load balancer with TLS and a firewall (WAF);
  - Secrets Manager;
  - encrypted backups.
- **Environments:** local (`./start.sh`), CI, staging (a smaller copy of production) and production, all from the same container images.
- **Security:**
  - only the load balancer is public;
  - the database is private and encrypted;
  - secrets are never in code;
  - the API's database user can't bypass academy separation or delete records.
- **CI/CD:**
  1. tests on every change;
  2. images built once and published;
  3. deploy = snapshot → migrate → rolling update with automatic rollback;
  4. manual approval before production.
- **Backups and recovery:** point-in-time restore (at most 5 minutes of data loss); automatic database failover (about 2 minutes); monthly restore drills.
- **Indicative cost: about USD 465 per month** for production plus staging (±25%, based on public pricing). At 10× load, about $700–900 per month.

→ [proposal §6](docs/technical-proposal.md#6-deployment-strategy-e), with the deployment diagram and cost breakdown.

---

## 5. Technical discussion scenarios

| Scenario | Our answer (full version in [proposal §7](docs/technical-proposal.md#7-discussion-scenarios)) |
| --- | --- |
| **Budget cut by 40%** | Run staging only in working hours, drop NAT gateways, use a single-AZ database (backups unchanged) and fewer containers. We accept slower recovery from rare failures; we never cut academy separation or backups. |
| **Must run on a single server** | Already supported: this repository's Docker setup *is* the single-server deployment. Add TLS (Caddy) and continuous backups to S3. Moving to the full cloud setup later needs no code changes. |
| **Athletes grow to 50,000** | Still modest for PostgreSQL. Partition the history tables, archive old audit data, add a read replica and more API containers. No architecture change. |
| **Two users update the same record** | Implemented and tested: the second save gets **409 Conflict** and the user reloads. Attendance submissions merge safely. Bookings and transfers are protected by the database. |
| **A deployment fails after a schema change** | Each migration runs in its own transaction (a failure rolls back and the old version keeps running). Expand/contract changes keep the previous app version compatible. Automatic rollback of the app. CI proves every migration can be reverted. Point-in-time restore is the last resort. |
| **A technology adds complexity without clear benefit** | Ask what measured problem it solves and what it costs to run. Kubernetes, microservices, Kafka and GraphQL fail that test here. Adopt something only when a metric or requirement demands it, and record the decision. |

---

## 6. Deliverables checklist

| Deliverable | Where |
| --- | --- |
| Technology stack and reasoning | [4A above](#a-technology-selection) and [proposal §2](docs/technical-proposal.md#2-technology-selection-a) |
| Architecture diagram | [Proposal §3.1](docs/technical-proposal.md#31-components) and the request-flow diagram in [§3.3](docs/technical-proposal.md#33-request-lifecycle-and-tenant-isolation) |
| Data model / ERD | [Proposal §4.1](docs/technical-proposal.md#41-core-data-model) |
| Deployment diagram | [Proposal §6.2](docs/technical-proposal.md#62-production-infrastructure) |
| Other diagrams | CI/CD pipeline ([§6.5](docs/technical-proposal.md#65-cicd)), team history timeline ([§4.4](docs/technical-proposal.md#44-historical-records)) |
| Decision summary (top 5) | [Proposal §8](docs/technical-proposal.md#8-decision-summary-the-five-most-important-decisions) |
| Source code, configuration, README, docs | This repository: [backend/](backend/README.md), [frontend/](frontend/README.md), [docs/](docs/technical-proposal.md) |

**The five key decisions, in one line each:**
1. A modular monolith, not microservices.
2. A shared database with row-level security, not a database per academy.
3. Dated assignments and append-only records for history.
4. Version numbers for concurrent edits, with the database as final referee.
5. Managed containers in the UAE AWS region.

---

## 7. Repository layout

```
athlete-coach-management/
├── backend/        NestJS API: modules, migrations (schema + security rules), tests, Docker
├── frontend/       Next.js web app: every screen for admins, coaches and athletes, Docker
├── docs/           technical proposal: diagrams, decisions, costs, scenarios
├── start.sh        start everything in Docker
├── stop.sh         stop everything
└── .github/        CI and release workflows
```

```
Browser ──► frontend :5000 ──► backend :5001 ──► PostgreSQL :5433
```

- The browser only talks to the frontend.
- The frontend calls the API from the server, using the signed-in user's token.
- Only the backend touches the database.

---

## 8. CI/CD and tests

- **CI** ([ci.yml](.github/workflows/ci.yml)), on every push and pull request:
  - **backend:** lint, typecheck, unit tests and build; then migrations applied, **rolled back** and re-applied; then end-to-end tests against a real PostgreSQL;
  - **frontend:** lint, typecheck and build;
  - both Docker images built.
- **Release** ([release.yml](.github/workflows/release.yml)), on merge to `main` or a `v*` tag: builds both images once and publishes them tagged with the commit (and the version).
- **Deploy to AWS:** designed in the [proposal §6.5](docs/technical-proposal.md#65-cicd). It needs an AWS account and Terraform, so it isn't automated in this repository yet.
- **Tests** prove the key claims, across **17 end-to-end scenarios**:
  - academy isolation;
  - roles;
  - concurrent edits returning 409;
  - append-only history;
  - sign-up;
  - recurring sessions;
  - attendance reports;
  - the audit log.

Run them with `cd backend && npm run test:e2e` (the database must be running).
