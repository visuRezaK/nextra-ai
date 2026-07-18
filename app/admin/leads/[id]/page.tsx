import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, Badge, En, faDate, faCad } from "@/components/admin/ui";
import {
  isLeadNoteKind,
  isLeadStatus,
  isOverdue,
  leadSourceLabel,
  leadStatusLabel,
  LEAD_NOTE_KIND_LABELS,
  LEAD_STATUS_TONES,
  type LeadStatus,
} from "@/lib/admin/leads";
import { LeadForm } from "./lead-form";
import { NoteForm } from "./note-form";
import { ConvertForm } from "./convert-form";
import { clearFollowUpAction, scoreLeadAction } from "../actions";

export const dynamic = "force-dynamic";

const BASE_COLUMNS = "id, name, email, phone, message, source, session_id, created_at";
const CRM_COLUMNS = `${BASE_COLUMNS}, status, owner_id, next_follow_up_at, updated_at`;
const MONEY_COLUMNS = `${CRM_COLUMNS}, amount_cad, expected_close, won_at`;

// The PostgREST type parser can't infer a row shape from a column list chosen at
// runtime, so it's declared here. The later fields are optional because the
// lower-tier fallback queries don't select them.
type LeadDetailRow = {
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
  amount_cad?: number | null;
  expected_close?: string | null;
};

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { id } = await params;
  const supabase = getAdminClient();

  // Two migrations add columns here, and each has to degrade on its own: with
  // admin6 applied but not admin7 the pipeline form must still work, just
  // without the money fields. So the select steps down a tier at a time
  // (admin7 → admin6 → original). The happy path is still one query; a
  // genuinely missing id walks all three and then 404s, which is harmless.
  let crmReady = true;
  let moneyReady = true;
  const fetchLead = async (columns: string): Promise<LeadDetailRow | null> => {
    const { data } = await supabase.from("contacts").select(columns).eq("id", id).maybeSingle();
    return (data ?? null) as unknown as LeadDetailRow | null;
  };

  let lead = await fetchLead(MONEY_COLUMNS);
  if (!lead) {
    moneyReady = false;
    lead = await fetchLead(CRM_COLUMNS);
    if (!lead) {
      crmReady = false;
      lead = await fetchLead(BASE_COLUMNS);
    }
  }
  if (!lead) notFound();

  // Convert (admin8: converted_at/person_id) is INDEPENDENT of money (admin7):
  // the user may apply admin6+admin8 but skip admin7. Probe it on its own so the
  // Convert button doesn't hide just because the money columns are absent. A
  // non-null row means admin8 is applied; person_id set means already converted.
  let convertReady = true;
  let personId: string | null = null;
  const { data: convRow } = await supabase
    .from("contacts")
    .select("converted_at, person_id")
    .eq("id", id)
    .maybeSingle();
  if (convRow === null) convertReady = false;
  else personId = (convRow.person_id as string | null) ?? null;

  // AI score (separate query, same pattern as convRow — doesn't disturb the tiers).
  const { data: aiRow } = await supabase
    .from("contacts")
    .select("ai_score, ai_score_rationale")
    .eq("id", id)
    .maybeSingle();
  const aiScore = (aiRow?.ai_score as number | null) ?? null;
  const aiRationale = (aiRow?.ai_score_rationale as string | null) ?? null;

  // lead_notes is missing before admin6.sql → data is null → timeline renders empty.
  const { data: notesData } = await supabase
    .from("lead_notes")
    .select("id, kind, body, author_email, created_at")
    .eq("contact_id", id)
    .order("created_at", { ascending: false })
    .limit(200);
  const notes = notesData ?? [];

  const status: LeadStatus = isLeadStatus(lead.status) ? lead.status : "new";
  const nextFollowUpAt = (lead.next_follow_up_at as string | null) ?? null;
  const amountCad = Number(lead.amount_cad ?? 0);
  const expectedClose = (lead.expected_close as string | null) ?? null;
  const overdue = crmReady && isOverdue(nextFollowUpAt, status);
  const canEdit = role !== "viewer";

  return (
    <>
      <PageTitle
        title="جزئیات لید"
        en="Lead Detail"
        subtitle={`${leadSourceLabel(lead.source)} · ${faDate(lead.created_at)}`}
      />

      <Link href="/admin/leads" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به فهرست لیدها
      </Link>

      {overdue ? (
        <div className="card-surface mb-6 border-amber-400/40 bg-amber-500/5 p-5">
          <h2 className="mb-2 font-semibold">
            ⏰ پیگیری عقب‌افتاده
            <En>Overdue follow-up</En>
            <span className="ms-2 text-xs font-normal text-muted">
              موعد: {faDate(nextFollowUpAt!)}
            </span>
          </h2>
          {canEdit ? (
            <form action={clearFollowUpAction}>
              <input type="hidden" name="contact_id" value={lead.id} />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60"
              >
                ✓ پیگیری انجام شد (Mark done)
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      <div className="card-surface mb-6 p-5">
        <h2 className="mb-3 flex flex-wrap items-center gap-3 font-semibold">
          {lead.name}
          {crmReady ? (
            <Badge tone={LEAD_STATUS_TONES[status]}>{leadStatusLabel(status)}</Badge>
          ) : null}
          {moneyReady && amountCad > 0 ? (
            <span className="text-sm font-normal text-muted">{faCad(amountCad)}</span>
          ) : null}
        </h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">ایمیل (Email)</dt>
            <dd dir="ltr" className="text-start">
              {lead.email ? (
                <a href={`mailto:${lead.email}`} className="text-accent hover:underline">
                  {lead.email}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted">تلفن (Phone)</dt>
            <dd dir="ltr" className="text-start">
              {lead.phone ? (
                <a href={`tel:${lead.phone}`} className="text-accent hover:underline">
                  {lead.phone}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
        {lead.message ? (
          <div className="mt-4">
            <p className="mb-1 text-xs text-muted">پیام (Message)</p>
            <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/80">
              {lead.message}
            </p>
          </div>
        ) : null}
        {lead.session_id ? (
          <Link
            href={`/admin/conversations/${lead.session_id}`}
            className="mt-4 inline-block text-sm text-accent hover:underline"
          >
            مشاهده گفتگو (View chat) ←
          </Link>
        ) : null}
      </div>

      <div className="card-surface mb-6 p-5">
        <h2 className="mb-2 flex flex-wrap items-center gap-3 font-semibold">
          امتیاز لید
          <En>AI Lead Score</En>
          {aiScore != null ? (
            <Badge tone={aiScore >= 70 ? "success" : aiScore >= 40 ? "warn" : "danger"}>
              {aiScore} / 100
            </Badge>
          ) : null}
        </h2>
        {aiRationale ? (
          <p className="mb-3 text-sm leading-7 text-foreground/80">{aiRationale}</p>
        ) : (
          <p className="mb-3 text-sm text-muted">هنوز امتیازدهی نشده است.</p>
        )}
        {canEdit ? (
          <form action={scoreLeadAction}>
            <input type="hidden" name="contact_id" value={lead.id} />
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
            >
              {aiScore != null ? "امتیازدهی مجدد (AI)" : "امتیازدهی با AI"}
            </button>
          </form>
        ) : null}
      </div>

      {convertReady ? (
        personId ? (
          <div className="card-surface mb-6 border-accent/30 bg-accent/5 p-5">
            <h2 className="mb-2 font-semibold">
              ✓ این لید تبدیل شده است
              <En>Converted</En>
            </h2>
            <Link
              href={`/admin/people/${personId}`}
              className="text-sm text-accent hover:underline"
            >
              مشاهدهٔ مخاطب (View contact) ←
            </Link>
          </div>
        ) : canEdit ? (
          <div className="card-surface mb-6 p-5">
            <h2 className="mb-1 font-semibold">
              تبدیل به مخاطب
              <En>Convert to Contact</En>
            </h2>
            <p className="mb-4 text-sm text-muted">
              لید را به مخاطب + شرکت + معامله ارتقا دهید. پیام لید اولین یادداشت تایم‌لاین می‌شود.
            </p>
            <ConvertForm contactId={lead.id} defaultAmount={amountCad} />
          </div>
        ) : null
      ) : null}

      <div className="card-surface mb-6 p-5">
        <h2 className="mb-4 font-semibold">
          مسیر فروش
          <En>Sales Pipeline</En>
        </h2>
        {!crmReady ? (
          <p className="rounded-lg border border-amber-400/40 bg-amber-500/5 p-3 text-sm text-muted">
            برای فعال‌سازی مسیر فروش، فایل <span dir="ltr">supabase/admin6.sql</span> را در
            Supabase اجرا کنید.
          </p>
        ) : canEdit ? (
          <>
            {!moneyReady ? (
              <p className="mb-4 rounded-lg border border-amber-400/40 bg-amber-500/5 p-3 text-sm text-muted">
                برای ثبت مبلغ و تاریخ بستن، فایل <span dir="ltr">supabase/admin7.sql</span> را هم
                اجرا کنید.
              </p>
            ) : null}
            <LeadForm
              contactId={lead.id}
              status={status}
              nextFollowUpAt={nextFollowUpAt}
              amountCad={amountCad}
              expectedClose={expectedClose}
              showMoney={moneyReady}
            />
          </>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted">پیگیری بعدی (Next follow-up)</dt>
              <dd>{nextFollowUpAt ? faDate(nextFollowUpAt) : "—"}</dd>
            </div>
            {moneyReady ? (
              <>
                <div>
                  <dt className="text-xs text-muted">مبلغ (Amount)</dt>
                  <dd>{faCad(amountCad)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">تاریخ بستن (Expected close)</dt>
                  <dd dir="ltr" className="text-start">{expectedClose ?? "—"}</dd>
                </div>
              </>
            ) : null}
          </dl>
        )}
      </div>

      <div className="card-surface p-5">
        <h2 className="mb-4 font-semibold">
          تاریخچهٔ فعالیت
          <En>Activity Timeline</En>
        </h2>
        {crmReady && canEdit ? (
          <div className="mb-5 border-b border-border pb-5">
            <NoteForm contactId={lead.id} />
          </div>
        ) : null}
        {notes.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">هنوز فعالیتی ثبت نشده است.</p>
        ) : (
          <ul className="divide-y divide-border">
            {notes.map((n) => (
              <li key={n.id} className="py-3">
                <div className="mb-1.5">
                  <Badge tone={n.kind === "status" ? "neutral" : "accent"}>
                    {isLeadNoteKind(n.kind) ? LEAD_NOTE_KIND_LABELS[n.kind] : n.kind}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-7">{n.body}</p>
                <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                  {n.author_email ? <span dir="ltr">{n.author_email}</span> : null}
                  {n.author_email ? <span>·</span> : null}
                  <span>{faDate(n.created_at)}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
