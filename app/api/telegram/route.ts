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

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
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

  // Split at 4096-char Telegram limit
  const chunks = reply.match(/[\s\S]{1,4096}/g) ?? [reply];
  for (let i = 0; i < chunks.length; i++) {
    await tgPost("sendMessage", {
      chat_id: chatId,
      text: chunks[i],
      ...(i === 0 ? { reply_to_message_id: messageId } : {}),
    });
  }
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
