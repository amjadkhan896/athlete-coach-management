# Backend: NestJS API

REST API for the Athlete & Coach Management Platform. It uses NestJS 12, TypeORM 1.x and PostgreSQL 17.

## Setup

```bash
cp .env.example .env      # set JWT_SECRET to a random string of 32+ characters
```

The same `.env` file is used by Docker and by `npm run start:dev`.

### Environment variables

| Variable | Default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | `development` | `production` turns off Swagger and blocks the seed script |
| `PORT` | `5001` | API port |
| `CORS_ORIGIN` | `http://localhost:5000` | Allowed browser origins, comma-separated |
| `DB_HOST` / `DB_PORT` | `localhost` / `5433` | Database address as seen from your machine. Docker overrides these for its containers. |
| `DB_NAME` | `acm` | Database name |
| `DB_USER` / `DB_PASSWORD` | `acm_app` | Restricted user the API connects as |
| `DB_MIGRATION_USER` / `DB_MIGRATION_PASSWORD` | `acm_owner` | Owner user for migrations and seeds |
| `DB_POOL_MAX` | `20` | Maximum database connections |
| `DB_SSL` | `false` | Use TLS to the database (set `true` in production) |
| `JWT_SECRET` | — | Signing key for login tokens, at least 32 characters (required) |
| `JWT_EXPIRES_IN` | `1h` | Token lifetime |
| `LOGIN_RATE_LIMIT` | `5` | Sign-in and password-change attempts per minute per client |
| `ALLOW_ACADEMY_SIGNUP` | `true` | Whether anyone can create an academy with `POST /api/auth/register`. `false` leaves onboarding to the platform operator only. |
| `PLATFORM_ADMIN_KEY` | empty | Secret for the platform onboarding endpoints (32+ characters). Empty disables them. |
| `SEED_PASSWORD` | `ChangeMe123!` | Password for the demo accounts |

## Run with Docker

Requirements: Docker with Compose v2.

```bash
docker compose up -d --build                   # postgres, then migrations, then api
docker compose --profile seed run --rm seed    # optional demo data
```

- API: http://localhost:5001/api
- Swagger docs: http://localhost:5001/docs
- PostgreSQL: `localhost:5433`

The stack runs four services:

| Service | Role |
| --- | --- |
| `postgres` | Database. On first start, `docker/postgres-init/` creates the restricted API user. |
| `migrate` | Applies pending migrations, then exits. The API waits for it to finish. |
| `api` | The NestJS server |
| `seed` | Optional demo data. Runs only with `--profile seed`. |

It also creates the Docker network `acm-network`, which the frontend joins.

## Run on your machine (hot reload)

Requirements: Node.js 22+. Docker is still used for the database.

```bash
docker compose up -d postgres    # database only
npm install
npm run migration:run            # create tables
npm run seed                     # optional demo data
npm run start:dev                # http://localhost:5001
```

## Demo accounts

Created by `npm run seed` (or the Docker `seed` service). Every account uses the password in `SEED_PASSWORD`, which defaults to `ChangeMe123!`.

| Academy | Role | Email | Password |
| --- | --- | --- | --- |
| Desert Falcons Academy | Admin | `admin@falcons.test` | `ChangeMe123!` |
| Desert Falcons Academy | Coach | `coach@falcons.test` | `ChangeMe123!` |
| Desert Falcons Academy | Athlete | `athlete@falcons.test` | `ChangeMe123!` |
| Gulf Stars Academy | Admin | `admin@gulfstars.test` | `ChangeMe123!` |
| Gulf Stars Academy | Coach | `coach@gulfstars.test` | `ChangeMe123!` |
| Gulf Stars Academy | Athlete | `athlete@gulfstars.test` | `ChangeMe123!` |

### Database login

| User | Password | Used for |
| --- | --- | --- |
| `acm_owner` | `change-me-owner` | Admin user: migrations, seeds, database tools |
| `acm_app` | `change-me-app` | The API's restricted user (row-level security applies) |

