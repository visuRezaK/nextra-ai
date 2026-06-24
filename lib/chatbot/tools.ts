import { tool } from "ai";
import { z } from "zod";
import { getAdminClient } from "./supabase-admin";
import { notifyLead } from "./notify";

// Tools the brain can call. Phase 1 ships a single lead-capture tool that writes
// to the same `contacts` table the booking form uses (source = 'chatbot').
export function buildTools(ctx: { sessionId: string }) {
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
  };
}
