import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, Badge, fa, faDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const VERDICT: Record<string, { label: string; tone: "success" | "accent" | "neutral" }> = {
  pass: { label: "✓ قبول", tone: "success" },
  warn: { label: "⚠ هشدار", tone: "accent" },
  fail: { label: "✗ مردود", tone: "neutral" },
};

const CATEGORY_LABELS: Record<string, string> = {
  kb: "در دانش",
  out_of_kb: "تست توهم",
  lead: "ثبت لید",
  edge: "موارد خاص",
};

export default async function EvalRunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  await requireRole(["editor"]);
  const { runId } = await params;
  const supabase = getAdminClient();

  const { data: run } = await supabase
    .from("eval_runs")
    .select("id, status, model, judge_model, question_count, totals, started_at, finished_at")
    .eq("id", runId)
    .maybeSingle();
  if (!run) notFound();

  const { data: results } = await supabase
    .from("eval_results")
    .select("id, question, category, answer, retrieved, scores, verdict, judge_note")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  const rows = results ?? [];
  const totals = (run.totals ?? {}) as Record<string, number>;

  return (
    <>
      <PageTitle
        title="جزئیات اجرای ارزیابی"
        subtitle={`${faDate(run.started_at)} · مدل پاسخ‌گو: ${run.model ?? "—"} · داور: ${run.judge_model ?? "—"}`}
      />

      <Link href="/admin/evaluation" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به صفحه ارزیابی
      </Link>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="سلامت" value={run.status === "done" ? `٪${fa(totals.health ?? 0)}` : "—"} />
        <StatCard label="ضدتوهم" value={`٪${fa(totals.faithfulness ?? 0)}`} />
        <StatCard label="ربط پاسخ" value={`٪${fa(totals.relevance ?? 0)}`} />
        <StatCard label="لحن برند" value={`٪${fa(totals.tone ?? 0)}`} />
        <StatCard label="بازیابی" value={`٪${fa(totals.retrieval ?? 0)}`} />
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {rows.map((r) => {
          const v = VERDICT[r.verdict ?? ""] ?? VERDICT.fail;
          const s = (r.scores ?? {}) as Record<string, number>;
          const retrieved = (r.retrieved ?? []) as { title: string | null; similarity: number }[];
          return (
            <section key={r.id} className="card-surface p-5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone={v.tone}>{v.label}</Badge>
                <Badge tone="neutral">{CATEGORY_LABELS[r.category] ?? r.category}</Badge>
                <span className="text-xs text-muted" dir="ltr">
                  F{fa(s.faithfulness ?? 0)} · R{fa(s.relevance ?? 0)} · T{fa(s.tone ?? 0)} · Ret
                  {fa(s.retrieval ?? 0)}
                </span>
              </div>
              <p className="font-medium">{r.question}</p>
              {r.answer ? (
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-surface-2/60 p-3 text-sm leading-7 text-foreground/80">
                  {r.answer}
                </p>
              ) : null}
              {r.judge_note ? (
                <p className="mt-2 text-sm text-muted">داور: {r.judge_note}</p>
              ) : null}
              {retrieved.length > 0 ? (
                <p className="mt-2 text-xs text-muted">
                  بازیابی‌شده‌ها:{" "}
                  {retrieved
                    .map((c) => `${c.title ?? "بدون عنوان"} (٪${fa(Math.round(c.similarity * 100))})`)
                    .join(" · ")}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </>
  );
}
