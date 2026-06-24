import { embed } from "ai";
import { EMBEDDING_MODEL, embeddingOptions } from "./models";
import { getAdminClient } from "./supabase-admin";
import type { Locale } from "@/lib/i18n/config";

export interface RetrievedChunk {
  title: string | null;
  content: string;
  category: string;
  similarity: number;
}

// Embed a single piece of text (used for the user's query at retrieval time).
export async function embedText(value: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value,
    providerOptions: embeddingOptions("RETRIEVAL_QUERY"),
  });
  return embedding;
}

// Retrieve the most relevant knowledge-base chunks for a query via the match_kb
// RPC (cosine similarity over pgvector), scoped to the given locale.
export async function retrieve(
  query: string,
  locale: Locale,
  matchCount = 5,
): Promise<RetrievedChunk[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const embedding = await embedText(trimmed);
  const supabase = getAdminClient();

  const { data, error } = await supabase.rpc("match_kb", {
    query_embedding: embedding,
    match_count: matchCount,
    filter_locale: locale,
  });

  if (error) {
    console.error("match_kb error:", error);
    return [];
  }

  return (data ?? []) as RetrievedChunk[];
}
