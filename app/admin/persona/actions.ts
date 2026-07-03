"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { invalidateChatConfigCache } from "@/lib/chatbot/config";

export type PersonaState = { ok: true } | { ok: false; error: string } | undefined;

// Deactivate the current version, then insert/activate the new one. The partial
// unique index (one active row) turns a race into an insert error, not a
// double-active state.
export async function savePersonaAction(
  _prev: PersonaState,
  formData: FormData,
): Promise<PersonaState> {
  const user = await requireAdmin();

  const content = String(formData.get("content") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (content.length < 20) {
    return { ok: false, error: "متن پرسونا خیلی کوتاه است (حداقل ۲۰ کاراکتر)." };
  }

  const supabase = getAdminClient();

  const { error: deactivateError } = await supabase
    .from("prompt_versions")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateError) {
    console.error("savePersonaAction deactivate error:", deactivateError);
    return { ok: false, error: "ذخیره ناموفق بود. آیا supabase/admin.sql اجرا شده است؟" };
  }

  const { error: insertError } = await supabase.from("prompt_versions").insert({
    content,
    note: note || null,
    is_active: true,
    created_by: user.id,
  });
  if (insertError) {
    console.error("savePersonaAction insert error:", insertError);
    return { ok: false, error: "ذخیرهٔ نسخهٔ جدید ناموفق بود. دوباره تلاش کنید." };
  }

  invalidateChatConfigCache();
  revalidatePath("/admin/persona");
  return { ok: true };
}

export async function activateVersionAction(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = getAdminClient();

  const { error: deactivateError } = await supabase
    .from("prompt_versions")
    .update({ is_active: false })
    .eq("is_active", true);
  if (deactivateError) {
    console.error("activateVersionAction deactivate error:", deactivateError);
    return;
  }

  const { error: activateError } = await supabase
    .from("prompt_versions")
    .update({ is_active: true })
    .eq("id", id);
  if (activateError) console.error("activateVersionAction activate error:", activateError);

  invalidateChatConfigCache();
  revalidatePath("/admin/persona");
}
