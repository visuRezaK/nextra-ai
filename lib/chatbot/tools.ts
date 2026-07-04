import { tool } from "ai";
import { z } from "zod";
import { getAdminClient } from "./supabase-admin";
import { notifyLead, notifyHandoff } from "./notify";
import type { ChatChannel } from "./types";

// Tools the brain can call: captureLead writes to the same `contacts` table the
// booking form uses; requestOperator queues the session for a human operator.
export function buildTools(ctx: { sessionId: string; channel?: ChatChannel }) {
  return {
    captureLead: tool({
      description:
        "ثبت اطلاعات تماس کاربری که مایل به دریافت مشاوره یا تماس است. وقتی کاربر نام و حداقل یک راه تماس (ایمیل یا شماره تلفن) ارائه داد، این ابزار را صدا بزن.",
      inputSchema: z.object({
        name: z.string().describe("نام کاربر"),
        email: z.string().optional().describe("ایمیل کاربر، در صورت وجود"),
        phone: z.string().optional().describe("شماره تماس کاربر، در صورت وجود"),
        intent: z
          .string()
          .optional()
          .describe("نوع کسب‌وکار یا خواستهٔ کاربر"),
        note: z.string().optional().describe("توضیح کوتاه اضافی"),
      }),
      execute: async ({ name, email, phone, intent, note }) => {
        if (!email && !phone) {
          return {
            ok: false,
            message: "برای ثبت، حداقل یک راه تماس (ایمیل یا تلفن) لازم است.",
          };
        }

        const supabase = getAdminClient();
        const message = [intent, note].filter(Boolean).join(" — ") || null;

        const { error } = await supabase.from("contacts").insert({
          name,
          email: email ?? null,
          phone: phone ?? null,
          message,
          source: "chatbot",
          session_id: ctx.sessionId,
        });

        if (error) {
          console.error("captureLead insert error:", error);
          return { ok: false, message: "ثبت اطلاعات با خطا مواجه شد." };
        }

        // Best-effort owner notification (never blocks the reply).
        await notifyLead({ name, email, phone, message, source: "chatbot" });

        return {
          ok: true,
          message: "اطلاعات تماس با موفقیت ثبت شد. به‌زودی تماس گرفته می‌شود.",
        };
      },
    }),

    requestOperator: tool({
      description:
        "ثبت درخواست صحبت با اپراتور/مشاور انسانی. وقتی کاربر صریحاً می‌خواهد با یک انسان (نه ربات) صحبت کند، یا سؤالش خارج از توان توست و اصرار دارد، این ابزار را صدا بزن.",
      inputSchema: z.object({
        reason: z
          .string()
          .optional()
          .describe("خلاصهٔ کوتاه موضوع یا دلیل درخواست کاربر"),
      }),
      execute: async ({ reason }) => {
        const supabase = getAdminClient();

        // Fail-soft if admin3.sql hasn't been applied — the user still gets a
        // polite confirmation and the owner still gets the email.
        const { error } = await supabase
          .from("chat_sessions")
          .update({ handoff_requested_at: new Date().toISOString() })
          .eq("id", ctx.sessionId);
        if (error) console.error("requestOperator update error:", error);

        await notifyHandoff({
          channel: ctx.channel ?? "web",
          sessionId: ctx.sessionId,
          reason: reason ?? null,
        });

        return {
          ok: true,
          message:
            "درخواست ثبت شد و به همکار انسانی اطلاع داده شد. اگر راه تماسی از کاربر نداری، حتماً نام و ایمیل یا تلفنش را بپرس و با captureLead ثبت کن تا بتوانیم پیگیری کنیم.",
        };
      },
    }),
  };
}
