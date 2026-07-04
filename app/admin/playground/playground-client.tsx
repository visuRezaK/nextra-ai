"use client";

import { useActionState } from "react";
import { comparePlaygroundAction, type PlaygroundState } from "./actions";

const MODEL_OPTIONS = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
];

const fa = (n: number) => n.toLocaleString("fa-IR");

export function PlaygroundClient() {
  const [state, action, pending] = useActionState<PlaygroundState, FormData>(
    comparePlaygroundAction,
    undefined,
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="card-surface flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">سؤال آزمایشی</span>
          <textarea
            name="query"
            rows={2}
            required
            placeholder="مثلاً: هزینه پیاده‌سازی چت‌بات برای فروشگاه اینترنتی چقدر است؟"
            className="rounded-lg border border-border bg-background p-3 outline-none focus:border-accent"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">مدل اول</span>
            <select
              name="model_a"
              defaultValue="gemini-2.5-flash"
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            >
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">مدل دوم (برای مقایسه)</span>
            <select
              name="model_b"
              defaultValue="gemini-2.5-pro"
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            >
              <option value="">— بدون مقایسه —</option>
              {MODEL_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">زبان</span>
            <select
              name="locale"
              defaultValue="fa"
              className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
            >
              <option value="fa">فارسی</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-muted">
            پرسونای پیش‌نویس (اختیاری — بدون اثر روی چت‌بات زنده)
          </summary>
          <textarea
            name="persona"
            rows={6}
            dir="rtl"
            placeholder="اینجا می‌توانید نسخهٔ آزمایشی پرسونا را قبل از ذخیره در بخش «پرسونا» امتحان کنید…"
            className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm leading-7 outline-none focus:border-accent"
          />
        </details>

        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {pending ? "در حال اجرا…" : "اجرا"}
        </button>
        {state && !state.ok ? <p className="text-sm text-red-500">{state.error}</p> : null}
      </form>

      {state?.ok ? (
        <>
          <div className={`grid gap-4 ${state.answers.length > 1 ? "lg:grid-cols-2" : ""}`}>
            {state.answers.map((a) => (
              <section key={a.model} className="card-surface p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="rounded-full bg-accent/10 px-2.5 py-0.5 font-medium text-accent" dir="ltr">
                    {a.model}
                  </span>
                  <span dir="ltr">{fa(a.ms)} ms</span>
                  {a.tokensIn != null ? (
                    <span dir="ltr">{fa(a.tokensIn)}→{fa(a.tokensOut ?? 0)} tok</span>
                  ) : null}
                </div>
                {a.error ? (
                  <p className="text-sm text-red-500">{a.error}</p>
                ) : (
                  <p className="whitespace-pre-wrap text-sm leading-7">{a.text}</p>
                )}
              </section>
            ))}
          </div>

          <section className="card-surface p-5">
            <h2 className="mb-3 font-semibold">chunkهای بازیابی‌شده ({fa(state.chunks.length)})</h2>
            <div className="flex flex-col gap-3">
              {state.chunks.map((c, i) => (
                <div key={i} className="rounded-lg border border-border bg-background p-3 text-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-medium">{c.title || c.category}</span>
                    <span className="text-xs text-muted" dir="ltr">
                      ٪{fa(Math.round(c.similarity * 100))} · {c.category}
                    </span>
                  </div>
                  <p className="line-clamp-3 leading-6 text-foreground/70">{c.content}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
