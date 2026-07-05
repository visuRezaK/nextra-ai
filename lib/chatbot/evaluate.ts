import { generateText, generateObject } from "ai";
import { z } from "zod";
import { google } from "@ai-sdk/google";
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

const JUDGE_MODEL_ID = "gemini-2.5-flash";
// A golden set larger than this is scored across several runs.
const MAX_QUESTIONS_PER_RUN = 25;
// Sequential: the free Gemini tier rate-limits bursts, and each question makes
// 3 calls (embed + answer + judge). One at a time, with retries, is reliable.
const GAP_MS = 1500; // pause between questions to stay under the RPM ceiling
// Stop a pass before Vercel's 300s function limit so we always persist state and
// mark progress instead of getting killed mid-flight. Remaining questions are
// picked up by the next (continue) pass.
const TIME_BUDGET_MS = 230_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isRateLimit = (msg: string) => /429|rate|quota|resource_exhausted/i.test(msg);

// The free Gemini tier allows ~20 generate_content requests/minute. Each question
// makes 2 of them (answer + judge). Rather than burst past the ceiling and rely
// on retries, we PACE the calls: keep at least MIN_FLASH_GAP_MS between them so we
// stay comfortably under 20/min (~17/min) and a full pass rarely trips the limit.
const MIN_FLASH_GAP_MS = 3500;
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
    .describe("وفاداری به منبع: پاسخ فقط از context ساخته شده؟ توهم = نمره کم"),
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
    model: google(JUDGE_MODEL_ID),
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

هر معیار را از ۰ تا ۱۰ نمره بده و جمع‌بندی pass/warn/fail بده. سخت‌گیر باش: توهم (ساختن اطلاعاتی که در context نیست) نابخشودنی است.`,
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

// Load the active golden set (same query used to size a run).
async function loadActiveQuestions() {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("eval_questions")
    .select("id, question, category, expected, locale")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(MAX_QUESTIONS_PER_RUN);
  if (error) throw new Error(`eval questions load failed: ${error.message}`);
  return (data ?? []) as EvalQuestion[];
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
  const questions = await loadActiveQuestions();
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
export async function createEvalRun(): Promise<{ runId: string; total: number }> {
  const supabase = getAdminClient();
  const config = await getRuntimeChatConfig();

  const list = await loadActiveQuestions();
  const total = list.length;
  if (total === 0) throw new Error("no active questions");

  const { data: run, error } = await supabase
    .from("eval_runs")
    .insert({
      status: "running",
      model: config.modelId,
      judge_model: JUDGE_MODEL_ID,
      question_count: total,
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

  const list = await loadActiveQuestions();
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
        await paceFlash();
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
