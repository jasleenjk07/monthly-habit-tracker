import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.join(__dirname, "..");
export const envPath = path.join(rootDir, ".env");

const PLACEHOLDER_RE =
  /^(your-client|your-secret|change-this|xxx|placeholder|insert-)/i;

export function isPlaceholder(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const v = value.trim();
  if (PLACEHOLDER_RE.test(v)) return true;
  if (v.includes("your-client-id") || v.includes("your-client-secret")) return true;
  return false;
}

export function isGoogleConfigured(): boolean {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return !isPlaceholder(id) && !isPlaceholder(secret);
}

export function googleConfigSummary(): {
  configured: boolean;
  envFileExists: boolean;
  clientIdSet: boolean;
  secretSet: boolean;
} {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  return {
    configured: isGoogleConfigured(),
    envFileExists: fs.existsSync(envPath),
    clientIdSet: !isPlaceholder(id),
    secretSet: !isPlaceholder(secret),
  };
}
