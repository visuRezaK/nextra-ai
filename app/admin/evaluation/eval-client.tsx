"use client";

import { useActionState } from "react";
import {
  runEvaluationAction,
  addQuestionAction,
  seedQuestionsAction,
  type RunEvalState,
  type QuestionState,
} from "./actions";

const fa = (n: number) => n.toLocaleString("fa-IR");

export function RunEvalButton({ questionCount }: { questionCount: number }) {
  const [state, action, pending] = useActionState<RunEvalState, FormData>(
    runEvaluationAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending || questionCount === 0}
        className="self-start rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {pending
          ? `در حال اجرای ${fa(questionCount)} سؤال + داوری… (تا چند دقیقه طول می‌کشد)`
          : `▶ اجرای ارزیابی (${fa(questionCount)} سؤال فعال)`}
      </button>
      {state?.ok ? (
        <p className="text-sm text-emerald-600">
          ارزیابی تمام شد — امتیاز سلامت: ٪{fa(state.summary.totals.health)} (
          {fa(state.summary.totals.pass)} قبول · {fa(state.summary.totals.warn)} هشدار ·{" "}
          {fa(state.summary.totals.fail)} مردود)
        </p>
      ) : null}
      {state && !state.ok ? <p className="text-sm text-red-500">{state.error}</p> : null}
    </form>
  );
}

export function SeedButton() {
  const [state, action, pending] = useActionState<QuestionState, FormData>(
    seedQuestionsAction,
    undefined,
  );

  return (
    <form action={action} className="inline">
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:border-accent/60 disabled:opacity-50"
      >
        {pending ? "در حال افزودن…" : "افزودن ۱۲ سؤال پیشنهادی"}
      </button>
      {state && !state.ok ? <span className="ms-2 text-sm text-red-500">{state.error}</span> : null}
    </form>
  );
}

export function AddQuestionForm() {
  const [state, action, pending] = useActionState<QuestionState, FormData>(
    addQuestionAction,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea
        name="question"
        rows={2}
        required
        placeholder="متن سؤال آزمون…"
        className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-accent"
      />
      <input
        type="text"
        name="expected"
        placeholder="رفتار مورد انتظار (اختیاری — به داور کمک می‌کند)"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          name="category"
          defaultValue="kb"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="kb">در دانش هست (پاسخ‌گویی درست)</option>
          <option value="out_of_kb">در دانش نیست (تست توهم)</option>
          <option value="lead">مسیر ثبت لید</option>
          <option value="edge">موارد خاص (خارج از حوزه/دستکاری)</option>
        </select>
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
          {pending ? "…" : "افزودن سؤال"}
        </button>
      </div>
      {state && !state.ok && state.error ? (
        <p className="text-sm text-red-500">{state.error}</p>
      ) : null}
    </form>
  );
}