Connect with any PostgreSQL client at `localhost:5433`, database `acm`. For example: `psql -h localhost -p 5433 -U acm_owner acm`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run start:dev` | Start with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run the compiled app |
| `npm run migration:run` | Apply pending migrations (from source) |
| `npm run migration:revert` | Undo the most recent migration |
| `npm run migration:run:prod` | Apply migrations from compiled `dist/` (used in containers) |
| `npm run seed` / `npm run seed:prod` | Load demo data from source / from `dist/`. Refuses when `NODE_ENV=production`. |
| `npm test` | Unit tests |
| `npm run test:e2e` | End-to-end tests against the database (run migrations and the seed first) |
| `npm run lint` / `npm run typecheck` | Static checks |

## Folder structure

```
docker-compose.yml        postgres, migrate, api, seed
Dockerfile                production image
.env.example              settings template
docker/postgres-init/     creates the restricted database user on first start
src/
  main.ts                 starts the server
  app.module.ts           wires all modules together
  config/                 reads and validates environment variables
  database/
    migrations/           SQL for tables, security rules and permissions
    seeds/                demo data
  common/                 shared plumbing, no business rules
    auth/                 token check, role check
    tenancy/              keeps every request inside the user's academy
    persistence/          base entity classes, safe-update helper
    http/                 error mapping, pagination, health checks
  modules/                one folder per business area
    identity/             sign-in, password change, user logins and roles
    academies/            the academy itself
    athletes/             athlete profiles
    coaches/              coach profiles
    teams/                teams and who is on which team when
    training/             training sessions and attendance
    performance/          performance assessments
    audit/                change history (read-only)
    platform/             onboarding new academies
test/                     end-to-end tests
```

Each module follows the same pattern:

```
athletes/
  athlete.entity.ts       database table mapping
  dto/                    request shapes and validation rules
  athletes.service.ts     business logic
  athletes.controller.ts  HTTP routes and required roles
  athletes.module.ts      what the module provides and exports
