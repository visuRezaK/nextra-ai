"use client";

import { useActionState } from "react";
import {
  setWebhookAction,
  broadcastAction,
  type TelegramActionState,
} from "./actions";

export function SetWebhookButton() {
  const [state, action, pending] = useActionState<TelegramActionState, FormData>(
    setWebhookAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-accent px-4 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "در حال ثبت…" : "ثبت / به‌روزرسانی Webhook"}
      </button>
      {state?.ok ? <span className="text-sm text-emerald-600">{state.message}</span> : null}
      {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
    </form>
  );
}

export function BroadcastForm() {
  const [state, action, pending] = useActionState<TelegramActionState, FormData>(
    broadcastAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea
        name="text"
        rows={4}
        required
        placeholder="متن پیام برای همهٔ کاربران تلگرام بات…"
        className="w-full rounded-lg border border-border bg-background p-3 text-sm leading-7 outline-none focus:border-accent"
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" className="accent-(--accent)" />
        مطمئنم — این پیام برای <b>همهٔ</b> کاربران تلگرام ارسال شود.
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending ? "در حال ارسال… (بسته به تعداد کاربران طول می‌کشد)" : "ارسال پیام انبوه"}
      </button>
      {state?.ok ? <p className="text-sm text-emerald-600">{state.message}</p> : null}
      {state && !state.ok ? <p className="text-sm text-red-500">{state.error}</p> : null}
    </form>
  );
}
