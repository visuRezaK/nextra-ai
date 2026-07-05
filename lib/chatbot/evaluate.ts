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

const JUDGE_MODEL_ID = "gemini-2.5-flash";
// Sequential runs take ~10s/question; cap so a run finishes within the 300s
// function limit. Larger golden sets can be run in a couple of passes.
const MAX_QUESTIONS_PER_RUN = 25;
// Sequential: the free Gemini tier rate-limits bursts, and each question makes
// 3 calls (embed + answer + judge). One at a time, with retries, is reliable.
const CONCURRENCY = 1;
const GAP_MS = 1500; // pause between questions to stay under the RPM ceiling

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      const retriable = /429|rate|quota|503|overloaded|timeout/i.test(msg);
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

export interface EvalRunSummary {
  runId: string;
  questionCount: number;
  totals: {
    health: number;
    faithfulness: number;
    relevance: number;
    tone: number;
    retrieval: number;
    pass: number;
    warn: number;
    fail: number;
  };
}

// Execute the full golden set and persist a run + per-question results.
export async function runEvaluation(): Promise<EvalRunSummary> {
  const supabase = getAdminClient();
  const config = await getRuntimeChatConfig();

  const { data: questions, error: qError } = await supabase
    .from("eval_questions")
    .select("id, question, category, expected, locale")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(MAX_QUESTIONS_PER_RUN);

  if (qError) throw new Error(`eval questions load failed: ${qError.message}`);
  const list = (questions ?? []) as EvalQuestion[];
  if (list.length === 0) throw new Error("no active questions");

  const { data: run, error: runError } = await supabase
    .from("eval_runs")
    .insert({
      status: "running",
      model: config.modelId,
      judge_model: JUDGE_MODEL_ID,
      question_count: list.length,
    })
    .select("id")
    .single();
  if (runError || !run) throw new Error(`eval run insert failed: ${runError?.message}`);
  const runId = run.id as string;

  const results: {
    scores: JudgeScores;
  }[] = [];

  // Small worker pool — keeps within free-tier rate limits.
  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const q = list[cursor++];
      try {
        const chunks = await withRetry(() => retrieve(q.question, q.locale, 5), "retrieve");
        const system = buildSystemPrompt({
          chunks,
          memorySummary: null,
          persona: config.persona,
        });
        const { text: answer } = await withRetry(
          () =>
            generateText({
              model: chatModel(config.modelId),
              temperature: config.temperature ?? undefined,
              maxOutputTokens: config.maxOutputTokens ?? undefined,
              system,
              prompt: q.question,
            }),
          "answer",
        );

        const scores = await withRetry(() => judgeAnswer({ question: q, answer, chunks }), "judge");
        results.push({ scores });

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
        console.error(`eval question failed (${q.id}):`, err);
        const msg = err instanceof Error ? err.message : String(err);
        const rateLimited = /429|rate|quota/i.test(msg);
        await supabase.from("eval_results").insert({
          run_id: runId,
          question_id: q.id,
          question: q.question,
          category: q.category,
          verdict: "fail",
          judge_note: rateLimited
            ? "محدودیت نرخ درخواست Gemini (rate limit) — کمی بعد دوباره اجرا کنید."
            : `خطا در اجرا: ${msg.slice(0, 120)}`,
        });
        results.push({
          scores: {
            faithfulness: 0,
            relevance: 0,
            tone: 0,
            retrieval: 0,
            verdict: "fail",
            note: "error",
          },
        });
      }
      // Breathe between questions so bursts don't trip the RPM limit.
      if (cursor < list.length) await sleep(GAP_MS);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const avg = (pick: (s: JudgeScores) => number) =>
    Math.round(
      (results.reduce((sum, r) => sum + pick(r.scores), 0) / Math.max(1, results.length)) * 10,
    );

  const totals = {
    faithfulness: avg((s) => s.faithfulness),
    relevance: avg((s) => s.relevance),
    tone: avg((s) => s.tone),
    retrieval: avg((s) => s.retrieval),
    pass: results.filter((r) => r.scores.verdict === "pass").length,
    warn: results.filter((r) => r.scores.verdict === "warn").length,
    fail: results.filter((r) => r.scores.verdict === "fail").length,
    health: 0,
  };
  // Health = weighted score; faithfulness matters most (anti-hallucination).
  totals.health = Math.round(
    totals.faithfulness * 0.4 + totals.relevance * 0.25 + totals.tone * 0.15 + totals.retrieval * 0.2,
  );

  await supabase
    .from("eval_runs")
    .update({ status: "done", totals, finished_at: new Date().toISOString() })
    .eq("id", runId);

  return { runId, questionCount: list.length, totals };
}
