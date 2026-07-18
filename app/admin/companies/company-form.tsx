"use client";

import { useActionState } from "react";
import { updateCompanyAction, type CompanyActionState } from "./actions";

const inputClass =
  "rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export function EditCompanyForm({
  companyId,
  name,
  industry,
  website,
  city,
  sizeLabel,
  notes,
}: {
  companyId: string;
  name: string;
  industry: string;
  website: string;
  city: string;
  sizeLabel: string;
  notes: string;
}) {
  const [state, action, pending] = useActionState<CompanyActionState, FormData>(
    updateCompanyAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="company_id" value={companyId} />
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">نام (Name)</span>
          <input name="name" defaultValue={name} required className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">صنعت (Industry)</span>
          <input name="industry" defaultValue={industry} className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">وب‌سایت (Website)</span>
          <input name="website" dir="ltr" defaultValue={website} className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">شهر (City)</span>
          <input name="city" defaultValue={city} className={inputClass} />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="text-sm text-muted">اندازه (Size)</span>
          <input name="size_label" defaultValue={sizeLabel} className={inputClass} />
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
