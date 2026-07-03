import { requireAdmin } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { DEFAULT_PERSONA } from "@/lib/chatbot/prompts";
import { PageTitle, Badge, faDate } from "@/components/admin/ui";
import { PersonaEditor } from "./persona-editor";
import { activateVersionAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PersonaPage() {
  await requireAdmin();
  const supabase = getAdminClient();

  const { data: versions } = await supabase
    .from("prompt_versions")
    .select("id, content, note, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const rows = versions ?? [];
  const active = rows.find((v) => v.is_active);

  return (
    <>
      <PageTitle
        title="پرسونا"
        subtitle="شخصیت و قواعد رفتاری چت‌بات — با نسخه‌بندی و امکان بازگشت"
      />

      <section className="card-surface p-5">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-semibold">پرسونای فعال</h2>
          {!active ? <Badge>پیش‌فرض کد</Badge> : active.note ? <Badge tone="accent">{active.note}</Badge> : null}
        </div>
        {!active ? (
          <p className="mb-4 text-sm text-muted">
            در حال استفاده از پرسونای پیش‌فرض کد. با ذخیرهٔ اولین نسخه، مدیریت از همین‌جا انجام می‌شود.
          </p>
        ) : null}
        <PersonaEditor initialContent={active?.content ?? DEFAULT_PERSONA} />
      </section>

      {rows.length > 0 ? (
        <section className="card-surface mt-6 p-5">
          <h2 className="mb-4 font-semibold">نسخه‌های قبلی</h2>
          <div className="flex flex-col gap-2">
            {rows.map((v) => (
              <details key={v.id} className="rounded-lg border border-border bg-background p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                  <span className="text-muted">{faDate(v.created_at)}</span>
                  {v.note ? <span>{v.note}</span> : null}
                  {v.is_active ? <Badge tone="success">فعال</Badge> : null}
                  {!v.is_active ? (
                    <form action={activateVersionAction} className="ms-auto">
                      <input type="hidden" name="id" value={v.id} />
                      <button type="submit" className="text-accent hover:underline">
                        بازگردانی به این نسخه
                      </button>
                    </form>
                  ) : null}
                </summary>
                <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm leading-7 text-foreground/80">
                  {v.content}
                </p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
