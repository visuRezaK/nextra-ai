"use client";

import { useActionState } from "react";
import { saveModelConfigAction, type ModelConfigState } from "./actions";

const MODELS = [
  {
    id: "gemini-2.5-flash",
    title: "Gemini 2.5 Flash",
    desc: "سریع و اقتصادی — پیش‌فرض؛ فارسی عالی و پشتیبانی از ابزار (ثبت لید)",
  },
  {
    id: "gemini-2.5-flash-lite",
    title: "Gemini 2.5 Flash Lite",
    desc: "سبک‌ترین و ارزان‌ترین — برای ترافیک بالا؛ کیفیت کمی پایین‌تر",
  },
  {
    id: "gemini-2.5-pro",
    title: "Gemini 2.5 Pro",
    desc: "قوی‌ترین — پاسخ‌های دقیق‌تر ولی کندتر و گران‌تر",
  },
] as const;

export function ModelForm({
  initial,
}: {
  initial: { chat_model: string; temperature: number | null; max_output_tokens: number | null };
}) {
  const [state, action, pending] = useActionState<ModelConfigState, FormData>(
    saveModelConfigAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">مدل گفتگو</legend>
        {MODELS.map((m) => (
          <label
            key={m.id}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 transition-colors has-checked:border-accent has-checked:bg-accent/5"
          >
            <input
              type="radio"
              name="chat_model"
              value={m.id}
              defaultChecked={initial.chat_model === m.id}
              className="mt-1 accent-(--accent)"
            />
            <span>
              <span className="block text-sm font-medium" dir="ltr">
                {m.title}
              </span>
              <span className="block text-xs text-muted">{m.desc}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Temperature</span>
          <input
            type="number"
            name="temperature"
            step="0.1"
            min="0"
            max="2"
            defaultValue={initial.temperature ?? ""}
            placeholder="خالی = پیش‌فرض"
            dir="ltr"
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
          <span className="text-xs text-muted">۰ تا ۲ — عدد کمتر یعنی پاسخ قابل‌پیش‌بینی‌تر</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">حداکثر توکن خروجی</span>
          <input
            type="number"
            name="max_output_tokens"
            min="1"
            max="65536"
            defaultValue={initial.max_output_tokens ?? ""}
            placeholder="خالی = پیش‌فرض"
            dir="ltr"
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          />
          <span className="text-xs text-muted">سقف طول هر پاسخ چت‌بات</span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "در حال ذخیره…" : "ذخیره تنظیمات"}
        </button>
        {state?.ok ? <span className="text-sm text-emerald-600">ذخیره شد.</span> : null}
        {state && !state.ok ? <span className="text-sm text-red-500">{state.error}</span> : null}
      </div>

      <p className="text-xs text-muted">
        تغییرات حداکثر تا ۶۰ ثانیه بعد روی همهٔ کانال‌ها (وب، ویجت، تلگرام) اعمال می‌شود.
      </p>
    </form>
  );
}
