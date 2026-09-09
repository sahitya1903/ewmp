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

## Roles

One built-in role per person, set by HR/Admin. `Admin` and `HR` are the two "reviewer" roles that see and act on everyone's data.

| Role | Home page | Can do |
|---|---|---|
| `Admin` | `/admin` | Mark attendance, manage holidays & notices, review leave & work updates, record salary payments, add/remove employees, add custom roles |
| `HR` | `/hr` | Everything Admin can except marking attendance & posting notices; also adds custom roles |
| `Accounts_E` | `/accounts` | Record salary payments, view leave balances |
| `Developer_E`, `Cyber Security_E`, `Social Media & Performance Marketing_E`, `Intern` | `/dashboard` | Submit daily work update, apply for leave, view own calendar/salary/notifications |

HR/Admin can also add extra custom role names (`CustomRole`); anyone assigned one lands on `/dashboard`.

## Modules

- **Auth** — credential login (JWT + bcrypt), change password, forgot/reset password (reset links are logged to the console; no email provider wired up).
- **Employees & roles** — HR/Admin CRUD over people and their profile (phone, monthly salary, joining date). Deleting a person cascades to all their attendance/leave/salary/notification records.
- **Daily work updates** — one submission per day per person (project, progress, remaining work, ETA, extra work), enforced to the server's "today". Submitting also marks the day Present. HR/Admin see every submission in full on a **Work Updates** tab, browsable by month and employee (each day's entry is kept, and a same-day edit is flagged). A reviewer can start a **follow-up thread** on any update; the employee replies from a "Follow-up requests" card on their dashboard (active threads only, with a toggle for past ones), and each side is notified. The reviewer closes the thread to end it (a new request reopens it). Requests and replies are appended — editing the update never drops the thread.
- **Leave & attendance** — apply for leave (today or later), HR/Admin approve/reject, Admin marks Present/Absent directly. Approved leave writes `Leave` attendance rows. Paid leave **accrues 1.75 days per completed month (21/year)**, capped annually; days beyond the accrued balance are unpaid.
- **Holidays & calendar** — HR/Admin maintain the holiday list; the shared `MonthCalendar` overlays holidays, notices, and (on the employee view) that person's attendance. The weekly off is Monday.
- **Salary** — `salaryPayable` is derived from attendance: `dailySalary × (days in month − absent − unpaid-leave − pre-joining days)`. HR/Admin/Accounts record the amount actually credited plus an optional remark; edits keep the original crediter and stamp the reviser, and every credit/revision is logged. The **Salary History** tab shows the whole team's credit activity for a month.
- **Notices & meetings** — Admin posts a dated notice or meeting link; it shows on every calendar and in a "Notices & Meetings" panel, and fans an announcement notification out to everyone.
- **Notifications** — a bell in the account bar with an unread count and feed. Emitted on leave decisions, salary credits/revisions, new/edited notices, and follow-up requests. Meeting reminders for notices landing today/tomorrow are generated lazily when the feed is fetched (there's no scheduler).

## API reference

All routes are under `/api`. Everything except the four public auth endpoints requires the `token` cookie. "Reviewer" = `Admin` + `HR`.

| Method & path | Who | Purpose |
|---|---|---|
| `POST /auth/login` · `POST /auth/logout` | public | start / end a session |
| `GET /auth/me` | any | current user + role |
| `POST /auth/change-password` | any | change own password |
| `POST /auth/forgot-password` · `POST /auth/reset-password` | public | password reset by emailed/logged token |
| `GET /employees` · `POST /employees` · `PUT /employees/:id` · `DELETE /employees/:id` | reviewer | employee CRUD |
| `GET /roles` | any | built-in + custom role names |
| `POST /roles` | reviewer | add a custom role |
| `POST /daily-work-updates` · `GET /daily-work-updates/today` | any | submit / read today's update |
| `GET /daily-work-updates` | any (own) / reviewer (all, `?userId=`) | full update content for a month (`?month=&year=`) |
| `GET /daily-work-updates/today-status` | Admin, HR | who has submitted today |
| `GET /daily-work-updates/follow-ups` | any | own updates with an open follow-up thread (`?includeClosed=1` for all) |
| `POST /daily-work-updates/:id/follow-up` | Admin, HR | add a follow-up request; reopens a closed thread (notifies the employee) |
| `POST /daily-work-updates/:id/follow-up-response` | update owner | reply to an open follow-up (notifies the requester) |
| `POST /daily-work-updates/:id/follow-up-close` | Admin, HR | end the follow-up conversation |
| `POST /leave-requests` · `GET /leave-requests` | any | apply / list (own, or all for reviewers) |
| `GET /leave-requests/balance` | any | own accrued/used/remaining for a year |
| `GET /leave-requests/balances` | reviewer, Accounts_E | everyone's balances |
| `PATCH /leave-requests/:id/status` | reviewer | approve / reject (notifies the employee) |
| `GET /attendance` | any | attendance rows (own, or all for reviewers) |
| `POST /attendance/mark` | Admin | mark a person Present/Absent for a working day |
| `GET /holidays` | any | holidays for a year |
| `POST /holidays` · `DELETE /holidays/:id` | Admin, HR | add / remove a holiday |
| `GET /salaries` | any (own) / reviewer + Accounts_E (all) | computed salary rows for a month |
| `GET /salaries/history` | reviewer, Accounts_E | combined credit history for a month |
| `PATCH /salaries/:id/credit` | reviewer, Accounts_E | record/revise a payment (notifies the employee) |
| `GET /notices` | any | notices (optionally filtered by year) |
| `POST /notices` · `PATCH /notices/:id` · `DELETE /notices/:id` | Admin | manage notices (create/edit fans out notifications) |
| `GET /notifications` | any | own feed + `unreadCount` (also materialises due reminders) |
| `PATCH /notifications/:id/read` · `POST /notifications/read-all` | any | mark read |

## Data model

MongoDB collections (all in `backend/src/models/`):

`User` · `EmployeeProfile` · `CustomRole` · `DailyWorkUpdate` · `LeaveRequest` · `Attendance` · `Holiday` · `Salary` · `SalaryPayment` · `Notice` · `Notification`

`Salary` rows are recomputed from attendance on every read (`computeSalaryForUser`), so they're a cache, not a source of truth. `SalaryPayment` holds the human-entered "what we actually paid" plus its edit history.

## Project layout

```
backend/src/
  server.js          route registration + error handler
  routes/            one file per resource, wires guards to controllers
  controllers/       request handlers
  models/            Mongoose schemas
  lib/               auth, db, dates, roles, notify/reminders,
                     workingDays, leavePolicy, salaryCalc
  middleware/        authGuard (cookie → req.user), roleGuard
  scripts/seed.mjs   wipe + reload demo data

frontend/src/
  app/               one folder per route (login, dashboard, admin, hr, accounts, …)
  components/         shared UI (SalaryTable, MonthCalendar, NotificationBell, …)
  lib/               api fetch wrapper, format/month helpers, hooks (useSalaries, useRoles)
  middleware.js       redirects unauthenticated users away from protected prefixes
```

## How auth flows

1. `frontend` posts credentials to `backend`'s `POST /api/auth/login`, `credentials: "include"`.
2. `backend` verifies the password, signs a JWT, and sets it as an httpOnly cookie.
3. `frontend/src/middleware.js` only checks that the cookie is *present* before allowing `/dashboard`, `/accounts`, `/admin`, `/hr`, `/change-password` — it can't verify the signature (the `JWT_SECRET` lives only in `backend`).
4. Each protected page wraps its content in `<RoleGuard allowedRoles={[...]}>`, which calls `backend`'s `GET /api/auth/me` client-side to confirm the actual role and redirects to `/login` if it doesn't match.

## Deployment

Frontend on Vercel (root dir `frontend`), backend + MongoDB on one Railway project (backend root dir `backend`).

The frontend serves the backend at a same-origin path so the auth cookie stays first-party: set **`BACKEND_URL`** (e.g. `https://api.up.railway.app`, no `NEXT_PUBLIC_` prefix) on Vercel and `NEXT_PUBLIC_API_URL=/api`; `next.config.mjs` rewrites `/api/:path*` to `${BACKEND_URL}/api/:path*`. Locally `BACKEND_URL` is unset and `apiFetch` calls the backend directly.

**Backend env (Railway):**

| Key | Notes |
|---|---|
| `MONGODB_URI` | `${{MongoDB.MONGO_PRIVATE_URL}}/ewmp?authSource=admin` |
| `JWT_SECRET` | long random string |
| `NODE_ENV` | `production` — enables `Secure` cookies, stops `forgot-password` returning the reset URL |
| `CORS_ORIGIN` · `FRONTEND_URL` | the Vercel URL |

`PORT` is injected by the host. `npm start` runs `node --env-file-if-exists=.env src/server.js`, so it works with or without a `.env` file.

Seed once against the DB's public URL locally (`npm run seed` wipes everything), or create a single admin by hand.
