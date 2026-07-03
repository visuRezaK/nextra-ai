"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { invalidateChatConfigCache } from "@/lib/chatbot/config";
import { ALLOWED_CHAT_MODELS } from "@/lib/chatbot/models";

export type ModelConfigState = { ok: true } | { ok: false; error: string } | undefined;

// Empty form fields mean "use the provider default" (stored as null).
const optionalNumber = (schema: z.ZodType<number>) =>
  z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    schema.nullable(),
  );

const schema = z.object({
  chat_model: z.enum(ALLOWED_CHAT_MODELS),
  temperature: optionalNumber(z.number().min(0).max(2)),
  max_output_tokens: optionalNumber(z.number().int().min(1).max(65536)),
});

export async function saveModelConfigAction(
  _prev: ModelConfigState,
  formData: FormData,
): Promise<ModelConfigState> {
  await requireAdmin();

  const parsed = schema.safeParse({
    chat_model: formData.get("chat_model"),
    temperature: formData.get("temperature"),
    max_output_tokens: formData.get("max_output_tokens"),
  });
  if (!parsed.success) {
    return { ok: false, error: "مقادیر فرم نامعتبر است. (temperature بین ۰ تا ۲)" };
  }

  const supabase = getAdminClient();
  const { error } = await supabase.from("model_config").upsert({
    id: 1,
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("saveModelConfigAction error:", error);
    return { ok: false, error: "ذخیره ناموفق بود. آیا supabase/admin.sql اجرا شده است؟" };
  }

  invalidateChatConfigCache();
  revalidatePath("/admin/model");
  return { ok: true };
}
