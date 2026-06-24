import { google } from "@ai-sdk/google";

// Central model configuration for the chatbot brain — direct Google provider
// (free Google AI Studio key, no Vercel billing). Swap a model here and every
// surface (web/telegram/widget) follows. Reads GOOGLE_GENERATIVE_AI_API_KEY.

// Main conversational model — Gemini 2.5 Flash (great Persian, fast, tool calling).
export const CHAT_MODEL = google("gemini-2.5-flash");

// Cheaper model used only to maintain the rolling long-term memory summary.
export const SUMMARY_MODEL = google("gemini-2.5-flash-lite");

// Embeddings — gemini-embedding-001. Its native size is 3072, but pgvector's
// hnsw index caps at 2000 dims, so we truncate (Matryoshka) to 1536 to match the
// vector(1536) column. Cosine search normalizes, so truncated vectors are fine.
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
