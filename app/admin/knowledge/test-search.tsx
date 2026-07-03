"use client";

import { useActionState } from "react";
import { testSearchAction, type TestSearchState } from "./actions";

export function TestSearch() {
  const [state, action, pending] = useActionState<TestSearchState, FormData>(
    testSearchAction,
    undefined,
  );

  return (
    <div>
      <form action={action} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="query"
          required
          placeholder="مثلاً: قیمت مشاوره چقدر است؟"
          className="min-w-64 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <select
          name="locale"
          defaultValue="fa"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="fa">فارسی</option>
          <option value="en">English</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "در حال جستجو…" : "جستجوی آزمایشی"}
        </button>
      </form>

      {state && !state.ok ? (
        <p className="mt-3 text-sm text-red-500">{state.error}</p>
      ) : null}

      {state?.ok ? (
        <div className="mt-4 flex flex-col gap-3">
          {state.results.length === 0 ? (
            <p className="text-sm text-muted">نتیجه‌ای یافت نشد.</p>
          ) : (
            state.results.map((r, i) => (
              <div key={i} className="rounded-lg border border-border bg-background p-3 text-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium">{r.title || r.category}</span>
                  <span className="text-xs text-muted" dir="ltr">
                    ٪{Math.round(r.similarity * 100).toLocaleString("fa-IR")} · {r.category}
                  </span>
                </div>
                <p className="line-clamp-3 leading-6 text-foreground/70">{r.content}</p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
