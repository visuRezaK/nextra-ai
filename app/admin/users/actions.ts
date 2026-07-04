"use server";

import { revalidatePath } from "next/cache";
import { requireRole, STAFF_ROLES } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

const VALID_ROLES = ["user", ...STAFF_ROLES] as const;

export type RoleActionState =
  | { ok: true }
  | { ok: false; error: string }
  | undefined;

export async function changeRoleAction(
  _prev: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  const { user: actor } = await requireRole([]);

  const targetId = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!targetId) return { ok: false, error: "شناسه کاربر نامعتبر است." };
  if (!(VALID_ROLES as readonly string[]).includes(role)) {
    return { ok: false, error: "نقش نامعتبر است." };
  }
  // Guard rail: an admin cannot demote themselves and lock everyone out.
  if (targetId === actor.id && role !== "admin") {
    return { ok: false, error: "نمی‌توانید نقش خودتان را پایین بیاورید." };
  }

  // Service role bypasses the column-level revoke that blocks self-promotion
  // from the browser — this action is only reachable by admins.
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", targetId)
    .select("email")
    .maybeSingle();

  if (error || !data) return { ok: false, error: "به‌روزرسانی نقش ناموفق بود." };

  await logAudit({
    actor,
    action: "users.change_role",
    target: data.email ?? targetId,
    meta: { role },
  });
  revalidatePath("/admin/users");
  return { ok: true };
}
