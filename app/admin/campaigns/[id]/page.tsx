import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, Badge, faDate } from "@/components/admin/ui";
import { segmentLabel } from "@/lib/admin/segments";
import { EmailCompose } from "./email-compose";
import { skipEmailAction, sendEmailAction, deleteCampaignAction } from "../actions";

export const dynamic = "force-dynamic";

type CampaignRow = {
  id: string;
  name: string;
  segment_key: string;
  goal: string | null;
  created_at: string;
};

type EmailRow = {
  id: string;
  to_name: string;
  to_email: string;
  context: Record<string, unknown> | null;
  subject: string | null;
  body_text: string | null;
  status: string;
  error: string | null;
  sent_at: string | null;
};

const EMAIL_STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "success" | "danger" | "warn" }> = {
  pending: { label: "در انتظار (Pending)", tone: "neutral" },
  ready: { label: "آمادهٔ ارسال (Ready)", tone: "accent" },
  skipped: { label: "رد شده (Skipped)", tone: "warn" },
  sent: { label: "ارسال شد (Sent)", tone: "success" },
  failed: { label: "ناموفق (Failed)", tone: "danger" },
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { id } = await params;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";
  const resendReady = Boolean(process.env.RESEND_API_KEY);

  const { data: campaignData } = await supabase
    .from("campaigns")
    .select("id, name, segment_key, goal, created_at")
    .eq("id", id)
    .maybeSingle();
  const campaign = campaignData as unknown as CampaignRow | null;
  if (!campaign) notFound();

  const { data: emailsData } = await supabase
    .from("campaign_emails")
    .select("id, to_name, to_email, context, subject, body_text, status, error, sent_at")
    .eq("campaign_id", id)
    .order("created_at", { ascending: true });
  const emails = (emailsData ?? []) as unknown as EmailRow[];

  const sent = emails.filter((e) => e.status === "sent").length;

  return (
    <>
      <PageTitle
        title={campaign.name}
        en="Campaign"
        subtitle={`${segmentLabel(campaign.segment_key)} · ${emails.length} گیرنده · ${sent} ارسال‌شده`}
      />

      <Link href="/admin/campaigns" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به فهرست کمپین‌ها
      </Link>

      {campaign.goal ? (
        <div className="card-surface mb-6 p-4 text-sm">
          <span className="text-muted">هدف (Goal): </span>
          {campaign.goal}
        </div>
      ) : null}

      {!resendReady ? (
        <div className="card-surface mb-6 border-amber-400/40 bg-amber-500/5 p-4 text-sm text-muted">
          ارسال ایمیل غیرفعال است — <span dir="ltr">RESEND_API_KEY</span> تنظیم نشده. می‌توانید
          ایمیل‌ها را بنویسید و بازبینی کنید؛ برای ارسال، کلید Resend را در محیط اضافه کنید.
        </div>
      ) : null}

      {emails.length === 0 ? (
        <p className="card-surface p-6 text-center text-sm text-muted">
          این سگمنت گیرندهٔ دارای ایمیلی نداشت.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {emails.map((e) => {
            const st = EMAIL_STATUS[e.status] ?? EMAIL_STATUS.pending;
            const locked = e.status === "sent";
            return (
              <section key={e.id} className="card-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium">{e.to_name}</span>
                    <span dir="ltr" className="ms-2 text-sm text-muted">
                      {e.to_email}
                    </span>
                  </div>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>

                {e.context && Object.keys(e.context).length > 0 ? (
                  <p className="mt-1 text-xs text-muted">
                    {Object.entries(e.context)
                      .filter(([, v]) => v)
                      .map(([k, v]) => `${k}: ${String(v)}`)
                      .join(" · ")}
                  </p>
                ) : null}

                {e.error ? <p className="mt-1 text-xs text-red-500">{e.error}</p> : null}
                {e.sent_at ? (
                  <p className="mt-1 text-xs text-muted">ارسال در {faDate(e.sent_at)}</p>
                ) : null}

                {canEdit ? (
                  <>
                    <EmailCompose
                      emailId={e.id}
                      subject={e.subject ?? ""}
                      bodyText={e.body_text ?? ""}
                      disabled={locked}
                    />
                    {!locked ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <form action={sendEmailAction}>
                          <input type="hidden" name="email_id" value={e.id} />
                          <input type="hidden" name="campaign_id" value={campaign.id} />
                          <button
                            type="submit"
                            disabled={!resendReady}
                            title={resendReady ? "" : "RESEND_API_KEY تنظیم نشده"}
                            className="rounded-lg bg-accent px-4 py-1.5 text-sm text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            ارسال (Send)
                          </button>
                        </form>
                        {e.status !== "skipped" ? (
                          <form action={skipEmailAction}>
                            <input type="hidden" name="email_id" value={e.id} />
                            <input type="hidden" name="campaign_id" value={campaign.id} />
                            <button
                              type="submit"
                              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
                            >
                              رد کردن (Skip)
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    {e.subject ? <span className="font-medium">{e.subject}</span> : "— بدون متن —"}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}

      {canEdit ? (
        <form action={deleteCampaignAction} className="mt-6">
          <input type="hidden" name="campaign_id" value={campaign.id} />
          <button
            type="submit"
            className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-500/5"
          >
            حذف کمپین (Delete)
          </button>
        </form>
      ) : null}
    </>
  );
}
