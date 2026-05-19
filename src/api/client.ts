const TOKEN_KEY = "tracker_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.error ?? "Request failed", res.status);
  }
  return data as T;
}

export type User = { id: number; email: string; name: string; created_at: string };

export type Platform = {
  id: number;
  user_id: number;
  name: string;
  color: string;
  url: string | null;
  activity_count?: number;
};

export type Activity = {
  id: number;
  user_id: number;
  platform_id: number | null;
  name: string;
  description: string | null;
  color: string;
  sort_order: number;
  platform_name?: string | null;
  platform_color?: string | null;
};

export type MonthLogs = {
  month: string;
  daysInMonth: number;
  checks: Record<number, Record<number, boolean>>;
};

export type Analytics = {
  month: string;
  days: number;
  totalActivities: number;
  totalCheckins: number;
  currentStreak: number;
  dailyScores: { log_date: string; score: number }[];
  monthDaily: { day: number; score: number }[];
  byActivity: { id: number; name: string; color: string; completions: number }[];
  byPlatform: { id: number; name: string; color: string; completions: number }[];
};
