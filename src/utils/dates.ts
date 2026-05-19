/** YYYY-MM in the user's local timezone (avoids UTC shift from toISOString). */
export function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

export function currentMonthKey(): string {
  return monthKeyFromDate(new Date());
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split("-").map(Number);
  return monthKeyFromDate(new Date(y, m - 1 + delta, 1));
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function dateForDay(monthKey: string, day: number): string {
  return `${monthKey}-${String(day).padStart(2, "0")}`;
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/** JSON turns numeric keys into strings; normalize for reliable lookups. */
export function normalizeChecks(
  raw: Record<string, Record<string, boolean>> | Record<number, Record<number, boolean>>,
): Record<number, Record<number, boolean>> {
  const out: Record<number, Record<number, boolean>> = {};
  for (const [aid, days] of Object.entries(raw ?? {})) {
    const activityId = Number(aid);
    if (Number.isNaN(activityId)) continue;
    out[activityId] = {};
    for (const [d, val] of Object.entries(days ?? {})) {
      if (val) out[activityId][Number(d)] = true;
    }
  }
  return out;
}

const TRACKER_MONTH_KEY = "tracker_view_month";

export function loadStoredMonthKey(): string {
  const stored = localStorage.getItem(TRACKER_MONTH_KEY);
  if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
  return currentMonthKey();
}

export function storeMonthKey(monthKey: string): void {
  localStorage.setItem(TRACKER_MONTH_KEY, monthKey);
}
