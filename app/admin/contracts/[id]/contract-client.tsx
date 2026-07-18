"use client";

import { useActionState, useEffect, useState } from "react";
import { updateContractAction, rewriteContractAction, type ContractActionState } from "../actions";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

// Markdown editor for the contract body + meta. The «بازنویسی با AI» button is
// gated off until the AI phase.
export function EditContractForm({
  contractId,
  title,
  amount,
  startDate,
  durationLabel,
  bodyMd,
}: {
  contractId: string;
  title: string;
  amount: number;
  startDate: string;
  durationLabel: string;
  bodyMd: string;
}) {
  const [state, action, pending] = useActionState<ContractActionState, FormData>(
    updateContractAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="contract_id" value={contractId} />
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">عنوان (Title)</span>
          <input name="title" defaultValue={title} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">مبلغ (Amount, CAD)</span>
          <input
            name="amount_cad"
            type="number"
            dir="ltr"
            min={0}
            step="0.01"
            defaultValue={amount || ""}
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">تاریخ شروع (Start date)</span>
          <input name="start_date" type="date" dir="ltr" defaultValue={startDate} className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">مدت (Duration)</span>
          <input name="duration_label" defaultValue={durationLabel} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">متن قرارداد — Markdown (Body)</span>
        <textarea
          name="body_md"
          defaultValue={bodyMd}
          rows={20}
          required
          dir="rtl"
          className={`${inputClass} font-mono leading-7`}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
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
  );
}

// AI rewrite — separate form (can't nest in the editor form). On success the
// body changed in the DB; reload so the editor's textarea shows the new text.
export function RewriteButton({ contractId }: { contractId: string }) {
  const [state, action, pending] = useActionState<ContractActionState, FormData>(
    rewriteContractAction,
    undefined,
  );
  useEffect(() => {
    if (state?.ok) window.location.reload();
  }, [state]);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="contract_id" value={contractId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60 disabled:opacity-50"
      >
        {pending ? "در حال بازنویسی…" : "بازنویسی با AI"}
      </button>
      {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
    </form>
  );
}

// Copy the public share link to the clipboard.
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60"
    >
      {copied ? "کپی شد ✓" : "کپی لینک (Copy link)"}
    </button>
  );
}