```

### Why a modular monolith

The API ships as one app with one database, which keeps it simple to run for a small team. Modules still have clear boundaries:

- A module uses another module only through what that module exports. It never reads another module's tables directly.
- For example, `training` and `performance` both ask `TeamAccessService` (exported by `teams`) whether a coach may act on a team. That rule lives in one place.
- If a module ever needs to scale on its own, it can be split into a separate service along these existing lines.

## Key design decisions

**Keeping academies apart**
- Every academy-owned table has an `academy_id` column.
- Each request runs in one database transaction tagged with the signed-in user's academy.
- PostgreSQL row-level security hides every row from other academies, even if a query forgets a `WHERE` clause.
- The API connects as a restricted database user that cannot switch this off. Without an academy set, it sees no rows at all.
- Foreign keys include `academy_id`, so a team can never contain another academy's athlete.
- The academy always comes from the login token. A request body that includes `academyId` is rejected.

**Roles**
- Every request checks the token and re-reads the user's membership, so removing access takes effect immediately.
- **Admins** can do everything in their academy.
- **Coaches** can view athletes, teams and sessions. They can only create sessions, record attendance and write assessments for teams they are currently assigned to.
- **Athletes** can only see their own assessments.

**History**
- Team assignments have `valid_from` and `valid_to` dates.
- A transfer closes the old assignment and opens the new one in a single step, so there is no gap and no overlap.
- The database rejects overlapping assignments and blocks edits to closed ones.
- Assessments are never edited or deleted. A correction is saved as a new record that points to the old one.

**Two people editing at once**
- Editable records carry a `version` number, and an update must send the version it read.
- If someone else saved first, the API returns `409 Conflict` with the current version, instead of silently overwriting their change.
- Attendance submissions can be repeated safely; submitting twice does not create duplicates.

**Scheduling**
- The database rejects a session that overlaps another session for the same team.
- Attendance is accepted only for athletes on the session's team on that date, in the academy's timezone.

**Audit log**
- Every insert and update on academy data is recorded by a database trigger: who, when, and the values before and after.
- The API can read the log but has no permission to write or change it, so entries cannot be forged.

**Onboarding academies**
- **Self-service:** anyone can sign up a new academy with `POST /api/auth/register`, and becomes its administrator.
  - The email must be new. Sign-up never attaches to an existing account, because it returns a session and reusing an account would hand out someone else's session.
  - It can be turned off with `ALLOW_ACADEMY_SIGNUP=false`.
- **Operator:** a platform operator can also create an academy and its first admin with `POST /api/platform/academies`, protected by `PLATFORM_ADMIN_KEY`.
- Either way, the admin then creates teams, coaches, athletes and logins inside their own academy.

**Errors**
- Database rule violations are returned as clear client errors: `409` for duplicates or overlaps, `422` for invalid references. They never surface as a generic `500`.

## API

All routes are under `/api`. Every route except login, platform and health needs an `Authorization: Bearer <token>` header. Get a token from `POST /api/auth/login` with `{ "email", "password" }`.

Full request and response details are in Swagger at http://localhost:5001/docs (not available when `NODE_ENV=production`). It documents every endpoint:

- a summary and description;
- the request body, with each field's type, format and limits;
- query and path parameters;
- the success response schema;
- the error responses it can return (400, 401, 403, 404, 409, 422, 429).

Sign in with `POST /api/auth/login`, click **Authorize**, and paste the `accessToken` to try endpoints from the browser. The token is remembered across page reloads.

The schemas are generated at build time by the `@nestjs/swagger` compiler plugin (see `nest-cli.json`) from the DTO classes and their validation rules. Endpoint summaries come from each controller method's doc comment.

| Area | Route | Who can use it |
| --- | --- | --- |
| **Auth** | `POST /auth/register`: sign up a new academy; the caller becomes its admin and is signed in (rate-limited) | anyone |
| | `POST /auth/login` (rate-limited) | anyone |
| | `GET /auth/me`: user, role and linked coach/athlete profile | any signed-in user |
| | `POST /auth/change-password` (rate-limited) | any signed-in user |
| **Academy** | `GET /academy` | any signed-in user |
| | `PATCH /academy`: name, timezone | admin |
| **Users** | `GET /users`, `POST /users` (create a login, optionally linked to a coach or athlete), `PATCH /users/:userId` (role, activate/deactivate) | admin |
| **Athletes** | `GET /athletes` (search, status, team filters) | admin, coach |
| | `GET /athletes/:id`, `GET /athletes/:id/team-history` | admin, coach, the athlete themselves |
| | `POST /athletes`, `PATCH /athletes/:id` | admin |
| | `POST /athletes/:id/transfer` | admin |
| **Coaches** | `GET /coaches` (search, status), `GET /coaches/:id`, `GET /coaches/:id/team-history` | admin, coach |
| | `POST /coaches`, `PATCH /coaches/:id` | admin |
| **Teams** | `GET /teams`, `GET /teams/:id` | admin, coach |
| | `GET /teams/:id/roster?date=`: who was on the team on any date | admin, coach |
| | `GET /teams/:id/history`: every athlete and coach assignment ever | admin, coach |
| | `POST /teams`, `PATCH /teams/:id`, `POST /teams/:id/athletes`, `POST /teams/:id/coaches` | admin |
| **Assignments** | `POST /athlete-assignments/:id/end`, `POST /coach-assignments/:id/end` | admin |
| **Sessions** | `GET /sessions` (team, date range, status, `mine=true` for a coach's teams), `GET /sessions/:id` | admin, coach |
| | `POST /sessions`, `PATCH /sessions/:id` (edit, complete, cancel) | admin, assigned coach |
| | `POST /sessions/recurring`: weekly series, created all-or-nothing | admin, assigned coach |
| **Attendance** | `GET /sessions/:id/attendance`, `PUT /sessions/:id/attendance` (bulk, repeat-safe) | admin, assigned coach (write) |
| | `GET /attendance?athleteId=`: one athlete's history | admin, coach, the athlete themselves |
| | `GET /attendance/summary?teamId=&from=&to=`: attendance rate per athlete | admin, coach |
| **Assessments** | `GET /assessments`, `GET /assessments/:id` | any signed-in user (athletes get only their own) |
| | `POST /assessments` (corrections use `supersedesId`) | admin, assigned coach |
| **Audit** | `GET /audit?entity=&entityId=&changedBy=`: who changed what, with before/after values | admin |
| **Platform** | `GET /platform/academies`, `POST /platform/academies` (new academy and its first admin). Needs the `X-Platform-Key` header. | platform operator |
| **Health** | `GET /health/live`, `GET /health/ready` (no `/api` prefix, no token) | anyone |

`PATCH` requests on athletes, coaches, teams and sessions must include the `version` from the last read.

## Tests

- `npm test` runs the unit tests.
- `npm run test:e2e` starts the app against the real database and checks the security rules:
  - one academy can't read or change another academy's data;
  - linking records across academies is rejected;
  - `academyId` in a request body is rejected;
  - the database user sees nothing without an academy context;
  - role limits are enforced;
  - two simultaneous edits produce one success and one `409`;
  - assessment history can't be changed.
- The same suite also covers:
  - academy sign-up and onboarding;
  - creating and deactivating logins;
  - athlete self-access;
  - recurring sessions;
  - attendance reports;
  - the audit log;
  - password change.

## Adding a database change

1. Write a new migration in `src/database/migrations/`. The schema is never auto-generated, because `synchronize` is off.
2. A new academy-owned table needs all of the following. Copy the pattern from the initial migration.
   - an `academy_id` column;
   - row-level security with a `tenant_isolation` policy;
   - composite foreign keys;
   - grants to the `app_runtime` role.
3. Prefer additive changes: add a column, deploy, then remove the old one in a later release. That way rolling back the app never requires rolling back the database.

## Not done yet

- Password reset by email, and email verification.
- Monitoring and alerting.
- Production secret management.
