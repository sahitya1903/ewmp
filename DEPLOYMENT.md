# Deployment (Phase 6)

Target: **backend + MongoDB on one Railway project**, **frontend on Vercel**, connected so the
auth cookie stays first-party (Vercel proxies `/api/*` to the Railway backend).

This is a runbook. It's written so a new collaborator can reproduce a known-good deployment on
the **company's** Railway and Vercel accounts by following it top to bottom. **Order matters** —
each phase produces a value (a URL, a secret) the next phase needs.

The owner provides two things: **Write access to `sahitya1903/ewmp`** (Phase 1) and the **database
contents** — the collaborator sends the owner the company Railway MongoDB's public URL and the
owner runs `copy-to-railway.mjs` against it from the machine that holds the local dev data
(Phase 5). Everything else is done with the company's Railway and Vercel accounts.

```
Browser ──HTTPS──▶ Vercel (frontend)
                     │  next.config.mjs rewrites /api/:path*
                     ▼
                   Railway backend  ──private network──▶  Railway MongoDB
```

---

## What you'll end up with

| Piece | Host | Root dir | Public URL |
|---|---|---|---|
| Frontend (Next.js) | Vercel | `frontend` | `https://<project>.vercel.app` |
| Backend (Express API) | Railway | `backend` | `https://<service>.up.railway.app` |
| Database (MongoDB) | Railway | — | private URL for the backend, public URL for one-off scripts |

The frontend has **no API routes**. In production `NEXT_PUBLIC_API_URL=/api`, so the browser calls
`https://<project>.vercel.app/api/*`; `frontend/next.config.mjs` rewrites that server-side to
`${BACKEND_URL}/api/*`. Because the browser only ever talks to the Vercel origin, the `token`
cookie is first-party and `SameSite=Lax` works.

---

## 0. Prerequisites

- **GitHub**: Write access to `sahitya1903/ewmp` — the owner adds you as a collaborator (Phase 1).
- **Railway**: a seat on the company Railway account/team, able to create projects.
- **Vercel**: a seat on the company Vercel account/team, able to import projects.
- The company's Railway and Vercel **GitHub apps must have access to `sahitya1903/ewmp`**. If the
  repo lives under a personal account and the company hosts are separate orgs, either transfer the
  repo into the company GitHub org or, in each host, grant its GitHub app access to the repo.
- **Node 20+** — needed by whoever runs the Phase 5 database load. Check with `node --version`.
- For Phase 5, the **repo owner** loads the data: you send them the company Railway MongoDB's public
  URL and they run `backend/scripts/copy-to-railway.mjs` locally, copying their dev database into it.
  You don't need the data or Node for this. If the owner can't do it, skip the copy and seed demo
  data instead — see Phase 5, Option B (that one needs Node locally).

---

## 1. Add the collaborator to GitHub

On `github.com/sahitya1903/ewmp` → **Settings → Collaborators and teams → Add people** → enter their
GitHub username → role **Write**. They accept the emailed invite.

They then clone and install:

```bash
git clone https://github.com/sahitya1903/ewmp.git
cd ewmp
npm install
npm install --prefix backend
npm install --prefix frontend
```

Everything below is done in the company's Railway and Vercel dashboards (plus one local script in Phase 5).

---

## 2. Railway — create the project and the database

1. **railway.com → New Project → Deploy from GitHub repo →** select `sahitya1903/ewmp`.
   Railway creates one service from the repo.
2. Open that service → **Settings**:
   - **Root Directory**: `backend`
   - **Build Command**: leave blank (there is no build step — plain Node, no TypeScript)
   - **Start Command**: `npm start`
     (runs `node --env-file-if-exists=.env src/server.js`; works with no `.env` file present)
   - Rename the service to `backend` so references read clearly.
3. In the same project → **New → Database → Add MongoDB**. Railway provisions MongoDB with a
   persistent volume. Rename this service to **`MongoDB`** exactly (the backend references it by
   name in the next phase — if you name it differently, adjust the reference to match).

---

## 3. Railway — backend environment variables

Backend service → **Variables** → add:

