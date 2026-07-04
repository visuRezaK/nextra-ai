import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

// Public endpoint: 👍/👎 on an assistant answer, sent by the chat UI (page,
// widget and embed all share ChatPanel and the chat_sid cookie). The rated
// Q/A pair is stored inline because the streaming client never sees DB
// message ids. Best-effort: any failure returns ok=false, never a 500 wall.

const clip = (v: unknown, max: number) =>
  typeof v === "string" ? v.slice(0, max).trim() || null : null;

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const rating = body.rating === 1 || body.rating === -1 ? body.rating : null;
  if (!rating) return NextResponse.json({ ok: false }, { status: 400 });

  try {
    const supabase = getAdminClient();

    // Link to the visitor's session when the cookie exists (same cookie the
    // chat endpoint uses). Missing session is fine — feedback still counts.
    let sessionId: string | null = null;
    const sid = request.cookies.get("chat_sid")?.value;
    if (sid) {
      const { data } = await supabase
        .from("chat_sessions")
        .select("id")
        .eq("channel", "web")
        .eq("external_id", sid)
        .maybeSingle();
      sessionId = data?.id ?? null;
    }

    const { error } = await supabase.from("chat_feedback").insert({
      session_id: sessionId,
      rating,
      question: clip(body.question, 2000),
      answer: clip(body.answer, 4000),
      comment: clip(body.comment, 1000),
      locale: clip(body.locale, 5),
    });
    if (error) {
      console.error("feedback insert error:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("feedback error:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
