# Frontend: Next.js web app

Web interface for the Athlete & Coach Management Platform. It uses Next.js 16 (App Router), React 19 and Tailwind CSS 4.

The frontend has no database of its own. All data comes from the [backend API](../backend/README.md), so **start the backend first**.

## Setup

```bash
cp .env.example .env
```

### Environment variables

| Variable | Default | Used by | Meaning |
| --- | --- | --- | --- |
| `API_URL` | `http://localhost:5001` | `npm run dev` | Backend address. Docker sets its own value. |
| `WEB_PORT` | `5000` | Docker | Host port for the web app |
| `INSECURE_COOKIES` | not set | Docker | `true` allows the login cookie over plain HTTP. Docker sets it for local use; leave it unset in production behind HTTPS. |

## Run with Docker

The backend stack must already be running. It creates the `acm-network` Docker network this stack joins.

```bash
docker compose up -d --build     # http://localhost:5000
```

Inside Docker, the web app reaches the API at `http://api:5001` over that network.

## Run on your machine (hot reload)

Requirements: Node.js 22+, and the backend running at `API_URL`.

```bash
npm install
npm run dev                      # http://localhost:5000
```

Sign in with a demo account, such as `admin@falcons.test` with password `ChangeMe123!` (see the [root README](../README.md#demo-accounts)).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start with hot reload |
| `npm run build` | Production build. The output is a self-contained server in `.next/standalone/`. |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate route types, then run the TypeScript check |

For production, use the Docker image. It runs the standalone server with `node server.js`.

## Screens

| Screen | Admin | Coach | Athlete |
| --- | --- | --- | --- |
| **Sign up** (`/signup`) | creates a new academy; the person becomes its admin | — | — |
| **Dashboard** | setup checklist for new academies, stats, upcoming sessions, teams, recent activity | the same, scoped to their teams | their teams, attendance rate, latest scores |
| **Athletes**: list with search and filters, profile with team history, attendance, assessments | add, edit, transfer, add to team | view, record and correct assessments | own profile only |
| **Coaches**: list, profile with team history | add, edit, assign to team | view | — |
| **Teams**: cards, plus a page with Roster, Sessions, Attendance report and History tabs | create, edit, add or remove athletes and coaches, view the roster on any past date | view, schedule sessions for their teams | — |
| **Training sessions**: list with filters, single or weekly-series scheduling | everything | their teams | — |
| **Session page**: attendance sheet, complete, cancel, edit | everything | their teams | — |
| **Assessments** | all athletes | all athletes | their own |
| **Users & access** | create logins, link them to profiles, change roles, remove access | — | — |
| **Audit log**: who changed what and when | view | — | — |
| **Settings** | academy name and timezone, own password | own password | own password |

The sidebar only shows the screens a person's role can use. The backend enforces the same rules on every request.

## Theme

- **Layout:** a sidebar with icons, a mobile menu, cards with soft borders, and a consistent set of buttons, badges, tables and form fields.
- **Components:** all defined in `src/components/ui.tsx`, so every screen looks the same.
- **Colours:** the accent colour is the `brand` palette in `src/app/globals.css`. To re-brand the app, point those variables at a different Tailwind colour (for example `--color-teal-600`).
- **Dark mode:** follows the operating system setting.
- **Icons:** from [lucide-react](https://lucide.dev).

## Folder structure

```
docker-compose.yml        web container
Dockerfile                production image
.env.example              settings template
src/
  app/
    globals.css           theme colours (brand palette)
    layout.tsx            root layout, font
    page.tsx              dashboard (different for staff and athletes)
    login/                sign-in screen
    athletes/ coaches/ teams/ sessions/ assessments/ users/ audit/ settings/
                          one folder per screen; actions.ts holds its server actions
    error.tsx             friendly error screen
  components/
    shell.tsx             sidebar layout
    nav-links.tsx         role-based sidebar links
    ui.tsx                cards, tables, badges, buttons, form fields
    action-form.tsx       form wired to a server action, with saving and error states
    session-form.tsx      single and recurring session scheduling
    assessment-form.tsx   record or correct an assessment
  lib/
    api.ts                calls the backend with the user's token
    actions.ts            shared server-action error handling
    session.ts            current user and academy (cached per request)
    format.ts             dates and times in academy time
    types.ts              shapes of the data the API returns
```

## How sign-in works

1. The login form submits to a server action in `app/actions.ts`.
2. The server action calls `POST /api/auth/login` on the backend and stores the returned token in an **httpOnly cookie**. Browser JavaScript can't read that cookie.
3. Pages are server components. They fetch data through `lib/api.ts`, which attaches the token from the cookie.
4. If the token is missing or expired, the user is redirected to `/login`.

The frontend only decides what to display. Every permission check happens in the backend.
