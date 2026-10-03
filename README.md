# Employee Work Management Portal

Two separate apps, connected over HTTP:

```
backend/    Express + Mongoose REST API  (http://localhost:4000)
frontend/   Next.js UI, no API routes    (http://localhost:3000)
```

The frontend never touches MongoDB directly — every request goes through the backend's `/api/*` routes. Auth is a session cookie (`token`, httpOnly, JWT-signed) set by the backend on login; because both apps run on `localhost` (just different ports), the browser sends that cookie to both without extra config. In production the frontend proxies `/api/*` to the backend (see [Deployment](#deployment)) so the cookie stays first-party.

## First-time setup

```bash
npm install                 # root: installs `concurrently`
npm install --prefix backend
npm install --prefix frontend
cp backend/.env.example backend/.env         # fill in MONGODB_URI + JWT_SECRET
cp frontend/.env.example frontend/.env.local # points at the backend URL
npm run seed                 # loads sample users/data into MongoDB
```

## Running

```bash
npm run dev                  # runs backend + frontend together
```

Or separately, in two terminals:

```bash
npm run dev --prefix backend    # http://localhost:4000
npm run dev --prefix frontend   # http://localhost:3000
```

Log in at `http://localhost:3000/login` — seeded test accounts are listed at the end of `backend/scripts/seed.mjs` (password `Test@1234` for all). `npm run seed` wipes and reloads all collections, so re-run it any time to reset the demo.

## Roles & categories

Every role belongs to a **category**. A category has a **base type** — `management` or `employee` — and that base type is what actually decides behaviour: the landing page and which access panel applies. `management` and `employee` are the two permanent built-in categories (they *are* the base types); Admin can add more, each pinned to a base type, and delete the custom ones.

| Base type | Built-in category | Built-in roles | Landing page | Access configured via |
|---|---|---|---|---|
| `management` | `management` | `Admin`, `HR`, `Accounts_E` | a multi-tab **console** | **Management Role Capabilities** panel (Admin only) |
| `employee` | `employee` | `Developer_E`, `Cyber Security_E`, `Social Media & Performance Marketing_E`, `Intern` | `/dashboard` | **Access Control** panel (Admin only) |

**Employee-base roles** land on `/dashboard`. Admin picks, per role, which feature modules that role sees: Daily Work Updates, Leave Requests, Attendance & Calendar, Salary, Notices & Meetings. A role with no explicit config has all five.

**Management-base roles** get a console. `Admin` (`/admin`), `HR` (`/hr`), and `Accounts_E` (`/accounts`) have dedicated pages; any other management-base role has no bespoke route, so it lands on a generic console at `/<slug-of-its-name>` (see `frontend/src/app/[roleSlug]/page.js`). For every management-base role *except Admin*, Admin picks which console tabs show up: Overview, Work Updates, Employees & Interns, Salaries, Salary History, Paid Leaves, Leave Requests, Add Custom Roles.

`Admin` always has full access and is not configurable. Three things are Admin-only and never delegable: marking attendance directly, posting notices, and the Access Control / Management Role Capabilities panels themselves.

Custom **roles** and **categories** are managed at runtime (Role & Category managers on the Employees tab) by any management role with the **Add Custom Roles** capability (`HR` has it by default; `Accounts_E` does not). A new management-base role starts with *no* capabilities until Admin grants some; a new employee-base role starts with all modules. Defaults preserve prior behaviour: `HR` keeps every capability, `Accounts_E` keeps Salaries + Salary History + Paid Leaves. **Deletes are blocked when in use**: a role with any assigned employee, a category with any role in it, and the built-in roles/categories all refuse deletion. Deleting a role also drops its Access Control / capability config.

## Modules

