import Link from "next/link";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, AdminTable, Badge, fa, faDate, faCad } from "@/components/admin/ui";
import {
  isLeadStatus,
  isOverdue,
  leadSourceLabel,
  leadStatusLabel,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONES,
  OPEN_LEAD_STATUSES,
  type LeadStatus,
} from "@/lib/admin/leads";

export const dynamic = "force-dynamic";

const BASE_COLUMNS = "id, name, email, phone, message, source, session_id, created_at";
const CRM_COLUMNS = `${BASE_COLUMNS}, status, next_follow_up_at`;
const MONEY_COLUMNS = `${CRM_COLUMNS}, amount_cad`;

// Each migration degrades on its own: admin6 adds the stage, admin7 adds the
// money. With admin6 applied but not admin7 the pipeline still works, minus the
// amount column.
type Tier = "money" | "crm" | "base";
const TIER_COLUMNS: Record<Tier, string> = {
  money: MONEY_COLUMNS,
  crm: CRM_COLUMNS,
  base: BASE_COLUMNS,
};

// The PostgREST type parser can't infer a row shape from a column list chosen at
// runtime, so the shapes are declared here instead. The later fields are
// optional because the lower-tier fallback queries don't select them.
type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  session_id: string | null;
  created_at: string;
  status?: string | null;
  next_follow_up_at?: string | null;
  // numeric(12,2) can arrive from PostgREST as a string; faCad() coerces.
  amount_cad?: number | string | null;
};

