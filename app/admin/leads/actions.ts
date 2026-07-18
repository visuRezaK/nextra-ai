"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { scoreLead } from "@/lib/admin/ai";
import {
  isLeadNoteKind,
  isLeadStatus,
  LEAD_STATUS_LABELS,
  type LeadNoteKind,
} from "@/lib/admin/leads";

export type LeadActionState = { ok: true } | { ok: false; error: string } | undefined;

const CRM_MISSING_ERROR = "ذخیره نشد؛ آیا فایل supabase/admin6.sql در Supabase اجرا شده است؟";

// Escape LIKE/ILIKE wildcards so a company name with % or _ is matched literally
// during find-or-create on convert.
function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// <input type="date"> submits a bare YYYY-MM-DD with no zone. Anchor it to 09:00
// Toronto so faDate() — which renders in America/Toronto — never shows the day
// before. -05:00 is EST; during EDT this lands at 10:00 local, still the same
// calendar day, which is all that matters for a follow-up date.
function parseFollowUpDate(raw: string): string | null | "invalid" {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "invalid";
  const d = new Date(`${raw}T09:00:00-05:00`);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d.toISOString();
}

// expected_close is a plain `date` column, so unlike next_follow_up_at it needs
// no timezone anchoring — the raw YYYY-MM-DD is stored as-is.
function parseCloseDate(raw: string): string | null | "invalid" {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "invalid";
  if (Number.isNaN(new Date(raw).getTime())) return "invalid";
  return raw;
}

// The amount input is type=number, but a pasted «5,000.50» or a stray space
// would arrive as junk — reject rather than silently store 0. Dollars have
// cents, so decimals are allowed; the column is numeric(12,2) and rounds to 2.
function parseCad(raw: string): number | "invalid" {
  if (!raw) return 0;
  const cleaned = raw.replace(/[,٬\s]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100) / 100;
}

// Append to the timeline. Best-effort: lead_notes only exists after admin6.sql,
// and a missing note must never fail the stage change that triggered it.
async function appendNote(params: {
  supabase: ReturnType<typeof getAdminClient>;
  contactId: string;
  authorId: string;
  authorEmail: string | null;
  kind: LeadNoteKind;
  body: string;
}): Promise<void> {
  const { error } = await params.supabase.from("lead_notes").insert({
    contact_id: params.contactId,
    author_id: params.authorId,
    author_email: params.authorEmail,
    kind: params.kind,
    body: params.body,
  });
  if (error) console.error("lead note insert error:", error);
}

