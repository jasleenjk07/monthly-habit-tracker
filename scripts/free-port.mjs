#!/usr/bin/env node
/** Free a TCP port before dev (avoids stale API server on 3001). */
import { execSync } from "child_process";

const port = process.argv[2] || "3001";

try {
  const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
  if (out) {
    for (const pid of out.split("\n").filter(Boolean)) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        /* already gone */
      }
    }
    console.log(`Freed port ${port}`);
  }
} catch {
  /* nothing listening */
}
