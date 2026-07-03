"use client";

import { useActionState } from "react";
import { savePersonaAction, type PersonaState } from "./actions";

export function PersonaEditor({ initialContent }: { initialContent: string }) {
  const [state, action, pending] = useActionState<PersonaState, FormData>(
    savePersonaAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea
        name="content"
        dir="rtl"
        rows={16}
        defaultValue={initialContent}
        className="w-full rounded-lg border border-border bg-background p-4 text-sm leading-7 outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="note"
          placeholder="برچسب نسخه (اختیاری) — مثلاً «لحن رسمی‌تر»"
          className="min-w-64 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "در حال ذخیره…" : "ذخیره و فعال‌سازی"}
        </button>
      </div>
      {state?.ok ? (
        <p className="text-sm text-emerald-600">نسخهٔ جدید ذخیره و فعال شد. (حداکثر ۶۰ ثانیه بعد روی چت‌بات اعمال می‌شود.)</p>
      ) : null}
      {state && !state.ok ? <p className="text-sm text-red-500">{state.error}</p> : null}
    </form>
  );
}
