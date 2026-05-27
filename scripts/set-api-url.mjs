import { existsSync, readFileSync, writeFileSync } from "node:fs";

const rawUrl = process.argv[2];

if (!rawUrl) {
  console.error("Usage: npm run set:api -- https://your-backend.example.com/api/v1");
  process.exit(1);
}

let apiUrl = rawUrl.trim().replace(/\/$/, "");
if (!apiUrl.endsWith("/api/v1")) {
  apiUrl = `${apiUrl}/api/v1`;
}

if (!/^https?:\/\//.test(apiUrl)) {
  console.error("API URL must start with http:// or https://");
  process.exit(1);
}

const envPath = ".env";
const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const line = `EXPO_PUBLIC_API_URL=${apiUrl}`;
const next = current.match(/^EXPO_PUBLIC_API_URL=/m)
  ? current.replace(/^EXPO_PUBLIC_API_URL=.*$/m, line)
  : `${line}\n${current}`;

writeFileSync(envPath, next);
console.info(`Mobile API URL set to ${apiUrl}`);
