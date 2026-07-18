"use client";

import { useActionState, useState } from "react";
import { LOGGABLE_ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "@/lib/admin/crm";
import { addActivityAction, type CrmActionState } from "../people/actions";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

type PersonOption = { id: string; full_name: string };

// Quick-log a task/call/meeting/note against any person, from the worklist. The
// due-date picker (tasks only) is converted to ISO in a hidden field so the
// server's UTC clock doesn't shift it.
export function ActivityQuickForm({ people }: { people: PersonOption[] }) {
  const [state, action, pending] = useActionState<CrmActionState, FormData>(
    addActivityAction,
    undefined,
  );
  const [type, setType] = useState<string>("task");
  const [dueIso, setDueIso] = useState<string>("");

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="due_at" value={dueIso} />
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">مخاطب (Contact)</span>
        <select name="person_id" required className={inputClass} defaultValue="">
          <option value="" disabled>
            — انتخاب —
          </option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-muted">نوع (Type)</span>
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={inputClass}
        >
          {LOGGABLE_ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACTIVITY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      {type === "task" ? (
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-muted">سررسید (Due)</span>
          <input
            type="datetime-local"
            dir="ltr"
            onChange={(e) => setDueIso(e.target.value ? new Date(e.target.value).toISOString() : "")}
            className={inputClass}
          />
        </label>
      ) : null}
      <label className="flex flex-1 flex-col gap-1.5">
        <span className="text-xs text-muted">عنوان (Title)</span>
        <input name="title" className={inputClass} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "…" : "افزودن (Add)"}
      </button>
      {state?.ok ? <span className="text-sm text-emerald-600">ثبت شد ✓</span> : null}
      {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
    </form>
  );
}
