"use client";

import { useActionState, useState, useTransition } from "react";
import type { PipelineStage } from "@/lib/admin/crm";
import { updateDealAction, moveDealAction, type DealActionState } from "../actions";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function EditDealForm({
  dealId,
  title,
  amount,
  expectedClose,
  stageKey,
  stages,
}: {
  dealId: string;
  title: string;
  amount: number;
  expectedClose: string;
  stageKey: string;
  stages: PipelineStage[];
}) {
  const [state, action, pending] = useActionState<DealActionState, FormData>(
    updateDealAction,
    undefined,
  );

  // Stage moves go through moveDealAction (status derive + activity log live
  // there), independent of the field-edit form.
  const [stage, setStage] = useState(stageKey);
  const [moveError, setMoveError] = useState("");
  const [, startTransition] = useTransition();

  function changeStage(toStage: string) {
    const target = stages.find((s) => s.key === toStage);
    let reason: string | null = null;
    if (target?.is_lost) {
      reason = window.prompt("دلیل باخت؟ (Lost reason)");
      if (reason === null) return;
    }
    const prev = stage;
    setStage(toStage);
    setMoveError("");
    startTransition(async () => {
      const res = await moveDealAction(dealId, toStage, reason);
      if (!res.ok) {
        setStage(prev);
        setMoveError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <label className="flex max-w-xs flex-col gap-1.5">
        <span className="text-sm text-muted">مرحله (Stage)</span>
        <select
          value={stage}
          onChange={(e) => changeStage(e.target.value)}
          className={inputClass}
        >
          {stages.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label_fa} ({s.label_en})
            </option>
          ))}
        </select>
        {moveError ? <span className="text-sm text-red-500">{moveError}</span> : null}
      </label>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="deal_id" value={dealId} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">عنوان (Title)</span>
          <input name="title" defaultValue={title} required className={inputClass} />
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">مبلغ (Amount, CAD)</span>
            <input
              name="amount_cad"
              type="number"
              dir="ltr"
              min={0}
              step="0.01"
              defaultValue={amount || ""}
              placeholder="0.00"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">تاریخ بستن تخمینی (Expected close)</span>
            <input
              name="expected_close"
              type="date"
              dir="ltr"
              defaultValue={expectedClose}
              className={inputClass}
            />
          </label>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {pending ? "در حال ذخیره…" : "ذخیره (Save)"}
          </button>
          {state?.ok ? <span className="text-sm text-emerald-600">ذخیره شد ✓</span> : null}
          {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
        </div>
      </form>
    </div>
  );
}
