# Employee Work Management Portal

Two separate apps, connected over HTTP:

```
backend/    Express + Mongoose REST API  (http://localhost:4000)
frontend/   Next.js UI, no API routes    (http://localhost:3000)
```

The frontend never touches MongoDB directly — every request goes through the backend's `/api/*` routes. Auth is a session cookie (`token`, httpOnly, JWT-signed) set by the backend on login; because both apps run on `localhost` (just different ports), the browser sends that cookie to both without extra config. Cross-domain production deploys would need CORS/cookie config revisited.

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

Log in at `http://localhost:3000/login` — seeded test accounts are listed in `backend/scripts/seed.mjs` (password `Test@1234` for all).

## How auth flows

1. `frontend` posts credentials to `backend`'s `POST /api/auth/login`, `credentials: "include"`.
2. `backend` verifies the password, signs a JWT, and sets it as an httpOnly cookie.
3. `frontend/src/middleware.js` only checks that the cookie is *present* before allowing `/dashboard`, `/accounts`, `/admin`, `/management` — it can't verify the signature (the `JWT_SECRET` lives only in `backend`).
4. Each protected page wraps its content in `<RoleGuard allowedRoles={[...]}>`, which calls `backend`'s `GET /api/auth/me` client-side to confirm the actual role and redirects to `/login` if it doesn't match.
