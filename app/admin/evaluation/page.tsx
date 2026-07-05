import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, AdminTable, Badge, fa, faDate } from "@/components/admin/ui";
import { RunEvalButton, SeedButton, AddQuestionForm } from "./eval-client";
import { deleteQuestionAction, continueRunFormAction, markRunFailedAction } from "./actions";

export const dynamic = "force-dynamic";
// Background eval passes run via after() within this segment's budget.
export const maxDuration = 300;

// A run whose last activity is older than this while still "running" is dead
// (function was killed / tab closed mid-pass) — offer continue or mark-failed.
const STALE_RUN_MS = 15 * 60 * 1000;

// Module-scope helper so the render body stays free of impure time calls.
function isStaleRun(status: string, startedAt: string): boolean {
  return status === "running" && Date.now() - new Date(startedAt).getTime() > STALE_RUN_MS;
}

const CATEGORY_LABELS: Record<string, { label: string; tone: "accent" | "success" | "neutral" }> = {
  kb: { label: "در دانش", tone: "accent" },
  out_of_kb: { label: "تست توهم", tone: "neutral" },
  lead: { label: "ثبت لید", tone: "success" },
  edge: { label: "موارد خاص", tone: "neutral" },
};

// Targets from the evaluation methodology (report template).
const CRITERIA: { key: string; label: string; target: number }[] = [
  { key: "retrieval", label: "کیفیت بازیابی (Retrieval)", target: 85 },
  { key: "faithfulness", label: "وفاداری به منبع (ضدتوهم)", target: 95 },
  { key: "relevance", label: "ربط و کامل بودن پاسخ", target: 90 },
  { key: "tone", label: "پایبندی به لحن برند", target: 90 },
];

