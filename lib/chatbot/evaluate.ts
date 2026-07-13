import { generateText, generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { chatModel } from "./models";
import { getRuntimeChatConfig } from "./config";
import { retrieve, type RetrievedChunk } from "./rag";
import { buildSystemPrompt } from "./prompts";
import { getAdminClient } from "./supabase-admin";
import type { Locale } from "@/lib/i18n/config";

// Chatbot quality evaluation (admin panel, phase 4).
// For every active golden-set question we run the REAL production pipeline
// (retrieve -> system prompt -> generate), then an LLM judge scores the answer
// on the methodology's criteria: faithfulness (anti-hallucination), relevance,
// brand tone, and retrieval quality. Sessions/memory/tools are not touched.
//
// The runner is RESUMABLE and TIME-BOUNDED so it survives the free Gemini tier's
// rate limits and Vercel's function timeout: it processes only questions that
// don't yet have a successful result for the run, stops cleanly before the
// time budget, and is re-invoked (background) until every question is scored.

// Judge model — gemini-2.5-flash-lite, matching the live answer model. The free
// tier's request quota is PER-MODEL-PER-DAY (verified 2026-07-05: 2.5-flash and
// flash-lite both answered 200 while 2.0-flash was separately exhausted), and
// flash-lite's free daily allowance is far larger than 2.5-flash's (~20/day), so
// keeping both answer and judge on flash-lite lets more of the golden set score
// before hitting the free cap.
const JUDGE_MODEL_ID = "gemini-2.5-flash-lite";
// The judge only SCORES answers — it doesn't have to share the bot's (Gemini)
// free-tier budget. When GROQ_API_KEY is set we run it on Groq's free tier
// instead, so each question makes only ONE Gemini generate call (the answer) —
// halving Gemini usage and letting ~2x more questions score per day before
// hitting Google's free daily cap. Falls back to Gemini when no Groq key is set,
// so nothing breaks before the key is added. GROQ_JUDGE_MODEL overrides the id.
// Must be a Groq model that supports json_schema structured outputs (generateObject
// needs it) — llama-3.3-70b does NOT. gpt-oss-120b does, and judged the Persian
// golden set best in testing (correctly flags hallucination, fluent Persian notes).
const GROQ_JUDGE_MODEL_ID = process.env.GROQ_JUDGE_MODEL || "openai/gpt-oss-120b";
const usingGroqJudge = () => !!process.env.GROQ_API_KEY;
const judgeModel = () => (usingGroqJudge() ? groq(GROQ_JUDGE_MODEL_ID) : google(JUDGE_MODEL_ID));
// Id recorded on the run row + shown in the admin panel.
const judgeModelId = () => (usingGroqJudge() ? `groq:${GROQ_JUDGE_MODEL_ID}` : JUDGE_MODEL_ID);
// Max active questions loaded into a single (legacy, ungrouped) run. Kept above
// the current golden set (32) so a full run covers the whole set. Grouped runs
// (the normal path) are bounded by GROUP_SIZE instead.
const MAX_QUESTIONS_PER_RUN = 40;
// The free Gemini tier can't score the whole golden set in one day, so the set
// is split into daily GROUPS: every GROUP_SIZE active questions (ordered by
// created_at) form one group, evaluated in its own run. 32 questions → 4 groups.
// Grouping is DERIVED from question order, not stored per-question, so adding a
// question just grows the last group.
export const GROUP_SIZE = 8;
// Sequential: the free Gemini tier rate-limits bursts, and each question makes
// 3 calls (embed + answer + judge). One at a time, with retries, is reliable.
const GAP_MS = 1500; // pause between questions to stay under the RPM ceiling
// Stop a pass before Vercel's 300s function limit so we always persist state and
// mark progress instead of getting killed mid-flight. Remaining questions are
// picked up by the next (continue) pass.
const TIME_BUDGET_MS = 230_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRateLimit = (msg: string) => /429|rate|quota|resource_exhausted/i.test(msg);

// The free Gemini 2.5-flash tier allows only ~10 generate_content requests/minute
// (the embedding call for retrieval is a different model, with its own quota, so
// it doesn't count here). Each question makes 2 flash calls (answer + judge).
// Rather than burst past the ceiling and rely on retries, we PACE the calls: keep
// at least MIN_FLASH_GAP_MS between them so we stay under ~9/min and a full pass
// rarely trips the limit. Earlier this was 3.5s (~17/min), which was tuned for a
// mistaken 20/min ceiling and caused 429 storms that skipped most questions.
const MIN_FLASH_GAP_MS = 7000;
let lastFlashAt = 0;
async function paceFlash() {
  const now = Date.now();
  const wait = Math.max(0, lastFlashAt + MIN_FLASH_GAP_MS - now);
  lastFlashAt = Math.max(now, lastFlashAt + MIN_FLASH_GAP_MS);
  if (wait > 0) await sleep(wait);
}

// Verdict for questions that couldn't be scored (rate limit / hit the retry cap).
// They are NOT failures — they are excluded from averages so they don't tank the
// health score, and shown as "not scored" in the UI.
const SKIPPED = "skipped";
const SKIPPED_NOTE = "سنجیده نشد — به سقف تلاش رسید (احتمالاً محدودیت نرخ Gemini). دوباره اجرا کنید.";

// Retry transient failures (429 rate limits / 503) with exponential backoff.
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [2000, 5000, 12000];
  let lastErr: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retriable = isRateLimit(msg) || /503|overloaded|timeout/i.test(msg);
      if (!retriable || attempt === delays.length) break;
      console.warn(`[eval] ${label} retry ${attempt + 1} after: ${msg.slice(0, 80)}`);
      await sleep(delays[attempt]);
    }
  }
  throw lastErr;
}

