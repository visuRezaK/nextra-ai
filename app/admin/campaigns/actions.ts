"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { sendEmail } from "@/lib/chatbot/notify";
import { generateCampaignEmail } from "@/lib/admin/ai";
import { isSegmentKey, resolveSegment } from "@/lib/admin/segments";

export type CampaignActionState = { ok: true } | { ok: false; error: string } | undefined;

// Create a campaign and freeze its segment into one pending email per recipient.
export async function createCampaignAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);

  const name = String(formData.get("name") ?? "").trim();
  const segmentKey = String(formData.get("segment_key") ?? "");
  const goal = String(formData.get("goal") ?? "").trim();
  if (!name || !isSegmentKey(segmentKey)) redirect("/admin/campaigns?error=input");

  const supabase = getAdminClient();
  const recipients = await resolveSegment(supabase, segmentKey);

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({ name, segment_key: segmentKey, goal: goal || null, status: "draft", created_by: user.email ?? null })
    .select("id")
    .single();
  if (error || !campaign) {
    console.error("createCampaign error:", error);
    redirect("/admin/campaigns?error=save");
  }

  if (recipients.length > 0) {
    const rows = recipients.map((r) => ({
      campaign_id: campaign!.id,
      person_id: r.personId,
      lead_id: r.leadId,
      to_name: r.name,
      to_email: r.email,
      context: r.context,
      status: "pending",
    }));
    const { error: emailsErr } = await supabase.from("campaign_emails").insert(rows);
    if (emailsErr) console.error("createCampaign emails error:", emailsErr);
  }

  await logAudit({
    actor: user,
    action: "campaign.create",
    target: campaign!.id as string,
    meta: { segment: segmentKey, recipients: recipients.length },
  });
  revalidatePath("/admin/campaigns");
  redirect(`/admin/campaigns/${campaign!.id}`);
}

// Compose/edit one recipient's email. Both fields present ⇒ ready to send.
export async function updateEmailAction(
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const { user } = await requireRole(["operator"]);

  const emailId = String(formData.get("email_id") ?? "");
  if (!emailId) return { ok: false, error: "ایمیل مشخص نشده است." };
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyText = String(formData.get("body_text") ?? "").trim();

  const supabase = getAdminClient();
  const { data: current } = await supabase
    .from("campaign_emails")
    .select("status, campaign_id")
    .eq("id", emailId)
    .maybeSingle();
  if (!current) return { ok: false, error: "ایمیل یافت نشد." };
  if (current.status === "sent") return { ok: false, error: "این ایمیل قبلاً ارسال شده است." };

  const status = subject && bodyText ? "ready" : "pending";
  const { error } = await supabase
    .from("campaign_emails")
    .update({ subject: subject || null, body_text: bodyText || null, status, error: null })
    .eq("id", emailId);
  if (error) {
    console.error("updateEmail error:", error);
    return { ok: false, error: "ذخیره نشد." };
  }

  await logAudit({ actor: user, action: "campaign.email.edit", target: emailId });
  revalidatePath(`/admin/campaigns/${current.campaign_id}`);
  return { ok: true };
}

// AI-draft one recipient's email from the campaign goal + their context.
// Fills subject/body and marks it ready.
export async function generateEmailAction(
  _prev: CampaignActionState,
  formData: FormData,
): Promise<CampaignActionState> {
  const { user } = await requireRole(["operator"]);
  const emailId = String(formData.get("email_id") ?? "");
  if (!emailId) return { ok: false, error: "ایمیل مشخص نشده است." };

  const supabase = getAdminClient();
  const { data: email } = await supabase
    .from("campaign_emails")
    .select("to_name, context, status, campaign_id, campaigns(goal)")
    .eq("id", emailId)
    .maybeSingle();
  if (!email) return { ok: false, error: "ایمیل یافت نشد." };
  if (email.status === "sent") return { ok: false, error: "این ایمیل قبلاً ارسال شده است." };

  const goal = (email.campaigns as unknown as { goal: string | null } | null)?.goal ?? "";
  const context = Object.entries((email.context as Record<string, unknown>) ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(" · ");

  try {
    const { subject, body } = await generateCampaignEmail({ name: email.to_name as string, goal, context });
    await supabase
      .from("campaign_emails")
      .update({ subject, body_text: body, status: "ready", error: null })
      .eq("id", emailId);
    await logAudit({ actor: user, action: "campaign.email.ai_generate", target: emailId });
  } catch (err) {
    console.error("generateEmail error:", err);
    return { ok: false, error: "تولید ناموفق بود — بعداً دوباره امتحان کنید." };
  }
  revalidatePath(`/admin/campaigns/${email.campaign_id}`);
  return { ok: true };
}

export async function skipEmailAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);
  const emailId = String(formData.get("email_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!emailId) return;

  const supabase = getAdminClient();
  const { error } = await supabase
    .from("campaign_emails")
    .update({ status: "skipped" })
    .eq("id", emailId)
    .neq("status", "sent");
  if (error) {
    console.error("skipEmail error:", error);
    return;
  }
  await logAudit({ actor: user, action: "campaign.email.skip", target: emailId });
  if (campaignId) revalidatePath(`/admin/campaigns/${campaignId}`);
}

// Send one reviewed email via Resend, marking it sent or failed.
export async function sendEmailAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);
  const emailId = String(formData.get("email_id") ?? "");
  const campaignId = String(formData.get("campaign_id") ?? "");
  if (!emailId) return;

  const supabase = getAdminClient();
  const { data: email } = await supabase
    .from("campaign_emails")
    .select("id, to_email, subject, body_text, status, campaign_id")
    .eq("id", emailId)
    .maybeSingle();
  if (!email) return;
  if (email.status === "sent") return;
  if (!email.subject || !email.body_text) {
    await supabase
      .from("campaign_emails")
      .update({ status: "failed", error: "موضوع یا متن خالی است." })
      .eq("id", emailId);
    revalidatePath(`/admin/campaigns/${email.campaign_id}`);
    return;
  }

  const result = await sendEmail({
    to: email.to_email as string,
    subject: email.subject as string,
    text: email.body_text as string,
  });

  await supabase
    .from("campaign_emails")
    .update(
      result.ok
        ? { status: "sent", sent_at: new Date().toISOString(), error: null }
        : { status: "failed", error: result.error },
    )
    .eq("id", emailId);

  await logAudit({ actor: user, action: "campaign.email.send", target: emailId, meta: { ok: result.ok } });
  revalidatePath(`/admin/campaigns/${campaignId || email.campaign_id}`);
}

export async function deleteCampaignAction(formData: FormData): Promise<void> {
  const { user } = await requireRole(["operator"]);
  const id = String(formData.get("campaign_id") ?? "");
  if (!id) return;

  const supabase = getAdminClient();
  const { error } = await supabase.from("campaigns").delete().eq("id", id);
  if (error) {
    console.error("deleteCampaign error:", error);
    return;
  }
  await logAudit({ actor: user, action: "campaign.delete", target: id });
  revalidatePath("/admin/campaigns");
  redirect("/admin/campaigns");
}
