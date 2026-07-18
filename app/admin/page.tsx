import Link from "next/link";
import { requireStaff } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, Badge, En, fa, faDate, faCad, faPct } from "@/components/admin/ui";
import {
  isLeadStatus,
  isOverdue,
  leadSourceLabel,
  leadStatusLabel,
  LEAD_STATUSES,
  OPEN_LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/admin/leads";

export const dynamic = "force-dynamic";

const CHANNEL_LABELS: Record<string, string> = {
  web: "وب",
  widget: "ویجت",
  telegram: "تلگرام",
};

export default async function AdminDashboardPage() {
  await requireStaff();
  const supabase = getAdminClient();

  const nowIso = new Date().toISOString();

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
    pipelineRes,
    valueRes,
    overdueTasksCountRes,
    overdueTasksRes,
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
    // Pipeline columns exist only after admin6.sql → data is null → the pipeline
    // section hides itself and the new cards read «—».
    supabase.from("contacts").select("status, next_follow_up_at").limit(2000),
    // amount_cad needs admin7.sql on top, so it degrades separately: the
    // pipeline can be live while the value card isn't.
    supabase.from("contacts").select("status, amount_cad").limit(2000),
    // Overdue open tasks (admin8). Null before admin8 → the card/section hide.
    supabase
      .from("activities")
      .select("*", { count: "exact", head: true })
      .eq("type", "task")
      .is("done_at", null)
      .not("due_at", "is", null)
      .lt("due_at", nowIso),
    supabase
      .from("activities")
      .select("id, title, due_at, people(id, full_name)")
      .eq("type", "task")
      .is("done_at", null)
      .not("due_at", "is", null)
      .lt("due_at", nowIso)
      .order("due_at", { ascending: true })
      .limit(8),
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

  // Same JS aggregation as the token usage below: one query beats six head:true
  // round-trips at this row volume.
  const pipelineRows = pipelineRes.data;
  const crmReady = pipelineRows !== null;
  const stageCounts = new Map<LeadStatus, number>();
  let overdueLeads = 0;
  for (const row of pipelineRows ?? []) {
    if (isLeadStatus(row.status)) {
      stageCounts.set(row.status, (stageCounts.get(row.status) ?? 0) + 1);
    }
    if (isOverdue(row.next_follow_up_at, row.status)) overdueLeads += 1;
  }
  const openLeads = OPEN_LEAD_STATUSES.reduce(
    (sum, s) => sum + (stageCounts.get(s) ?? 0),
    0,
  );
  const maxStage = Math.max(1, ...LEAD_STATUSES.map((s) => stageCounts.get(s) ?? 0));

  const valueRows = valueRes.data;
  const moneyReady = valueRows !== null;
  let openValue = 0;
  for (const row of valueRows ?? []) {
    if ((OPEN_LEAD_STATUSES as readonly string[]).includes(row.status as string)) {
      // numeric(12,2) can arrive from PostgREST as a string.
      openValue += Number(row.amount_cad ?? 0);
    }
  }

  // Overdue tasks (admin8). count is null-safe; the list is null before admin8.
  const tasksReady = overdueTasksRes.data !== null;
  const overdueTasksCount = overdueTasksCountRes.count ?? 0;
  const overdueTasks = (overdueTasksRes.data ?? []) as unknown as {
    id: string;
    title: string | null;
    due_at: string | null;
    people: { id: string; full_name: string } | null;
  }[];

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
      <PageTitle title="داشبورد" en="Dashboard" subtitle="نمای کلی چت‌بات و لیدها" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="کل گفتگوها" value={fa(sessions)} hint="Total conversations" />
        <StatCard label="کل پیام‌ها" value={fa(messages)} hint="Total messages" />
        <StatCard label="لیدها" value={fa(leads)} hint={`Leads — ${fa(chatbotLeads)} از چت‌بات`} />
        <StatCard
          label="نرخ تبدیل چت‌بات"
          value={faPct(conversion)}
          hint="Chatbot conversion — لید چت‌بات ÷ گفتگوها"
        />
        <StatCard
          label="لیدهای باز"
          value={crmReady ? fa(openLeads) : "—"}
          hint="Open leads — جدید تا پیشنهاد"
        />
        <StatCard
          label="پیگیری‌های عقب‌افتاده"
          value={crmReady ? fa(overdueLeads) : "—"}
          hint="Overdue follow-ups — موعد گذشته"
        />
        <StatCard
          label="ارزش مسیر فروش باز"
          value={moneyReady ? faCad(openValue) : "—"}
          hint="Open pipeline value"
        />
        <StatCard
          label="وظایف معوق"
          value={tasksReady ? fa(overdueTasksCount) : "—"}
          hint="Overdue tasks — موعد گذشته"
        />
      </div>

      {tasksReady && overdueTasks.length > 0 ? (
        <section className="card-surface mt-6 border-red-500/30 bg-red-500/5 p-5">
          <h2 className="mb-3 flex items-center justify-between font-semibold">
            <span>
              وظایف معوق
              <En>Overdue Tasks</En>
            </span>
            <Link
              href="/admin/activities"
              className="text-sm font-normal text-accent hover:underline"
            >
              همهٔ فعالیت‌ها (All) ←
            </Link>
          </h2>
          <ul className="divide-y divide-border text-sm">
            {overdueTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                <span>
                  {t.title ?? "—"}
                  {t.people ? (
                    <Link
                      href={`/admin/people/${t.people.id}`}
                      className="ms-2 text-accent hover:underline"
                    >
                      {t.people.full_name}
                    </Link>
                  ) : null}
                </span>
                {t.due_at ? <span className="text-muted">{faDate(t.due_at)}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {crmReady ? (
        <section className="card-surface mt-6 p-5">
          <h2 className="mb-4 flex items-center justify-between font-semibold">
            <span>
              مسیر فروش
              <En>Sales Pipeline</En>
            </span>
            <Link href="/admin/reports" className="text-sm font-normal text-accent hover:underline">
              گزارش‌ها (Reports) ←
            </Link>
          </h2>
          <div className="flex flex-col gap-3">
            {LEAD_STATUSES.map((s) => {
              const c = stageCounts.get(s) ?? 0;
              return (
                <div key={s}>
                  <div className="mb-1 flex justify-between text-sm">
                    <Link href={`/admin/leads?status=${s}`} className="hover:text-accent">
                      {leadStatusLabel(s)}
                    </Link>
                    <span className="text-muted">{fa(c)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${(c / maxStage) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-4 font-semibold">
            گفتگوها به تفکیک کانال
            <En>Conversations by Channel</En>
          </h2>
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
          <h2 className="mb-4 font-semibold">
            آخرین لیدها
            <En>Recent Leads</En>
          </h2>
          <ul className="divide-y divide-border text-sm">
            {(recentLeadsRes.data ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2">
                <Link href={`/admin/leads/${l.id}`} className="text-accent hover:underline">
                  {l.name}
                </Link>
                <span className="flex items-center gap-2">
                  <Badge tone={l.source === "web" ? "neutral" : "accent"}>
                    {leadSourceLabel(l.source)}
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
