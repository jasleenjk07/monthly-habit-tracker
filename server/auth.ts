import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, type UserRow } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-tracker-secret-change-in-production";

export type AuthPayload = { userId: number; email: string };

export function signToken(user: Pick<UserRow, "id" | "email">): string {
  return jwt.sign({ userId: user.id, email: user.email } satisfies AuthPayload, JWT_SECRET, {
    expiresIn: "30d",
  });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const payload = verifyToken(header.slice(7));
    const user = db
      .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
      .get(payload.userId) as { id: number; email: string; name: string; created_at: string } | undefined;
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; email: string; name: string; created_at: string };
    }
  }
}
