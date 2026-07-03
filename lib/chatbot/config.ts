import { getAdminClient } from "./supabase-admin";
import { ALLOWED_CHAT_MODELS, type AllowedChatModel } from "./models";

// Runtime chat configuration, editable from the admin panel (model_config and
// prompt_versions tables). Every read fails soft to the hardcoded defaults so
// the chatbot keeps working even before supabase/admin.sql has been applied.

export interface RuntimeChatConfig {
  modelId: AllowedChatModel;
  temperature: number | null;
  maxOutputTokens: number | null;
  persona: string | null; // null => DEFAULT_PERSONA in prompts.ts
}

const DEFAULTS: RuntimeChatConfig = {
  modelId: "gemini-2.5-flash",
  temperature: null,
  maxOutputTokens: null,
  persona: null,
};

const TTL_MS = 60_000;

let cache: { value: RuntimeChatConfig; at: number } | null = null;

export async function getRuntimeChatConfig(): Promise<RuntimeChatConfig> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  let value = DEFAULTS;
  try {
    const supabase = getAdminClient();
    const [modelRes, personaRes] = await Promise.all([
      supabase
        .from("model_config")
        .select("chat_model, temperature, max_output_tokens")
        .eq("id", 1)
        .maybeSingle(),
      supabase
        .from("prompt_versions")
        .select("content")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    const row = modelRes.data;
    value = {
      modelId: (ALLOWED_CHAT_MODELS as readonly string[]).includes(row?.chat_model ?? "")
        ? (row!.chat_model as AllowedChatModel)
        : DEFAULTS.modelId,
      temperature: row?.temperature ?? null,
      maxOutputTokens: row?.max_output_tokens ?? null,
      persona: personaRes.data?.content ?? null,
    };
  } catch (err) {
    console.error("getRuntimeChatConfig error (using defaults):", err);
  }

  cache = { value, at: Date.now() };
  return value;
}

// Called by admin server actions after a write; the 60s TTL covers other
// serverless instances.
export function invalidateChatConfigCache(): void {
  cache = null;
}
