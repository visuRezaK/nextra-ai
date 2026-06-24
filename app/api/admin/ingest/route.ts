import { ingestAll } from "@/lib/chatbot/ingest";

export const runtime = "nodejs";
export const maxDuration = 120;

// Rebuilds the RAG knowledge base from the i18n dictionaries.
// Guarded by INGEST_SECRET — send it as the `x-ingest-secret` header.
export async function POST(request: Request) {
  const secret = process.env.INGEST_SECRET;
  const provided = request.headers.get("x-ingest-secret");

  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const summary = await ingestAll();
    return Response.json({ ok: true, summary });
  } catch (err) {
    console.error("ingest error:", err);
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
