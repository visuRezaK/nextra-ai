"use client";

import { useActionState, useEffect } from "react";
import { updateEmailAction, generateEmailAction, type CampaignActionState } from "../actions";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

// Compose/edit one recipient's email. Saving with both fields marks it «ready».
// The «تولید با AI» button is gated to the AI phase.
export function EmailCompose({
  emailId,
  toEmail,
  subject,
  bodyText,
  disabled,
}: {
  emailId: string;
  toEmail: string;
  subject: string;
  bodyText: string;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState<CampaignActionState, FormData>(
    updateEmailAction,
    undefined,
  );
  // AI generate is a separate action; on success the row's subject/body changed
  // in the DB, so reload to show them in these uncontrolled fields for review.
  const [genState, genAction, genPending] = useActionState<CampaignActionState, FormData>(
    generateEmailAction,
    undefined,
  );
  useEffect(() => {
    if (genState?.ok) window.location.reload();
  }, [genState]);

  return (
    <>
      {/* Separate, DOM-sibling form for the AI-generate button (form= attr). */}
      <form id={`gen-${emailId}`} action={genAction}>
        <input type="hidden" name="email_id" value={emailId} />
      </form>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="email_id" value={emailId} />
      <label className="flex flex-col gap-1">
        <span className="text-xs text-muted">ایمیل گیرنده (Recipient)</span>
        <input
          name="to_email"
          type="email"
          dir="ltr"
          defaultValue={toEmail}
          placeholder="name@example.com"
          disabled={disabled}
          className={`${inputClass} text-start`}
        />
      </label>
      <input
        name="subject"
        defaultValue={subject}
        placeholder="موضوع (Subject)"
        disabled={disabled}
        className={inputClass}
      />
      <textarea
        name="body_text"
        defaultValue={bodyText}
        rows={4}
        placeholder="متن ایمیل — اختصاصی برای این گیرنده…"
        disabled={disabled}
        className={`${inputClass} leading-7`}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending || disabled}
          className="rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60 disabled:opacity-50"
        >
          {pending ? "در حال ذخیره…" : "ذخیره (Save)"}
        </button>
        {/* AI generate — its own form so it doesn't submit the compose fields. */}
        <button
          type="submit"
          form={`gen-${emailId}`}
          disabled={genPending || disabled}
          className="rounded-lg border border-dashed border-border px-3 py-1.5 text-sm transition-colors hover:border-accent/60 disabled:opacity-50"
        >
          {genPending ? "در حال تولید…" : "تولید با AI"}
        </button>
        {state?.ok ? <span className="text-sm text-emerald-600">ذخیره شد ✓</span> : null}
        {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
        {genState && !genState.ok ? (
          <span className="text-sm text-red-500">{genState.error}</span>
        ) : null}
      </div>
      </form>
    </>
  );
}
