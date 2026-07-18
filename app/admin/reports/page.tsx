import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, StatCard, AdminTable, Badge, En, fa, faCad, faPct } from "@/components/admin/ui";
import {
  personSourceLabel,
  stageLabel,
  stageTone,
  type PipelineStage,
} from "@/lib/admin/crm";

export const dynamic = "force-dynamic";

type ContactRow = { source: string; converted_at: string | null };
type DealRow = {
  stage_key: string;
  status: string;
  // numeric(12,2) can arrive from PostgREST as a string — coerce before summing.
  amount_cad: number | string | null;
  won_at: string | null;
  people: { source: string } | null;
};

// Gregorian months with Latin digits, Toronto-anchored — matches faDate so
// revenue months read the same as dates everywhere else in the panel.
function monthKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
  }).format(new Date(iso));
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return new Intl.DateTimeFormat("fa-IR-u-ca-gregory-nu-latn", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(y), Number(m) - 1, 1)));
}

export default async function ReportsPage() {
  await requireRole(["operator", "viewer"]);
  const supabase = getAdminClient();

  // The normalized reports read leads (contacts), deals and the stage config.
  // All three land with admin8; pipeline_stages is the clearest "is it applied"
  // signal, so the page gates on it.
  const [contactsRes, dealsRes, stagesRes] = await Promise.all([
    supabase.from("contacts").select("source, converted_at").limit(10000),
    supabase
      .from("deals")
      .select("stage_key, status, amount_cad, won_at, people(source)")
      .limit(10000),
    supabase
      .from("pipeline_stages")
      .select("key, label_fa, label_en, position, is_won, is_lost")
      .order("position", { ascending: true }),
  ]);

  const stages = (stagesRes.data ?? []) as unknown as PipelineStage[];
  if (stages.length === 0) {
    return (
      <>
        <PageTitle title="گزارش‌ها" en="Reports" subtitle="قیف تبدیل، ارزش مسیر فروش و درآمد" />
        <p className="card-surface p-6 text-center text-sm text-muted">
          برای فعال‌سازی گزارش‌ها، فایل <span dir="ltr">supabase/admin8.sql</span> را در Supabase
          اجرا کنید.
        </p>
      </>
    );
  }

  const contacts = (contactsRes.data ?? []) as unknown as ContactRow[];
  const deals = (dealsRes.data ?? []) as unknown as DealRow[];

  // ---- Deal aggregates ----
  const stageAgg = new Map<string, { count: number; value: number }>();
  const byMonth = new Map<string, { count: number; revenue: number }>();
  const revenueBySource = new Map<string, number>();
  let openValue = 0;
  let wonRevenue = 0;
  let wonCount = 0;
  let lostCount = 0;

  const stagePos = new Map(stages.map((s) => [s.key, s.position] as const));
  const consultationPos = stagePos.get("consultation") ?? 3;
  let advanced = 0; // deals at consultation stage or beyond — the "engaged" funnel step

  for (const d of deals) {
    const amount = Number(d.amount_cad ?? 0);
    const st = stageAgg.get(d.stage_key) ?? { count: 0, value: 0 };
    st.count += 1;
    st.value += amount;
    stageAgg.set(d.stage_key, st);

    if ((stagePos.get(d.stage_key) ?? 0) >= consultationPos) advanced += 1;

    if (d.status === "open") openValue += amount;
    else if (d.status === "won") {
      wonRevenue += amount;
      wonCount += 1;
      const src = d.people?.source ?? "unknown";
      revenueBySource.set(src, (revenueBySource.get(src) ?? 0) + amount);
      if (d.won_at) {
        const key = monthKey(d.won_at);
        const mo = byMonth.get(key) ?? { count: 0, revenue: 0 };
        mo.count += 1;
        mo.revenue += amount;
        byMonth.set(key, mo);
      }
    } else if (d.status === "lost") lostCount += 1;
  }

  // ---- Lead / source aggregates ----
  const leadsBySource = new Map<string, { leads: number; converted: number }>();
  let convertedLeads = 0;
  for (const c of contacts) {
    const e = leadsBySource.get(c.source) ?? { leads: 0, converted: 0 };
    e.leads += 1;
    if (c.converted_at) {
      e.converted += 1;
      convertedLeads += 1;
    }
    leadsBySource.set(c.source, e);
  }

  const totalLeads = contacts.length;
  const totalDeals = deals.length;
  const closed = wonCount + lostCount;
  // Win rate over DECIDED deals only — open deals aren't losses.
  const winRate = closed > 0 ? Math.round((wonCount / closed) * 100) : 0;

  // The normalized funnel: the path from raw intake to signed revenue.
  const funnel: { label: string; en: string; count: number }[] = [
    { label: "لید", en: "Leads", count: totalLeads },
    { label: "تبدیل‌شده", en: "Converted", count: convertedLeads },
    { label: "معامله", en: "Deals", count: totalDeals },
    { label: "جلسه به بعد", en: "Engaged", count: advanced },
    { label: "برد", en: "Won", count: wonCount },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.count));
  const maxStageValue = Math.max(1, ...stages.map((s) => stageAgg.get(s.key)?.value ?? 0));
  const months = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-12);
  const maxMonth = Math.max(1, ...months.map(([, m]) => m.revenue));

  const allSources = new Set([...leadsBySource.keys(), ...revenueBySource.keys()]);
  const sources = [...allSources]
    .map((source) => ({
      source,
      leads: leadsBySource.get(source)?.leads ?? 0,
      converted: leadsBySource.get(source)?.converted ?? 0,
      revenue: revenueBySource.get(source) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);

  return (
    <>
      <PageTitle title="گزارش‌ها" en="Reports" subtitle="قیف تبدیل، ارزش مسیر فروش و درآمد" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="کل لیدها" value={fa(totalLeads)} hint={`Leads — ${fa(convertedLeads)} تبدیل‌شده`} />
        <StatCard
          label="ارزش مسیر فروش باز"
          value={faCad(openValue)}
          hint="Open pipeline value — معاملات باز"
        />
        <StatCard
          label="درآمد بسته‌شده"
          value={faCad(wonRevenue)}
          hint={`Closed revenue — ${fa(wonCount)} معامله`}
        />
        <StatCard
          label="نرخ برد"
          value={faPct(winRate)}
          hint={
            closed > 0
              ? `Win rate — ${fa(wonCount)} برد از ${fa(closed)} تعیین‌تکلیف‌شده`
              : "Win rate — هنوز معامله‌ای بسته نشده"
          }
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card-surface p-5">
          <h2 className="mb-1 font-semibold">
            قیف تبدیل
            <En>Conversion Funnel</En>
          </h2>
          <p className="mb-4 text-xs text-muted">
            مسیر از لید خام تا قرارداد امضاشده. «باخته» بخشی از قیف نیست — {fa(lostCount)} معامله از
            مسیر خارج شده.
          </p>
          <div className="flex flex-col gap-3">
            {funnel.map((f) => {
              const pct = totalLeads > 0 ? Math.round((f.count / totalLeads) * 100) : 0;
              return (
                <div key={f.en}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>
                      {f.label}
                      <span dir="ltr" className="text-muted"> ({f.en})</span>
                    </span>
                    <span className="text-muted">
                      {fa(f.count)} · {faPct(pct)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="card-surface p-5">
          <h2 className="mb-1 font-semibold">
            ارزش مسیر فروش به تفکیک مرحله
            <En>Pipeline Value by Stage</En>
          </h2>
          <p className="mb-4 text-xs text-muted">مجموع مبلغ معاملات در هر مرحله.</p>
          <div className="flex flex-col gap-3">
            {stages.map((s) => {
              const v = stageAgg.get(s.key)?.value ?? 0;
              const c = stageAgg.get(s.key)?.count ?? 0;
              return (
                <div key={s.key}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Badge tone={stageTone(s)}>{stageLabel(s)}</Badge>
                      <span className="text-xs text-muted">{fa(c)}</span>
                    </span>
                    <span className="text-muted">{faCad(v)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2">
                    <div
                      className="h-2 rounded-full bg-accent"
                      style={{ width: `${(v / maxStageValue) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section className="card-surface mt-6 p-5">
        <h2 className="mb-1 font-semibold">
          درآمد ماهانه
          <En>Monthly Revenue</En>
        </h2>
        <p className="mb-4 text-xs text-muted">بر اساس تاریخ برد معامله، ۱۲ ماه اخیر.</p>
        {months.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">هنوز معامله‌ای برده نشده است.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {months.map(([key, m]) => (
              <div key={key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{monthLabel(key)}</span>
                  <span className="text-muted">
                    {faCad(m.revenue)} · {fa(m.count)} معامله
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-2">
                  <div
                    className="h-2 rounded-full bg-emerald-500"
                    style={{ width: `${(m.revenue / maxMonth) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-1 font-semibold">
          منابع لید
          <En>Lead Sources</En>
        </h2>
        <p className="mb-4 text-xs text-muted">کدام کانال فقط لید می‌آورد و کدام واقعاً درآمد می‌سازد.</p>
        <AdminTable
          headers={[
            "منبع (Source)",
            "لیدها (Leads)",
            "تبدیل‌شده (Converted)",
            "درآمد (Revenue)",
          ]}
          empty={sources.length === 0}
        >
          {sources.map((s) => (
            <tr key={s.source}>
              <td className="px-4 py-3">
                <Badge tone={s.source === "web" ? "neutral" : "accent"}>
                  {personSourceLabel(s.source)}
                </Badge>
              </td>
              <td className="px-4 py-3">{fa(s.leads)}</td>
              <td className="px-4 py-3 text-muted">{fa(s.converted)}</td>
              <td className="px-4 py-3">{faCad(s.revenue)}</td>
            </tr>
          ))}
        </AdminTable>
      </section>
    </>
  );
}