const judgeSchema = z.object({
  faithfulness: z
    .number()
    .min(0)
    .max(10)
    .describe(
      "وفاداری به منبع: آیا ادعاهای واقعیِ پاسخ با context و برند سازگارند؟ فقط جعلِ اطلاعاتِ مشخص (قیمت، آمار، تاریخ، قابلیت، آدرس یا ادعای تأییدنشده) توهم است و نمرهٔ کم می‌گیرد؛ استنتاج منطقی، بازگویی با کلمات دیگر، یا اطلاعاتِ بدیهیِ برند توهم نیست",
    ),
  relevance: z.number().min(0).max(10).describe("ربط و کامل بودن پاسخ به سؤال"),
  tone: z.number().min(0).max(10).describe("پایبندی به لحن برند: نیمه‌رسمی، گرم، کوتاه، بدون اغراق"),
  retrieval: z
    .number()
    .min(0)
    .max(10)
    .describe("کیفیت بازیابی: chunkهای آورده‌شده چقدر به سؤال مرتبط بودند"),
  verdict: z.enum(["pass", "warn", "fail"]).describe("جمع‌بندی کلی"),
  note: z.string().describe("یک جمله توضیح فارسی برای مدیر"),
});

export type JudgeScores = z.infer<typeof judgeSchema>;

interface EvalQuestion {
  id: string;
  question: string;
  category: "kb" | "out_of_kb" | "lead" | "edge";
  expected: string | null;
  locale: Locale;
}

const CATEGORY_GUIDANCE: Record<EvalQuestion["category"], string> = {
  kb: "پاسخ این سؤال در پایگاه دانش موجود است. بسنج که آیا بات درست و کامل از context پاسخ داده.",
  out_of_kb:
    "پاسخ این سؤال در پایگاه دانش نیست. رفتار درست: صادقانه بگوید مطمئن نیست و به مشاوره دعوت کند. اگر بات جزئیات/قیمت/آمار از خودش ساخته، faithfulness باید ۰-۲ باشد و verdict=fail.",
  lead: "این سناریوی ثبت لید است. رفتار درست: علاقه را تشخیص دهد و مودبانه نام و راه تماس بخواهد (نه فشار زیاد).",
  edge: "این سؤال خارج از حوزه یا تلاش برای خراب‌کردن نقش بات است. رفتار درست: مودبانه در نقش بماند، وارد موضوع نامرتبط نشود و به حوزهٔ خدمات برگرداند.",
};

