import { requireRole } from "@/lib/admin/auth";
import { getAdminClient } from "@/lib/chatbot/supabase-admin";
import { PageTitle } from "@/components/admin/ui";
import type { PipelineStage } from "@/lib/admin/crm";
import { DealsBoard, type BoardDeal } from "./deals-board";
import { createDealAction } from "./actions";

export const dynamic = "force-dynamic";

type DealRow = {
  id: string;
  title: string;
  amount_cad: number | string | null;
  stage_key: string;
  stage_entered_at: string | null;
  people: { id: string; full_name: string } | null;
};

type PersonOption = { id: string; full_name: string };

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default async function DealsPage() {
  const { role } = await requireRole(["operator", "viewer"]);
  const supabase = getAdminClient();
  const canEdit = role !== "viewer";

  const [stagesRes, dealsRes, peopleRes] = await Promise.all([
    supabase
      .from("pipeline_stages")
      .select("key, label_fa, label_en, position, is_won, is_lost")
      .order("position", { ascending: true }),
    supabase
      .from("deals")
      .select("id, title, amount_cad, stage_key, stage_entered_at, people(id, full_name)")
      .order("updated_at", { ascending: false })
      .limit(500),
    supabase.from("people").select("id, full_name").order("full_name").limit(500),
  ]);

  const stages = (stagesRes.data ?? []) as unknown as PipelineStage[];
  const dealRows = (dealsRes.data ?? []) as unknown as DealRow[];
  const people = (peopleRes.data ?? []) as unknown as PersonOption[];

  const deals: BoardDeal[] = dealRows.map((d) => ({
    id: d.id,
    title: d.title,
    amount: Number(d.amount_cad ?? 0),
    stageKey: d.stage_key,
    stageEnteredAt: d.stage_entered_at,
    personId: d.people?.id ?? null,
    personName: d.people?.full_name ?? null,
  }));

  return (
    <>
      <PageTitle title="معاملات" en="Deals" subtitle="مسیر فروش — کارت‌ها را بین مراحل بکشید" />

      {stages.length === 0 ? (
        <p className="card-surface p-6 text-center text-sm text-muted">
          مراحل مسیر فروش یافت نشد — فایل <span dir="ltr">supabase/admin8.sql</span> را اجرا کنید.
        </p>
      ) : (
        <>
          {canEdit ? (
            <details className="card-surface mb-4 p-4">
              <summary className="cursor-pointer text-sm font-medium">
                + معاملهٔ جدید (New deal)
              </summary>
              <form action={createDealAction} className="mt-4 flex flex-wrap items-end gap-3">
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs text-muted">عنوان (Title)</span>
                  <input name="title" required className={inputClass} />
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-xs text-muted">مخاطب (Contact)</span>
                  <select name="person_id" className={inputClass} defaultValue="">
                    <option value="">— بدون مخاطب —</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-muted">مبلغ (Amount, CAD)</span>
                  <input
                    name="amount_cad"
                    type="number"
                    dir="ltr"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    className={inputClass}
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
                >
                  افزودن (Add)
                </button>
              </form>
            </details>
          ) : null}

          <DealsBoard stages={stages} initialDeals={deals} />
        </>
      )}
    </>
  );
}
