import { generateText } from "ai";
import { SUMMARY_MODEL } from "./models";
import { getAdminClient } from "./supabase-admin";
import type { ChatChannel } from "./types";

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  // Usage metadata, recorded on assistant messages for the admin dashboard.
  model?: string;
  tokensIn?: number;
  tokensOut?: number;
}

export interface ResolvedSession {
  id: string;
  summary: string | null;
}

// Find-or-create the conversation row keyed by (channel, external_id). Attaches
// user_id when the visitor is logged in, and returns the long-term summary so the
// brain can seed the system prompt with what it already knows about this user.
export async function resolveSession(params: {
  channel: ChatChannel;
  externalId: string;
  userId: string | null;
}): Promise<ResolvedSession> {
  const { channel, externalId, userId } = params;
  const supabase = getAdminClient();

  const { data, error } = await supabase
    .from("chat_sessions")
    .upsert(
      {
        channel,
        external_id: externalId,
        last_seen: new Date().toISOString(),
        // Only set user_id when present so an upsert doesn't wipe a prior link.
        ...(userId ? { user_id: userId } : {}),
      },
      { onConflict: "channel,external_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`resolveSession failed: ${error?.message ?? "no row"}`);
  }

  const summary = await loadMemory(data.id);
  return { id: data.id, summary };
}

// Short-term memory: the most recent user/assistant turns, chronological.
export async function loadHistory(
  sessionId: string,
  limit = 12,
): Promise<StoredMessage[]> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as StoredMessage[]).reverse();
}

// Long-term memory: the rolling summary for a session.
export async function loadMemory(sessionId: string): Promise<string | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("chat_memory")
    .select("summary")
    .eq("session_id", sessionId)
    .maybeSingle();
  return data?.summary ?? null;
}

export async function appendMessages(
  sessionId: string,
  messages: StoredMessage[],
): Promise<void> {
  if (messages.length === 0) return;
  const supabase = getAdminClient();
  const rows = messages.map((m) => ({
    session_id: sessionId,
    role: m.role,
    content: m.content,
    // Only include usage columns when present so inserts keep working on a DB
    // where supabase/admin.sql hasn't been applied yet.
    ...(m.model !== undefined ? { model: m.model } : {}),
    ...(m.tokensIn !== undefined ? { tokens_in: m.tokensIn } : {}),
    ...(m.tokensOut !== undefined ? { tokens_out: m.tokensOut } : {}),
  }));
  const { error } = await supabase.from("chat_messages").insert(rows);
  if (error) {
    // Unknown-column error — supabase/admin.sql not applied yet. PostgREST
    // reports it as PGRST204 (schema cache) or 42703 (PostgreSQL). Retry
    // without the usage columns so messages are never lost.
    if (error.code === "PGRST204" || error.code === "42703") {
      const bare = messages.map((m) => ({
        session_id: sessionId,
        role: m.role,
        content: m.content,
      }));
      const { error: retryError } = await supabase.from("chat_messages").insert(bare);
      if (retryError) console.error("appendMessages retry error:", retryError);
      return;
    }
    console.error("appendMessages error:", error);
  }
}

// Update the long-term summary from recent turns. Cheap model, best-effort:
// failures must never break the chat response.
export async function refreshMemory(params: {
  sessionId: string;
  previousSummary: string | null;
  history: StoredMessage[];
}): Promise<void> {
  const { sessionId, previousSummary, history } = params;
  if (history.length < 4) return; // too early to be worth summarizing

  const transcript = history
    .map((m) => `${m.role === "user" ? "کاربر" : "دستیار"}: ${m.content}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: SUMMARY_MODEL,
      system:
        "تو خلاصه‌نویس یک گفتگوی فروش هستی. یک خلاصهٔ کوتاه و به‌روز از گفتگو به فارسی بنویس که نام، اطلاعات تماس، نوع کسب‌وکار، نیاز و علاقه‌مندی کاربر را در خود داشته باشد. فقط خود خلاصه را بنویس.",
      prompt:
        (previousSummary ? `خلاصهٔ قبلی:\n${previousSummary}\n\n` : "") +
        `گفتگوی اخیر:\n${transcript}\n\nخلاصهٔ به‌روزشده:`,
    });

    const summary = text.trim();
    if (!summary) return;

    const supabase = getAdminClient();
    await supabase.from("chat_memory").upsert(
      {
        session_id: sessionId,
        summary,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "session_id" },
    );
  } catch (err) {
    console.error("refreshMemory error:", err);
  }
}
