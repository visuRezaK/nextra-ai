import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { CHAT_MODEL } from "./models";
import { retrieve } from "./rag";
import {
  resolveSession,
  loadHistory,
  appendMessages,
  refreshMemory,
} from "./memory";
import { buildSystemPrompt } from "./prompts";
import { buildTools } from "./tools";
import type { ChatChannel } from "./types";
import type { Locale } from "@/lib/i18n/config";

export interface RunChatParams {
  messages: UIMessage[];
  locale: Locale;
  channel: ChatChannel;
  externalId: string;
  userId: string | null;
}

// Pull the plain text out of the latest user message (used as the RAG query).
function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join(" ")
      .trim();
  }
  return "";
}

// The central brain. Every surface (web/telegram/widget) funnels into this:
//   1. resolve session + load long-term memory
//   2. embed the question -> vector search for grounding context
//   3. build the Persian system prompt (persona + context + memory)
//   4. stream the model with the lead-capture tool (multi-step)
//   5. on finish: persist the turn + refresh the rolling memory summary
export async function runChat(params: RunChatParams) {
  const { messages, locale, channel, externalId, userId } = params;

  const session = await resolveSession({ channel, externalId, userId });
  const userText = lastUserText(messages);

  const chunks = await retrieve(userText, locale, 5);
  const system = buildSystemPrompt({ chunks, memorySummary: session.summary });

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: CHAT_MODEL,
    system,
    messages: modelMessages,
    tools: buildTools({ sessionId: session.id }),
    stopWhen: stepCountIs(4),
    onFinish: async ({ text }) => {
      const toStore: { role: "user" | "assistant"; content: string }[] = [];
      if (userText) toStore.push({ role: "user", content: userText });
      if (text?.trim()) toStore.push({ role: "assistant", content: text.trim() });
      await appendMessages(session.id, toStore);

      const history = await loadHistory(session.id, 12);
      await refreshMemory({
        sessionId: session.id,
        previousSummary: session.summary,
        history,
      });
    },
  });

  return { result, sessionId: session.id };
}
