// One-time script to obtain a Google OAuth refresh token for the booking
// form's Calendar/Meet integration (lib/google/calendar.ts). Run locally,
// then paste the printed refresh token into .env.local and Vercel as
// GOOGLE_REFRESH_TOKEN.
//
// Prerequisite: a Google Cloud OAuth client (type "Web application") with
// http://localhost:53682/oauth2callback added as an authorized redirect URI,
// and the Calendar API enabled on the project. Set GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET in .env.local first.
//
// Usage: node scripts/google-oauth-setup.mjs

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}
loadEnvLocal();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET باید در .env.local مقداردهی شده باشند.");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("\nاین لینک را در مرورگر باز کن و با اکانت گوگلی که می‌خواهی جلسات روی آن ساخته شود وارد شو:\n");
console.log(authUrl.toString());
console.log("\nمنتظر تایید...\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    res.writeHead(400, { "content-type": "text/html; charset=utf-8" }).end(
      "خطا در احراز هویت. پنجره را ببند و دوباره تلاش کن."
    );
    server.close();
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();

    if (!tokenRes.ok || !tokens.refresh_token) {
      console.error("\nتوکن گرفته نشد:", tokens);
      res.writeHead(500, { "content-type": "text/html; charset=utf-8" }).end(
        "توکن گرفته نشد — اگر قبلاً با همین اکانت اجازه داده‌ای، دسترسی برنامه را از myaccount.google.com/permissions بردار و دوباره امتحان کن (Google فقط بار اول refresh_token می‌فرستد)."
      );
    } else {
      console.log("\nاین مقدار را به عنوان GOOGLE_REFRESH_TOKEN در .env.local و در Vercel قرار بده:\n");
      console.log(tokens.refresh_token);
      console.log("");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(
        "<h2>انجام شد ✅</h2><p>refresh token در ترمینال چاپ شد. این پنجره را می‌توانی ببندی.</p>"
      );
    }
  } catch (err) {
    console.error(err);
    res.writeHead(500).end("خطا");
  } finally {
    server.close();
  }
});

server.listen(PORT, () => {
  // no-op; the auth URL above already tells the user what to do next
});
