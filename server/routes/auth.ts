import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { authMiddleware, signToken } from "../auth.js";
import { googleConfigSummary, isGoogleConfigured } from "../env.js";
import {
  authUserFromGoogle,
  createOAuthState,
  exchangeCodeForProfile,
  getFrontendUrl,
  getGoogleAuthUrl,
  getGoogleRedirectUri,
  verifyOAuthState,
} from "../google.js";

export const authRouter = Router();

authRouter.get("/google/status", (_req, res) => {
  const summary = googleConfigSummary();
  res.json({
    enabled: summary.configured,
    envFileExists: summary.envFileExists,
    clientIdSet: summary.clientIdSet,
    secretSet: summary.secretSet,
    redirectUri: getGoogleRedirectUri(),
    setupCommand: "npm run setup:google",
  });
});

authRouter.get("/google", (req, res) => {
  const frontend = getFrontendUrl(req);
  if (!isGoogleConfigured()) {
    res.redirect(
      `${frontend}/login?error=${encodeURIComponent(
        "Google sign-in is not set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file, then restart the server.",
      )}`,
    );
    return;
  }
  const state = createOAuthState();
  res.redirect(getGoogleAuthUrl(state));
});

authRouter.get("/google/callback", async (req, res) => {
  const frontend = getFrontendUrl(req);

  if (!isGoogleConfigured()) {
    res.redirect(`${frontend}/auth/callback?error=${encodeURIComponent("Google OAuth not configured")}`);
    return;
  }

  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  if (error) {
    res.redirect(`${frontend}/auth/callback?error=${encodeURIComponent(error)}`);
    return;
  }

  if (!code || !state || !verifyOAuthState(state)) {
    res.redirect(
      `${frontend}/auth/callback?error=${encodeURIComponent("Invalid or expired sign-in. Try again.")}`,
    );
    return;
  }

  try {
    const profile = await exchangeCodeForProfile(code);
    const { token } = authUserFromGoogle(profile);
    res.redirect(`${frontend}/auth/callback?token=${encodeURIComponent(token)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google sign-in failed";
    res.redirect(`${frontend}/auth/callback?error=${encodeURIComponent(message)}`);
  }
});

authRouter.post("/register", (req, res) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email?.trim() || !password || password.length < 6) {
    res.status(400).json({ error: "Email and password (min 6 characters) are required" });
    return;
  }

  const displayName = name?.trim() || email.split("@")[0];
  const normalizedEmail = email.trim().toLowerCase();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: "An account with this email already exists" });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db
    .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
    .run(normalizedEmail, passwordHash, displayName);

  const userId = Number(result.lastInsertRowid);

  const user = db
    .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
    .get(userId) as { id: number; email: string; name: string; created_at: string };

  const token = signToken(user);
  res.status(201).json({ token, user });
});

authRouter.post("/login", (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.trim().toLowerCase()) as
    | {
        id: number;
        email: string;
        password_hash: string;
        name: string;
        created_at: string;
        google_id: string | null;
      }
    | undefined;

  if (!user || !user.password_hash) {
    res.status(401).json({
      error: user?.google_id
        ? "This account uses Google sign-in. Continue with Google."
        : "Invalid email or password",
    });
    return;
  }

  if (!bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, created_at: user.created_at },
  });
});

authRouter.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
