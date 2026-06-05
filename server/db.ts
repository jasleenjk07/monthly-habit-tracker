import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Railway: mount volume at /app/data; set DATA_DIR or use RAILWAY_VOLUME_MOUNT_PATH */
const dataDir =
  process.env.DATA_DIR ??
  process.env.RAILWAY_VOLUME_MOUNT_PATH ??
  path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
export const dbPath = path.join(dataDir, "tracker.db");

export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA synchronous = FULL");

console.log(`SQLite database: ${dbPath}`);

if (process.env.RAILWAY_ENVIRONMENT && !process.env.RAILWAY_VOLUME_MOUNT_PATH) {
  console.warn(
    "WARNING: No Railway volume at /app/data. Tracker data may be lost when the service restarts or redeploys.",
  );
}

/** Flush WAL so writes survive refresh (important on cloud containers). */
export function flushDb(): void {
  try {
    db.exec("PRAGMA wal_checkpoint(FULL)");
  } catch {
    /* ignore */
  }
}

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