function revalidateLead(contactId: string): void {
  revalidatePath(`/admin/leads/${contactId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
}

// The lead detail form: stage + next follow-up + an optional note, one submit.
export async function updateLeadAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const { user } = await requireRole(["operator"]);

  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return { ok: false, error: "لید مشخص نشده است." };

  const status = String(formData.get("status") ?? "");
  if (!isLeadStatus(status)) return { ok: false, error: "وضعیت نامعتبر است." };

  const followUp = parseFollowUpDate(String(formData.get("next_follow_up_at") ?? "").trim());
  if (followUp === "invalid") return { ok: false, error: "تاریخ پیگیری نامعتبر است." };

  const expectedClose = parseCloseDate(String(formData.get("expected_close") ?? "").trim());
  if (expectedClose === "invalid") return { ok: false, error: "تاریخ بستن نامعتبر است." };

  const amount = parseCad(String(formData.get("amount_cad") ?? "").trim());
  if (amount === "invalid")
    return { ok: false, error: "مبلغ نامعتبر است — یک عدد مثبت به دلار کانادا وارد کنید." };

  const note = String(formData.get("note") ?? "").trim();

  const supabase = getAdminClient();

  // Read the current stage first so we know whether to log a status change and
  // whether won_at needs to move. won_at only exists after admin7.sql, so a null
  // here would otherwise read as «lead not found» — step down instead.
  let { data: current } = await supabase
    .from("contacts")
    .select("status, won_at")
    .eq("id", contactId)
    .maybeSingle();
  if (!current) {
    ({ data: current } = await supabase
      .from("contacts")
      .select("status")
      .eq("id", contactId)
      .maybeSingle());
  }
  if (!current) return { ok: false, error: "لید یافت نشد." };

  const previous = current.status as string | null;

  // won_at stamps the close, so the monthly-revenue report has a date to group
  // on. It's set on the way in and cleared on the way out — a lead reopened
  // after a mistaken «برنده» must not keep counting as revenue.
  let wonAt = (current.won_at as string | null) ?? null;
  if (status === "won" && previous !== "won") wonAt = new Date().toISOString();
  else if (status !== "won" && previous === "won") wonAt = null;

  const base = {
    status,
    next_follow_up_at: followUp,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("contacts")
    .update({ ...base, expected_close: expectedClose, amount_cad: amount, won_at: wonAt })
    .eq("id", contactId);
  if (error) {
    // Unknown-column error — admin7.sql not applied yet. PostgREST reports it as
    // PGRST204 (schema cache) or 42703 (PostgreSQL). Retry without the money
    // columns so the stage change still lands, same as appendMessages does for
    // the usage columns in lib/chatbot/memory.ts.
    if (error.code === "PGRST204" || error.code === "42703") {
      const { error: retryError } = await supabase
        .from("contacts")
        .update(base)
        .eq("id", contactId);
      if (retryError) {
        console.error("updateLead retry error:", retryError);
        return { ok: false, error: CRM_MISSING_ERROR };
      }
    } else {
      console.error("updateLead error:", error);
      return { ok: false, error: CRM_MISSING_ERROR };
    }
  }

  if (isLeadStatus(previous) && previous !== status) {
    await appendNote({
      supabase,
      contactId,
      authorId: user.id,
      authorEmail: user.email ?? null,
      kind: "status",
      body: `وضعیت از «${LEAD_STATUS_LABELS[previous]}» به «${LEAD_STATUS_LABELS[status]}» تغییر کرد.`,
    });
  }

  if (note) {
    await appendNote({
      supabase,
      contactId,
      authorId: user.id,
      authorEmail: user.email ?? null,
      kind: "note",
      body: note,
    });
  }

  await logAudit({
    actor: user,
    action: "lead.update",
    target: contactId,
    meta: {
      status,
      next_follow_up_at: followUp,
      expected_close: expectedClose,
      amount_cad: amount,
      won_at: wonAt,
      note: note.length > 0,
    },
  });
  revalidateLead(contactId);
  return { ok: true };
}

// One-click "پیگیری انجام شد" — clears the follow-up date.
export async function clearFollowUpAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return;

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("contacts")
    .update({ next_follow_up_at: null, updated_at: new Date().toISOString() })
    .eq("id", contactId);
  if (error) {
    console.error("clearFollowUp error:", error);
    return;
  }

  await logAudit({ actor: user, action: "lead.followup.clear", target: contactId });
  revalidateLead(contactId);
}

// Promote a lead (contacts row) into the normalized CRM: find-or-create a
// company, create a person, optionally open a deal, seed the person's timeline
// with the lead's message, and stamp the lead converted. Then jump to the new
// person's 360° profile. The lead's own row and capture stay intact.
export async function convertLeadAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return;

  const supabase = getAdminClient();

  // person_id is admin8; amount_cad is admin7 and may not be applied, so it is
  // NOT selected here — the deal's seed amount comes from the form instead.
  const { data: lead } = await supabase
    .from("contacts")
    .select("id, name, email, phone, message, source, session_id, person_id")
    .eq("id", contactId)
    .maybeSingle();
  if (!lead) return;

  // Already converted → just go to the person (idempotent, no duplicate people).
  if (lead.person_id) redirect(`/admin/people/${lead.person_id}`);

  // Find-or-create the company by name (case-insensitive, wildcards escaped).
  const companyName = String(formData.get("company_name") ?? "").trim();
  let companyId: string | null = null;
  if (companyName) {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", escapeLike(companyName))
      .limit(1)
      .maybeSingle();
    if (existing) {
      companyId = existing.id as string;
    } else {
      const { data: created } = await supabase
        .from("companies")
        .insert({ name: companyName })
        .select("id")
        .single();
      companyId = created?.id ?? null;
    }
  }

  const { data: person, error: personErr } = await supabase
    .from("people")
    .insert({
      company_id: companyId,
      full_name: lead.name,
      email: lead.email,
      phone: lead.phone,
      source: lead.source,
      lead_id: lead.id,
      session_id: lead.session_id,
    })
    .select("id")
    .single();
  if (personErr || !person) {
    console.error("convertLead person error:", personErr);
    return;
  }
  const personId = person.id as string;

  // Optional deal, seeded with the amount typed in the convert form.
  let dealId: string | null = null;
  if (formData.get("create_deal") === "on") {
    const parsed = parseCad(String(formData.get("deal_amount") ?? "").trim());
    const dealAmount = parsed === "invalid" ? 0 : parsed;
    const title = String(formData.get("deal_title") ?? "").trim() || `همکاری با ${lead.name}`;
    const { data: deal } = await supabase
      .from("deals")
      .insert({
        title,
        person_id: personId,
        company_id: companyId,
        stage_key: "new",
        status: "open",
        amount_cad: dealAmount,
      })
      .select("id")
      .single();
    dealId = deal?.id ?? null;
  }

  // Seed the timeline with the lead's original challenge.
  if (lead.message) {
    await supabase.from("activities").insert({
      person_id: personId,
      deal_id: dealId,
      type: "note",
      title: "چالش اولیهٔ لید (Lead challenge)",
      body: lead.message,
      created_by: user.email ?? null,
    });
  }

  await supabase
    .from("contacts")
    .update({ converted_at: new Date().toISOString(), person_id: personId })
    .eq("id", contactId);

  await logAudit({
    actor: user,
    action: "lead.convert",
    target: contactId,
    meta: { person_id: personId, company_id: companyId, deal: dealId != null },
  });
  revalidatePath(`/admin/leads/${contactId}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/people");
  redirect(`/admin/people/${personId}`);
}

// AI lead scoring (manual trigger). Writes ai_score/rationale/scored_at.
export async function scoreLeadAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);
  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return;

  const supabase = getAdminClient();
  const { data: lead } = await supabase
    .from("contacts")
    .select("name, message, source, status")
    .eq("id", contactId)
    .maybeSingle();
  if (!lead) return;

  try {
    const { score, rationale } = await scoreLead({
      name: lead.name,
      message: lead.message ?? null,
      source: lead.source,
      status: (lead.status as string) ?? "new",
    });
    await supabase
      .from("contacts")
      .update({ ai_score: score, ai_score_rationale: rationale, ai_scored_at: new Date().toISOString() })
      .eq("id", contactId);
    await logAudit({ actor: user, action: "lead.ai_score", target: contactId, meta: { score } });
  } catch (err) {
    console.error("scoreLead error:", err);
  }
  revalidateLead(contactId);
}

// Standalone timeline entry — a note, or a logged call/email/meeting.
export async function addLeadNoteAction(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const { user } = await requireRole(["operator"]);

  const contactId = String(formData.get("contact_id") ?? "");
  if (!contactId) return { ok: false, error: "لید مشخص نشده است." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "متن یادداشت خالی است." };

  const rawKind = String(formData.get("kind") ?? "note");
  const kind: LeadNoteKind = isLeadNoteKind(rawKind) && rawKind !== "status" ? rawKind : "note";

  const supabase = getAdminClient();
  const { error } = await supabase.from("lead_notes").insert({
    contact_id: contactId,
    author_id: user.id,
    author_email: user.email ?? null,
    kind,
    body,
  });
  if (error) {
    console.error("addLeadNote error:", error);
    return { ok: false, error: CRM_MISSING_ERROR };
  }

  await logAudit({
    actor: user,
    action: "lead.note",
    target: contactId,
    meta: { kind, length: body.length },
  });
  revalidateLead(contactId);
  return { ok: true };
}
