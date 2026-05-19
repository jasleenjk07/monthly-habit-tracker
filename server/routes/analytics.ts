import { Router } from "express";
import { currentMonthKey, daysInMonth } from "../dates.js";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(authMiddleware);

analyticsRouter.get("/", (req, res) => {
  const userId = req.user!.id;
  const month = (req.query.month as string) || currentMonthKey();
  const days = Number(req.query.days) || 30;

  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days + 1);
  const startStr = startDate.toISOString().slice(0, 10);

  const dailyScores = db
    .prepare(
      `SELECT log_date, COUNT(*) as score
       FROM daily_logs
       WHERE user_id = ? AND completed = 1 AND log_date >= ?
       GROUP BY log_date
       ORDER BY log_date`,
    )
    .all(userId, startStr) as { log_date: string; score: number }[];

  const byActivity = db
    .prepare(
      `SELECT a.id, a.name, a.color, COUNT(l.id) as completions
       FROM activities a
       LEFT JOIN daily_logs l ON l.activity_id = a.id AND l.completed = 1
         AND l.log_date >= ?
       WHERE a.user_id = ?
       GROUP BY a.id
       ORDER BY completions DESC`,
    )
    .all(startStr, userId);

  const byPlatform = db
    .prepare(
      `SELECT p.id, p.name, p.color, COUNT(l.id) as completions
       FROM platforms p
       LEFT JOIN activities a ON a.platform_id = p.id
       LEFT JOIN daily_logs l ON l.activity_id = a.id AND l.completed = 1
         AND l.log_date >= ?
       WHERE p.user_id = ?
       GROUP BY p.id
       ORDER BY completions DESC`,
    )
    .all(startStr, userId);

  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;

  const monthDaily = db
    .prepare(
      `SELECT CAST(substr(log_date, 9, 2) AS INTEGER) as day, COUNT(*) as score
       FROM daily_logs
       WHERE user_id = ? AND completed = 1 AND log_date >= ? AND log_date <= ?
       GROUP BY log_date
       ORDER BY log_date`,
    )
    .all(userId, monthStart, monthEnd) as { day: number; score: number }[];

  const totalActivities = (
    db.prepare("SELECT COUNT(*) as c FROM activities WHERE user_id = ?").get(userId) as {
      c: number;
    }
  ).c;

  const totalCheckins = (
    db
      .prepare(
        "SELECT COUNT(*) as c FROM daily_logs WHERE user_id = ? AND completed = 1 AND log_date >= ?",
      )
      .get(userId, startStr) as { c: number }
  ).c;

  const streak = computeStreak(userId);

  res.json({
    month,
    days,
    totalActivities,
    totalCheckins,
    currentStreak: streak,
    dailyScores,
    monthDaily,
    byActivity,
    byPlatform,
  });
});

function computeStreak(userId: number): number {
  const dates = db
    .prepare(
      `SELECT DISTINCT log_date FROM daily_logs
       WHERE user_id = ? AND completed = 1
       ORDER BY log_date DESC
       LIMIT 90`,
    )
    .all(userId) as { log_date: string }[];

  if (dates.length === 0) return 0;

  const set = new Set(dates.map((d) => d.log_date));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  const todayStr = cursor.toISOString().slice(0, 10);
  const yesterday = new Date(cursor);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (!set.has(todayStr) && !set.has(yesterdayStr)) return 0;

  if (!set.has(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (!set.has(key)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
