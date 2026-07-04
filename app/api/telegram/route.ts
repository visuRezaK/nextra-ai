import { after } from "next/server";
import type { UIMessage } from "ai";
import { runChat } from "@/lib/chatbot/brain";
import { resolveSession, loadHistory } from "@/lib/chatbot/memory";
import type { StoredMessage } from "@/lib/chatbot/memory";
import { defaultLocale } from "@/lib/i18n/config";

export const runtime = "nodejs";
export const maxDuration = 60;

interface TelegramMessage {
  message_id: number;
  from?: { id: number; first_name: string; username?: string };
  chat: { id: number; type: string };
  text?: string;
  date: number;
}

interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  message?: TelegramMessage;
  data?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function tgPost(method: string, body: object): Promise<void> {
  if (!TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function toUIMessages(history: StoredMessage[]): UIMessage[] {
  return history.map((m, i) => ({
    id: `h${i}`,
    role: m.role,
    parts: [{ type: "text" as const, text: m.content }],
  }));
}

async function handleMessage(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();
  const messageId = msg.message_id;
  const externalId = `telegram_${chatId}`;

  if (!text) return;

  await tgPost("sendChatAction", { chat_id: chatId, action: "typing" });

  if (text === "/start") {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: "سلام! من دستیار هوش مصنوعی Nextra AI هستم 👋\nچطور می‌تونم کمکتون کنم؟",
    });
    return;
  }

  const { id: sessionId } = await resolveSession({
    channel: "telegram",
    externalId,
    userId: null,
  });

  const history = await loadHistory(sessionId, 12);

  const messages: UIMessage[] = [
    ...toUIMessages(history),
    {
      id: `tg-${messageId}`,
      role: "user",
      parts: [{ type: "text", text }],
    },
  ];

  const { result } = await runChat({
    messages,
    locale: defaultLocale,
    channel: "telegram",
    externalId,
    userId: null,
  });

  const reply = (await result.text).trim();
  if (!reply) return;

  // Split at 4096-char Telegram limit; feedback buttons go on the last chunk.
  const chunks = reply.match(/[\s\S]{1,4096}/g) ?? [reply];
  for (let i = 0; i < chunks.length; i++) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      ...(i === 0 ? { reply_to_message_id: messageId } : {}),
      ...(i === chunks.length - 1
        ? {
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "👍", callback_data: "fb:1" },
                  { text: "👎", callback_data: "fb:-1" },
                ],
              ],
            },
          }
        : {}),
    });
  }
}

// 👍/👎 pressed under a bot reply — store it in chat_feedback (same table the
// website thumbs use) and thank the user.
async function handleCallback(cb: TelegramCallbackQuery): Promise<void> {
  const match = /^fb:(-?1)$/.exec(cb.data ?? "");
  const chatId = cb.message?.chat.id;

  if (match && chatId) {
    const rating = Number(match[1]) as 1 | -1;
    const answer = cb.message?.text ?? null;

    try {
      const { getAdminClient } = await import("@/lib/chatbot/supabase-admin");
      const supabase = getAdminClient();

      const { data: session } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("channel", "telegram")
        .eq("external_id", `telegram_${chatId}`)
        .maybeSingle();

      // The rated answer text is on the callback; find the question that
      // preceded it in the stored history (best-effort).
      let question: string | null = null;
      if (session && answer) {
        const { data: q } = await supabase
          .from("chat_messages")
          .select("content")
          .eq("session_id", session.id)
          .eq("role", "user")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        question = q?.content ?? null;
      }

      const { error } = await supabase.from("chat_feedback").insert({
        session_id: session?.id ?? null,
        rating,
        question,
        answer: answer?.slice(0, 4000) ?? null,
        locale: "fa",
      });
      if (error) console.error("[Telegram] feedback insert error:", error);
    } catch (err) {
      console.error("[Telegram] feedback error:", err);
    }

    // Remove the buttons so the vote is visibly locked in.
    await tgPost("editMessageReplyMarkup", {
      chat_id: chatId,
      message_id: cb.message?.message_id,
      reply_markup: { inline_keyboard: [] },
    });
  }

  await tgPost("answerCallbackQuery", {
    callback_query_id: cb.id,
    text: match ? "ممنون از بازخوردتان! 🙏" : undefined,
  });
}

export async function POST(request: Request) {
  if (!TOKEN) return new Response("Bot not configured", { status: 503 });

  if (WEBHOOK_SECRET) {
    const secret = request.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== WEBHOOK_SECRET) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let update: TelegramUpdate;
  try {
    update = await request.json();
  } catch {
    return new Response("OK", { status: 200 });
  }

  // Feedback button presses arrive as callback_query updates.
  const cb = update.callback_query;
  if (cb) {
    after(async () => {
      try {
        await handleCallback(cb);
      } catch (err) {
        console.error("[Telegram] callback error:", err);
      }
    });
    return new Response("OK", { status: 200 });
  }

  const msg = update.message;
  if (!msg?.text) return new Response("OK", { status: 200 });

  after(async () => {
    try {
      await handleMessage(msg);
    } catch (err) {
      console.error("[Telegram] handler error:", err);
      try {
        await tgPost("sendMessage", {
          chat_id: msg.chat.id,
          text: "متأسفم، مشکلی پیش آمد. لطفاً دوباره امتحان کنید.",
        });
      } catch {}
    }
  });

  return new Response("OK", { status: 200 });
}
