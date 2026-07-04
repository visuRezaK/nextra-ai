import { embedMany } from "ai";
import { EMBEDDING_MODEL, embeddingOptions } from "./models";
import { getAdminClient } from "./supabase-admin";
import type { Locale } from "@/lib/i18n/config";

// Uploaded-document ingestion for the knowledge base (admin panel, phase 3).
// Documents land in kb_documents with source='upload' and survive dictionary
// re-ingests. metadata.source_name groups the chunks of one document.

const MAX_CHUNK_CHARS = 1500;
const MAX_CHUNKS = 200; // hard cap per document — keeps embedding cost bounded

export async function extractPdf(buffer: ArrayBuffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

export async function extractDocx(buffer: ArrayBuffer): Promise<string> {
  const mammoth = (await import("mammoth")).default;
  const { value } = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return value;
}

// Plain-text extraction from a web page — good enough for article/docs pages.
export async function extractUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; NextraKB/1.0)" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  const html = await res.text();

  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

// Split extracted text into embedding-sized chunks along paragraph borders.
export function chunkText(raw: string): string[] {
  const text = raw.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  const paragraphs = text
    .split(/\n\s*\n|\n(?=[#•\-\d])/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter((p) => p.length > 30); // drop crumbs (menu items, page numbers)

  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if (p.length > MAX_CHUNK_CHARS) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      // Hard-split very long paragraphs on sentence-ish borders.
      let rest = p;
      while (rest.length > MAX_CHUNK_CHARS) {
        let cut = rest.lastIndexOf("۔", MAX_CHUNK_CHARS);
        if (cut < MAX_CHUNK_CHARS / 2) cut = rest.lastIndexOf(".", MAX_CHUNK_CHARS);
        if (cut < MAX_CHUNK_CHARS / 2) cut = rest.lastIndexOf(" ", MAX_CHUNK_CHARS);
        if (cut < MAX_CHUNK_CHARS / 2) cut = MAX_CHUNK_CHARS;
        chunks.push(rest.slice(0, cut + 1).trim());
        rest = rest.slice(cut + 1).trim();
      }
      if (rest) current = rest;
      continue;
    }
    if (current.length + p.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n${p}` : p;
    }
  }
  if (current) chunks.push(current);

  return chunks.slice(0, MAX_CHUNKS);
}

// Embed + store one document's chunks. Replaces any previous upload with the
// same source_name (re-upload = update).
export async function ingestUpload(params: {
  sourceName: string;
  text: string;
  locale: Locale;
  uploadedBy?: string;
}): Promise<number> {
  const { sourceName, text, locale, uploadedBy } = params;

  const chunks = chunkText(text);
  if (chunks.length === 0) {
    throw new Error("no extractable text");
  }

  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: chunks,
    providerOptions: embeddingOptions("RETRIEVAL_DOCUMENT"),
  });

  const supabase = getAdminClient();

  await supabase
    .from("kb_documents")
    .delete()
    .eq("source", "upload")
    .eq("locale", locale)
    .eq("metadata->>source_name", sourceName);

  const rows = chunks.map((content, i) => ({
    locale,
    category: "upload",
    title: chunks.length > 1 ? `${sourceName} (${i + 1}/${chunks.length})` : sourceName,
    content,
    embedding: embeddings[i],
    source: "upload",
    metadata: { source_name: sourceName, uploaded_by: uploadedBy ?? null },
  }));

  const { error } = await supabase.from("kb_documents").insert(rows);
  if (error) throw new Error(`upload insert failed: ${error.message}`);

  return rows.length;
}