- **Auth** — credential login (JWT + bcrypt), change password, forgot/reset password (reset links are logged to the console; no email provider wired up). `GET /auth/me` also returns the caller's category, base type, and joining date.
- **Roles & access control** — any management role with the *Add Custom Roles* capability can add custom role names (`CustomRole`), each tagged `management` or `employee`. Admin gates employee-role features on the **Access Control** panel (`RolePermission` per employee role) and management-role console tabs on the **Management Role Capabilities** panel (`ManagementCapability` per management role). Both are enforced server-side by `moduleGuard` / `managementCapabilityGuard` and mirrored client-side so hidden tabs never flash.
- **Employees & profiles** — management roles with the *Employees* capability CRUD people and their profile (phone, monthly salary, joining date). Deleting a person cascades to all their attendance/leave/salary/notification records. The directory (`GET /employees`) is readable by any management role — other tabs reuse it as shared lookup data.
- **Daily work updates** — one submission per day per person (project, progress, remaining work, ETA, extra work), enforced to the server's "today". Submitting also marks the day Present. Management roles with the *Work Updates* capability see every submission in full on a **Work Updates** tab, browsable by month and employee (each day's entry is kept, and a same-day edit is flagged). A reviewer can start a **follow-up thread** on any update; the employee replies from a "Follow-up requests" card on their dashboard (active threads only, with a toggle for past ones), and each side is notified. The reviewer closes the thread to end it (a new request reopens it). Requests and replies are appended — editing the update never drops the thread. `Admin`, `HR`, and `Accounts_E` never submit updates themselves — their attendance is marked on login instead.
- **Leave & attendance** — apply for leave (today or later); management roles with the *Leave Requests* capability approve/reject; only `Admin` marks Present/Absent directly. Approved leave writes `Leave` attendance rows. Paid leave **accrues 1.75 days per completed month (21/year)**, capped annually; days beyond the accrued balance are unpaid. Any management role can read everyone's leave balances (`GET /leave-requests/balances`) to cross-check payroll.
- **Holidays & calendar** — `Admin` and `HR` maintain the holiday list; the shared `MonthCalendar` overlays holidays, notices, and (on the employee view) that person's attendance. The weekly off is Monday.
- **Salary** — `salaryPayable` is derived from attendance: `dailySalary × (days in month − absent − unpaid-leave − pre-joining days)`. Management roles with the *Salaries* capability record the amount actually credited plus an optional remark; edits keep the original crediter and stamp the reviser, and every credit/revision is logged. The **Salary History** tab (its own capability) shows the whole team's credit activity for a month.
- **Notices & meetings** — only `Admin` posts a dated notice or meeting link; it shows on every calendar and in a "Notices & Meetings" panel (rendered on the console's first tab and the employee dashboard), and fans an announcement notification out to everyone.
- **Notifications** — a bell in the account bar with an unread count and feed. Emitted on leave decisions, salary credits/revisions, new/edited notices, and follow-up requests. Meeting reminders for notices landing today/tomorrow are generated lazily when the feed is fetched (there's no scheduler).

## API reference

All routes are under `/api`. Everything except the four public auth endpoints requires the `token` cookie.

**"Who" column:**

- **any** — any authenticated user, own data only
- **management** — any management-category role. `Admin` always passes; `HR` / `Accounts_E` / a custom management role also need the *italicised capability* enabled by Admin
- **Admin** — `Admin` only
- an *italicised module* means an employee role additionally needs that Access Control module switched on (a no-op for management roles, which always have every module)

| Method & path | Who | Purpose |
|---|---|---|
| `POST /auth/login` · `POST /auth/logout` | public | start / end a session |
| `GET /auth/me` | any | current user + role + category + base type + joining date |
| `POST /auth/change-password` | any | change own password |
| `POST /auth/forgot-password` · `POST /auth/reset-password` | public | password reset by emailed/logged token |
| `GET /roles` | any | built-in + custom role names, each with its category and `isBuiltIn` |
| `POST /roles` | management + *Add Custom Roles* | add a custom role in a given category |
| `DELETE /roles/:name` | management + *Add Custom Roles* | delete a custom role — `409` if any employee still has it |
| `GET /categories` | any | built-in + custom categories, each with `baseType` and `isBuiltIn` |
| `POST /categories` | management + *Add Custom Roles* | add a category (`baseType` `management` or `employee`) |
| `DELETE /categories/:name` | management + *Add Custom Roles* | delete a custom category — `409` if any role is in it |
| `GET /role-permissions/mine` | any | feature modules enabled for the caller's role |
| `GET /role-permissions` · `PUT /role-permissions/:role` | Admin | view / set per-employee-role module access |
| `GET /management-capabilities/mine` | any | console capabilities granted to the caller's role |
| `GET /management-capabilities` · `PUT /management-capabilities/:role` | Admin | view / set per-management-role console capabilities |
| `GET /employees` | management | employee directory (shared lookup) |
| `POST /employees` · `PUT /employees/:id` · `DELETE /employees/:id` | management + *Employees* | employee CRUD (delete cascades) |
| `POST /daily-work-updates` · `GET /daily-work-updates/today` | any + *dailyWorkUpdate* | submit / read own update for today |
| `GET /daily-work-updates` | own: any · all (`?userId=&month=&year=`): management + *Work Updates* | full update content for a month |
| `GET /daily-work-updates/today-status` | management + *Work Updates* | who has submitted today |
| `GET /daily-work-updates/follow-ups` | any | own updates with an open follow-up (`?includeClosed=1` for all) |
| `POST /daily-work-updates/:id/follow-up` · `POST /daily-work-updates/:id/follow-up-close` | management + *Work Updates* | open / close a follow-up thread (notifies the employee) |
| `POST /daily-work-updates/:id/follow-up-response` | update owner | reply to an open follow-up (notifies the requester) |
| `POST /leave-requests` · `GET /leave-requests/balance` | any + *leave* | apply / own accrued-used-remaining for a year |
| `GET /leave-requests` | own: any · all: management + *Leave Requests* | list leave requests |
| `GET /leave-requests/balances` | management | everyone's balances |
| `PATCH /leave-requests/:id/status` | management + *Leave Requests* | approve / reject (notifies the employee) |
| `GET /attendance` | own: any + *attendance* · all: management + *Overview* | attendance rows |
| `POST /attendance/mark` | Admin | mark a person Present/Absent for a working day |
| `GET /holidays` | any | holidays for a year |
| `POST /holidays` · `DELETE /holidays/:id` | Admin, HR | add / remove a holiday |
| `GET /salaries` | own: any · all: management + *Salaries* (all under *salary*) | computed salary rows for a month |
| `GET /salaries/history` | management + *Salary History* | combined credit history for a month |
| `PATCH /salaries/:id/credit` | management + *Salaries* | record / revise a payment (notifies the employee) |
| `GET /notices` | any + *notices* | notices (optionally filtered by year) |
| `POST /notices` · `PATCH /notices/:id` · `DELETE /notices/:id` | Admin | manage notices (create/edit fans out notifications) |
| `GET /notifications` | any | own feed + `unreadCount` (also materialises due reminders) |
| `PATCH /notifications/:id/read` · `POST /notifications/read-all` | any | mark read |

## Data model

MongoDB collections (all in `backend/src/models/`):

`User` · `EmployeeProfile` · `CustomRole` · `Category` · `RolePermission` · `ManagementCapability` · `DailyWorkUpdate` · `LeaveRequest` · `Attendance` · `Holiday` · `Salary` · `SalaryPayment` · `Notice` · `Notification`

- `CustomRole` — a runtime-added role name plus its `category` (a category name). Built-in roles live in `lib/roles.js`.
- `Category` — a runtime-added category plus its `baseType` (`management` / `employee`). The two built-in categories live in `lib/categories.js`, not this collection.
- `RolePermission` — one doc per employee-base role, holding which feature modules are enabled. No doc = all modules on.
- `ManagementCapability` — one doc per management-base role, holding which console tabs Admin has granted. No doc = the role's built-in default (`HR` all, `Accounts_E` three).
- `Salary` rows are recomputed from attendance on every read (`computeSalaryForUser`), so they're a cache, not a source of truth. `SalaryPayment` holds the human-entered "what we actually paid" plus its edit history.

## Project layout

```
backend/src/
  server.js          route registration + error handler
  routes/            one file per resource, wires guards to controllers
  controllers/       request handlers
  models/            Mongoose schemas
  lib/               auth, db, dates; roles + categories + URL slugs;
                     module/capability access resolution; notify/reminders;
                     workingDays, leavePolicy, salaryCalc
  middleware/        authGuard.js — cookie→req.user, plus role / module / capability guards
  scripts/           seed.mjs (wipe + reload demo data),
                     copy-db.mjs (clone a DB into another, e.g. local → Atlas),
                     backfill-work-updates.mjs (top up work updates through today)

frontend/src/
  app/               one folder per route (login, dashboard, admin, hr, accounts, …);
                     [roleSlug]/ is the generic console for custom management roles
  components/         shared UI (ManagementConsole, AccessControlPanel,
                     ManagementCapabilitiesPanel, SalaryTable, MonthCalendar, …)
  lib/               api fetch wrapper, format/month helpers, role/module label maps,
                     hooks (useSalaries, useRoles, useRolePermissions, useManagementCapabilities)
  proxy.js           redirects unauthenticated users away from non-public pages
```

## How auth flows

1. `frontend` posts credentials to `backend`'s `POST /api/auth/login`, `credentials: "include"`.
2. `backend` verifies the password, signs a JWT, sets it as an httpOnly cookie, and returns `redirectTo` — the role's landing page (`/admin`, `/hr`, `/accounts`, `/dashboard`, or `/<slug>` for a custom management role).
3. `frontend/src/proxy.js` (Next's request middleware, renamed from `middleware.js` per the Next 16 deprecation) only checks that the cookie is *present* — it can't verify the signature (`JWT_SECRET` lives only in `backend`). It's exclusion-based: everything except `/`, `/login`, `/forgot-password`, `/reset-password` (and Next's assets and `/api/*`) needs the cookie, so a custom role's unknown URL slug is still protected.
4. Each protected page wraps its content in `<RoleGuard>` — by `allowedRoles`, `deniedRoles`, or `deniedBaseTypes` (e.g. `/dashboard` denies the whole `management` base type) — which calls `GET /api/auth/me` client-side to confirm the real role/base type and redirects to `/login` if it doesn't match. Console tabs and dashboard modules are then filtered by `GET /api/*/mine`.

## Deployment

Serverless on Vercel as **two projects from this repo**: the backend (root dir `backend`, framework preset **Other**, entry point `api/index.js`) and the frontend (root dir `frontend`, Next.js), plus a MongoDB database such as Atlas. Full step-by-step guide, including creating and connecting the database: [`VERCEL_DEPLOYMENT.pdf`](VERCEL_DEPLOYMENT.pdf).

The frontend serves the backend at a same-origin path so the auth cookie stays first-party: set **`BACKEND_URL`** (the backend project's production URL, no `NEXT_PUBLIC_` prefix, no trailing slash) and `NEXT_PUBLIC_API_URL=/api` on the frontend project; `next.config.mjs` rewrites `/api/:path*` to `${BACKEND_URL}/api/:path*`. Both are read at build time, so redeploy after changing them. Locally `BACKEND_URL` is unset and `apiFetch` calls the backend directly. If login returns "Request failed", check `https://<frontend-url>/api/health`.

**Backend env (Vercel backend project):**

| Key | Notes |
|---|---|
| `MONGODB_URI` | e.g. `mongodb+srv://user:pass@cluster.mongodb.net/ewmp?retryWrites=true&w=majority`; the `/ewmp` database name is required |
| `JWT_SECRET` | long random string |
| `NODE_ENV` | `production`: enables `Secure` cookies, stops `forgot-password` returning the reset URL |
| `CORS_ORIGIN` · `FRONTEND_URL` | the frontend's URL |

Don't set `PORT`; only `src/server.js` (local dev) reads it. Atlas must allow connections from anywhere (`0.0.0.0/0`), since Vercel functions have no fixed IPs. Vercel applies env changes only on the next deploy.

**Loading data**: run locally against the target database:

- `npm run seed --prefix backend` with `MONGODB_URI` pointed at the target wipes and reloads demo data.
- `TARGET_URI=… npm run copy-db --prefix backend` clones a database (default source: local `ewmp`) into the target, wiping it first. Indexes are built from the model schemas, and collections with no model are skipped.
- `npm run backfill-updates --prefix backend` (uses `MONGODB_URI`) tops up start/end-of-day work updates for every employee through today, marks those days Present, and converts any legacy single-form updates. It never wipes anything, and re-running it adds only what's missing.
