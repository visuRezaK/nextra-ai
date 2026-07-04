"use client";

import { useActionState } from "react";
import { sendOperatorMessageAction, type OperatorReplyState } from "./actions";

// Reply box for telegram conversations — sends as the human operator.
export function OperatorReply({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState<OperatorReplyState, FormData>(
    sendOperatorMessageAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="session_id" value={sessionId} />
      <textarea
        name="text"
        rows={3}
        required
        placeholder="پاسخ شما به‌عنوان اپراتور انسانی — مستقیم در تلگرام کاربر ارسال می‌شود…"
        className="w-full rounded-lg border border-border bg-background p-3 text-sm leading-7 outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "در حال ارسال…" : "ارسال به تلگرام کاربر"}
        </button>
        {state?.ok ? <span className="text-sm text-emerald-600">ارسال شد ✓</span> : null}
        {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
      </div>
    </form>
  );
}
