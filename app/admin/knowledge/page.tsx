import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, fa } from "@/components/admin/ui";
import { TestSearch } from "./test-search";
import { ReingestButton } from "./reingest-button";

export const dynamic = "force-dynamic";
// Re-ingest embeds every chunk — allow up to two minutes (same as the ingest API route).
export const maxDuration = 120;

export default async function KnowledgePage() {
  await requireRole(["editor"]);
  const supabase = getAdminClient();

  const { data } = await supabase
    .from("kb_documents")
    .select("locale, category, title")
    .limit(2000);

  const rows = data ?? [];
  const byLocale = new Map<string, Map<string, number>>();
  for (const row of rows) {
    const cats = byLocale.get(row.locale) ?? new Map<string, number>();
    cats.set(row.category, (cats.get(row.category) ?? 0) + 1);
    byLocale.set(row.locale, cats);
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
