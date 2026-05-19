import { Router } from "express";
import { db } from "../db.js";
import { authMiddleware } from "../auth.js";

export const platformsRouter = Router();
platformsRouter.use(authMiddleware);

platformsRouter.get("/", (req, res) => {
  const platforms = db
    .prepare(
      `SELECT p.*, 
        (SELECT COUNT(*) FROM activities a WHERE a.platform_id = p.id) as activity_count
       FROM platforms p WHERE p.user_id = ? ORDER BY p.name`,
    )
    .all(req.user!.id);
  res.json({ platforms });
});

platformsRouter.post("/", (req, res) => {
  const { name, color, url } = req.body as { name?: string; color?: string; url?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Platform name is required" });
    return;
  }
  const result = db
    .prepare("INSERT INTO platforms (user_id, name, color, url) VALUES (?, ?, ?, ?)")
    .run(req.user!.id, name.trim(), color ?? "#1a1a1a", url?.trim() || null);
  const platform = db.prepare("SELECT * FROM platforms WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ platform });
});

platformsRouter.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, color, url } = req.body as { name?: string; color?: string; url?: string };
  const existing = db
    .prepare("SELECT id FROM platforms WHERE id = ? AND user_id = ?")
    .get(id, req.user!.id);
  if (!existing) {
    res.status(404).json({ error: "Platform not found" });
    return;
  }
  if (name !== undefined) {
    db.prepare("UPDATE platforms SET name = ? WHERE id = ?").run(name.trim(), id);
  }
  if (color !== undefined) {
    db.prepare("UPDATE platforms SET color = ? WHERE id = ?").run(color, id);
  }
  if (url !== undefined) {
    db.prepare("UPDATE platforms SET url = ? WHERE id = ?").run(url?.trim() || null, id);
  }
  const platform = db.prepare("SELECT * FROM platforms WHERE id = ?").get(id);
  res.json({ platform });
});

platformsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const result = db
    .prepare("DELETE FROM platforms WHERE id = ? AND user_id = ?")
    .run(id, req.user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: "Platform not found" });
    return;
  }
  res.status(204).send();
});
