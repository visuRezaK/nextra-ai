"use server";

import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { CHAT_MODEL } from "@/lib/chatbot/models";
import { aiEnabled } from "@/lib/admin/ai";

export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantResult = { ok: true; answer: string } | { ok: false; error: string };

// CRM chat assistant: answers over REAL data via tool calls — never invents
// numbers. Read-only tools, gated to operator+. Non-streaming (generateText)
// for simplicity; multi-step so the model can chain a couple of tool calls.
export async function askAssistant(messages: AssistantMessage[]): Promise<AssistantResult> {
  await requireRole(["operator"]);
  if (!aiEnabled()) {
    return { ok: false, error: "دستیار هوش مصنوعی فعال نیست — GOOGLE_GENERATIVE_AI_API_KEY تنظیم نشده." };
  }
  if (messages.length === 0) return { ok: false, error: "پیامی وارد نشده است." };

  const supabase = getAdminClient();
  const num = (v: unknown) => Number(v ?? 0);

  const tools = {
    crm_stats: tool({
      description: "آمار کلی CRM: تعداد لیدها به تفکیک وضعیت، معاملات باز/برنده/باخته، ارزش مسیر فروش، درآمد بسته‌شده، و وظایف معوق.",
      inputSchema: z.object({}),
      execute: async () => {
        const [leads, deals, tasks] = await Promise.all([
          supabase.from("contacts").select("status, converted_at").limit(5000),
          supabase.from("deals").select("status, amount_cad").limit(5000),
          supabase
            .from("activities")
            .select("id", { count: "exact", head: true })
            .eq("type", "task")
            .is("done_at", null)
            .lt("due_at", new Date().toISOString()),
        ]);
        const leadRows = leads.data ?? [];
        const dealRows = deals.data ?? [];
        const byStatus: Record<string, number> = {};
        for (const l of leadRows) byStatus[l.status ?? "?"] = (byStatus[l.status ?? "?"] ?? 0) + 1;
        let open = 0, wonRev = 0, wonN = 0, lostN = 0;
        for (const d of dealRows) {
          if (d.status === "open") open += num(d.amount_cad);
          else if (d.status === "won") { wonRev += num(d.amount_cad); wonN++; }
          else if (d.status === "lost") lostN++;
        }
        return {
          leads_total: leadRows.length,
          leads_converted: leadRows.filter((l) => l.converted_at).length,
          leads_by_status: byStatus,
          deals_won: wonN,
          deals_lost: lostN,
          open_pipeline_value_cad: Math.round(open),
          won_revenue_cad: Math.round(wonRev),
          overdue_tasks: tasks.count ?? 0,
        };
      },
    }),

    query_leads: tool({
      description: "فهرست لیدهای اخیر، با فیلتر اختیاری وضعیت (new/contacted/qualified/proposal/won/lost).",
      inputSchema: z.object({
        status: z.string().optional().describe("وضعیت لید برای فیلتر"),
        limit: z.number().optional().describe("حداکثر تعداد، پیش‌فرض ۱۰"),
      }),
      execute: async ({ status, limit }) => {
        let q = supabase
          .from("contacts")
          .select("name, email, status, source, created_at")
          .order("created_at", { ascending: false })
          .limit(Math.min(limit ?? 10, 25));
        if (status) q = q.eq("status", status);
        return (await q).data ?? [];
      },
    }),

    query_deals: tool({
      description: "فهرست معاملات، با فیلتر اختیاری وضعیت (open/won/lost).",
      inputSchema: z.object({
        status: z.string().optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ status, limit }) => {
        let q = supabase
          .from("deals")
          .select("title, amount_cad, status, stage_key, people(full_name)")
          .order("updated_at", { ascending: false })
          .limit(Math.min(limit ?? 10, 25));
        if (status) q = q.eq("status", status);
        const rows = (await q).data ?? [];
        return rows.map((d) => ({
          title: d.title,
          amount_cad: num(d.amount_cad),
          status: d.status,
          stage: d.stage_key,
          contact: (d.people as unknown as { full_name: string } | null)?.full_name ?? null,
        }));
      },
    }),

    query_activities: tool({
      description: "فهرست وظایف/فعالیت‌ها؛ با overdue_only=true فقط وظایف معوق.",
      inputSchema: z.object({
        overdue_only: z.boolean().optional(),
        limit: z.number().optional(),
      }),
      execute: async ({ overdue_only, limit }) => {
        let q = supabase
          .from("activities")
          .select("type, title, due_at, done_at, people(full_name)")
          .order("created_at", { ascending: false })
          .limit(Math.min(limit ?? 10, 25));
        if (overdue_only) {
          q = q.eq("type", "task").is("done_at", null).lt("due_at", new Date().toISOString());
        }
        const rows = (await q).data ?? [];
        return rows.map((a) => ({
          type: a.type,
          title: a.title,
          due_at: a.due_at,
          done: Boolean(a.done_at),
          contact: (a.people as unknown as { full_name: string } | null)?.full_name ?? null,
        }));
      },
    }),
  };

  try {
    const { text } = await generateText({
      model: CHAT_MODEL,
      system: `تو دستیار داخلی CRM شرکت «Nextra AI Consulting» هستی. به سؤال مدیر دربارهٔ لیدها، مخاطبان، معاملات، وظایف و گزارش‌ها پاسخ بده.
قوانین:
- فقط بر اساس دادهٔ واقعی که از ابزارها می‌گیری جواب بده؛ هرگز عدد یا نام از خودت نساز.
- برای هر سؤال آماری یا فهرستی، ابزار مناسب را صدا بزن.
- پاسخ کوتاه، فارسی و روشن. مبالغ را با «دلار کانادا» بگو.
- اگر داده‌ای نبود، صادقانه بگو داده‌ای موجود نیست.`,
      messages,
      tools,
      stopWhen: stepCountIs(6),
    });
    return { ok: true, answer: text.trim() || "پاسخی تولید نشد." };
  } catch (err) {
    console.error("askAssistant error:", err);
    return { ok: false, error: "خطا در دستیار — شاید سهمیهٔ رایگان Gemini پر شده باشد. کمی بعد امتحان کنید." };
  }
}
