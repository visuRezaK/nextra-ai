"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

export type OperatorReplyState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

// Send a human-operator reply into a telegram conversation, via the bot.
// (Web/widget sessions have no push channel, so replies there go through the
// lead's contact info instead.)
export async function sendOperatorMessageAction(
  _prev: OperatorReplyState,
  formData: FormData,
): Promise<OperatorReplyState> {
  const { user } = await requireRole(["operator"]);

  const sessionId = String(formData.get("session_id") ?? "");
  const text = String(formData.get("text") ?? "").trim();
  if (!sessionId || text.length < 1) return { ok: false, error: "متن پیام خالی است." };

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN تنظیم نشده است." };

  const supabase = getAdminClient();
  const { data: session } = await supabase
    .from("chat_sessions")
    .select("id, channel, external_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) return { ok: false, error: "گفتگو یافت نشد." };
  if (session.channel !== "telegram") {
    return { ok: false, error: "ارسال مستقیم فقط برای گفتگوهای تلگرام ممکن است." };
  }

  const chatId = session.external_id.replace(/^telegram_/, "");
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `👤 ${text}` }),
    });
    const data = (await res.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      return { ok: false, error: `تلگرام خطا داد: ${data.description ?? "unknown"}` };
    }
  } catch (err) {
    console.error("sendOperatorMessage error:", err);
    return { ok: false, error: "اتصال به تلگرام ناموفق بود." };
  }

  // Store in the transcript; model='operator' marks it as human, and the bot
  // sees it as prior assistant context in future turns.
  const { error: insertError } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: text,
    model: "operator",
  });
  if (insertError) console.error("operator message insert error:", insertError);

  await logAudit({
    actor: user,
    action: "handoff.reply",
    target: sessionId,
    meta: { length: text.length },
  });
  revalidatePath(`/admin/conversations/${sessionId}`);
  return { ok: true };
}

// Mark the handoff request as handled.
export async function resolveHandoffAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const sessionId = String(formData.get("session_id") ?? "");
  if (!sessionId) return;

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("chat_sessions")
    .update({ handoff_resolved_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (error) console.error("resolveHandoff error:", error);

  await logAudit({ actor: user, action: "handoff.resolve", target: sessionId });
  revalidatePath(`/admin/conversations/${sessionId}`);
  revalidatePath("/admin/conversations");
}
