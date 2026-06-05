import { Router } from "express";
import { db, flushDb } from "../db.js";
import { authMiddleware } from "../auth.js";

export const activitiesRouter = Router();
activitiesRouter.use(authMiddleware);

activitiesRouter.get("/", (req, res) => {
  const activities = db
    .prepare(
      `SELECT a.*, p.name as platform_name, p.color as platform_color
       FROM activities a
       LEFT JOIN platforms p ON p.id = a.platform_id
       WHERE a.user_id = ?
       ORDER BY a.sort_order, a.name`,
    )
    .all(req.user!.id);
  res.json({ activities });
});

activitiesRouter.post("/", (req, res) => {
  const { name, description, color, platformId } = req.body as {
    name?: string;
    description?: string;
    color?: string;
    platformId?: number | null;
  };
  if (!name?.trim()) {
    res.status(400).json({ error: "Activity name is required" });
    return;
  }

  if (platformId) {
    const platform = db
      .prepare("SELECT id FROM platforms WHERE id = ? AND user_id = ?")
      .get(platformId, req.user!.id);
    if (!platform) {
      res.status(400).json({ error: "Invalid platform" });
      return;
    }
  }

  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) as m FROM activities WHERE user_id = ?")
    .get(req.user!.id) as { m: number };

  const result = db
    .prepare(
      "INSERT INTO activities (user_id, platform_id, name, description, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .run(
      req.user!.id,
      platformId ?? null,
      name.trim(),
      description?.trim() || null,
      color ?? "#1a1a1a",
      maxOrder.m + 1,
    );

  const activity = db
    .prepare(
      `SELECT a.*, p.name as platform_name, p.color as platform_color
       FROM activities a LEFT JOIN platforms p ON p.id = a.platform_id WHERE a.id = ?`,
    )
    .get(result.lastInsertRowid);
  flushDb();
  res.status(201).json({ activity });
});

activitiesRouter.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, description, color, platformId, sortOrder } = req.body as {
    name?: string;
    description?: string;
    color?: string;
    platformId?: number | null;
    sortOrder?: number;
  };

  const existing = db
    .prepare("SELECT id FROM activities WHERE id = ? AND user_id = ?")
    .get(id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }

  if (name !== undefined) db.prepare("UPDATE activities SET name = ? WHERE id = ?").run(name.trim(), id);
  if (description !== undefined) {
    db.prepare("UPDATE activities SET description = ? WHERE id = ?").run(description?.trim() || null, id);
  }
  if (color !== undefined) db.prepare("UPDATE activities SET color = ? WHERE id = ?").run(color, id);
  if (platformId !== undefined) {
    db.prepare("UPDATE activities SET platform_id = ? WHERE id = ?").run(platformId, id);
  }
  if (sortOrder !== undefined) {
    db.prepare("UPDATE activities SET sort_order = ? WHERE id = ?").run(sortOrder, id);
  }

  const activity = db
    .prepare(
      `SELECT a.*, p.name as platform_name, p.color as platform_color
       FROM activities a LEFT JOIN platforms p ON p.id = a.platform_id WHERE a.id = ?`,
    )
    .get(id);
  flushDb();
  res.json({ activity });
});

activitiesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const result = db
    .prepare("DELETE FROM activities WHERE id = ? AND user_id = ?")
    .run(id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Activity not found" });
    return;
  }
  flushDb();
  res.status(204).send();
});
