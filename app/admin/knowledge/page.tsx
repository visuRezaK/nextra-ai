import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, fa } from "@/components/admin/ui";
import { TestSearch } from "./test-search";
import { ReingestButton } from "./reingest-button";
import { UploadForm } from "./upload-form";
import { deleteUploadAction } from "./actions";

export const dynamic = "force-dynamic";
// Re-ingest embeds every chunk — allow up to two minutes (same as the ingest API route).
export const maxDuration = 120;

export default async function KnowledgePage() {
  await requireRole(["editor"]);
  const supabase = getAdminClient();

  // source/metadata columns are richer post-admin3.sql; fall back gracefully.
  let data: unknown[] | null = (
    await supabase
      .from("kb_documents")
      .select("locale, category, title, source, metadata")
      .limit(2000)
  ).data;
  if (!data) {
    data = (
      await supabase.from("kb_documents").select("locale, category, title").limit(2000)
    ).data;
  }

  const rows = (data ?? []) as {
    locale: string;
    category: string;
    title: string | null;
    source?: string;
    metadata?: { source_name?: string } | null;
  }[];

  const byLocale = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const cats = byLocale.get(row.locale) ?? new Map<string, number>();
    cats.set(row.category, (cats.get(row.category) ?? 0) + 1);
    byLocale.set(row.locale, cats);
  }

  // Uploaded documents, grouped per (source_name, locale).
  const uploads = new Map<string, { sourceName: string; locale: string; chunks: number }>();
  for (const row of rows) {
    if (row.source !== "upload") continue;
    const name = row.metadata?.source_name ?? row.title ?? "؟";
    const key = `${name}|${row.locale}`;
    const entry = uploads.get(key) ?? { sourceName: name, locale: row.locale, chunks: 0 };
    entry.chunks += 1;
    uploads.set(key, entry);
  }

  return (
    <>
      <PageTitle
        title="پایگاه دانش"
        subtitle="محتوای RAG از دیکشنری‌های سایت (fa.json / en.json) ساخته می‌شود"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="کل قطعات" value={fa(rows.length)} />
        {[...byLocale.entries()].map(([locale, cats]) => (
          <StatCard
            key={locale}
            label={locale === "fa" ? "قطعات فارسی" : locale === "en" ? "قطعات انگلیسی" : locale}
            value={fa([...cats.values()].reduce((a, b) => a + b, 0))}
          />
        ))}
      </div>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-2 font-semibold">بازسازی پایگاه دانش</h2>
        <p className="mb-4 text-sm text-muted">
          پس از هر تغییر در fa.json یا en.json این دکمه را بزنید تا چت‌بات با محتوای جدید پاسخ دهد.
        </p>
        <ReingestButton />
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-2 font-semibold">افزودن سند (PDF / Word / URL)</h2>
        <p className="mb-4 text-sm text-muted">
          سند آپلودشده chunk و embed می‌شود و چت‌بات بلافاصله از آن پاسخ می‌دهد. این اسناد با
          «بازسازی پایگاه دانش» پاک نمی‌شوند و آپلود دوباره با همان نام، نسخه قبلی را جایگزین می‌کند.
        </p>
        <UploadForm />

        {uploads.size > 0 ? (
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="mb-2 text-sm font-medium">اسناد آپلودشده</h3>
            <ul className="divide-y divide-border text-sm">
              {[...uploads.values()].map((u) => (
                <li key={`${u.sourceName}|${u.locale}`} className="flex items-center gap-3 py-2">
                  <span className="min-w-0 flex-1 truncate" dir="ltr">
                    {u.sourceName}
                  </span>
                  <span className="text-xs text-muted">
                    {u.locale === "fa" ? "فارسی" : "انگلیسی"} · {fa(u.chunks)} قطعه
                  </span>
                  <form action={deleteUploadAction}>
                    <input type="hidden" name="source_name" value={u.sourceName} />
                    <input type="hidden" name="locale" value={u.locale} />
                    <button
                      type="submit"
                      className="rounded-md px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      حذف
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-2 font-semibold">جستجوی آزمایشی</h2>
        <p className="mb-4 text-sm text-muted">
          همان جستجوی برداری‌ای که چت‌بات هنگام پاسخ‌دادن انجام می‌دهد — برای دیباگ کیفیت بازیابی.
        </p>
        <TestSearch />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {[...byLocale.entries()].map(([locale, cats]) => (
          <section key={locale} className="card-surface p-5">
            <h2 className="mb-4 font-semibold">
              دسته‌بندی‌ها — {locale === "fa" ? "فارسی" : "انگلیسی"}
            </h2>
            <ul className="divide-y divide-border text-sm">
              {[...cats.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([cat, n]) => (
                  <li key={cat} className="flex justify-between py-2">
                    <span dir="ltr">{cat}</span>
                    <span className="text-muted">{fa(n)}</span>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
