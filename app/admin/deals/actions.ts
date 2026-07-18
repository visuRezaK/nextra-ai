"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { dealNextAction } from "@/lib/admin/ai";
import { dealStatusFromStage, daysInStage } from "@/lib/admin/crm";

export type DealActionState = { ok: true } | { ok: false; error: string } | undefined;
export type MoveResult = { ok: true } | { ok: false; error: string };

function parseCad(raw: string): number | "invalid" {
  if (!raw) return 0;
  const cleaned = raw.replace(/[,٬\s]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100) / 100;
}

// expected_close is a plain `date`; the raw YYYY-MM-DD is stored as-is.
function parseCloseDate(raw: string): string | null | "invalid" {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "invalid";
  if (Number.isNaN(new Date(raw).getTime())) return "invalid";
  return raw;
}

// Move a deal to a stage. The deal's status (open|won|lost) is DERIVED from the
// stage's flags, won_at/lost_at are stamped/cleared accordingly, and the move is
// logged as a stage_change activity on the person's timeline. Called from the
// board (drag or the mobile select) and the deal detail page.
export async function moveDealAction(
  dealId: string,
  stageKey: string,
  reason: string | null,
): Promise<MoveResult> {
  const { user } = await requireRole(["operator"]);
  if (!dealId || !stageKey) return { ok: false, error: "ورودی نامعتبر است." };

  const supabase = getAdminClient();

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("key, label_fa, is_won, is_lost")
    .eq("key", stageKey)
    .maybeSingle();
  if (!stage) return { ok: false, error: "مرحله نامعتبر است." };

  const { data: deal } = await supabase
    .from("deals")
    .select("id, stage_key, person_id, pipeline_stages(label_fa)")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { ok: false, error: "معامله یافت نشد." };
  if (deal.stage_key === stageKey) return { ok: true };

  const status = dealStatusFromStage(stage as { is_won: boolean; is_lost: boolean });
  const now = new Date().toISOString();
  const cleanReason = status === "lost" ? (reason?.trim() || null) : null;

  const { error } = await supabase
    .from("deals")
    .update({
      stage_key: stageKey,
      status,
      stage_entered_at: now,
      updated_at: now,
      won_at: status === "won" ? now : null,
      lost_at: status === "lost" ? now : null,
      lost_reason: cleanReason,
    })
    .eq("id", dealId);
  if (error) {
    console.error("moveDeal error:", error);
    return { ok: false, error: "جابه‌جا نشد." };
  }

  if (deal.person_id) {
    const fromLabel =
      (deal.pipeline_stages as unknown as { label_fa: string } | null)?.label_fa ?? deal.stage_key;
    await supabase.from("activities").insert({
      person_id: deal.person_id,
      deal_id: dealId,
      type: "stage_change",
      title: "تغییر مرحله",
      body: `«${fromLabel}» → «${stage.label_fa}»${cleanReason ? ` — دلیل: ${cleanReason}` : ""}`,
      created_by: user.email ?? null,
    });
  }

  await logAudit({ actor: user, action: "deal.move", target: dealId, meta: { stage: stageKey, status } });
  revalidatePath("/admin/deals");
  revalidatePath(`/admin/deals/${dealId}`);
  revalidatePath("/admin/people");
  return { ok: true };
}

export async function createDealAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect("/admin/deals?error=title");

  const parsed = parseCad(String(formData.get("amount_cad") ?? "").trim());
  const amount = parsed === "invalid" ? 0 : parsed;
  const personId = String(formData.get("person_id") ?? "").trim() || null;

  const supabase = getAdminClient();

  // Inherit the person's company so the deal shows on the company page too.
  let companyId: string | null = null;
  if (personId) {
    const { data: person } = await supabase
      .from("people")
      .select("company_id")
      .eq("id", personId)
      .maybeSingle();
    companyId = (person?.company_id as string | null) ?? null;
  }

  const { data: deal, error } = await supabase
    .from("deals")
    .insert({
      title,
      person_id: personId,
      company_id: companyId,
      stage_key: "new",
      status: "open",
      amount_cad: amount,
    })
    .select("id")
    .single();
  if (error || !deal) {
    console.error("createDeal error:", error);
    redirect("/admin/deals?error=save");
  }

  await logAudit({ actor: user, action: "deal.create", target: deal!.id as string });
  revalidatePath("/admin/deals");
  redirect("/admin/deals");
}

// Field edits only (title / amount / expected_close). Stage moves go through
// moveDealAction so the status-derive + activity logging live in one place.
export async function updateDealAction(
  _prev: DealActionState,
  formData: FormData,
): Promise<DealActionState> {
  const { user } = await requireRole(["operator"]);

  const dealId = String(formData.get("deal_id") ?? "");
  if (!dealId) return { ok: false, error: "معامله مشخص نشده است." };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "عنوان معامله خالی است." };

  const parsed = parseCad(String(formData.get("amount_cad") ?? "").trim());
  if (parsed === "invalid") return { ok: false, error: "مبلغ نامعتبر است." };
  const expectedClose = parseCloseDate(String(formData.get("expected_close") ?? "").trim());
  if (expectedClose === "invalid") return { ok: false, error: "تاریخ بستن نامعتبر است." };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("deals")
    .update({
      title,
      amount_cad: parsed,
      expected_close: expectedClose,
      updated_at: new Date().toISOString(),
    })
    .eq("id", dealId);
  if (error) {
    console.error("updateDeal error:", error);
    return { ok: false, error: "ذخیره نشد." };
  }

  await logAudit({ actor: user, action: "deal.update", target: dealId });
  revalidatePath(`/admin/deals/${dealId}`);
  revalidatePath("/admin/deals");
  return { ok: true };
}

// AI next-action suggestion for a deal. Writes deals.ai_next_action.
export async function dealNextActionAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);
  const dealId = String(formData.get("deal_id") ?? "");
  if (!dealId) return;

  const supabase = getAdminClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("title, amount_cad, stage_entered_at, pipeline_stages(label_fa)")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return;

  const { data: acts } = await supabase
    .from("activities")
    .select("type, title, body")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false })
    .limit(5);
  const recent = (acts ?? []).map((a) => `${a.title ?? a.type}: ${a.body ?? ""}`).join(" | ");
  const stageLabel =
    (deal.pipeline_stages as unknown as { label_fa: string } | null)?.label_fa ?? "—";

  try {
    const suggestion = await dealNextAction({
      title: deal.title,
      stage: stageLabel,
      daysInStage: daysInStage(deal.stage_entered_at as string | null),
      amount: Number(deal.amount_cad ?? 0),
      recent,
    });
    await supabase
      .from("deals")
      .update({ ai_next_action: suggestion, ai_next_action_at: new Date().toISOString() })
      .eq("id", dealId);
    await logAudit({ actor: user, action: "deal.ai_next_action", target: dealId });
  } catch (err) {
    console.error("dealNextAction error:", err);
  }
  revalidatePath(`/admin/deals/${dealId}`);
  revalidatePath("/admin/deals");
}

export async function deleteDealAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const dealId = String(formData.get("deal_id") ?? "");
  if (!dealId) return;

  const supabase = getAdminClient();
  const { error } = await supabase.from("deals").delete().eq("id", dealId);
  if (error) {
    console.error("deleteDeal error:", error);
    return;
  }

  await logAudit({ actor: user, action: "deal.delete", target: dealId });
  revalidatePath("/admin/deals");
  redirect("/admin/deals");
}