| Key | Value | Notes |
|---|---|---|
| `MONGODB_URI` | `${{MongoDB.MONGO_PRIVATE_URL}}/ewmp?authSource=admin` | Railway reference to the MongoDB service over the **private** network. The `/ewmp` names the database; `?authSource=admin` is required — Railway's root Mongo user authenticates against `admin`. |
| `JWT_SECRET` | a long random string | Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` — or `openssl rand -hex 48`. Keep it out of git. Rotating it logs everyone out. |
| `NODE_ENV` | `production` | Enables `Secure` cookies and stops `forgot-password` returning the reset URL in the response body. |
| `CORS_ORIGIN` | *(fill in Phase 6)* | The frontend's public URL. Leave unset for now, or set a placeholder. |
| `FRONTEND_URL` | *(fill in Phase 6)* | Same URL — used to build password-reset links. |

**Do not set `PORT`** — Railway injects it, and `src/server.js` reads `process.env.PORT`.

Railway redeploys the backend on every variable change.

---

## 4. Railway — give the backend a public domain, then verify

1. Backend service → **Settings → Networking → Generate Domain**.
   You get `https://<service>.up.railway.app`. This is the value Vercel's `BACKEND_URL` will point at.
2. Wait for the deploy to go green, then check the health endpoint:

   ```bash
   curl https://<service>.up.railway.app/api/health
   # {"ok":true}
   ```

   If this fails, open the backend's **Deploy Logs**. The usual causes: `MONGODB_URI` missing the
   database name or `?authSource=admin`, or the MongoDB service still starting.

---

## 5. Load the database into the company's Railway MongoDB

The backend now runs but the database is empty. Pick one option.

### Get the MongoDB **public** connection URL (needed for both options)

The private URL from Phase 3 only resolves *between Railway services*. Anything run from a laptop —
including the copy script — needs the public URL of the company's Railway MongoDB:

MongoDB service → **Variables** → copy **`MONGO_PUBLIC_URL`**. If it isn't present, MongoDB service
→ **Settings → Networking → enable TCP Proxy**, then it appears. It looks like:

```
mongodb://mongo:<password>@<host>.proxy.rlwy.net:<port>
```

Append the database and auth source: `…:<port>/ewmp?authSource=admin`. This is the `TARGET_URI`.

### Option A — the owner copies their dev database in (default)

**You (collaborator):** send the owner the full `TARGET_URI` from above, over a secure channel (it
contains the Mongo root password). Nothing else to do until they confirm it's loaded.

**The owner**, on the machine with the local dev database, with `backend` dependencies installed:

```bash
cd backend
npm install

TARGET_URI="mongodb://mongo:<password>@<host>.proxy.rlwy.net:<port>/ewmp?authSource=admin" \
  node scripts/copy-to-railway.mjs
```

- `backend/scripts/copy-to-railway.mjs` copies every collection and its indexes from `SOURCE_URI`
  to `TARGET_URI`, wiping the target first. It uses only `mongoose` (a backend dependency) — no
  MongoDB CLI tools needed.
- `SOURCE_URI` defaults to `mongodb://127.0.0.1:27017/ewmp`, which is the owner's local DB — no need
  to set it unless their data lives elsewhere.
- The script **drops every collection in the target `ewmp` database first**, then copies. It prints a
  per-collection count and a grand total. It refuses to run if source and target are identical.

Once the owner reports the grand total, rotate the Mongo password if you want (MongoDB service →
**Variables**), or leave it — the `TARGET_URI` was only shared with the owner.

### Option B — start fresh (if the owner can't run the copy)

Skip the transfer. Seed demo data (and a working login) straight into Railway MongoDB:

```bash
MONGODB_URI="mongodb://mongo:<password>@<host>.proxy.rlwy.net:<port>/ewmp?authSource=admin" \
  npm run seed --prefix backend
```

`npm run seed` **wipes and reloads all collections**. It creates nine demo people (password
`Test@1234` for all — listed at the end of `backend/scripts/seed.mjs`). Log in as
`admin1@ewmp.test`, then through the UI replace the demo people with real ones and
**change or delete every seeded account before real use**.

If you don't want demo data at all: connect a Mongo client to the public URL and insert one `User`
by hand (needs a bcrypt `passwordHash` — the demo hash for `Test@1234` can be lifted from the seed
output, then changed on first login).

---

## 6. Vercel — deploy the frontend

