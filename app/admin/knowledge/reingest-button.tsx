"use client";

import { useActionState } from "react";
import { reingestAction, type ReingestState } from "./actions";

export function ReingestButton() {
  const [state, action, pending] = useActionState<ReingestState, FormData>(
    reingestAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "در حال بازسازی… (ممکن است یک دقیقه طول بکشد)" : "بازسازی پایگاه دانش"}
      </button>

      {state?.ok ? (
        <span className="text-sm text-emerald-600">
          انجام شد:{" "}
          {state.summary
            .map((s) => `${s.locale} = ${s.count.toLocaleString("fa-IR")}`)
            .join("، ")}
        </span>
      ) : null}
      {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
    </form>
  );
}
