"use client";

import { useState } from "react";
import { convertLeadAction } from "../actions";

// Promote a lead into a person (+ company + optional deal). The deal fields
// reveal on the checkbox; the amount pre-fills from the lead's estimate.
export function ConvertForm({
  contactId,
  defaultAmount,
}: {
  contactId: string;
  defaultAmount: number;
}) {
  const [withDeal, setWithDeal] = useState(true);

  return (
    <form action={convertLeadAction} className="flex flex-col gap-4">
      <input type="hidden" name="contact_id" value={contactId} />

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">نام شرکت — اختیاری (Company)</span>
        <input
          type="text"
          name="company_name"
          placeholder="اگر خالی بماند، مخاطب بدون شرکت ثبت می‌شود"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="create_deal"
          checked={withDeal}
          onChange={(e) => setWithDeal(e.target.checked)}
          className="accent-[var(--accent)]"
        />
        ساخت معامله (Create deal)
      </label>

      {withDeal ? (
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-sm text-muted">عنوان معامله (Deal title)</span>
            <input
              type="text"
              name="deal_title"
              placeholder="همکاری با …"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-muted">مبلغ تخمینی (Amount, CAD)</span>
            <input
              type="number"
              name="deal_amount"
              dir="ltr"
              min={0}
              step="0.01"
              defaultValue={defaultAmount || ""}
              placeholder="0.00"
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </label>
        </div>
      ) : null}

      <div>
        <button
          type="submit"
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
        >
          تبدیل به مخاطب (Convert)
        </button>
      </div>
    </form>
  );
}
