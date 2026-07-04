import {
  streamText,
  stepCountIs,
  convertToModelMessages,
  type UIMessage,
} from "ai";
import { chatModel } from "./models";
import { getRuntimeChatConfig } from "./config";
import { retrieve } from "./rag";
import {
  resolveSession,
  loadHistory,
  appendMessages,
  refreshMemory,
  type StoredMessage,
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

  // Runtime config from the admin panel (model + persona); fails soft to defaults.
  const config = await getRuntimeChatConfig();

  const chunks = await retrieve(userText, locale, 5);
  const system = buildSystemPrompt({
    chunks,
    memorySummary: session.summary,
    persona: config.persona,
  });

  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: chatModel(config.modelId),
    temperature: config.temperature ?? undefined,
    maxOutputTokens: config.maxOutputTokens ?? undefined,
    system,
    messages: modelMessages,
    tools: buildTools({ sessionId: session.id, channel }),
    stopWhen: stepCountIs(4),
    onFinish: async ({ text, totalUsage }) => {
      const toStore: StoredMessage[] = [];
      if (userText) toStore.push({ role: "user", content: userText });
      if (text?.trim())
        toStore.push({
          role: "assistant",
          content: text.trim(),
          model: config.modelId,
          tokensIn: totalUsage?.inputTokens,
          tokensOut: totalUsage?.outputTokens,
        });
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
