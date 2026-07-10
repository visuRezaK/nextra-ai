import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { notifyLead } from "@/lib/chatbot/notify";

export const runtime = "nodejs";

// Called by the ElevenLabs voice agent's `capture_lead` webhook tool — the
// voice counterpart of the chatbot's captureLead tool (lib/chatbot/tools.ts).
// Guarded by ELEVENLABS_TOOL_SECRET, sent as the `x-voice-tool-secret` header
// configured on the tool in the ElevenLabs dashboard. The JSON `message` in
// the response is read back to the agent's LLM, so it stays Persian and
// speakable.
export async function POST(request: Request) {
  const secret = process.env.ELEVENLABS_TOOL_SECRET;
  const provided = request.headers.get("x-voice-tool-secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let body: {
    name?: string;
    email?: string;
    phone?: string;
    business?: string;
    conversation_id?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim() || null;
  const phone = body.phone?.trim() || null;
  if (!name || (!email && !phone)) {
    return Response.json(
      { ok: false, message: "برای ثبت، نام و حداقل یک راه تماس (ایمیل یا تلفن) لازم است." },
      { status: 400 },
    );
  }

  const message =
    [
      body.business?.trim() || null,
      // contacts.session_id is a uuid FK to chat_sessions; ElevenLabs
      // conversation ids are not uuids, so the reference lives here instead.
      body.conversation_id ? `voice conversation: ${body.conversation_id}` : null,
    ]
      .filter(Boolean)
      .join(" — ") || null;

  const supabase = getAdminClient();
  const { error } = await supabase.from("contacts").insert({
    name,
    email,
    phone,
    message,
    source: "voice",
    session_id: null,
  });

  if (error) {
    console.error("voice lead insert error:", error);
    return Response.json(
      { ok: false, message: "ثبت اطلاعات با خطا مواجه شد." },
      { status: 500 },
    );
  }

  // Best-effort owner notification (never blocks the agent's reply).
  await notifyLead({ name, email, phone, message, source: "voice" });

  return Response.json({
    ok: true,
    message: "اطلاعات تماس با موفقیت ثبت شد. به‌زودی برای هماهنگی مشاوره رایگان تماس گرفته می‌شود.",
  });
}