async function judgeAnswer(params: {
  question: EvalQuestion;
  answer: string;
  chunks: RetrievedChunk[];
}): Promise<JudgeScores> {
  const { question, answer, chunks } = params;
  const context = chunks.length
    ? chunks.map((c, i) => `[${i + 1}] ${c.title ?? ""}: ${c.content}`).join("\n")
    : "(هیچ chunkای بازیابی نشد)";

  const { object } = await generateObject({
    model: judgeModel(),
    schema: judgeSchema,
    prompt: `تو داور کیفیت یک چت‌بات RAG فارسی هستی (دستیار سایت Nextra AI Consulting — مشاور هوش مصنوعی برای کسب‌وکارها).

نوع سؤال: ${question.category}
${CATEGORY_GUIDANCE[question.category]}
${question.expected ? `رفتار مورد انتظار (از تیم): ${question.expected}` : ""}

سؤال کاربر:
${question.question}

chunkهای بازیابی‌شده از پایگاه دانش:
${context}

پاسخ چت‌بات:
${answer}

هر معیار را از ۰ تا ۱۰ نمره بده و جمع‌بندی pass/warn/fail بده.
در سنجش وفاداری منصف باش: faithfulness را فقط وقتی خیلی پایین (۰-۳) بده که پاسخ اطلاعاتِ مشخصِ ساختگی داشته باشد — قیمت، آمار، تاریخ، قابلیت، آدرس یا ادعای تأییدنشده که در context نیست. استنتاج‌های منطقیِ سازگار با context و برند، بازگویی با کلماتِ دیگر، یا اطلاعاتِ بدیهیِ برند را توهم حساب نکن و به‌خاطرشان نمره را صفر نکن. توهمِ واقعی (جعلِ عدد/آمار/واقعیت) همچنان مردود است.`,
  });

  return object;
}

export interface EvalTotals {
  health: number;
  faithfulness: number;
  relevance: number;
  tone: number;
  retrieval: number;
  pass: number;
  warn: number;
  fail: number;
  scored: number; // questions actually judged (basis of the averages)
  skipped: number; // questions that couldn't be scored (rate limit)
}

// One background pass over the golden set. Returns live progress so the caller
// (or client poller) knows whether to schedule another pass.
export interface EvalRunProgress {
  runId: string;
  complete: boolean;
  done: number; // questions with a persisted result
  total: number; // active questions in the run
}

// Full active golden set, in the canonical order that defines the groups.
async function loadAllActiveQuestions() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("eval_questions")
    .select("id, question, category, expected, locale")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(`eval questions load failed: ${error.message}`);
  return (data ?? []) as EvalQuestion[];
}

// Number of daily groups the active set splits into.
export function groupCount(activeTotal: number): number {
  return Math.max(1, Math.ceil(activeTotal / GROUP_SIZE));
}

// Questions to score for a run. `group` (1-based) slices the ordered active set
// to that group's window; null/undefined means a legacy full run (all active,
// capped). Same query is used to size a run and to resume it, so a run always
// sees the same slice across passes (as long as the set isn't edited mid-run).
async function loadActiveQuestions(group?: number | null) {
  const all = await loadAllActiveQuestions();
  if (!group) return all.slice(0, MAX_QUESTIONS_PER_RUN);
  const start = (group - 1) * GROUP_SIZE;
  return all.slice(start, start + GROUP_SIZE);
}

// Which group a run covered (null for a legacy full run, or if the column
// predates admin5.sql).
async function loadRunGroup(runId: string): Promise<number | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("eval_runs")
    .select("eval_group")
    .eq("id", runId)
    .maybeSingle();
  return (data?.eval_group ?? null) as number | null;
}

interface ResultRow {
  question_id: string | null;
  scores: Record<string, number> | null;
  verdict: string | null;
}

// All result rows for a run (used to derive progress + totals). Kept small.
async function loadResults(runId: string): Promise<ResultRow[]> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("eval_results")
    .select("question_id, scores, verdict")
    .eq("run_id", runId);
  return (data ?? []) as ResultRow[];
}

// Distinct question ids that already have a GENUINE (non-skipped) result — used
// both to resume (don't re-score) and to decide when a run is complete.
function scoredIds(rows: ResultRow[]): Set<string> {
  return new Set(
    rows.filter((r) => r.verdict !== SKIPPED && r.question_id).map((r) => r.question_id as string),
  );
}

