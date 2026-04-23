# soyapostol — Railway deployment guide

soyapostol is a two-service full-stack app:

| Service | Stack | Dockerfile |
|---|---|---|
| `backend` | FastAPI + Playwright (headless Chromium) | `Dockerfile.backend` |
| `frontend` | React (CRA) static build served with `serve` | `Dockerfile.frontend` |

Plus **MongoDB** (Railway plugin or MongoDB Atlas).

---

## 1. Provision MongoDB

Pick one:

- **Railway MongoDB plugin** — click *New → Database → MongoDB* in your Railway project. Railway gives you an internal `MONGO_URL` like `mongodb://mongo:PASSWORD@mongo.railway.internal:27017`.
- **MongoDB Atlas** (free tier) — create a cluster, get the connection string.

---

## 2. Deploy the backend service

1. In Railway, click **+ New → Empty Service** (or **Deploy from GitHub repo**).
2. Settings → **Root Directory**: `/` (repo root).
3. Settings → **Build** → set **Dockerfile Path** to `Dockerfile.backend`.
4. Settings → **Networking** → enable **Generate Domain** (you'll get e.g. `soyapostol-api.up.railway.app`).
5. Variables tab — set these (see `backend/.env.example`):

   ```
   MONGO_URL=<from Mongo plugin or Atlas>
   DB_NAME=apostol_db
   JWT_SECRET=<run: python -c "import secrets;print(secrets.token_hex(32))">
   ADMIN_EMAIL=admin@apostol.app
   ADMIN_PASSWORD=<strong password>
   CORS_ORIGINS=https://<your-frontend-domain>.up.railway.app
   COOKIE_SECURE=true
   COOKIE_SAMESITE=none
   ```

6. Deploy. Logs should show `Apostol API started`.
7. Test: `curl https://<your-backend-domain>.up.railway.app/api/` → `{"message":"Apostol API","status":"ok"}`

---

## 3. Deploy the frontend service

1. **+ New → Empty Service** in the same Railway project.
2. Root Directory: `/`.
3. Build → Dockerfile Path: `Dockerfile.frontend`.
4. Networking → Generate Domain (e.g. `soyapostol-web.up.railway.app`).
5. Variables — **add as a BUILD variable** (important: CRA bakes env vars at build time):

   ```
   REACT_APP_BACKEND_URL=https://<your-backend-domain>.up.railway.app
   ```

   In Railway: Variables → the variable is automatically used both at build and runtime, but if you use the new "shared variables" split, make sure it's scoped to *Build*.

6. Deploy. Visit the frontend domain.

---

## 4. Update backend `CORS_ORIGINS` with the real frontend URL

After the frontend domain is live, go back to the backend service and set:

```
CORS_ORIGINS=https://<your-frontend-domain>.up.railway.app
```

Redeploy the backend. Cookie-based auth (login/logout/favorites/Examen upload) requires this exact match.

---

## 5. Verify

| Check | Expected |
|---|---|
| `GET /api/` | `{"message":"Apostol API","status":"ok"}` |
| Open frontend, click **Lecturas** | 4 readings from USCCB in ~2s (first hit populates cache) |
| Open **Biblia** | 73 books; click Génesis → chapter text from Vatican |
| Log in with admin creds | Favorites + Examen upload work |

If Biblia or Lecturas return 503 *"temporarily unavailable"* on the very first request, just retry — Chromium is warming up. Subsequent requests are served from MongoDB cache.

---

## Notes on Playwright on Railway

The backend image is based on `mcr.microsoft.com/playwright/python:v1.58.0-jammy` which ships Chromium and every required system library pre-installed. No custom apt install needed.

If you ever change the Playwright version in `backend/requirements.txt`, update the tag in `Dockerfile.backend` to match.

---

## Optional: put everything behind a single custom domain

If you want `soyapostol.com` to serve the frontend and `soyapostol.com/api` to serve the backend, add a reverse proxy service (e.g., Caddy) or use Railway's **Path-based routing** feature. Not required — separate domains work fine.
