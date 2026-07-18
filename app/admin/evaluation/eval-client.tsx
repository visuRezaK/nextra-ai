"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  startEvaluationAction,
  continueEvaluationAction,
  getRunStatusAction,
  finalizeRunAction,
  addQuestionAction,
  seedQuestionsAction,
  type QuestionState,
} from "./actions";

const fa = (n: number) => n.toLocaleString("fa-IR-u-nu-latn");

const POLL_MS = 5000;
// Only continue once the run has been QUIET this long — i.e. no result written
// for IDLE_MS. This means the previous background pass has ended, so continuing
// can't spawn an overlapping pass (which previously caused duplicate rows and
// wasted the rate-limit quota). It's also longer than a single rate-limited
// question, so a slow-but-active pass is never mistaken for a dead one.
const IDLE_MS = 75_000;
const MAX_CONTINUES = 15; // plenty of passes for the free tier to recover between

type Phase =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "done"; health: number; pass: number; warn: number; fail: number; skipped: number }
  | { kind: "error"; message: string };

// The run executes in the background (server action + after); this button starts
// it, then polls status and — only when the run has gone quiet — auto-continues
// until it's done, so the browser never holds a multi-minute request and passes
// never overlap.
export function RunEvalButton({
  questionCount,
  group,
  label,
}: {
  questionCount: number;
  group?: number;
  label?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const runIdRef = useRef<string | null>(null);
  const continuesRef = useRef(0);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  const finishFrom = useCallback(
    (totals: Record<string, number>) => {
      setPhase({
        kind: "done",
        health: Number(totals.health ?? 0),
        pass: Number(totals.pass ?? 0),
        warn: Number(totals.warn ?? 0),
        fail: Number(totals.fail ?? 0),
        skipped: Number(totals.skipped ?? 0),
      });
      router.refresh();
    },
    [router],
  );

  const poll = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId || busyRef.current) return;

    let status;
    try {
      status = await getRunStatusAction(runId);
    } catch {
      return; // transient — try again next tick
    }

    if (status.status === "done") {
      stop();
      finishFrom(status.totals);
      return;
    }
    if (status.status === "failed" || status.status === "missing") {
      stop();
      setPhase({ kind: "error", message: "اجرا ناتمام ماند. دوباره تلاش کنید." });
      router.refresh();
      return;
    }

    // running
    setPhase({ kind: "running", done: status.done, total: status.total });
    if (status.done >= status.total) return; // all scored; next poll will see "done"

    // Continue only if the run has gone quiet (previous pass ended) — this is
    // what keeps passes from overlapping.
    const quiet = Date.now() - status.lastActivityAt > IDLE_MS;
    if (!quiet) return;

    busyRef.current = true;
    try {
      if (continuesRef.current >= MAX_CONTINUES) {
        stop();
        await finalizeRunAction(runId); // give up on the stragglers, mark them skipped
        const s = await getRunStatusAction(runId);
        if (s.status === "done") finishFrom(s.totals);
        else {
          setPhase({
            kind: "error",
            message: "سنجش ناموفق — سهمیهٔ رایگان Gemini پر شده. کمی بعد دوباره اجرا کنید.",
          });
          router.refresh();
        }
        return;
      }
      continuesRef.current += 1;
      await continueEvaluationAction(runId);
    } finally {
      busyRef.current = false;
    }
  }, [finishFrom, router, stop]);

  const start = useCallback(async () => {
    runIdRef.current = null;
    continuesRef.current = 0;
    busyRef.current = false;
    setPhase({ kind: "running", done: 0, total: questionCount });

    const res = await startEvaluationAction(group);
    if (!res || !res.ok) {
      setPhase({ kind: "error", message: res?.error ?? "شروع ارزیابی ناموفق بود." });
      return;
    }
    runIdRef.current = res.runId;
    setPhase({ kind: "running", done: 0, total: res.total });
    stop();
    timerRef.current = setInterval(poll, POLL_MS);
  }, [group, poll, questionCount, stop]);

  const running = phase.kind === "running";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={start}
        disabled={running || questionCount === 0}
        className="self-start rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {running
          ? `در حال اجرا… ${fa(phase.done)} از ${fa(phase.total)} سنجیده شد`
          : (label ?? `▶ اجرای ارزیابی (${fa(questionCount)} سؤال فعال)`)}
      </button>

      {running ? (
        <p className="text-sm text-muted">
          در پس‌زمینه اجرا می‌شود؛ لازم نیست صفحه را ببندید. (با تحمل محدودیت نرخ Gemini، ممکن است
          چند دقیقه طول بکشد و خودکار ادامه یابد)
        </p>
      ) : null}

      {phase.kind === "done" ? (
        <p className="text-sm text-emerald-600">
          ارزیابی تمام شد — امتیاز سلامت: {fa(phase.health)}% ({fa(phase.pass)} قبول ·{" "}
          {fa(phase.warn)} هشدار · {fa(phase.fail)} مردود
          {phase.skipped > 0 ? ` · ${fa(phase.skipped)} سنجیده‌نشده` : ""})
          {phase.skipped > 0 ? (
            <span className="block text-amber-600">
              {fa(phase.skipped)} سؤال به‌خاطر محدودیت نرخ سنجیده نشد و در امتیاز حساب نشده — برای
              نتیجهٔ کامل دوباره اجرا کنید.
            </span>
          ) : null}
        </p>
      ) : null}

      {phase.kind === "error" ? <p className="text-sm text-red-500">{phase.message}</p> : null}
    </div>
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
        {pending ? "در حال افزودن…" : "افزودن ۳۲ سؤال پیشنهادی"}
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
