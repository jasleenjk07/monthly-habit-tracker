import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, type Analytics } from "../api/client";
import { currentMonthKey, daysInMonth } from "../utils/dates";

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const monthKey = useMemo(() => currentMonthKey(), []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<Analytics>(`/analytics?month=${monthKey}&days=${days}`);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [monthKey, days]);

  useEffect(() => {
    load();
  }, [load]);

  const monthChart = useMemo(() => {
    if (!data) return [];
    const numDays = daysInMonth(monthKey);
    const byDay = new Map(data.monthDaily.map((d) => [d.day, d.score]));
    return Array.from({ length: numDays }, (_, i) => ({
      day: i + 1,
      score: byDay.get(i + 1) ?? 0,
    }));
  }, [data, monthKey]);

  const trendChart = useMemo(() => {
    if (!data) return [];
    return data.dailyScores.map((d) => ({
      date: d.log_date.slice(5),
      score: d.score,
    }));
  }, [data]);

  if (loading && !data) return <p className="page-loading">Loading analytics…</p>;
  if (!data) return null;

  return (
    <div className="page">
      <header className="page-header">
        <h1 className="page-title">Analytics</h1>
        <div className="range-control">
          <label>
            Range
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </label>
        </div>
      </header>

      <div className="stat-grid">
        <div className="stat-card card">
          <span className="stat-value">{data.currentStreak}</span>
          <span className="stat-label">Day streak</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">{data.totalCheckins}</span>
          <span className="stat-label">Check-ins ({days}d)</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">{data.totalActivities}</span>
          <span className="stat-label">Activities</span>
        </div>
        <div className="stat-card card">
          <span className="stat-value">
            {data.totalActivities
              ? (data.totalCheckins / (days * data.totalActivities) * 100).toFixed(0)
              : 0}
            %
          </span>
          <span className="stat-label">Completion rate</span>
        </div>
      </div>

      <section className="card chart-card">
        <h2>This month — daily score</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={monthChart}>
            <CartesianGrid stroke="#e8e4dc" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip labelFormatter={(d) => `Day ${d}`} />
            <Line type="monotone" dataKey="score" stroke="#1a1a1a" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <section className="card chart-card">
        <h2>Recent trend</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendChart}>
            <CartesianGrid stroke="#e8e4dc" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#2e7d32" strokeWidth={2} dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </section>

      <div className="analytics-row">
        <section className="card chart-card half">
          <h2>By activity</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.byActivity} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke="#e8e4dc" horizontal={false} />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="completions" fill="#1a1a1a" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="card chart-card half">
          <h2>By platform</h2>
          {data.byPlatform.length === 0 ? (
            <p className="muted">Link activities to platforms to see breakdowns.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.byPlatform}>
                <CartesianGrid stroke="#e8e4dc" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="completions" fill="#1565c0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>
    </div>
  );
}
