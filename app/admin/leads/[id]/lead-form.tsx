"use client";

import { useActionState } from "react";
import { LEAD_STATUSES, leadStatusLabel, type LeadStatus } from "@/lib/admin/leads";
import { updateLeadAction, type LeadActionState } from "../actions";

// Stage + next follow-up + an optional note, in one submit: the whole point of
// working a lead is doing all three at once after a call.
export function LeadForm({
  contactId,
  status,
  nextFollowUpAt,
  amountCad,
  expectedClose,
  showMoney,
}: {
  contactId: string;
  status: LeadStatus;
  nextFollowUpAt: string | null;
  amountCad: number;
  expectedClose: string | null;
  // False until admin7.sql runs — the action would fail on the missing columns.
  showMoney: boolean;
}) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(
    updateLeadAction,
    undefined,
  );

  // <input type="date"> needs YYYY-MM-DD in Toronto terms, not the raw ISO date
  // (which is UTC and can be a day off).
  const dateValue = nextFollowUpAt
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Toronto",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(nextFollowUpAt))
    : "";

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="contact_id" value={contactId} />

      <div className="flex flex-wrap gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">وضعیت (Stage)</span>
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {leadStatusLabel(s)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">پیگیری بعدی (Next follow-up)</span>
          <input
            type="date"
            name="next_follow_up_at"
            dir="ltr"
            defaultValue={dateValue}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>

        {showMoney ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">مبلغ (Amount, CAD)</span>
              <input
                type="number"
                name="amount_cad"
                dir="ltr"
                min={0}
                step="0.01"
                defaultValue={amountCad || ""}
                placeholder="0.00"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-muted">تاریخ بستن تخمینی (Expected close)</span>
              <input
                type="date"
                name="expected_close"
                dir="ltr"
                defaultValue={expectedClose ?? ""}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </label>
          </>
        ) : null}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">یادداشت — اختیاری (Note)</span>
        <textarea
          name="note"
          rows={2}
          placeholder="چه گفتید؟ قدم بعدی چیست؟"
          className="w-full rounded-lg border border-border bg-background p-3 text-sm leading-7 outline-none focus:border-accent"
        />
      </label>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "در حال ذخیره…" : "ذخیره"}
        </button>
        {state?.ok ? <span className="text-sm text-emerald-600">ذخیره شد ✓</span> : null}
        {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
      </div>
    </form>
  );
}
