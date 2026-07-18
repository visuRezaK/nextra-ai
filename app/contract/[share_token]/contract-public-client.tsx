"use client";

import { useActionState } from "react";
import { acceptContractAction, type AcceptState } from "./actions";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60"
    >
      چاپ / ذخیرهٔ PDF
    </button>
  );
}

// The online-signature box: type your name to accept. Public, keyed by token.
export function AcceptForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(
    acceptContractAction,
    undefined,
  );

  if (state?.ok) {
    return (
      <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
        ✓ قرارداد با موفقیت تأیید شد. سپاس‌گزاریم.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="share_token" value={token} />
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">برای تأیید، نام کامل خود را وارد کنید:</span>
        <input
          name="name"
          required
          placeholder="نام و نام خانوادگی"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "در حال ثبت…" : "تأیید و امضای قرارداد"}
        </button>
        {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
      </div>
    </form>
  );
}