async function loadDoneIds(runId: string): Promise<Set<string>> {
  return scoredIds(await loadResults(runId));
}

// Totals over DISTINCT, genuinely-scored questions only. Duplicate rows (from a
// past concurrency bug) and skipped rows are excluded so they can't skew the
// health score.
function computeTotals(rows: ResultRow[]): EvalTotals {
  // De-duplicate by question id, preferring a scored row over a skipped one.
  const byQ = new Map<string, ResultRow>();
  for (const r of rows) {
    const key = r.question_id ?? JSON.stringify(r.scores);
    const existing = byQ.get(key);
    if (!existing || (existing.verdict === SKIPPED && r.verdict !== SKIPPED)) byQ.set(key, r);
  }
  const unique = [...byQ.values()];
  const scored = unique.filter((r) => r.verdict !== SKIPPED);
  const skipped = unique.length - scored.length;

  const n = Math.max(1, scored.length);
  const avg = (key: keyof JudgeScores) =>
    Math.round((scored.reduce((s, r) => s + (Number(r.scores?.[key]) || 0), 0) / n) * 10);

  const totals: EvalTotals = {
    faithfulness: avg("faithfulness"),
    relevance: avg("relevance"),
    tone: avg("tone"),
    retrieval: avg("retrieval"),
    pass: scored.filter((r) => r.verdict === "pass").length,
    warn: scored.filter((r) => r.verdict === "warn").length,
    fail: scored.filter((r) => r.verdict === "fail").length,
    scored: scored.length,
    skipped,
    health: 0,
  };
  // Health = weighted score; faithfulness matters most (anti-hallucination).
  totals.health = Math.round(
    totals.faithfulness * 0.4 + totals.relevance * 0.25 + totals.tone * 0.15 + totals.retrieval * 0.2,
  );
  return totals;
}

// Combine several groups' totals into one aggregate. Each metric is a
// scored-count-weighted mean of the per-group averages (so a group that scored
// more questions counts proportionally more), and health is recomputed from the
// combined metrics with the same weighting as a single run.
function combineTotals(list: Record<string, number>[]): EvalTotals {
  let scored = 0;
  let skipped = 0;
  let pass = 0;
  let warn = 0;
  let fail = 0;
  const weighted: Record<string, number> = { faithfulness: 0, relevance: 0, tone: 0, retrieval: 0 };
  for (const t of list) {
    const s = Number(t.scored) || 0;
    scored += s;
    skipped += Number(t.skipped) || 0;
    pass += Number(t.pass) || 0;
    warn += Number(t.warn) || 0;
    fail += Number(t.fail) || 0;
    for (const k of Object.keys(weighted)) weighted[k] += (Number(t[k]) || 0) * s;
  }
  const n = Math.max(1, scored);
  const faithfulness = Math.round(weighted.faithfulness / n);
  const relevance = Math.round(weighted.relevance / n);
  const tone = Math.round(weighted.tone / n);
  const retrieval = Math.round(weighted.retrieval / n);
  return {
    faithfulness,
    relevance,
    tone,
    retrieval,
    pass,
    warn,
    fail,
    scored,
    skipped,
    health: Math.round(faithfulness * 0.4 + relevance * 0.25 + tone * 0.15 + retrieval * 0.2),
  };
}

export interface GroupSummary {
  group: number; // 1-based
  questionCount: number;
  lastRun: { id: string; health: number; scored: number; skipped: number; startedAt: string } | null;
}

export interface EvaluationOverview {
  migrated: boolean; // false until admin5.sql adds eval_runs.eval_group
  groupSize: number;
  groupsTotal: number;
  groupsCovered: number; // groups with at least one done run
  groups: GroupSummary[];
  aggregate: EvalTotals | null; // combined health across covered groups (null if none)
}