export default async function EvaluationPage() {
  await requireRole(["editor"]);
  const supabase = getAdminClient();

  const [questionsRes, runsRes, feedbackUpRes, feedbackDownRes] = await Promise.all([
    supabase
      .from("eval_questions")
      .select("id, question, category, expected, locale, is_active")
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("eval_runs")
      .select("id, status, model, question_count, totals, started_at, finished_at")
      .order("started_at", { ascending: false })
      .limit(10),
    supabase.from("chat_feedback").select("*", { count: "exact", head: true }).eq("rating", 1),
    supabase.from("chat_feedback").select("*", { count: "exact", head: true }).eq("rating", -1),
  ]);

  const tablesMissing = questionsRes.error !== null;
  const questions = questionsRes.data ?? [];
  const runs = runsRes.data ?? [];
  const lastDone = runs.find((r) => r.status === "done");
  const totals = (lastDone?.totals ?? {}) as Record<string, number>;

  const up = feedbackUpRes.count ?? 0;
  const down = feedbackDownRes.count ?? 0;
  const satisfaction = up + down > 0 ? Math.round((up / (up + down)) * 100) : null;

  const health = totals.health ?? null;
  const healthStatus =
    health === null ? "—" : health >= 90 ? "🟢 خوب" : health >= 75 ? "🟡 نیازمند توجه" : "🔴 بحرانی";

  return (
    <>
      <PageTitle
        title="ارزیابی چت‌بات"
        subtitle="سنجش کیفیت با مجموعهٔ آزمون (Golden Set) و داور هوش مصنوعی — قبل از انتشار تغییرات، اینجا بسنجید"
      />

      {tablesMissing ? (
        <div className="card-surface mb-6 border-amber-400/40 bg-amber-500/5 p-5 text-sm">
          جدول‌های ارزیابی هنوز ساخته نشده‌اند — فایل <code dir="ltr">supabase/admin4.sql</code> را
          در Supabase SQL Editor اجرا کنید.
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="امتیاز سلامت (آخرین اجرا)"
          value={health === null ? "—" : `٪${fa(health)}`}
          hint={healthStatus}
        />
        <StatCard
          label="نتایج آخرین اجرا"
          value={
            lastDone
              ? `${fa((totals.pass as number) ?? 0)}✓ ${fa((totals.warn as number) ?? 0)}⚠ ${fa((totals.fail as number) ?? 0)}✗`
              : "—"
          }
          hint={lastDone ? faDate(lastDone.started_at) : "هنوز اجرایی ثبت نشده"}
        />
        <StatCard label="سؤالات آزمون" value={fa(questions.length)} />
        <StatCard
          label="رضایت کاربران واقعی"
          value={satisfaction === null ? "—" : `٪${fa(satisfaction)}`}
          hint="از دکمه‌های 👍/👎"
        />
      </div>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-2 font-semibold">جدول معیارها — آخرین اجرا</h2>
        {lastDone ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 text-start font-medium">معیار</th>
                <th className="py-2 text-start font-medium">نمره</th>
                <th className="py-2 text-start font-medium">هدف</th>
                <th className="py-2 text-start font-medium">وضعیت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {CRITERIA.map((c) => {
                const score = (totals[c.key] as number) ?? 0;
                const ok = score >= c.target;
                const close = score >= c.target - 10;
                return (
                  <tr key={c.key}>
                    <td className="py-2">{c.label}</td>
                    <td className="py-2 font-medium">٪{fa(score)}</td>
                    <td className="py-2 text-muted">≥ ٪{fa(c.target)}</td>
                    <td className="py-2">{ok ? "✅" : close ? "⚠️" : "❌"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">
            هنوز ارزیابی‌ای اجرا نشده است. سؤال‌ها را آماده کنید و «اجرای ارزیابی» را بزنید.
          </p>
        )}
        <div className="mt-4">
          <RunEvalButton questionCount={questions.filter((q) => q.is_active).length} />
        </div>
      </section>

      {runs.length > 0 ? (
        <section className="card-surface mt-6 p-5">
          <h2 className="mb-3 font-semibold">تاریخچهٔ اجراها</h2>
          <AdminTable headers={["تاریخ", "مدل", "سؤالات", "سلامت", "نتایج", ""]} empty={false}>
            {runs.map((r) => {
              const t = (r.totals ?? {}) as Record<string, number>;
              const stale = isStaleRun(r.status, r.started_at);
              const statusLabel =
                r.status === "done"
                  ? `٪${fa(t.health ?? 0)}`
                  : r.status === "running"
                    ? stale
                      ? "ناتمام"
                      : "در حال اجرا…"
                    : "خطا";
              return (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-muted">{faDate(r.started_at)}</td>
                  <td className="px-4 py-3" dir="ltr">{r.model ?? "—"}</td>
                  <td className="px-4 py-3">{fa(r.question_count)}</td>
                  <td className={`px-4 py-3 font-medium ${stale ? "text-amber-600" : ""}`}>
                    {statusLabel}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {r.status === "done"
                      ? `${fa(t.pass ?? 0)}✓ ${fa(t.warn ?? 0)}⚠ ${fa(t.fail ?? 0)}✗`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/evaluation/${r.id}`} className="text-accent hover:underline">
                        جزئیات
                      </Link>
                      {stale ? (
                        <>
                          <form action={continueRunFormAction}>
                            <input type="hidden" name="runId" value={r.id} />
                            <button type="submit" className="text-emerald-600 hover:underline">
                              ادامه اجرا
                            </button>
                          </form>
                          <form action={markRunFailedAction}>
                            <input type="hidden" name="runId" value={r.id} />
                            <button type="submit" className="text-red-500 hover:underline">
                              علامت خطا
                            </button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </AdminTable>
        </section>
      ) : null}

      <section className="card-surface mt-6 p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">مجموعهٔ آزمون (Golden Set)</h2>
          {questions.length === 0 && !tablesMissing ? <SeedButton /> : null}
        </div>
        <p className="mb-4 text-sm text-muted">
          سؤال‌هایی که نمایندهٔ کاربران واقعی‌اند. هر بار پرسونا، مدل یا پایگاه دانش را تغییر
          می‌دهید، با همین خط‌کش ثابت بسنجید که بهتر شده یا بدتر.
        </p>

        <div className="mb-5">
          <AddQuestionForm />
        </div>

        {questions.length > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {questions.map((q) => {
              const cat = CATEGORY_LABELS[q.category] ?? CATEGORY_LABELS.kb;
              return (
                <li key={q.id} className="flex items-start gap-3 py-2.5">
                  <Badge tone={cat.tone}>{cat.label}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{q.question}</p>
                    {q.expected ? (
                      <p className="mt-0.5 text-xs text-muted">انتظار: {q.expected}</p>
                    ) : null}
                  </div>
                  <form action={deleteQuestionAction}>
                    <input type="hidden" name="id" value={q.id} />
                    <button
                      type="submit"
                      className="rounded-md px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-500/10"
                    >
                      حذف
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </>
  );
}
