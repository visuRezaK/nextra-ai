import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, Badge, En, faDate, faCad } from "@/components/admin/ui";
import {
  activityTypeLabel,
  isTaskOverdue,
  isTaskToday,
  personSourceLabel,
  stageLabel,
  stageTone,
  type PipelineStage,
} from "@/lib/admin/crm";
import { EditPersonForm, ActivityForm } from "./person-client";
import { toggleTaskAction, summarizePersonAction } from "../actions";

export const dynamic = "force-dynamic";

type PersonRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  source: string;
  notes: string | null;
  session_id: string | null;
  lead_id: string | null;
  ai_summary: string | null;
  created_at: string;
  companies: { id: string; name: string } | null;
};

type DealRow = {
  id: string;
  title: string;
  amount_cad: number | string | null;
  status: string;
  pipeline_stages: Pick<PipelineStage, "label_fa" | "label_en" | "is_won" | "is_lost"> | null;
};

type ActivityRow = {
  id: string;
  type: string;
  title: string | null;
  body: string | null;
  due_at: string | null;
  done_at: string | null;
  created_by: string | null;
  created_at: string;
};

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { id } = await params;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  const { data: personData } = await supabase
    .from("people")
    .select(
      "id, full_name, email, phone, position, source, notes, session_id, lead_id, ai_summary, created_at, companies(id, name)",
    )
    .eq("id", id)
    .maybeSingle();
  const person = personData as unknown as PersonRow | null;
  if (!person) notFound();

  const [dealsRes, activitiesRes] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, amount_cad, status, pipeline_stages(label_fa, label_en, is_won, is_lost)")
      .eq("person_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("activities")
      .select("id, type, title, body, due_at, done_at, created_by, created_at")
      .eq("person_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const deals = (dealsRes.data ?? []) as unknown as DealRow[];
  const activities = (activitiesRes.data ?? []) as unknown as ActivityRow[];

  return (
    <>
      <PageTitle
        title={person.full_name}
        en="Contact 360°"
        subtitle={`${personSourceLabel(person.source)} · ${faDate(person.created_at)}`}
      />

      <Link href="/admin/people" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به فهرست مخاطبان
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: contact + AI + deals */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          <section className="card-surface p-5">
            <h2 className="mb-3 font-semibold">
              اطلاعات تماس
              <En>Contact</En>
            </h2>
            <dl className="flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">شرکت (Company)</dt>
                <dd>
                  {person.companies ? (
                    <Link
                      href={`/admin/companies/${person.companies.id}`}
                      className="text-accent hover:underline"
                    >
                      {person.companies.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">سمت (Position)</dt>
                <dd>{person.position ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">ایمیل (Email)</dt>
                <dd dir="ltr" className="text-start">
                  {person.email ? (
                    <a href={`mailto:${person.email}`} className="text-accent hover:underline">
                      {person.email}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">تلفن (Phone)</dt>
                <dd dir="ltr" className="text-start">
                  {person.phone ? (
                    <a href={`tel:${person.phone}`} className="text-accent hover:underline">
                      {person.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-sm">
              {person.lead_id ? (
                <Link href={`/admin/leads/${person.lead_id}`} className="text-accent hover:underline">
                  لید اصلی (Origin lead)
                </Link>
              ) : null}
              {person.session_id ? (
                <Link
                  href={`/admin/conversations/${person.session_id}`}
                  className="text-accent hover:underline"
                >
                  گفتگوی چت‌بات (Chat)
                </Link>
              ) : null}
            </div>
          </section>

          {/* AI insight — gated until the AI phase. */}
          <section className="card-surface p-5">
            <h2 className="mb-2 font-semibold">
              شناخت مشتری (AI)
              <En>AI Insight</En>
            </h2>
            {person.ai_summary ? (
              <p className="mb-3 whitespace-pre-wrap text-sm leading-7 text-foreground/80">
                {person.ai_summary}
              </p>
            ) : (
              <p className="mb-3 rounded-lg border border-dashed border-border p-3 text-sm text-muted">
                هنوز خلاصه‌ای ساخته نشده است.
              </p>
            )}
            {canEdit ? (
              <form action={summarizePersonAction}>
                <input type="hidden" name="person_id" value={person.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
                >
                  {person.ai_summary ? "بازسازی خلاصه (AI)" : "ساخت خلاصه (AI)"}
                </button>
              </form>
            ) : null}
          </section>

          <section className="card-surface p-5">
            <h2 className="mb-3 font-semibold">
              معاملات
              <En>Deals</En>
            </h2>
            {deals.length === 0 ? (
              <p className="text-sm text-muted">معامله‌ای ثبت نشده است.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {deals.map((d) => (
                  <li key={d.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{d.title}</span>
                      <span className="text-sm text-muted">{faCad(d.amount_cad)}</span>
                    </div>
                    {d.pipeline_stages ? (
                      <div className="mt-1.5">
                        <Badge tone={stageTone(d.pipeline_stages)}>
                          {stageLabel(d.pipeline_stages)}
                        </Badge>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right column: edit + timeline */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {canEdit ? (
            <section className="card-surface p-5">
              <h2 className="mb-4 font-semibold">
                ویرایش مخاطب
                <En>Edit</En>
              </h2>
              <EditPersonForm
                personId={person.id}
                fullName={person.full_name}
                email={person.email ?? ""}
                phone={person.phone ?? ""}
                position={person.position ?? ""}
                companyName={person.companies?.name ?? ""}
                notes={person.notes ?? ""}
              />
            </section>
          ) : null}

          <section className="card-surface p-5">
            <h2 className="mb-4 font-semibold">
              تایم‌لاین
              <En>Timeline</En>
            </h2>
            {canEdit ? (
              <div className="mb-5 border-b border-border pb-5">
                <ActivityForm personId={person.id} />
              </div>
            ) : null}
            {activities.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">هنوز فعالیتی ثبت نشده است.</p>
            ) : (
              <ul className="divide-y divide-border">
                {activities.map((a) => {
                  const overdue = isTaskOverdue(a.due_at, a.done_at);
                  const today = isTaskToday(a.due_at, a.done_at);
                  return (
                    <li key={a.id} className="py-3">
                      <div className="mb-1.5 flex items-center gap-2">
                        <Badge tone={a.type === "stage_change" ? "neutral" : "accent"}>
                          {activityTypeLabel(a.type)}
                        </Badge>
                        {a.type === "task" && a.due_at ? (
                          <Badge tone={overdue ? "danger" : today ? "warn" : "neutral"}>
                            {a.done_at ? "انجام شد (Done)" : `سررسید ${faDate(a.due_at)}`}
                          </Badge>
                        ) : null}
                      </div>
                      {a.title ? <p className="text-sm font-medium">{a.title}</p> : null}
                      {a.body ? (
                        <p className="whitespace-pre-wrap text-sm leading-7 text-foreground/80">
                          {a.body}
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                        {a.created_by ? <span dir="ltr">{a.created_by}</span> : null}
                        {a.created_by ? <span>·</span> : null}
                        <span>{faDate(a.created_at)}</span>
                        {a.type === "task" && canEdit ? (
                          <form action={toggleTaskAction} className="ms-auto">
                            <input type="hidden" name="activity_id" value={a.id} />
                            <input type="hidden" name="person_id" value={person.id} />
                            <input type="hidden" name="done" value={a.done_at ? "0" : "1"} />
                            <button type="submit" className="text-accent hover:underline">
                              {a.done_at ? "بازگشایی (Reopen)" : "✓ انجام شد (Mark done)"}
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