// Everything the evaluation page needs to render the grouped, daily workflow:
// the group breakdown (with each group's best run — see below) and the combined
// health score across whichever groups have been evaluated so far.
export async function loadEvaluationOverview(): Promise<EvaluationOverview> {
  const supabase = getAdminClient();
  const all = await loadAllActiveQuestions();
  const groupsTotal = groupCount(all.length);

  // Best done run per group: the one that scored the MOST questions, newest as
  // tiebreak. This keeps a fuller run from being clobbered by a later partial
  // re-run (e.g. a re-run that hit the free-tier rate limit and only scored 2/8
  // must not replace a previous complete 8/8 run in the health score). Guarded
  // so the page still renders before admin5.sql has added the eval_group column.
  let migrated = true;
  const latestByGroup = new Map<
    number,
    { id: string; totals: Record<string, number>; started_at: string }
  >();
  const { data, error } = await supabase
    .from("eval_runs")
    .select("id, eval_group, totals, started_at")
    .eq("status", "done")
    .not("eval_group", "is", null)
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) {
    migrated = false;
  } else {
    for (const r of data as {
      id: string;
      eval_group: number;
      totals: Record<string, number>;
      started_at: string;
    }[]) {
      const cur = latestByGroup.get(r.eval_group);
      // Rows arrive newest-first, so `cur` is always at least as recent as `r`;
      // an older run replaces it only if it genuinely covered MORE questions.
      const scored = Number(r.totals?.scored ?? 0);
      if (!cur || scored > Number(cur.totals?.scored ?? 0)) {
        latestByGroup.set(r.eval_group, { id: r.id, totals: r.totals ?? {}, started_at: r.started_at });
      }
    }
  }

  const groups: GroupSummary[] = [];
  const coveredTotals: Record<string, number>[] = [];
  for (let g = 1; g <= groupsTotal; g++) {
    const start = (g - 1) * GROUP_SIZE;
    const questionCount = all.slice(start, start + GROUP_SIZE).length;
    const run = latestByGroup.get(g);
    if (run) coveredTotals.push(run.totals);
    groups.push({
      group: g,
      questionCount,
      lastRun: run
        ? {
            id: run.id,
            health: Number(run.totals?.health ?? 0),
            scored: Number(run.totals?.scored ?? 0),
            skipped: Number(run.totals?.skipped ?? 0),
            startedAt: run.started_at,
          }
        : null,
    });
  }

  return {
    migrated,
    groupSize: GROUP_SIZE,
    groupsTotal,
    groupsCovered: coveredTotals.length,
    groups,
    aggregate: coveredTotals.length > 0 ? combineTotals(coveredTotals) : null,
  };
}

// If every active question now has a genuine result, compute totals from the
// persisted rows (not in-memory, since a run spans several passes) and mark done.
async function finalizeIfComplete(runId: string, total: number): Promise<boolean> {
  const rows = await loadResults(runId);
  if (scoredIds(rows).size < total) return false;

  const supabase = getAdminClient();
  await supabase
    .from("eval_runs")
    .update({ status: "done", totals: computeTotals(rows), finished_at: new Date().toISOString() })
    .eq("id", runId);
  return true;
}

// Force-close a stalled run: mark any un-scored questions as "skipped" (NOT
// failed — they're excluded from the averages), then finalize. Used when the
// client hits its continue cap (persistent rate limits) so a run never stays
// "running" forever and the health score reflects only what was actually judged.
export async function forceFinalize(runId: string): Promise<EvalTotals> {
  const supabase = getAdminClient();
  const group = await loadRunGroup(runId);
  const questions = await loadActiveQuestions(group);
  const doneIds = await loadDoneIds(runId);
  const missing = questions.filter((q) => !doneIds.has(q.id));

  if (missing.length > 0) {
    await supabase.from("eval_results").insert(
      missing.map((q) => ({
        run_id: runId,
        question_id: q.id,
        question: q.question,
        category: q.category,
        verdict: SKIPPED,
        judge_note: SKIPPED_NOTE,
      })),
    );
  }

  const totals = computeTotals(await loadResults(runId));
  // If nothing could be scored (quota fully exhausted), the run is a measurement
  // FAILURE, not a ٪0 result — mark it failed so it isn't shown as a health score.
  const status = totals.scored > 0 ? "done" : "failed";
  await supabase
    .from("eval_runs")
    .update({ status, totals, finished_at: new Date().toISOString() })
    .eq("id", runId);
  return totals;
}

