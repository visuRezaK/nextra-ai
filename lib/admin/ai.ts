// Admin CRM AI helpers — the single place every gated AI touchpoint routes
// through. Direct Google provider (same GOOGLE_GENERATIVE_AI_API_KEY as the
// chatbot), on flash-lite to spare the shared free-tier daily quota, since these
// are manual, single-shot calls. Each throws AiDisabledError when no key is set;
// callers catch and show a clean Persian message.
import "server-only";
import { generateText, generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

const AI_MODEL = google("gemini-2.5-flash-lite");

export function aiEnabled(): boolean {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
}

export class AiDisabledError extends Error {
  constructor() {
    super("هوش مصنوعی فعال نیست — GOOGLE_GENERATIVE_AI_API_KEY تنظیم نشده است.");
    this.name = "AiDisabledError";
  }
}

function ensure() {
  if (!aiEnabled()) throw new AiDisabledError();
}

// ---------- 1. Lead scoring ----------
const scoreSchema = z.object({
  score: z.number().min(0).max(100),
  rationale: z.string(),
});

export async function scoreLead(input: {
  name: string;
  message: string | null;
  source: string;
  status: string;
}): Promise<{ score: number; rationale: string }> {
  ensure();
  const { object } = await generateObject({
    model: AI_MODEL,
    schema: scoreSchema,
    prompt: `تو کارشناس ارزیابی سرنخ فروش برای «Nextra AI Consulting» (مشاور هوش مصنوعی کسب‌وکار) هستی.
این لید را از ۰ تا ۱۰۰ امتیاز بده و یک توضیح کوتاه فارسی (حداکثر دو جمله) بنویس. معیارها: شفافیت چالش، تناسب با خدمات AI، کامل‌بودن اطلاعات، و منبع.

نام: ${input.name}
منبع: ${input.source}
مرحله: ${input.status}
چالش/پیام: ${input.message ?? "—"}`,
  });
  return { score: Math.round(object.score), rationale: object.rationale.trim() };
}

// ---------- 2. Conversation / contact summary ----------
export async function summarizePerson(input: {
  name: string;
  transcript: string;
}): Promise<string> {
  ensure();
  const { text } = await generateText({
    model: AI_MODEL,
    prompt: `این گفتگو/سوابق مربوط به مخاطب «${input.name}» است. سه تا پنج بولت کوتاه فارسی بنویس که نیازها، دغدغه‌ها و سیگنال‌های خرید او را خلاصه کند. فقط بولت‌ها را بنویس، بدون مقدمه.

${input.transcript}`,
  });
  return text.trim();
}

// ---------- 3. Deal next action ----------
export async function dealNextAction(input: {
  title: string;
  stage: string;
  daysInStage: number;
  amount: number;
  recent: string;
}): Promise<string> {
  ensure();
  const { text } = await generateText({
    model: AI_MODEL,
    prompt: `تو مربی فروش هستی. برای این معامله، یک «اقدام بعدی» مشخص و عملی در یک جملهٔ کوتاه فارسی پیشنهاد بده.

عنوان: ${input.title}
مرحله: ${input.stage} (${input.daysInStage} روز در این مرحله)
مبلغ: CAD ${input.amount}
آخرین فعالیت‌ها: ${input.recent || "—"}`,
  });
  return text.trim();
}

// ---------- 4. Contract rewrite ----------
export async function rewriteContract(input: {
  bodyMd: string;
  note: string;
}): Promise<string> {
  ensure();
  const { text } = await generateText({
    model: AI_MODEL,
    prompt: `این متن قرارداد مشاوره (Markdown فارسی) را بازنویسی و روان‌تر کن، ساختار و شماره‌گذاری بندها را حفظ کن و فقط Markdown برگردان (بدون توضیح اضافه).${input.note ? `\nراهنمای شخصی‌سازی: ${input.note}` : ""}

${input.bodyMd}`,
  });
  return text.trim();
}

// ---------- 5. Campaign email generation ----------
const emailSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

export async function generateCampaignEmail(input: {
  name: string;
  goal: string;
  context: string;
}): Promise<{ subject: string; body: string }> {
  ensure();
  const { object } = await generateObject({
    model: AI_MODEL,
    schema: emailSchema,
    prompt: `یک ایمیل کاملاً اختصاصی فارسی برای این گیرنده بنویس. لحن حرفه‌ای و صمیمی، حداکثر ۱۲۰ کلمه، بدون لحن تبلیغاتی، با یک دعوت روشن به جلسهٔ مشاورهٔ رایگان. از طرف «Nextra AI Consulting».

گیرنده: ${input.name}
هدف کمپین: ${input.goal || "ارتباط مجدد"}
زمینهٔ این گیرنده: ${input.context || "—"}`,
  });
  return { subject: object.subject.trim(), body: object.body.trim() };
}
