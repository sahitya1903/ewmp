# Deploying the backend to Vercel (serverless)

This covers **only the backend** — turning `backend/` into a Vercel serverless
project. Frontend-on-Vercel and MongoDB Atlas setup are separate, later steps
(see `DEPLOYMENT.md` for the previous Railway-based runbook, which this will
eventually replace).

## What changed to make this possible

- `backend/src/app.js` — the Express app (routes, middleware, error handler),
  with no `app.listen()`. Exported so both the local dev server and the
  Vercel function can use it.
- `backend/src/server.js` — local dev only: `connectDB()` then `app.listen()`.
  Unchanged in behavior, just imports `app` now instead of defining it.
- `backend/api/index.js` — the Vercel entry point. On each request it awaits
  `connectDB()` (reuses the cached connection on warm invocations — see
  `backend/src/lib/db.js`) then hands off to the same Express `app`.
- `backend/vercel.json` — rewrites every request path to `/api`, i.e. to
  `api/index.js`, while preserving the original path/query so Express's own
  routing (`/api/auth`, `/api/employees`, ...) still works unchanged.

No route, controller, model, or middleware file was touched.

## Prerequisites

- A Vercel account (free Hobby plan is fine here).
- Vercel CLI installed — already present on this machine (`vercel --version`).
- Logged in: `vercel login` (opens a browser / emails a confirmation link;
  run this yourself since it ties to your own Vercel account).

## Option A — Deploy from the CLI (fastest, works before GitHub is linked)

From the `backend/` directory:

```bash
cd backend
vercel link      # first time: creates/links a Vercel project for this folder
vercel deploy     # preview deployment
vercel deploy --prod   # production deployment
```

`vercel link` will ask:
- **Set up and deploy?** Yes
- **Which scope?** your account/team
- **Link to existing project?** No (first time)
- **Project name?** e.g. `ewmp-backend`
- **Directory?** `.` (you're already inside `backend/`)
- Framework is auto-detected as "Other" — correct, since this isn't Next.js.

## Option B — Deploy via GitHub import (for auto-deploy on push)

1. Commit and push the backend changes (`app.js`, updated `server.js`,
   `api/index.js`, `vercel.json`) to `main`.
2. vercel.com → **Add New → Project → Import** `sahitya1903/ewmp`.
3. **Root Directory**: `backend`.
4. Framework preset: **Other** (no build command needed — plain Node, no
   TypeScript, matches how the backend already runs on Railway).
5. Deploy.

Either option produces a URL like `https://ewmp-backend.vercel.app`.

## Environment variables (add in Vercel → Project → Settings → Environment Variables)

| Key | Value | Notes |
|---|---|---|
| `MONGODB_URI` | *(added once the Atlas cluster exists)* | Until this is set, **every route will 500** — `backend/src/lib/db.js` throws at import time if it's missing. This is expected right now; nothing to fix until Atlas is set up. |
| `JWT_SECRET` | a long random string | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. Never commit this. |
| `NODE_ENV` | `production` | Enables `Secure` cookies; hides the password-reset URL from API responses. |
| `CORS_ORIGIN` | the frontend's URL, once deployed | Only matters for direct browser calls (e.g. local dev pointed at prod). In production the Next.js frontend proxies server-side, so this is mostly a formality. |
| `FRONTEND_URL` | the frontend's URL, once deployed | Used to build password-reset links. |

**Do not set `PORT`** — it's meaningless for a serverless function; `server.js` (the only place that reads it) never runs on Vercel.

## Verifying the deploy

```bash
curl https://<your-backend>.vercel.app/api/health
```

- **Before `MONGODB_URI` is set**: expect a `500` — this is the known gap until Atlas is wired up, not a bug in the migration.
- **After `MONGODB_URI` is set**: expect `{"ok":true}`.

## Next steps (not yet done)

1. Create the MongoDB Atlas cluster, set `MONGODB_URI` above.
2. Point the frontend's `BACKEND_URL` (in its Vercel project) at this backend's URL, so `next.config.mjs`'s rewrite proxies `/api/*` to it and the auth cookie stays first-party.
3. Once the frontend URL is known, come back and set `CORS_ORIGIN` / `FRONTEND_URL` above.
