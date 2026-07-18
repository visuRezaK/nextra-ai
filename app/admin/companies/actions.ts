"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";

export type CompanyActionState = { ok: true } | { ok: false; error: string } | undefined;

const FIELDS = ["name", "industry", "website", "city", "size_label", "notes"] as const;

function readCompany(formData: FormData) {
  const out: Record<string, string | null> = {};
  for (const f of FIELDS) out[f] = String(formData.get(f) ?? "").trim() || null;
  return out;
}

export async function createCompanyAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const fields = readCompany(formData);
  if (!fields.name) redirect("/admin/companies?error=name");

  const supabase = getAdminClient();
  const { data: company, error } = await supabase
    .from("companies")
    .insert(fields)
    .select("id")
    .single();
  if (error || !company) {
    console.error("createCompany error:", error);
    redirect("/admin/companies?error=save");
  }

  await logAudit({ actor: user, action: "company.create", target: company!.id as string });
  revalidatePath("/admin/companies");
  redirect(`/admin/companies/${company!.id}`);
}

export async function updateCompanyAction(
  _prev: CompanyActionState,
  formData: FormData,
): Promise<CompanyActionState> {
  const { user } = await requireRole(["operator"]);

  const companyId = String(formData.get("company_id") ?? "");
  if (!companyId) return { ok: false, error: "شرکت مشخص نشده است." };
  const fields = readCompany(formData);
  if (!fields.name) return { ok: false, error: "نام شرکت خالی است." };

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("companies")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", companyId);
  if (error) {
    console.error("updateCompany error:", error);
    return { ok: false, error: "ذخیره نشد." };
  }

  await logAudit({ actor: user, action: "company.update", target: companyId });
  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/admin/companies");
  return { ok: true };
}
