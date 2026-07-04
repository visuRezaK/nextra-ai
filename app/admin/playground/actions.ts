"use server";

import { generateText } from "ai";
import { requireRole } from "@/lib/admin/auth";
import { retrieve, type RetrievedChunk } from "@/lib/chatbot/rag";
import { chatModel, ALLOWED_CHAT_MODELS } from "@/lib/chatbot/models";
import { buildSystemPrompt } from "@/lib/chatbot/prompts";
import { getRuntimeChatConfig } from "@/lib/chatbot/config";

export interface PlaygroundAnswer {
  model: string;
  text: string;
  ms: number;
  tokensIn: number | null;
  tokensOut: number | null;
  error?: string;
}

export type PlaygroundState =
  | {
      ok: true;
      query: string;
      chunks: RetrievedChunk[];
      answers: PlaygroundAnswer[];
    }
  | { ok: false; error: string }
  | undefined;

// Run the exact production pipeline (retrieve -> system prompt -> generate)
// against one or two models, without touching sessions, memory or tools.
export async function comparePlaygroundAction(
  _prev: PlaygroundState,
  formData: FormData,
): Promise<PlaygroundState> {
  await requireRole(["editor"]);

  const query = String(formData.get("query") ?? "").trim();
  const locale = String(formData.get("locale") ?? "fa");
  const personaDraft = String(formData.get("persona") ?? "").trim();
  const modelA = String(formData.get("model_a") ?? "");
  const modelB = String(formData.get("model_b") ?? "");

  if (!query) return { ok: false, error: "متن سؤال را وارد کنید." };
  if (locale !== "fa" && locale !== "en") return { ok: false, error: "زبان نامعتبر است." };

  const models = [modelA, modelB]
    .filter((m): m is string => (ALLOWED_CHAT_MODELS as readonly string[]).includes(m))
    // De-dupe: comparing a model against itself is a waste of tokens.
    .filter((m, i, arr) => arr.indexOf(m) === i);
  if (models.length === 0) return { ok: false, error: "دست‌کم یک مدل معتبر انتخاب کنید." };

  try {
    const [config, chunks] = await Promise.all([
      getRuntimeChatConfig(),
      retrieve(query, locale, 5),
    ]);
    const system = buildSystemPrompt({
      chunks,
      memorySummary: null,
      persona: personaDraft || config.persona,
    });

    const answers = await Promise.all(
      models.map(async (modelId): Promise<PlaygroundAnswer> => {
        const started = Date.now();
        try {
          const { text, usage } = await generateText({
            model: chatModel(modelId),
            temperature: config.temperature ?? undefined,
            maxOutputTokens: config.maxOutputTokens ?? undefined,
            system,
            prompt: query,
          });
          return {
            model: modelId,
            text,
            ms: Date.now() - started,
            tokensIn: usage?.inputTokens ?? null,
            tokensOut: usage?.outputTokens ?? null,
          };
        } catch (err) {
          console.error("playground generate error:", err);
          return {
            model: modelId,
            text: "",
            ms: Date.now() - started,
            tokensIn: null,
            tokensOut: null,
            error: "تولید پاسخ ناموفق بود.",
          };
        }
      }),
    );

    return { ok: true, query, chunks, answers };
  } catch (err) {
    console.error("playground error:", err);
    return { ok: false, error: "اجرای پلی‌گراند ناموفق بود." };
  }
}
