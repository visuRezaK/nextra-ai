"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { rewriteContract } from "@/lib/admin/ai";
import { buildContractMarkdown } from "@/lib/admin/contracts";

export type ContractActionState = { ok: true } | { ok: false; error: string } | undefined;

function parseCad(raw: string): number | "invalid" {
  if (!raw) return 0;
  const cleaned = raw.replace(/[,٬\s]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return "invalid";
  return Math.round(n * 100) / 100;
}

function parseDate(raw: string): string | null | "invalid" {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "invalid";
  if (Number.isNaN(new Date(raw).getTime())) return "invalid";
  return raw;
}

type DealJoin = {
  id: string;
  title: string;
  amount_cad: number | string | null;
  person_id: string | null;
  company_id: string | null;
  people: { full_name: string; email: string | null; phone: string | null } | null;
  companies: { name: string } | null;
};

// Create a draft contract from a deal, seeded with the Nextra template.
export async function createContractAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const dealId = String(formData.get("deal_id") ?? "");
  if (!dealId) redirect("/admin/contracts?error=deal");

  const supabase = getAdminClient();
  const { data: dealData } = await supabase
    .from("deals")
    .select(
      "id, title, amount_cad, person_id, company_id, people(full_name, email, phone), companies(name)",
    )
    .eq("id", dealId)
    .maybeSingle();
  const deal = dealData as unknown as DealJoin | null;
  if (!deal) redirect("/admin/contracts?error=deal");

  // Contract number NX-<year>-<seq>, sequential within the calendar year.
  const year = new Date().getFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1)).toISOString();
  const { count } = await supabase
    .from("contracts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", yearStart);
  const contractNo = `NX-${year}-${String((count ?? 0) + 1).padStart(3, "0")}`;

  const amount = Number(deal!.amount_cad ?? 0);
  const personName = deal!.people?.full_name ?? deal!.title;
  const durationLabel = "یک ماه";
  const bodyMd = buildContractMarkdown({
    contractNo,
    personName,
    companyName: deal!.companies?.name ?? null,
    personEmail: deal!.people?.email ?? null,
    personPhone: deal!.people?.phone ?? null,
    amountCad: amount,
    durationLabel,
    startDate: null,
  });

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      contract_no: contractNo,
      title: `قرارداد ${personName}`,
      deal_id: deal!.id,
      person_id: deal!.person_id,
      company_id: deal!.company_id,
      body_md: bodyMd,
      amount_cad: amount,
      duration_label: durationLabel,
      status: "draft",
    })
    .select("id")
    .single();
  if (error || !contract) {
    console.error("createContract error:", error);
    redirect("/admin/contracts?error=save");
  }

  await logAudit({ actor: user, action: "contract.create", target: contract!.id as string });
  revalidatePath("/admin/contracts");
  redirect(`/admin/contracts/${contract!.id}`);
}

// Edit the contract body / meta. Blocked once accepted (the client signed this
// text) or canceled.
export async function updateContractAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const { user } = await requireRole(["operator"]);

  const id = String(formData.get("contract_id") ?? "");
  if (!id) return { ok: false, error: "قرارداد مشخص نشده است." };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "عنوان قرارداد خالی است." };
  const bodyMd = String(formData.get("body_md") ?? "").trim();
  if (!bodyMd) return { ok: false, error: "متن قرارداد خالی است." };

  const amount = parseCad(String(formData.get("amount_cad") ?? "").trim());
  if (amount === "invalid") return { ok: false, error: "مبلغ نامعتبر است." };
  const startDate = parseDate(String(formData.get("start_date") ?? "").trim());
  if (startDate === "invalid") return { ok: false, error: "تاریخ شروع نامعتبر است." };

  const supabase = getAdminClient();
  const { data: current } = await supabase
    .from("contracts")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { ok: false, error: "قرارداد یافت نشد." };
  if (current.status === "accepted" || current.status === "canceled") {
    return { ok: false, error: "قرارداد تأییدشده یا لغوشده قابل ویرایش نیست." };
  }

  const { error } = await supabase
    .from("contracts")
    .update({
      title,
      body_md: bodyMd,
      amount_cad: amount,
      start_date: startDate,
      duration_label: String(formData.get("duration_label") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("updateContract error:", error);
    return { ok: false, error: "ذخیره نشد." };
  }

  await logAudit({ actor: user, action: "contract.update", target: id });
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
  return { ok: true };
}

// AI rewrite of the contract body. Returns a result so the editor can show an
// error; on success the body is saved and the page revalidates.
export async function rewriteContractAction(
  _prev: ContractActionState,
  formData: FormData,
): Promise<ContractActionState> {
  const { user } = await requireRole(["operator"]);
  const id = String(formData.get("contract_id") ?? "");
  if (!id) return { ok: false, error: "قرارداد مشخص نشده است." };

  const supabase = getAdminClient();
  const { data: current } = await supabase
    .from("contracts")
    .select("body_md, status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return { ok: false, error: "قرارداد یافت نشد." };
  if (current.status === "accepted" || current.status === "canceled") {
    return { ok: false, error: "این قرارداد قابل ویرایش نیست." };
  }

  try {
    const rewritten = await rewriteContract({
      bodyMd: current.body_md as string,
      note: String(formData.get("note") ?? "").trim(),
    });
    await supabase
      .from("contracts")
      .update({ body_md: rewritten, updated_at: new Date().toISOString() })
      .eq("id", id);
    await logAudit({ actor: user, action: "contract.ai_rewrite", target: id });
  } catch (err) {
    console.error("rewriteContract error:", err);
    return { ok: false, error: "بازنویسی ناموفق بود — بعداً دوباره امتحان کنید." };
  }
  revalidatePath(`/admin/contracts/${id}`);
  return { ok: true };
}

// Draft → sent: mint the public share token (once) and stamp sent_at.
export async function sendContractAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const id = String(formData.get("contract_id") ?? "");
  if (!id) return;

  const supabase = getAdminClient();
  const { data: current } = await supabase
    .from("contracts")
    .select("share_token, status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return;

  const token = (current.share_token as string | null) ?? randomUUID().replace(/-/g, "");
  const { error } = await supabase
    .from("contracts")
    .update({ status: "sent", share_token: token, sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("sendContract error:", error);
    return;
  }

  await logAudit({ actor: user, action: "contract.send", target: id });
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
}

// Reopen a sent/viewed/canceled contract for editing (back to draft). Not
// allowed once accepted.
export async function reopenContractAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const id = String(formData.get("contract_id") ?? "");
  if (!id) return;

  const supabase = getAdminClient();
  const { data: current } = await supabase.from("contracts").select("status").eq("id", id).maybeSingle();
  if (!current || current.status === "accepted") return;

  const { error } = await supabase
    .from("contracts")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("reopenContract error:", error);
    return;
  }
  await logAudit({ actor: user, action: "contract.reopen", target: id });
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
}

export async function cancelContractAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const id = String(formData.get("contract_id") ?? "");
  if (!id) return;

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("contracts")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("cancelContract error:", error);
    return;
  }
  await logAudit({ actor: user, action: "contract.cancel", target: id });
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
}

export async function deleteContractAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const id = String(formData.get("contract_id") ?? "");
  if (!id) return;

  const supabase = getAdminClient();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) {
    console.error("deleteContract error:", error);
    return;
  }
  await logAudit({ actor: user, action: "contract.delete", target: id });
  revalidatePath("/admin/contracts");
  redirect("/admin/contracts");
}
