"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

const API = "https://api.telegram.org";

export type TelegramActionState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | undefined;

// Point the bot's webhook at this deployment's /api/telegram.
export async function setWebhookAction(): Promise<TelegramActionState> {
  const { user } = await requireRole([]);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN تنظیم نشده است." };
  if (!site) return { ok: false, error: "NEXT_PUBLIC_SITE_URL تنظیم نشده است." };

  const url = `${site.replace(/\/$/, "")}/api/telegram`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  try {
    const res = await fetch(`${API}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        ...(secret ? { secret_token: secret } : {}),
        allowed_updates: ["message", "callback_query"],
      }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      return { ok: false, error: `تلگرام خطا داد: ${data.description ?? "unknown"}` };
    }

    await logAudit({ actor: user, action: "telegram.set_webhook", target: url });
    revalidatePath("/admin/telegram");
    return { ok: true, message: `Webhook روی ${url} ثبت شد.` };
  } catch (err) {
    console.error("setWebhookAction error:", err);
    return { ok: false, error: "اتصال به API تلگرام ناموفق بود." };
  }
}

// Send a message to every known telegram chat (sessions with channel=telegram).
export async function broadcastAction(
  _prev: TelegramActionState,
  formData: FormData,
): Promise<TelegramActionState> {
  const { user } = await requireRole([]);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN تنظیم نشده است." };

  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 2) return { ok: false, error: "متن پیام خیلی کوتاه است." };
  if (formData.get("confirm") !== "on") {
    return { ok: false, error: "برای ارسال انبوه، تیک تأیید را بزنید." };
  }

  const supabase = getAdminClient();
  const { data: sessions, error } = await supabase
    .from("chat_sessions")
    .select("external_id")
    .eq("channel", "telegram")
    .limit(1000);
  if (error) return { ok: false, error: "خواندن فهرست چت‌های تلگرام ناموفق بود." };

  const chatIds = (sessions ?? [])
    .map((s) => s.external_id.replace(/^telegram_/, ""))
    .filter(Boolean);
  if (chatIds.length === 0) {
    return { ok: false, error: "هنوز هیچ کاربر تلگرامی با بات گفتگو نکرده است." };
  }

  let sent = 0;
  let failed = 0;
  for (const chatId of chatIds) {
    try {
      const res = await fetch(`${API}/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
      const data = (await res.json()) as { ok: boolean };
      if (data.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
    // Stay well under Telegram's ~30 msg/s limit.
    await new Promise((r) => setTimeout(r, 50));
  }

  await logAudit({
    actor: user,
    action: "telegram.broadcast",
    meta: { sent, failed, length: text.length },
  });

  return {
    ok: true,
    message: `ارسال شد به ${sent.toLocaleString("fa-IR")} چت${
      failed ? `؛ ${failed.toLocaleString("fa-IR")} ناموفق` : ""
    }.`,
  };
}
