/** Backend origin in production (e.g. https://your-app.up.railway.app). Empty in local dev (Vite proxy). */
export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_URL?.trim();
  if (!url) return "";
  return url.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return `/api${p}`;
  return `${base}/api${p}`;
}
