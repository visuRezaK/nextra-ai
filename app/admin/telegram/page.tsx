import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, Badge, fa, faDate } from "@/components/admin/ui";
import { SetWebhookButton, BroadcastForm } from "./telegram-client";

export const dynamic = "force-dynamic";
// Broadcast loops over every telegram chat with a small delay.
export const maxDuration = 120;

interface WebhookInfo {
  url?: string;
  pending_update_count?: number;
  last_error_date?: number;
  last_error_message?: string;
}

// Ask Telegram where the webhook currently points. Fail-soft: a network
// hiccup renders the page with "unknown" status instead of crashing it.
async function getWebhookInfo(token: string): Promise<WebhookInfo | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
      cache: "no-store",
    });
    const data = (await res.json()) as { ok: boolean; result?: WebhookInfo };
    return data.ok ? (data.result ?? null) : null;
  } catch {
    return null;
  }
}

export default async function TelegramPage() {
  await requireRole([]);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secretSet = Boolean(process.env.TELEGRAM_WEBHOOK_SECRET);
  const expectedUrl = `${(process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "")}/api/telegram`;

  const supabase = getAdminClient();
  const [info, sessionsRes, lastRes] = await Promise.all([
    token ? getWebhookInfo(token) : Promise.resolve(null),
    supabase
      .from("chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("channel", "telegram"),
    supabase
      .from("chat_sessions")
      .select("last_seen")
      .eq("channel", "telegram")
      .order("last_seen", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const webhookOk = Boolean(info?.url) && info?.url === expectedUrl;

  return (
    <>
      <PageTitle
        title="تلگرام"
        subtitle="وضعیت بات، Webhook و ارسال پیام انبوه — @Nextraaiconsulting_bot"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="توکن بات" value={token ? "✓ تنظیم شده" : "✗ نیست"} />
        <StatCard
          label="Webhook"
          value={info === null ? "نامشخص" : webhookOk ? "✓ فعال" : "✗ نادرست"}
          hint={info?.url ? undefined : "هنوز ثبت نشده"}
        />
        <StatCard label="کاربران تلگرام" value={fa(sessionsRes.count ?? 0)} />
        <StatCard
          label="آخرین فعالیت"
          value={lastRes.data ? faDate(lastRes.data.last_seen) : "—"}
        />
      </div>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-4 font-semibold">وضعیت Webhook</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">آدرس فعلی</dt>
            <dd className="mt-1 break-all" dir="ltr">{info?.url || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">آدرس مورد انتظار</dt>
            <dd className="mt-1 break-all" dir="ltr">{expectedUrl}</dd>
          </div>
          <div>
            <dt className="text-muted">آپدیت‌های در صف</dt>
            <dd className="mt-1">{info ? fa(info.pending_update_count ?? 0) : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Secret header</dt>
            <dd className="mt-1">
              <Badge tone={secretSet ? "success" : "neutral"}>
                {secretSet ? "فعال" : "تنظیم نشده (اختیاری)"}
              </Badge>
            </dd>
          </div>
          {info?.last_error_message ? (
            <div className="sm:col-span-2">
              <dt className="text-muted">آخرین خطای تلگرام</dt>
              <dd className="mt-1 text-red-500">
                {info.last_error_message}
                {info.last_error_date
                  ? ` — ${faDate(new Date(info.last_error_date * 1000).toISOString())}`
                  : ""}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-4">
          <SetWebhookButton />
        </div>
      </section>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-1 font-semibold">پیام انبوه (Broadcast)</h2>
        <p className="mb-4 text-sm text-muted">
          به همهٔ {fa(sessionsRes.count ?? 0)} کاربری که تا امروز با بات گفتگو کرده‌اند ارسال می‌شود.
          کاربرانی که بات را بلاک کرده باشند در آمار «ناموفق» می‌آیند.
        </p>
        <BroadcastForm />
      </section>
    </>
  );
}
