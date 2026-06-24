import { randomUUID } from "crypto";
import type { UIMessage } from "ai";
import { runChat } from "@/lib/chatbot/brain";
import { createClient } from "@/lib/supabase/server";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 60;

const COOKIE = "chat_sid";

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function POST(request: Request) {
  let body: { messages?: UIMessage[]; locale?: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const messages = body.messages ?? [];
  const locale: Locale = isLocale(body.locale ?? "")
    ? (body.locale as Locale)
    : defaultLocale;

  // Anonymous session id — persists a guest's conversation across reloads.
  let sid = readCookie(request.headers.get("cookie"), COOKIE);
  let setCookie: string | undefined;
  if (!sid) {
    sid = randomUUID();
    setCookie = `${COOKIE}=${sid}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax; HttpOnly`;
  }

  // Logged-in user (optional) — lets long-term memory follow them.
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    userId = null;
  }

  const { result } = await runChat({
    messages,
    locale,
    channel: "web",
    externalId: sid,
    userId,
  });

  return result.toUIMessageStreamResponse(
    setCookie ? { headers: { "Set-Cookie": setCookie } } : undefined,
  );
}
