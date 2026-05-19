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

### Google sign-in

Run the interactive setup (creates/updates `.env`):

```bash
npm run setup:google
```

You will need a **Web application** OAuth client from [Google Cloud Console](https://console.cloud.google.com/apis/credentials) with this redirect URI:

```
http://localhost:3001/api/auth/google/callback
```

If Vite uses a different port (e.g. `5174`), set `FRONTEND_URL` when the script asks.

Restart the app:

```bash
npm run dev
```

The server logs `Google sign-in: enabled` when ready. Use **Continue with Google** on login/register.

If the same email was used for password sign-up, Google sign-in links to that account automatically.

### Production

```bash
npm run build
npm start
```

Serves the built UI and API on port `3001`.

## Default data

New accounts get sample activities (DSA, Python, AI/ML, etc.) and platforms (LeetCode, GitHub, Coursera). Edit or delete them anytime.

## Data

SQLite database at `data/tracker.db` (created automatically). Add `data/` to backups if you care about your history.

Set `JWT_SECRET` in production:

```bash
export JWT_SECRET="your-long-random-secret"
npm start
```
# monthly-habit-tracker
