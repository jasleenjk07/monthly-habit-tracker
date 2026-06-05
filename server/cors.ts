import type { CorsOptions } from "cors";

const LOCAL_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

export function getCorsOptions(): CorsOptions {
  const allowed = new Set<string>(LOCAL_ORIGINS);

  if (process.env.FRONTEND_URL) {
    allowed.add(process.env.FRONTEND_URL.replace(/\/$/, ""));
  }

  if (process.env.CORS_ORIGINS) {
    for (const o of process.env.CORS_ORIGINS.split(",")) {
      const trimmed = o.trim().replace(/\/$/, "");
      if (trimmed) allowed.add(trimmed);
    }
  }

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.replace(/\/$/, "");
      if (allowed.has(normalized)) {
        callback(null, true);
        return;
      }
      // Allow all Vercel preview + production URLs (*.vercel.app)
      if (/^https:\/\/[\w-]+\.vercel\.app$/.test(normalized)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  };
}
