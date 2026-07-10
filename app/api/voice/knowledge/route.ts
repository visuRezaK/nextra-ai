import { retrieve } from "@/lib/chatbot/rag";
import { isLocale, type Locale } from "@/lib/i18n/config";

export const runtime = "nodejs";

// Called by the ElevenLabs voice agent's `search_knowledge` webhook tool.
// Runs the same vector search the site chatbot uses (lib/chatbot/rag.ts over
// kb_documents), so both assistants answer from one knowledge base and a
// single re-ingest updates them together. Guarded by the same
// ELEVENLABS_TOOL_SECRET header as /api/voice/lead. The `knowledge` string in
// the response is fed to the agent's LLM as the tool result.
export async function POST(request: Request) {
  const secret = process.env.ELEVENLABS_TOOL_SECRET;
  const provided = request.headers.get("x-voice-tool-secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: { query?: string; locale?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query) {
    return Response.json(
      { ok: false, message: "برای جستجو، متن سؤال کاربر لازم است." },
      { status: 400 },
    );
  }

  // The voice agent speaks Persian, so fa is the sensible default.
  const locale: Locale = isLocale(body.locale ?? "") ? (body.locale as Locale) : "fa";

  try {
    const chunks = await retrieve(query, locale, 4);

    if (chunks.length === 0) {
      return Response.json({
        ok: true,
        knowledge:
          "در دانش‌نامه پاسخ مشخصی پیدا نشد. صادقانه بگو این مورد را دقیق نمی‌دانی و پیشنهاد بده در مشاوره رایگان ۳۰ دقیقه‌ای دقیق جواب داده می‌شود.",
      });
    }

    const knowledge = chunks
      .map((c) => (c.title ? `${c.title}: ${c.content}` : c.content))
      .join("\n---\n");

    return Response.json({ ok: true, knowledge });
  } catch (err) {
    console.error("voice knowledge search error:", err);
    return Response.json(
      { ok: false, message: "جستجوی دانش‌نامه با خطا مواجه شد." },
      { status: 500 },
    );
  }
}
