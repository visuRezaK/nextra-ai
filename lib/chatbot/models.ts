import { google } from "@ai-sdk/google";
import { gateway } from "@ai-sdk/gateway";
import type { LanguageModel } from "ai";

// Central model configuration for the chatbot brain. Text generation (chat,
// judge, summary) is routed through the Vercel AI Gateway so it isn't capped by
// the Google AI Studio free tier (~20 generate_content requests/day per model,
// which throttled both the live chatbot and the eval runner). Embeddings stay on
// the direct Google key — that's a separate, far larger quota and the gateway's
// embedding coverage for gemini-embedding-001 (custom dims + taskType) is narrow.
//
// MIGRATION-SAFE: the gateway is used only once AI_GATEWAY_API_KEY is set;
// until then we fall back to the direct Google key, so deploying this change
// never breaks the bot mid-migration. Adding the env var (+ redeploy) flips it.
const USE_GATEWAY = Boolean(process.env.AI_GATEWAY_API_KEY);

// Resolve a Gemini text model — via the gateway ("google/<id>") when configured,
// otherwise the direct Google provider. Google-specific provider options and
// tool calling work identically through the gateway.
function geminiModel(id: string): LanguageModel {
  return USE_GATEWAY ? gateway(`google/${id}`) : google(id);
}

// Main conversational model — Gemini 2.5 Flash (great Persian, fast, tool calling).
export const CHAT_MODEL = geminiModel("gemini-2.5-flash");

// Chat models the admin panel may select between (all Gemini — same routing).
export const ALLOWED_CHAT_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
] as const;
export type AllowedChatModel = (typeof ALLOWED_CHAT_MODELS)[number];

// Resolve a configured model id to a provider instance, falling back to the
// default flash model when the id is unknown (e.g. stale DB value).
export function chatModel(id: string): LanguageModel {
  const valid = (ALLOWED_CHAT_MODELS as readonly string[]).includes(id);
  return geminiModel(valid ? id : "gemini-2.5-flash");
}

// Cheaper model used only to maintain the rolling long-term memory summary.
export const SUMMARY_MODEL = geminiModel("gemini-2.5-flash-lite");

// Embeddings — gemini-embedding-001, kept on the DIRECT Google key (separate
// quota from generate_content; not the bottleneck). Its native size is 3072, but
// pgvector's hnsw index caps at 2000 dims, so we truncate (Matryoshka) to 1536 to
// match the vector(1536) column. Cosine search normalizes, so truncation is fine.
export const EMBEDDING_MODEL = google.textEmbedding("gemini-embedding-001");
export const EMBEDDING_DIMENSIONS = 1536;

// Per-call Google embedding options. taskType is set asymmetrically by the
// caller (RETRIEVAL_DOCUMENT when indexing, RETRIEVAL_QUERY when searching).
export function embeddingOptions(taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY") {
  return {
    google: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
      taskType,
    },
  };
}
