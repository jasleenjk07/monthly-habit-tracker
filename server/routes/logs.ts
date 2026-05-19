import { Router } from "express";
import { currentMonthKey, daysInMonth } from "../dates.js";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";

export const logsRouter = Router();
logsRouter.use(authMiddleware);

logsRouter.get("/", (req, res) => {
  const month = (req.query.month as string) || currentMonthKey();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "Invalid month format (use YYYY-MM)" });
    return;
  }

  const [year, mon] = month.split("-").map(Number);
  const start = `${month}-01`;
  const end = `${month}-${String(daysInMonth(month)).padStart(2, "0")}`;

  const logs = db
    .prepare(
      `SELECT activity_id, log_date, completed, notes
       FROM daily_logs
       WHERE user_id = ? AND log_date >= ? AND log_date <= ?`,
    )
    .all(req.user!.id, start, end) as {
    activity_id: number;
    log_date: string;
    completed: number;
    notes: string | null;
  }[];

  const byActivity: Record<number, Record<number, boolean>> = {};
  for (const log of logs) {
    if (!log.completed) continue;
    const day = Number(log.log_date.slice(8, 10));
    if (!byActivity[log.activity_id]) byActivity[log.activity_id] = {};
    byActivity[log.activity_id][day] = true;
  }

  res.json({ month, daysInMonth: daysInMonth(month), checks: byActivity });
});

logsRouter.post("/toggle", (req, res) => {
  const { activityId, date, completed } = req.body as {
    activityId?: number;
    date?: string;
    completed?: boolean;
  };

  if (!activityId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "activityId and date (YYYY-MM-DD) are required" });
    return;
  }

  const activity = db
    .prepare("SELECT id FROM activities WHERE id = ? AND user_id = ?")
    .get(activityId, req.user!.id);
  if (!activity) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  const shouldComplete = completed !== false;

  if (shouldComplete) {
    db.prepare(
      `INSERT INTO daily_logs (user_id, activity_id, log_date, completed)
       VALUES (?, ?, ?, 1)
       ON CONFLICT(user_id, activity_id, log_date) DO UPDATE SET completed = 1`,
    ).run(req.user!.id, activityId, date);
  } else {
    db.prepare(
      "DELETE FROM daily_logs WHERE user_id = ? AND activity_id = ? AND log_date = ?",
    ).run(req.user!.id, activityId, date);
  }

  res.json({ ok: true, activityId, date, completed: shouldComplete });
});

logsRouter.post("/bulk", (req, res) => {
  const { entries } = req.body as {
    entries?: { activityId: number; date: string; completed: boolean }[];
  };
  if (!Array.isArray(entries)) {
    res.status(400).json({ error: "entries array required" });
    return;
  }

  const insert = db.prepare(
    `INSERT INTO daily_logs (user_id, activity_id, log_date, completed)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(user_id, activity_id, log_date) DO UPDATE SET completed = 1`,
  );
  const remove = db.prepare(
    "DELETE FROM daily_logs WHERE user_id = ? AND activity_id = ? AND log_date = ?",
  );

  for (const e of entries) {
    const activity = db
      .prepare("SELECT id FROM activities WHERE id = ? AND user_id = ?")
      .get(e.activityId, req.user!.id);
    if (!activity) continue;
    if (e.completed) insert.run(req.user!.id, e.activityId, e.date);
    else remove.run(req.user!.id, e.activityId, e.date);
  }

  res.json({ ok: true });
});
