import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __envDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__envDir, "..", ".env") });

import express from "express";
import cors from "cors";
import fs from "fs";
import { googleConfigSummary, isGoogleConfigured } from "./env.js";
import "./db.js";
import { authRouter } from "./routes/auth.js";
import { platformsRouter } from "./routes/platforms.js";
import { activitiesRouter } from "./routes/activities.js";
import { logsRouter } from "./routes/logs.js";
import { analyticsRouter } from "./routes/analytics.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const g = googleConfigSummary();
  res.json({
    ok: true,
    google: {
      enabled: g.configured,
      envFileExists: g.envFileExists,
      clientIdSet: g.clientIdSet,
      secretSet: g.secretSet,
      setupCommand: "npm run setup:google",
    },
  });
});

/** Registered on app (not only router) so status works even if auth module is cached */
app.get("/api/auth/google/status", (_req, res) => {
  const g = googleConfigSummary();
  res.json({
    enabled: g.configured,
    envFileExists: g.envFileExists,
    clientIdSet: g.clientIdSet,
    secretSet: g.secretSet,
    setupCommand: "npm run setup:google",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/platforms", platformsRouter);
app.use("/api/activities", activitiesRouter);
app.use("/api/logs", logsRouter);
app.use("/api/analytics", analyticsRouter);

const distPath = path.join(__dirname, "..", "dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`API server running at http://localhost:${PORT}`);
  if (isGoogleConfigured()) {
    console.log("Google sign-in: enabled");
  } else {
    console.log("Google sign-in: not configured — run: npm run setup:google");
  }
});
