# Frontend — Employee Work Management Portal

Next.js UI. It has **no API routes** — every request goes to the Express API in `../backend` via `NEXT_PUBLIC_API_URL` (set in `.env.local`, e.g. `http://localhost:4000/api`).

```bash
npm run dev      # http://localhost:3000  (start the backend first)
npm run build    # production build
npm run lint     # eslint
```

Or run both apps together with `npm run dev` from the repo root.

See the [root README](../README.md) for setup, roles, the API reference, and how auth flows between the two apps.

## Layout

- `src/app/` — one folder per route (`login`, `dashboard`, `admin`, `hr`, `accounts`, `change-password`, `forgot-password`, `reset-password`); `[roleSlug]/` is the console for custom management roles.
- `src/components/` — shared UI (`SalaryTable`, `MonthCalendar`, `NotificationBell`, `AttendanceOverview`, …).
- `src/lib/` — `api.js` fetch wrapper, `format.js` / `month.js` helpers, hooks (`useSalaries`, `useRoles`), `roles.js` labels.
- `src/proxy.js` — Next's request middleware: redirects to `/login` when the `token` cookie is missing (every route except the public ones and `/api/*`).
