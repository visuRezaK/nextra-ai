"use client";

import { useActionState, useState } from "react";
import { LOGGABLE_ACTIVITY_TYPES, ACTIVITY_TYPE_LABELS } from "@/lib/admin/crm";
import { updatePersonAction, addActivityAction, type CrmActionState } from "../actions";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

// Edit the person's contact details. Company is find-or-create by name.
export function EditPersonForm({
  personId,
  fullName,
  email,
  phone,
  position,
  companyName,
  notes,
}: {
  personId: string;
  fullName: string;
  email: string;
  phone: string;
  position: string;
  companyName: string;
  notes: string;
}) {
  const [state, action, pending] = useActionState<CrmActionState, FormData>(
    updatePersonAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="person_id" value={personId} />
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">نام کامل (Full name)</span>
          <input name="full_name" defaultValue={fullName} required className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">شرکت (Company)</span>
          <input name="company_name" defaultValue={companyName} className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">ایمیل (Email)</span>
          <input name="email" type="email" dir="ltr" defaultValue={email} className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">تلفن (Phone)</span>
          <input name="phone" dir="ltr" defaultValue={phone} className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">سمت (Position)</span>
          <input name="position" defaultValue={position} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">یادداشت‌ها (Notes)</span>
        <textarea name="notes" rows={2} defaultValue={notes} className={`${inputClass} leading-7`} />
      </label>
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
  );
}

// Log a note / call / meeting / task on the person's timeline. A task reveals a
// due-date picker whose local value is converted to ISO in a hidden field, so
// the server (UTC on Vercel) doesn't shift the time.
export function ActivityForm({ personId }: { personId: string }) {
  const [state, action, pending] = useActionState<CrmActionState, FormData>(
    addActivityAction,
    undefined,
  );
  const [type, setType] = useState<string>("note");
  const [dueIso, setDueIso] = useState<string>("");

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="person_id" value={personId} />
      <input type="hidden" name="due_at" value={dueIso} />
      <div className="flex flex-wrap gap-3">
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
        {type === "task" ? (
          <input
            type="datetime-local"
            dir="ltr"
            onChange={(e) =>
              setDueIso(e.target.value ? new Date(e.target.value).toISOString() : "")
            }
            className={inputClass}
            aria-label="سررسید"
          />
        ) : null}
      </div>
      <input name="title" placeholder="عنوان — اختیاری (Title)" className={inputClass} />
      <textarea
        name="body"
        rows={2}
        placeholder="متن…"
        className={`${inputClass} leading-7`}
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60 disabled:opacity-50"
        >
          {pending ? "در حال ثبت…" : "افزودن (Add)"}
        </button>
        {state?.ok ? <span className="text-sm text-emerald-600">ثبت شد ✓</span> : null}
        {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
      </div>
    </form>
  );
}
