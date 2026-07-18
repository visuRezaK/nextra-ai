"use client";

import { useActionState } from "react";
import { LEAD_NOTE_KIND_LABELS, LOGGABLE_NOTE_KINDS } from "@/lib/admin/leads";
import { addLeadNoteAction, type LeadActionState } from "../actions";

// Log a touch without changing the stage — the "I just called them" box.
export function NoteForm({ contactId }: { contactId: string }) {
  const [state, action, pending] = useActionState<LeadActionState, FormData>(
    addLeadNoteAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="contact_id" value={contactId} />
      <textarea
        name="body"
        rows={2}
        required
        placeholder="یادداشت جدید…"
        className="w-full rounded-lg border border-border bg-background p-3 text-sm leading-7 outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          name="kind"
          defaultValue="note"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {LOGGABLE_NOTE_KINDS.map((k) => (
            <option key={k} value={k}>
              {LEAD_NOTE_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60 disabled:opacity-50"
        >
          {pending ? "در حال ثبت…" : "افزودن"}
        </button>
        {state?.ok ? <span className="text-sm text-emerald-600">ثبت شد ✓</span> : null}
        {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
      </div>
    </form>
  );
}
