import type { User } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

// Best-effort audit trail for mutating admin actions. Never throws — a
// missing table (admin2.sql not applied) must not break the action itself.
export async function logAudit(params: {
  actor: User;
  action: string;
  target?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getAdminClient();
    const { error } = await supabase.from("audit_log").insert({
      actor_id: params.actor.id,
      actor_email: params.actor.email ?? null,
      action: params.action,
      target: params.target ?? null,
      meta: params.meta ?? {},
    });
    if (error) console.error("logAudit error:", error);
  } catch (err) {
    console.error("logAudit error:", err);
  }
}
