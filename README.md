# Daily Tracker

Full-stack habit and activity tracker with authentication, custom activities, learning platforms, monthly grid tracking, and analytics.

## Features

- **Register / Login** — email/password or **Google OAuth**
- **Activities** — add, delete, and color-code habits (DSA, Python, etc.)
- **Platforms** — LeetCode, GitHub, Coursera, or your own links
- **Monthly tracker** — checkbox grid by day, auto-saved to the database
- **Analytics** — streak, completion rate, daily score charts, breakdown by activity/platform

## Run locally

Requires [Node.js](https://nodejs.org) (includes npm). On macOS with Homebrew:

```bash
brew install node
export PATH="/opt/homebrew/bin:$PATH"
```

Install and start **both** the API server and the frontend:

```bash
cd daily-tracker
npm install
npm run dev
```

Open **http://localhost:5173**

- Frontend: port `5173` (proxies `/api` to the server)
- API: port `3001`

### Google sign-in (local)

```bash
npm run setup:google
```

Redirect URI in Google Cloud Console:

```
http://localhost:3001/api/auth/google/callback
```

Restart `npm run dev`. The server logs `Google sign-in: enabled` when ready.

---

## Deploy (recommended: Railway + Vercel)

The app splits into:

| Part | Platform | Why |
|------|----------|-----|
| **API** (Express + SQLite) | [Railway](https://railway.app) | Long-running Node server + persistent disk |
| **Frontend** (React/Vite) | [Vercel](https://vercel.com) | Static SPA hosting |

### 1. Deploy backend on Railway

1. Create a project at [railway.app](https://railway.app) → **Deploy from GitHub** → select this repo.
2. Railway detects Node and runs `npm start` (see `railway.toml`).
3. Add a **Volume** mounted at `/app/data` so SQLite persists (Settings → Volumes).
4. Set **Variables** in Railway:

   | Variable | Example |
   |----------|---------|
   | `JWT_SECRET` | long random string |
   | `FRONTEND_URL` | `https://monthly-habit-tracker-c4ws.vercel.app` |
   | `GOOGLE_CLIENT_ID` | from Google Cloud |
   | `GOOGLE_CLIENT_SECRET` | from Google Cloud |
   | `GOOGLE_REDIRECT_URI` | `https://YOUR-RAILWAY-URL.up.railway.app/api/auth/google/callback` |

5. Copy your Railway public URL (e.g. `https://daily-tracker-production.up.railway.app`).
6. Test: open `https://YOUR-RAILWAY-URL/api/health` — you should see JSON.

### 2. Deploy frontend on Vercel

1. Import the same repo on [vercel.com](https://vercel.com).
2. Framework: **Vite** (or use the included `vercel.json`).
3. Add **Environment Variable**:

   | Name | Value |
   |------|-------|
   | `VITE_API_URL` | `https://YOUR-RAILWAY-URL.up.railway.app` (no trailing slash) |

4. Deploy. Open your Vercel URL → login / Google sign-in should work.

### 3. Google Cloud Console

In [Credentials](https://console.cloud.google.com/apis/credentials) → your OAuth client:

| Setting | Value |
|---------|-------|
| **Authorized redirect URIs** | `https://YOUR-RAILWAY-URL.up.railway.app/api/auth/google/callback` |
| **Authorized JavaScript origins** | `https://YOUR-VERCEL-URL.vercel.app` |

Keep the localhost redirect URI for local dev.

### Troubleshooting

- **404 on `/api/auth/google` on Vercel** — API must run on Railway; set `VITE_API_URL` on Vercel.
- **CORS errors** — set `FRONTEND_URL` on Railway to your exact Vercel URL (no trailing slash).
- **Data lost on Railway** — attach a volume at `/app/data`.
- **Google redirect mismatch** — `GOOGLE_REDIRECT_URI` must match Railway callback URL exactly.

---

## Default data

New accounts get sample activities and platforms. Edit or delete them anytime.

## Data

SQLite database at `data/tracker.db` (created automatically). Back up `data/` in production.
