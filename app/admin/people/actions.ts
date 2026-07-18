"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { summarizePerson } from "@/lib/admin/ai";
import { isActivityType } from "@/lib/admin/crm";

export type CrmActionState = { ok: true } | { ok: false; error: string } | undefined;

function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Find-or-create a company by name (shared by person create/edit). Returns the
// company id, or null when no name was given.
async function resolveCompany(
  supabase: ReturnType<typeof getAdminClient>,
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const { data: existing } = await supabase
    .from("companies")
    .select("id")
    .ilike("name", escapeLike(trimmed))
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data: created } = await supabase
    .from("companies")
    .insert({ name: trimmed })
    .select("id")
    .single();
  return created?.id ?? null;
}

// Create a person manually (outside the convert flow). Redirects to the profile.
export async function createPersonAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) redirect("/admin/people?error=name");

  const supabase = getAdminClient();
  const companyId = await resolveCompany(supabase, String(formData.get("company_name") ?? ""));

  const { data: person, error } = await supabase
    .from("people")
    .insert({
      full_name: fullName,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      position: String(formData.get("position") ?? "").trim() || null,
      company_id: companyId,
      source: "manual",
    })
    .select("id")
    .single();
  if (error || !person) {
    console.error("createPerson error:", error);
    redirect("/admin/people?error=save");
  }

  await logAudit({ actor: user, action: "person.create", target: person!.id as string });
  revalidatePath("/admin/people");
  redirect(`/admin/people/${person!.id}`);
}

export async function updatePersonAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const { user } = await requireRole(["operator"]);

  const personId = String(formData.get("person_id") ?? "");
  if (!personId) return { ok: false, error: "مخاطب مشخص نشده است." };
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "نام مخاطب خالی است." };

  const supabase = getAdminClient();
  const companyId = await resolveCompany(supabase, String(formData.get("company_name") ?? ""));

  const { error } = await supabase
    .from("people")
    .update({
      full_name: fullName,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      position: String(formData.get("position") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      company_id: companyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId);
  if (error) {
    console.error("updatePerson error:", error);
    return { ok: false, error: "ذخیره نشد." };
  }

  await logAudit({ actor: user, action: "person.update", target: personId });
  revalidatePath(`/admin/people/${personId}`);
  revalidatePath("/admin/people");
  return { ok: true };
}

// Add a timeline entry (note / call / meeting / task) to a person. Tasks carry a
// due date (already an ISO string, converted browser-side).
export async function addActivityAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const { user } = await requireRole(["operator"]);

  const personId = String(formData.get("person_id") ?? "");
  if (!personId) return { ok: false, error: "مخاطب مشخص نشده است." };

  const rawType = String(formData.get("type") ?? "note");
  const type = isActivityType(rawType) && rawType !== "stage_change" ? rawType : "note";

  const body = String(formData.get("body") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  if (!body && !title) return { ok: false, error: "متن یا عنوان لازم است." };

  const dueRaw = String(formData.get("due_at") ?? "").trim();
  let dueAt: string | null = null;
  if (dueRaw) {
    const d = new Date(dueRaw);
    if (Number.isNaN(d.getTime())) return { ok: false, error: "تاریخ سررسید نامعتبر است." };
    dueAt = d.toISOString();
  }

  const supabase = getAdminClient();
  const { error } = await supabase.from("activities").insert({
    person_id: personId,
    type,
    title,
    body: body || null,
    due_at: type === "task" ? dueAt : null,
    created_by: user.email ?? null,
  });
  if (error) {
    console.error("addActivity error:", error);
    return { ok: false, error: "ثبت نشد." };
  }

  await logAudit({ actor: user, action: "activity.create", target: personId, meta: { type } });
  revalidatePath(`/admin/people/${personId}`);
  revalidatePath("/admin/activities");
  revalidatePath("/admin");
  return { ok: true };
}

// AI "customer insight" — summarize the person's chatbot transcript (or, if
// none, their timeline) into 3–5 bullets. Writes people.ai_summary.
export async function summarizePersonAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);
  const personId = String(formData.get("person_id") ?? "");
  if (!personId) return;

  const supabase = getAdminClient();
  const { data: person } = await supabase
    .from("people")
    .select("full_name, session_id")
    .eq("id", personId)
    .maybeSingle();
  if (!person) return;

  // Prefer the chatbot transcript; fall back to timeline entries.
  let transcript = "";
  if (person.session_id) {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", person.session_id)
      .in("role", ["user", "assistant"])
      .order("created_at", { ascending: true })
      .limit(60);
    transcript = (msgs ?? [])
      .map((m) => `${m.role === "user" ? "کاربر" : "دستیار"}: ${m.content}`)
      .join("\n");
  }
  if (!transcript) {
    const { data: acts } = await supabase
      .from("activities")
      .select("type, title, body")
      .eq("person_id", personId)
      .order("created_at", { ascending: false })
      .limit(30);
    transcript = (acts ?? []).map((a) => `${a.title ?? a.type}: ${a.body ?? ""}`).join("\n");
  }
  if (!transcript.trim()) return;

  try {
    const summary = await summarizePerson({ name: person.full_name, transcript });
    await supabase
      .from("people")
      .update({ ai_summary: summary, ai_summary_at: new Date().toISOString() })
      .eq("id", personId);
    await logAudit({ actor: user, action: "person.ai_summary", target: personId });
  } catch (err) {
    console.error("summarizePerson error:", err);
  }
  revalidatePath(`/admin/people/${personId}`);
}

// Toggle a task's done state from the timeline checkbox.
export async function toggleTaskAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const activityId = String(formData.get("activity_id") ?? "");
  const personId = String(formData.get("person_id") ?? "");
  if (!activityId) return;

  const done = formData.get("done") === "1";
  const supabase = getAdminClient();
  const { error } = await supabase
    .from("activities")
    .update({ done_at: done ? new Date().toISOString() : null })
    .eq("id", activityId);
  if (error) {
    console.error("toggleTask error:", error);
    return;
  }

  await logAudit({ actor: user, action: "activity.toggle", target: activityId, meta: { done } });
  if (personId) revalidatePath(`/admin/people/${personId}`);
  revalidatePath("/admin/activities");
  revalidatePath("/admin");
}
