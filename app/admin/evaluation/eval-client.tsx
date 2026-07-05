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

const fa = (n: number) => n.toLocaleString("fa-IR");

const POLL_MS = 4500;
const STALL_MS = 25_000; // no new result this long -> assume the pass ended, continue
const MAX_CONTINUES = 6; // cap so persistent rate limits can't loop forever

type Phase =
  | { kind: "idle" }
  | { kind: "running"; done: number; total: number }
  | { kind: "done"; health: number; pass: number; warn: number; fail: number }
  | { kind: "error"; message: string };

// The run executes in the background (server action + after); this button starts
// it, then polls status and auto-continues stalled passes until it's done, so
// the browser never holds a multi-minute request.
export function RunEvalButton({ questionCount }: { questionCount: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const runIdRef = useRef<string | null>(null);
  const lastDoneRef = useRef(0);
  const lastProgressAtRef = useRef(0);
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
      });
      router.refresh();
    },
    [router],
  );

  const poll = useCallback(async () => {
    const runId = runIdRef.current;
    if (!runId) return;

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
    const now = Date.now();
    if (status.done > lastDoneRef.current) {
      lastDoneRef.current = status.done;
      lastProgressAtRef.current = now;
    }
    setPhase({ kind: "running", done: status.done, total: status.total });

    // A background pass ended before finishing (rate limit / budget) -> continue.
    const stalled = now - lastProgressAtRef.current > STALL_MS;
    if (stalled && !busyRef.current) {
      busyRef.current = true;
      try {
        if (continuesRef.current >= MAX_CONTINUES) {
          stop();
          await finalizeRunAction(runId);
          const s = await getRunStatusAction(runId);
          finishFrom(s.totals);
          return;
        }
        continuesRef.current += 1;
        lastProgressAtRef.current = now; // reset the stall window for the new pass
        await continueEvaluationAction(runId);
      } finally {
        busyRef.current = false;
      }
    }
  }, [finishFrom, router, stop]);

  const start = useCallback(async () => {
    runIdRef.current = null;
    lastDoneRef.current = 0;
    lastProgressAtRef.current = Date.now();
    continuesRef.current = 0;
    busyRef.current = false;
    setPhase({ kind: "running", done: 0, total: questionCount });

    const res = await startEvaluationAction();
    if (!res || !res.ok) {
      setPhase({ kind: "error", message: res?.error ?? "شروع ارزیابی ناموفق بود." });
      return;
    }
    runIdRef.current = res.runId;
    lastProgressAtRef.current = Date.now();
    setPhase({ kind: "running", done: 0, total: res.total });
    stop();
    timerRef.current = setInterval(poll, POLL_MS);
  }, [poll, questionCount, stop]);

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
          : `▶ اجرای ارزیابی (${fa(questionCount)} سؤال فعال)`}
      </button>

      {running ? (
        <p className="text-sm text-muted">
          در پس‌زمینه اجرا می‌شود؛ لازم نیست صفحه را ببندید. (با تحمل محدودیت نرخ Gemini، ممکن است
          چند دقیقه طول بکشد و خودکار ادامه یابد)
        </p>
      ) : null}

      {phase.kind === "done" ? (
        <p className="text-sm text-emerald-600">
          ارزیابی تمام شد — امتیاز سلامت: ٪{fa(phase.health)} ({fa(phase.pass)} قبول ·{" "}
          {fa(phase.warn)} هشدار · {fa(phase.fail)} مردود)
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