// Escape PostgREST .or() special characters in the user's search term.
function sanitizeQuery(q: string): string {
  return q.replace(/[,()"]/g, " ").trim();
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string; status?: string; overdue?: string }>;
}) {
  await requireRole(["operator", "viewer"]);
  const { source, q, status, overdue } = await searchParams;
  const supabase = getAdminClient();

  // Step down a tier at a time, the same way the conversations list handles the
  // handoff columns.
  const buildQuery = (tier: Tier) => {
    const withCrm = tier !== "base";
    let query = supabase
      .from("contacts")
      .select(TIER_COLUMNS[tier])
      .order("created_at", { ascending: false })
      .limit(200);

    if (source === "web" || source === "chatbot" || source === "voice")
      query = query.eq("source", source);
    if (withCrm && isLeadStatus(status)) query = query.eq("status", status);
    if (withCrm && overdue === "1") {
      query = query
        .not("next_follow_up_at", "is", null)
        .lt("next_follow_up_at", new Date().toISOString())
        .in("status", [...OPEN_LEAD_STATUSES]);
    }
    const term = q ? sanitizeQuery(q) : "";
    if (term) {
      query = query.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
      );
    }
    return query;
  };

  // A valid empty result is [], which is truthy — null only means the query errored.
  let crmReady = true;
  let moneyReady = true;
  let { data: leads } = await buildQuery("money");
  if (!leads) {
    moneyReady = false;
    ({ data: leads } = await buildQuery("crm"));
    if (!leads) {
      crmReady = false;
      ({ data: leads } = await buildQuery("base"));
    }
  }
  const rows = (leads ?? []) as unknown as LeadRow[];

  // Stage counts for the pipeline strip: one query, counted in JS (row volume is
  // small at this scale, and six head:true round-trips would cost more).
  const { data: pipelineRows } = crmReady
    ? await supabase.from("contacts").select("status").limit(2000)
    : { data: null };
  const stageCounts = new Map<LeadStatus, number>();
  for (const row of pipelineRows ?? []) {
    if (isLeadStatus(row.status)) {
      stageCounts.set(row.status, (stageCounts.get(row.status) ?? 0) + 1);
    }
  }

  const params = new URLSearchParams();
  if (source) params.set("source", source);
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  if (overdue === "1") params.set("overdue", "1");
  const exportHref = `/admin/leads/export${params.size ? `?${params}` : ""}`;

  // Stage chips keep the current search/source filter, but swap the stage.
  const stageHref = (s: LeadStatus) => {
    const next = new URLSearchParams();
    if (source) next.set("source", source);
    if (q) next.set("q", q);
    if (status !== s) next.set("status", s);
    return `/admin/leads${next.size ? `?${next}` : ""}`;
  };

  return (
    <>
      <PageTitle
        title="CRM — لیدها"
        en="Leads & Sales Pipeline"
        subtitle="سرنخ‌های فرم سایت، چت‌بات و دستیار صوتی"
      />

      {pipelineRows ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {LEAD_STATUSES.map((s) => (
            <Link
              key={s}
              href={stageHref(s)}
              className={`transition-opacity hover:opacity-80 ${
                status === s ? "" : "opacity-60"
              }`}
            >
              <Badge tone={LEAD_STATUS_TONES[s]}>
                {LEAD_STATUS_LABELS[s]} {fa(stageCounts.get(s) ?? 0)}
              </Badge>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <form method="get" className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="جستجو در نام، ایمیل، تلفن…"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <select
            name="source"
            defaultValue={source ?? ""}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="">همه منابع (All sources)</option>
            <option value="web">فرم سایت (Web form)</option>
            <option value="chatbot">چت‌بات (Chatbot)</option>
            <option value="voice">دستیار صوتی (Voice)</option>
          </select>
          {crmReady ? (
            <>
              <select
                name="status"
                defaultValue={status ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="">همه وضعیت‌ها (All stages)</option>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {leadStatusLabel(s)}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-muted">
                <input
                  type="checkbox"
                  name="overdue"
                  value="1"
                  defaultChecked={overdue === "1"}
                  className="accent-[var(--accent)]"
                />
                فقط پیگیری‌های عقب‌افتاده (Overdue only)
              </label>
            </>
          ) : null}
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
          >
            اعمال فیلتر
          </button>
        </form>
        <a
          href={exportHref}
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60"
        >
          خروجی CSV
        </a>
      </div>

      <AdminTable
        headers={[
          "نام (Name)",
          ...(crmReady ? ["وضعیت (Stage)"] : []),
          ...(moneyReady ? ["مبلغ (Amount)"] : []),
          ...(crmReady ? ["پیگیری بعدی (Next follow-up)"] : []),
          "ایمیل (Email)",
          "تلفن (Phone)",
          "پیام (Message)",
          "منبع (Source)",
          "تاریخ (Date)",
          "گفتگو (Chat)",
        ]}
        empty={rows.length === 0}
      >
        {rows.map((l) => {
          const leadStatus: LeadStatus = isLeadStatus(l.status) ? l.status : "new";
          const late = crmReady && isOverdue(l.next_follow_up_at, l.status);
          return (
            <tr key={l.id} className={late ? "bg-amber-500/5" : undefined}>
              <td className="px-4 py-3 font-medium">
                <Link href={`/admin/leads/${l.id}`} className="text-accent hover:underline">
                  {l.name}
                </Link>
              </td>
              {crmReady ? (
                <td className="px-4 py-3">
                  <Badge tone={LEAD_STATUS_TONES[leadStatus]}>
                    {LEAD_STATUS_LABELS[leadStatus]}
                  </Badge>
                </td>
              ) : null}
              {moneyReady ? (
                <td className="whitespace-nowrap px-4 py-3">{faCad(l.amount_cad)}</td>
              ) : null}
              {crmReady ? (
                <td className="px-4 py-3">
                  {l.next_follow_up_at ? (
                    late ? (
                      <Badge tone="danger">{faDate(l.next_follow_up_at)}</Badge>
                    ) : (
                      <span className="text-muted">{faDate(l.next_follow_up_at)}</span>
                    )
                  ) : (
                    "—"
                  )}
                </td>
              ) : null}
              <td className="px-4 py-3" dir="ltr">{l.email ?? "—"}</td>
              <td className="px-4 py-3" dir="ltr">{l.phone ?? "—"}</td>
              <td className="max-w-xs px-4 py-3 text-muted">
                <span className="line-clamp-2">{l.message ?? "—"}</span>
              </td>
              <td className="px-4 py-3">
                <Badge tone={l.source === "web" ? "neutral" : "accent"}>
                  {leadSourceLabel(l.source)}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted">{faDate(l.created_at)}</td>
              <td className="px-4 py-3">
                {l.session_id ? (
                  <Link
                    href={`/admin/conversations/${l.session_id}`}
                    className="text-accent hover:underline"
                  >
                    مشاهده گفتگو
                  </Link>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </>
  );
}
