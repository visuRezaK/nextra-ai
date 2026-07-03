import { requireAdmin } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle } from "@/components/admin/ui";
import { ModelForm } from "./model-form";

export const dynamic = "force-dynamic";

export default async function ModelPage() {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("model_config")
    .select("chat_model, temperature, max_output_tokens")
    .eq("id", 1)
    .maybeSingle();

  const initial = {
    chat_model: data?.chat_model ?? "gemini-2.5-flash",
    temperature: data?.temperature ?? null,
    max_output_tokens: data?.max_output_tokens ?? null,
  };

  return (
    <>
      <PageTitle
        title="تنظیمات مدل"
        subtitle="مدل Gemini و پارامترهای تولید پاسخ — با همان کلید مستقیم Google"
      />
      <section className="card-surface max-w-2xl p-5">
        <ModelForm initial={initial} />
      </section>
    </>
  );
}