1. **vercel.com → Add New → Project → Import** `sahitya1903/ewmp`.
2. **Root Directory**: `frontend`. Framework preset auto-detects **Next.js** (build `next build`).
3. **Environment Variables** (all environments):

   | Key | Value | Notes |
   |---|---|---|
   | `NEXT_PUBLIC_API_URL` | `/api` | The browser calls the Vercel origin; `apiFetch` prepends this. |
   | `BACKEND_URL` | `https://<service>.up.railway.app` | **No** `NEXT_PUBLIC_` prefix — server-only, read by `next.config.mjs` `rewrites()`. No trailing slash. |

4. **Deploy.** You get `https://<project>.vercel.app`.

---

## 7. Close the loop — point the backend at the real frontend URL

Back in **Railway → backend → Variables**, set both to the Vercel URL from Phase 6:

| Key | Value |
|---|---|
| `CORS_ORIGIN` | `https://<project>.vercel.app` |
| `FRONTEND_URL` | `https://<project>.vercel.app` |

Scheme + host only — no path, no trailing slash. If you add a custom domain later, put the custom
domain here. Railway redeploys the backend automatically.

---

## 8. Verify end to end

1. Open `https://<project>.vercel.app/login` and log in. With Option A data, use an account from the
   owner's database (ask the owner for a login). With Option B, use seeded `admin1@ewmp.test` /
   `Test@1234`.
2. You should land on `/admin`. In DevTools → **Application → Cookies → `https://<project>.vercel.app`**
   confirm a `token` cookie: `HttpOnly`, `Secure`, `SameSite=Lax`.
3. Open `https://<project>.vercel.app/api/health` → `{"ok":true}` — this proves the Vercel → Railway
   proxy works (it's the backend answering through the rewrite).
4. Click around the dashboards; confirm data loads (proves the backend reached MongoDB).

---

## 9. Ongoing deploys

Both hosts watch the connected branch (`main`) and redeploy on push.

- **Railway**: backend service → **Settings → deploy triggers**. Set the watch path to `backend/**`
  so a frontend-only commit doesn't rebuild the backend.
- **Vercel**: with **Root Directory** = `frontend`, Vercel only rebuilds when files under `frontend/`
  change (its default "skip build if no changes in root directory" behavior).

---

## Environment variable reference

**Railway — backend service**

| Key | Example | Set when |
|---|---|---|
| `MONGODB_URI` | `${{MongoDB.MONGO_PRIVATE_URL}}/ewmp?authSource=admin` | Phase 3 |
| `JWT_SECRET` | `a1b2…` (96 hex chars) | Phase 3 |
| `NODE_ENV` | `production` | Phase 3 |
| `CORS_ORIGIN` | `https://ewmp.vercel.app` | Phase 7 |
| `FRONTEND_URL` | `https://ewmp.vercel.app` | Phase 7 |
| `PORT` | *(injected by Railway — never set)* | — |

**Vercel — frontend project**

| Key | Example | Set when |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` | Phase 6 |
| `BACKEND_URL` | `https://ewmp-backend.up.railway.app` | Phase 6 |

**Local only** (`backend/.env`, `frontend/.env.local` — both gitignored): see `backend/.env.example`
and `frontend/.env.example`. Locally `BACKEND_URL` is unset and the frontend calls the backend
directly on `http://localhost:4000/api`.

---

## Gotchas

- **`?authSource=admin` is mandatory** on the Railway Mongo URI. Without it every DB call fails auth.
- **The private URL is not reachable from your laptop.** Phase 5 scripts and any Mongo GUI must use
  `MONGO_PUBLIC_URL` (TCP proxy).
- **`NODE_ENV=production` is load-bearing.** Without it, cookies aren't `Secure` and
  `POST /api/auth/forgot-password` returns the reset link in the response body.
- **No email provider is wired up.** Password-reset links are printed to the **Railway backend logs**
  (`[Password reset] <email> -> <url>`). Until an email provider is added, an admin reads the log and
  forwards the link, or resets the password directly in the database. Worth wiring up before wide
  rollout.
- **Keep Vercel and Railway in the same region** (e.g. both Singapore / India) — every request is
  browser → Vercel → Railway backend → Railway Mongo, so a region mismatch adds a round trip.
- **`JWT_SECRET` never goes in git.** It's the whole session-security boundary.
- **Node version**: the repo sets `engines.node: ">=20"`; Railway's Nixpacks respects it. Pin it
  further with a `NODE_VERSION` variable if you want byte-for-byte reproducible builds.