// Create an eval_runs row synchronously and return its id so the caller can
// return it to the client immediately, then run the heavy loop in the background.
export async function createEvalRun(
  group?: number | null,
): Promise<{ runId: string; total: number }> {
  const supabase = getAdminClient();
  const config = await getRuntimeChatConfig();

  const list = await loadActiveQuestions(group);
  const total = list.length;
  if (total === 0) throw new Error("no active questions");

  const { data: run, error } = await supabase
    .from("eval_runs")
    .insert({
      status: "running",
      model: config.modelId,
      judge_model: judgeModelId(),
      question_count: total,
      eval_group: group ?? null,
    })
    .select("id")
    .single();
  if (error || !run) throw new Error(`eval run insert failed: ${error?.message}`);
  return { runId: run.id as string, total };
}

// Execute (or resume) an existing run. Time-bounded and resumable: processes the
// questions not yet scored, persisting each result as it goes, and stops before
// the function's time budget. Returns progress; call again (same runId) to
// continue until `complete` is true.
export async function runEvaluation(runId: string): Promise<EvalRunProgress> {
  const supabase = getAdminClient();
  const config = await getRuntimeChatConfig();

  const group = await loadRunGroup(runId);
  const list = await loadActiveQuestions(group);
  const total = list.length;
  if (total === 0) return { runId, complete: true, done: 0, total: 0 };

  // Resuming: make sure the row reflects "running" again.
  await supabase.from("eval_runs").update({ status: "running" }).eq("id", runId);

  const doneIds = await loadDoneIds(runId);
  const pending = list.filter((q) => !doneIds.has(q.id));

  const startedAt = Date.now();
  for (let i = 0; i < pending.length; i++) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) break; // out of budget — next pass continues
    const q = pending[i];
    try {
      const chunks = await withRetry(() => retrieve(q.question, q.locale, 5), "retrieve");
      const system = buildSystemPrompt({
        chunks,
        memorySummary: null,
        persona: config.persona,
      });
      const { text: answer } = await withRetry(
        async () => {
          await paceFlash();
          return generateText({
            model: chatModel(config.modelId),
            temperature: config.temperature ?? undefined,
            maxOutputTokens: config.maxOutputTokens ?? undefined,
            system,
            prompt: q.question,
          });
        },
        "answer",
      );

      const scores = await withRetry(async () => {
        // Only pace against Google's RPM ceiling when the judge is on Gemini;
        // on Groq it draws from a separate, much larger budget.
        if (!usingGroqJudge()) await paceFlash();
        return judgeAnswer({ question: q, answer, chunks });
      }, "judge");

      // Defensive: skip if a row already landed for this question (guards against
      // any residual overlap between passes so we never write duplicates).
      const { data: existing } = await supabase
        .from("eval_results")
        .select("id")
        .eq("run_id", runId)
        .eq("question_id", q.id)
        .limit(1);
      if (existing && existing.length > 0) continue;

      await supabase.from("eval_results").insert({
        run_id: runId,
        question_id: q.id,
        question: q.question,
        category: q.category,
        answer,
        retrieved: chunks.map((c) => ({
          title: c.title,
          similarity: Math.round(c.similarity * 100) / 100,
        })),
        scores: {
          faithfulness: scores.faithfulness,
          relevance: scores.relevance,
          tone: scores.tone,
          retrieval: scores.retrieval,
        },
        verdict: scores.verdict,
        judge_note: scores.note,
      });
    } catch (err) {
      // No result row is written on failure, so this question is retried on the
      // next pass. A rate limit means the minute quota is spent — end the pass
      // and let the caller resume after a delay instead of burning the budget.
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`eval question failed (${q.id}): ${msg.slice(0, 120)}`);
      if (isRateLimit(msg)) break;
      // Other (non-transient) error: skip this question and try the next.
      continue;
    }
    if (i < pending.length - 1) await sleep(GAP_MS);
  }

  const complete = await finalizeIfComplete(runId, total);
  const done = (await loadDoneIds(runId)).size;
  return { runId, complete, done, total };
}
