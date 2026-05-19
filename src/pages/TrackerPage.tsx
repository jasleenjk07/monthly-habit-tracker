import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type Activity, type MonthLogs } from "../api/client";
import { ApiError } from "../api/client";
import {
  dateForDay,
  formatMonthLabel,
  loadStoredMonthKey,
  normalizeChecks,
  shiftMonthKey,
  storeMonthKey,
} from "../utils/dates";

export default function TrackerPage() {
  const [monthKey, setMonthKey] = useState(() => loadStoredMonthKey());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [logs, setLogs] = useState<MonthLogs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    storeMonthKey(monthKey);
  }, [monthKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setSaveError("");
    try {
      const [actRes, logRes] = await Promise.all([
        api<{ activities: Activity[] }>("/activities"),
        api<MonthLogs>(`/logs?month=${monthKey}`),
      ]);
      setActivities(actRes.activities);
      setLogs({
        ...logRes,
        checks: normalizeChecks(logRes.checks),
      });
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to load tracker data");
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    load();
  }, [load]);

  const numDays = logs?.daysInMonth ?? 31;
  const checks = logs?.checks ?? {};

  const toggle = async (activityId: number, day: number) => {
    const date = dateForDay(monthKey, day);
    const wasChecked = Boolean(checks[activityId]?.[day]);
    const previousLogs = logs;

    setSaveError("");
    setLogs((prev) => {
      if (!prev) return prev;
      const next = { ...prev, checks: { ...prev.checks } };
      next.checks[activityId] = { ...next.checks[activityId] };
      if (!wasChecked) next.checks[activityId][day] = true;
      else delete next.checks[activityId][day];
      return next;
    });

    try {
      await api("/logs/toggle", {
        method: "POST",
        body: JSON.stringify({
          activityId,
          date,
          completed: !wasChecked,
        }),
      });
    } catch (err) {
      setLogs(previousLogs);
      setSaveError(
        err instanceof ApiError ? err.message : "Could not save. Check your connection and try again.",
      );
    }
  };

  const scores = useMemo(() => {
    return Array.from({ length: numDays }, (_, i) => {
      const day = i + 1;
      let score = 0;
      for (const a of activities) {
        if (checks[a.id]?.[day]) score++;
      }
      return score;
    });
  }, [activities, checks, numDays]);

  const chartData = useMemo(
    () => scores.map((score, i) => ({ day: i + 1, score: score === 0 ? null : score })),
    [scores],
  );

  const maxScore = Math.max(activities.length, 1);
  const totalChecked = scores.reduce((a, b) => a + b, 0);

  if (loading && !logs) {
    return <p className="page-loading">Loading tracker…</p>;
  }

  return (
    <div className="page">
      {saveError && (
        <p className="form-error tracker-save-error" role="alert">
          {saveError}
        </p>
      )}
      <header className="page-header">
        <h1 className="page-title">Monthly Habit Tracker</h1>
        <div className="month-control">
          <span className="month-label">Month</span>
          <button
            type="button"
            className="nav-btn"
            onClick={() => setMonthKey(shiftMonthKey(monthKey, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <span className="month-value">{formatMonthLabel(monthKey)}</span>
          <button
            type="button"
            className="nav-btn"
            onClick={() => setMonthKey(shiftMonthKey(monthKey, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </header>

      {activities.length === 0 ? (
        <div className="empty-state card">
          <p>No activities yet.</p>
          <a href="/activities" className="btn btn-primary">
            Add activities
          </a>
        </div>
      ) : (
        <>
          <section className="tracker-section card" aria-label="Habit tracking grid">
            <div className="table-wrap">
              <table className="habit-table">
                <thead>
                  <tr>
                    <th className="col-index" scope="col" />
                    <th className="col-habit" scope="col">
                      Activity
                    </th>
                    {Array.from({ length: numDays }, (_, i) => (
                      <th key={i} className="col-day" scope="col">
                        {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity, hi) => (
                    <tr key={activity.id}>
                      <td className="col-index">{hi + 1}</td>
                      <td className="col-habit">
                        <span
                          className="activity-dot"
                          style={{ background: activity.color }}
                          aria-hidden
                        />
                        {activity.name}
                      </td>
                      {Array.from({ length: numDays }, (_, di) => {
                        const day = di + 1;
                        const checked = Boolean(checks[activity.id]?.[day]);
                        return (
                          <td key={di} className="col-day">
                            <label className="checkbox-cell">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(activity.id, day)}
                                aria-label={`${activity.name} on day ${day}`}
                              />
                              <span className="check-mark" aria-hidden />
                            </label>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="stats">
              {totalChecked} check-ins · avg {(totalChecked / numDays).toFixed(1)} activities/day
            </p>
          </section>

          <section className="graph-section card" aria-label="Daily habits score graph">
            <h2 className="graph-title">Daily habits score</h2>
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 12, right: 16, bottom: 8, left: 4 }}>
                  <CartesianGrid stroke="#d4cfc4" />
                  <XAxis
                    dataKey="day"
                    type="number"
                    domain={[1, numDays]}
                    tick={{ fill: "#1a1a1a", fontSize: 11 }}
                  />
                  <YAxis
                    domain={[0, maxScore]}
                    ticks={Array.from({ length: maxScore }, (_, i) => i + 1)}
                    tick={{ fill: "#1a1a1a", fontSize: 11 }}
                    width={28}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value} activities`, "Score"]}
                    labelFormatter={(day) => `Day ${day}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#1a1a1a"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#1a1a1a" }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
