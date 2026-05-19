import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "tracker.db");

export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#1a1a1a',
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform_id INTEGER REFERENCES platforms(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#1a1a1a',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    log_date TEXT NOT NULL,
    completed INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, activity_id, log_date)
  );

  CREATE INDEX IF NOT EXISTS idx_logs_user_date ON daily_logs(user_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
if (!userColumns.some((c) => c.name === "google_id")) {
  db.exec("ALTER TABLE users ADD COLUMN google_id TEXT");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL",
  );
}

export type UserRow = {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  created_at: string;
};

const DEFAULT_PLATFORMS = [
  { name: "LeetCode", color: "#ffa116", url: "https://leetcode.com" },
  { name: "GitHub", color: "#24292e", url: "https://github.com" },
  { name: "Coursera", color: "#0056d2", url: "https://coursera.org" },
];

const DEFAULT_ACTIVITIES = [
  { name: "DSA", color: "#1a1a1a" },
  { name: "Python", color: "#3776ab" },
  { name: "AI/ML", color: "#ff6f00" },
  { name: "Projects", color: "#2e7d32" },
  { name: "LLD", color: "#6a1b9a" },
  { name: "SQL", color: "#1565c0" },
  { name: "Solve Aloud", color: "#c62828" },
  { name: "Daily Planning", color: "#455a64" },
];

export function seedDefaults(userId: number): void {
  const platformCount = db
    .prepare("SELECT COUNT(*) as c FROM platforms WHERE user_id = ?")
    .get(userId) as { c: number };
  if (platformCount.c > 0) return;

  const insertPlatform = db.prepare(
    "INSERT INTO platforms (user_id, name, color, url) VALUES (?, ?, ?, ?)",
  );
  for (const p of DEFAULT_PLATFORMS) {
    insertPlatform.run(userId, p.name, p.color, p.url);
  }

  const insertActivity = db.prepare(
    "INSERT INTO activities (user_id, platform_id, name, color, sort_order) VALUES (?, NULL, ?, ?, ?)",
  );
  DEFAULT_ACTIVITIES.forEach((a, i) => {
    insertActivity.run(userId, a.name, a.color, i);
  });
}
