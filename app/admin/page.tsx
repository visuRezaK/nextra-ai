import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, Badge, fa, faDate } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  web: "وب",
  widget: "ویجت",
  telegram: "تلگرام",
};

export default async function AdminDashboardPage() {
  await requireStaff();
  const supabase = getAdminClient();

  const count = (table: string) =>
    supabase.from(table).select("*", { count: "exact", head: true });

  const channelCount = (channel: string) =>
    supabase
      .from("chat_sessions")
      .select("*", { count: "exact", head: true })
      .eq("channel", channel);

  const [
    sessionsRes,
    messagesRes,
    contactsRes,
    chatbotLeadsRes,
    webRes,
    widgetRes,
    telegramRes,
    recentSessionsRes,
    recentLeadsRes,
    usageRes,
  ] = await Promise.all([
    count("chat_sessions"),
    count("chat_messages"),
    count("contacts"),
    supabase
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("source", "chatbot"),
    channelCount("web"),
    channelCount("widget"),
    channelCount("telegram"),
    supabase
      .from("chat_sessions")
      .select("id, channel, last_seen")
      .order("last_seen", { ascending: false })
      .limit(8),
    supabase
      .from("contacts")
      .select("id, name, source, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("chat_messages")
      .select("model, tokens_in, tokens_out")
      .not("model", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const sessions = sessionsRes.count ?? 0;
  const messages = messagesRes.count ?? 0;
  const leads = contactsRes.count ?? 0;
  const chatbotLeads = chatbotLeadsRes.count ?? 0;
  const conversion = sessions > 0 ? Math.round((chatbotLeads / sessions) * 100) : 0;

  const channels = [
    { key: "web", count: webRes.count ?? 0 },
    { key: "widget", count: widgetRes.count ?? 0 },
    { key: "telegram", count: telegramRes.count ?? 0 },
  ];
  const maxChannel = Math.max(1, ...channels.map((c) => c.count));

  // Aggregate token usage per model in JS (row volume is small at this scale).
  const usage = new Map<string, { tokensIn: number; tokensOut: number; count: number }>();
  for (const row of usageRes.data ?? []) {
    const key = row.model as string;
    const agg = usage.get(key) ?? { tokensIn: 0, tokensOut: 0, count: 0 };
    agg.tokensIn += row.tokens_in ?? 0;
    agg.tokensOut += row.tokens_out ?? 0;
    agg.count += 1;
    usage.set(key, agg);
  }

  return (
    <>
      <PageTitle title="داشبورد" subtitle="نمای کلی چت‌بات و لیدها" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="کل گفتگوها" value={fa(sessions)} />
        <StatCard label="کل پیام‌ها" value={fa(messages)} />
        <StatCard label="لیدها" value={fa(leads)} hint={`${fa(chatbotLeads)} از چت‌بات`} />
        <StatCard label="نرخ تبدیل چت‌بات" value={`٪${fa(conversion)}`} hint="لید چت‌بات ÷ گفتگوها" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-4 font-semibold">گفتگوها به تفکیک کانال</h2>
          <div className="flex flex-col gap-3">
            {channels.map((c) => (
              <div key={c.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{CHANNEL_LABELS[c.key]}</span>
                  <span className="text-muted">{fa(c.count)}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-2">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${(c.count / maxChannel) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-4 font-semibold">مصرف توکن به تفکیک مدل</h2>
          {usage.size === 0 ? (
            <p className="text-sm text-muted">
              هنوز داده‌ای ثبت نشده است. (پس از اجرای supabase/admin.sql، پیام‌های جدید شمارش می‌شوند.)
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 text-start font-medium">مدل</th>
                  <th className="py-2 text-start font-medium">پیام‌ها</th>
                  <th className="py-2 text-start font-medium">توکن ورودی</th>
                  <th className="py-2 text-start font-medium">توکن خروجی</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...usage.entries()].map(([model, agg]) => (
                  <tr key={model}>
                    <td className="py-2" dir="ltr">{model}</td>
                    <td className="py-2">{fa(agg.count)}</td>
                    <td className="py-2">{fa(agg.tokensIn)}</td>
                    <td className="py-2">{fa(agg.tokensOut)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-4 font-semibold">گفتگوهای اخیر</h2>
          <ul className="divide-y divide-border text-sm">
            {(recentSessionsRes.data ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                <Link href={`/admin/conversations/${s.id}`} className="text-accent hover:underline">
                  {CHANNEL_LABELS[s.channel] ?? s.channel}
                </Link>
                <span className="text-muted">{faDate(s.last_seen)}</span>
              </li>
            ))}
            {(recentSessionsRes.data ?? []).length === 0 ? (
              <li className="py-2 text-muted">گفتگویی ثبت نشده است.</li>
            ) : null}
          </ul>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-4 font-semibold">آخرین لیدها</h2>
          <ul className="divide-y divide-border text-sm">
            {(recentLeadsRes.data ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <span>{l.name}</span>
                <span className="flex items-center gap-2">
                  <Badge tone={l.source === "chatbot" ? "accent" : "neutral"}>
                    {l.source === "chatbot" ? "چت‌بات" : "فرم سایت"}
                  </Badge>
                  <span className="text-muted">{faDate(l.created_at)}</span>
                </span>
              </li>
            ))}
            {(recentLeadsRes.data ?? []).length === 0 ? (
              <li className="py-2 text-muted">لیدی ثبت نشده است.</li>
            ) : null}
          </ul>
        </section>
      </div>
    </>
  );
}
