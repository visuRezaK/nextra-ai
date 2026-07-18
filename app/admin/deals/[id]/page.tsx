import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle, Badge, En, faDate, faCad } from "@/components/admin/ui";
import {
  DEAL_STATUS_LABELS,
  DEAL_STATUS_TONES,
  isDealStatus,
  stageLabel,
  type PipelineStage,
} from "@/lib/admin/crm";
import { EditDealForm } from "./deal-edit-form";
import { deleteDealAction, dealNextActionAction } from "../actions";
import { createContractAction } from "@/app/admin/contracts/actions";

export const dynamic = "force-dynamic";

type DealRow = {
  id: string;
  title: string;
  amount_cad: number | string | null;
  expected_close: string | null;
  stage_key: string;
  status: string;
  lost_reason: string | null;
  ai_next_action: string | null;
  created_at: string;
  people: { id: string; full_name: string } | null;
  companies: { id: string; name: string } | null;
  pipeline_stages: Pick<PipelineStage, "label_fa" | "label_en"> | null;
};

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { role } = await requireRole(["operator", "viewer"]);
  const { id } = await params;
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  const [dealRes, stagesRes] = await Promise.all([
    supabase
      .from("deals")
      .select(
        "id, title, amount_cad, expected_close, stage_key, status, lost_reason, ai_next_action, created_at, people(id, full_name), companies(id, name), pipeline_stages(label_fa, label_en)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("pipeline_stages")
      .select("key, label_fa, label_en, position, is_won, is_lost")
      .order("position", { ascending: true }),
  ]);

  const deal = dealRes.data as unknown as DealRow | null;
  if (!deal) notFound();
  const stages = (stagesRes.data ?? []) as unknown as PipelineStage[];
  const status = isDealStatus(deal.status) ? deal.status : "open";

  return (
    <>
      <PageTitle
        title={deal.title}
        en="Deal"
        subtitle={`${faCad(deal.amount_cad)} · ثبت ${faDate(deal.created_at)}`}
      />

      <Link href="/admin/deals" className="mb-4 inline-block text-sm text-accent hover:underline">
        ← بازگشت به برد معاملات
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Badge tone={DEAL_STATUS_TONES[status]}>{DEAL_STATUS_LABELS[status]}</Badge>
        {deal.pipeline_stages ? <Badge tone="accent">{stageLabel(deal.pipeline_stages)}</Badge> : null}
        {deal.people ? (
          <Link href={`/admin/people/${deal.people.id}`} className="text-sm text-accent hover:underline">
            {deal.people.full_name}
          </Link>
        ) : null}
        {deal.companies ? (
          <Link
            href={`/admin/companies/${deal.companies.id}`}
            className="text-sm text-muted hover:text-accent"
          >
            {deal.companies.name}
          </Link>
        ) : null}
      </div>

      {status === "lost" && deal.lost_reason ? (
        <div className="card-surface mb-6 border-red-500/30 bg-red-500/5 p-4 text-sm">
          <span className="text-muted">دلیل باخت (Lost reason): </span>
          {deal.lost_reason}
        </div>
      ) : null}

      <section className="card-surface mb-6 p-5">
        <h2 className="mb-2 font-semibold">
          اقدام بعدی
          <En>AI Next Action</En>
        </h2>
        {deal.ai_next_action ? (
          <p className="mb-3 text-sm leading-7 text-foreground/80">{deal.ai_next_action}</p>
        ) : (
          <p className="mb-3 text-sm text-muted">هنوز پیشنهادی ساخته نشده است.</p>
        )}
        {canEdit ? (
          <form action={dealNextActionAction}>
            <input type="hidden" name="deal_id" value={deal.id} />
            <button
              type="submit"
              className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
            >
              {deal.ai_next_action ? "پیشنهاد مجدد (AI)" : "پیشنهاد اقدام (AI)"}
            </button>
          </form>
        ) : null}
      </section>

      {canEdit ? (
        <>
          <section className="card-surface mb-6 p-5">
            <h2 className="mb-4 font-semibold">
              ویرایش معامله
              <En>Edit</En>
            </h2>
            <EditDealForm
              dealId={deal.id}
              title={deal.title}
              amount={Number(deal.amount_cad ?? 0)}
              expectedClose={deal.expected_close ?? ""}
              stageKey={deal.stage_key}
              stages={stages}
            />
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <form action={createContractAction}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <button
                type="submit"
                className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60"
              >
                ساخت قرارداد (Create contract)
              </button>
            </form>
            <form action={deleteDealAction}>
              <input type="hidden" name="deal_id" value={deal.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-500/5"
              >
                حذف معامله (Delete)
              </button>
            </form>
          </div>
        </>
      ) : (
        <section className="card-surface p-5 text-sm">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted">مبلغ (Amount)</dt>
              <dd>{faCad(deal.amount_cad)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">تاریخ بستن (Expected close)</dt>
              <dd dir="ltr" className="text-start">{deal.expected_close ?? "—"}</dd>
            </div>
          </dl>
        </section>
      )}
    </>
  );
}
