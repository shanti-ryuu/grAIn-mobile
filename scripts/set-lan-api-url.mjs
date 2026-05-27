import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function getLanIp() {
  for (const iface of ["en0", "en1"]) {
    try {
      const value = execFileSync("ipconfig", ["getifaddr", iface], { encoding: "utf8" }).trim();
      if (value) {
        return value;
      }
    } catch {
      // Try the next interface.
    }
  }

  throw new Error("Unable to detect LAN IP. Set EXPO_PUBLIC_API_URL manually in .env.");
}

const envPath = ".env";
const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const nextUrl = `http://${getLanIp()}:3000/api/v1`;
const line = `EXPO_PUBLIC_API_URL=${nextUrl}`;
const next = current.match(/^EXPO_PUBLIC_API_URL=/m)
  ? current.replace(/^EXPO_PUBLIC_API_URL=.*$/m, line)
  : `${line}\n${current}`;

writeFileSync(envPath, next);
console.info(`Mobile API URL set to ${nextUrl}`);
