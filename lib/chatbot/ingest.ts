import { embedMany } from "ai";
import { EMBEDDING_MODEL, embeddingOptions } from "./models";
import { getAdminClient } from "./supabase-admin";
import { getDictionary, type Dictionary } from "@/lib/i18n/dictionaries";
import { locales } from "@/lib/i18n/config";

interface Chunk {
  category: string;
  title: string | null;
  content: string;
}

// Turn the i18n dictionary into retrievable knowledge-base chunks:
// one record per FAQ Q/A and per marketing section (good recall, low noise).
function buildChunks(dict: Dictionary): Chunk[] {
  const chunks: Chunk[] = [];

  chunks.push({
    category: "brand",
    title: dict.brand.name,
    content: `${dict.brand.name} — ${dict.brand.tagline}. ${dict.hero.subtitle}`,
  });

  for (const item of dict.problem.items) {
    chunks.push({ category: "problem", title: item.title, content: `${item.title}: ${item.desc}` });
  }

  for (const item of dict.services.items) {
    chunks.push({ category: "service", title: item.title, content: `${item.title}: ${item.desc}` });
  }

  for (const step of dict.plan.steps) {
    chunks.push({ category: "plan", title: step.title, content: `${step.title}: ${step.desc}` });
  }

  chunks.push({
    category: "featured",
    title: dict.featured.title,
    content: `${dict.featured.title} — ${dict.featured.desc} قیمت: ${dict.featured.price} ${dict.featured.priceUnit}. شامل: ${dict.featured.points.join("، ")}`,
  });

  for (const item of dict.why.items) {
    chunks.push({ category: "why", title: item.title, content: `${item.title}: ${item.desc}` });
  }

  chunks.push({ category: "about", title: dict.about.title, content: dict.about.body });

  chunks.push({
    category: "audience",
    title: dict.audience.title,
    content: `${dict.audience.title} ${dict.audience.items.join("، ")}`,
  });

  for (const item of dict.faq.items) {
    chunks.push({ category: "faq", title: item.q, content: `سؤال: ${item.q}\nپاسخ: ${item.a}` });
  }

  for (const item of dict.chatbot_faq.items) {
    chunks.push({ category: "chatbot_faq", title: item.q, content: `${item.q}\n${item.a}` });
  }

  for (const row of dict.transform.rows) {
    chunks.push({ category: "transform", title: null, content: `قبل: ${row.before} — بعد: ${row.after}` });
  }

  return chunks;
}

// Re-ingest the whole knowledge base. Idempotent: clears each locale's rows and
// re-inserts. Re-run whenever fa.json / en.json change.
export async function ingestAll(): Promise<{ locale: string; count: number }[]> {
  const supabase = getAdminClient();
  const summary: { locale: string; count: number }[] = [];

  for (const locale of locales) {
    const dict = await getDictionary(locale);
    const chunks = buildChunks(dict);

    const { embeddings } = await embedMany({
      model: EMBEDDING_MODEL,
      values: chunks.map((c) => c.content),
      providerOptions: embeddingOptions("RETRIEVAL_DOCUMENT"),
    });

    // Only wipe dictionary-derived rows; uploaded documents (source='upload')
    // must survive a re-ingest. Falls back to the old full wipe when the
    // source column doesn't exist yet (admin3.sql not applied).
    const { error: deleteError } = await supabase
      .from("kb_documents")
      .delete()
      .eq("locale", locale)
      .eq("source", "site");
    if (deleteError) {
      await supabase.from("kb_documents").delete().eq("locale", locale);
    }

    const rows = chunks.map((c, i) => ({
      locale,
      category: c.category,
      title: c.title,
      content: c.content,
      embedding: embeddings[i],
      metadata: {},
      ...(deleteError ? {} : { source: "site" }),
    }));

    const { error } = await supabase.from("kb_documents").insert(rows);
    if (error) {
      throw new Error(`ingest insert (${locale}) failed: ${error.message}`);
    }

    summary.push({ locale, count: rows.length });
  }

  return summary;
}
