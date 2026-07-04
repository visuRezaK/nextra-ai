"use server";

import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { retrieve, type RetrievedChunk } from "@/lib/chatbot/rag";
import { ingestAll } from "@/lib/chatbot/ingest";
import { revalidatePath } from "next/cache";

export type TestSearchState =
  | { ok: true; query: string; results: RetrievedChunk[] }
  | { ok: false; error: string }
  | undefined;

export async function testSearchAction(
  _prev: TestSearchState,
  formData: FormData,
): Promise<TestSearchState> {
  await requireRole(["editor"]);

  const query = String(formData.get("query") ?? "").trim();
  const locale = String(formData.get("locale") ?? "fa");
  if (!query) return { ok: false, error: "متن جستجو را وارد کنید." };
  if (locale !== "fa" && locale !== "en") return { ok: false, error: "زبان نامعتبر است." };

  try {
    const results = await retrieve(query, locale, 5);
    return { ok: true, query, results };
  } catch (err) {
    console.error("testSearchAction error:", err);
    return { ok: false, error: "جستجو ناموفق بود. اتصال به مدل embedding را بررسی کنید." };
  }
}

export type ReingestState =
  | { ok: true; summary: { locale: string; count: number }[] }
  | { ok: false; error: string }
  | undefined;

// No params needed — useActionState's (state, payload) args are ignorable.
export async function reingestAction(): Promise<ReingestState> {
  const { user } = await requireRole(["editor"]);

  try {
    const summary = await ingestAll();
    await logAudit({
      actor: user,
      action: "kb.reingest",
      meta: { summary },
    });
    revalidatePath("/admin/knowledge");
    return { ok: true, summary };
  } catch (err) {
    console.error("reingestAction error:", err);
    return { ok: false, error: "بازسازی پایگاه دانش ناموفق بود." };
  }
}
