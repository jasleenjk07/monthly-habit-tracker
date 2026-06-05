import crypto from "crypto";
import { db, seedDefaults } from "./db.js";
import { signToken } from "./auth.js";
import { isGoogleConfigured } from "./env.js";

export { isGoogleConfigured };

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

const pendingStates = new Map<string, number>();

export function getGoogleRedirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const railwayHost =
    process.env.RAILWAY_PUBLIC_DOMAIN?.trim() ||
    process.env.RAILWAY_STATIC_URL?.trim();
  if (railwayHost) {
    const base = railwayHost.startsWith("http") ? railwayHost : `https://${railwayHost}`;
    return `${base.replace(/\/$/, "")}/api/auth/google/callback`;
  }

  return `http://localhost:${process.env.PORT ?? 3001}/api/auth/google/callback`;
}

export function getFrontendUrl(req?: { headers: { origin?: string } }): string {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  const origin = req?.headers?.origin;
  if (origin && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin;
  return "http://localhost:5173";
}

export function createOAuthState(): string {
  const state = crypto.randomBytes(24).toString("hex");
  pendingStates.set(state, Date.now() + 10 * 60 * 1000);
  return state;
}

export function verifyOAuthState(state: string): boolean {
  const expires = pendingStates.get(state);
  if (!expires || Date.now() > expires) return false;
  pendingStates.delete(state);
  return true;
}

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
  token_type: string;
};

type GoogleProfile = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function exchangeCodeForProfile(code: string): Promise<GoogleProfile> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: getGoogleRedirectUri(),
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${err}`);
  }

  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  const profileRes = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!profileRes.ok) {
    throw new Error("Failed to fetch Google profile");
  }

  const profile = (await profileRes.json()) as GoogleProfile;
  if (!profile.sub || !profile.email) {
    throw new Error("Google profile missing required fields");
  }
  return profile;
}

export function findOrCreateGoogleUser(profile: GoogleProfile): {
  id: number;
  email: string;
  name: string;
  created_at: string;
} {
  const email = profile.email.trim().toLowerCase();
  const name = profile.name?.trim() || email.split("@")[0];

  let row = db
    .prepare("SELECT id, email, name, created_at FROM users WHERE google_id = ?")
    .get(profile.sub) as { id: number; email: string; name: string; created_at: string } | undefined;

  if (row) return row;

  const byEmail = db
    .prepare("SELECT id, email, name, created_at, google_id FROM users WHERE email = ?")
    .get(email) as
    | { id: number; email: string; name: string; created_at: string; google_id: string | null }
    | undefined;

  if (byEmail) {
    if (byEmail.google_id && byEmail.google_id !== profile.sub) {
      throw new Error("Email already linked to another Google account");
    }
    db.prepare("UPDATE users SET google_id = ? WHERE id = ?").run(profile.sub, byEmail.id);
    return {
      id: byEmail.id,
      email: byEmail.email,
      name: byEmail.name,
      created_at: byEmail.created_at,
    };
  }

  const result = db
    .prepare("INSERT INTO users (email, password_hash, name, google_id) VALUES (?, '', ?, ?)")
    .run(email, name, profile.sub);

  const userId = Number(result.lastInsertRowid);
  seedDefaults(userId);

  return db
    .prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
    .get(userId) as { id: number; email: string; name: string; created_at: string };
}

export function authUserFromGoogle(profile: GoogleProfile): {
  token: string;
  user: { id: number; email: string; name: string; created_at: string };
} {
  const user = findOrCreateGoogleUser(profile);
  const token = signToken(user);
  return { token, user };
}
