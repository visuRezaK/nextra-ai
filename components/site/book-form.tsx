"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/icons";
import { submitContactAction, type ContactState } from "@/app/[locale]/book/actions";
import { torontoTimeToUtc, formatInZone } from "@/lib/timezone";

// Business hours, 16:00–20:00 Toronto time, half-hour slots. The <select>
// shows each slot converted to the visitor's own browser timezone; the
// canonical value submitted is always the real UTC instant.
const TORONTO_SLOTS = Array.from({ length: (20 * 60 - 16 * 60) / 30 + 1 }, (_, i) => {
  const totalMinutes = 16 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
});

// The visitor's IANA zone is a browser-only value with no server equivalent —
// useSyncExternalStore keeps SSR/hydration output as "" and swaps in the real
// zone right after mount, without the render-cascade a useEffect+setState
// pair would trigger.
function subscribeNoop() {
  return () => {};
}
function getVisitorTzSnapshot() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}
function getVisitorTzServerSnapshot() {
  return "";
}

type BookDict = {
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  timezoneNote: string;
  message: string;
  submit: string;
  successTitle: string;
  successBody: string;
  errorRequired: string;
  errorGeneral: string;
};

export function BookForm({ dict, locale }: { dict: BookDict; locale: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(
    submitContactAction,
    undefined
  );
  const [date, setDate] = useState("");
  const visitorTz = useSyncExternalStore(
    subscribeNoop,
    getVisitorTzSnapshot,
    getVisitorTzServerSnapshot
  );

  const slots = useMemo(() => {
    if (!date) return [];
    return TORONTO_SLOTS.map((torontoTime) => {
      const instant = torontoTimeToUtc(date, torontoTime);
      return {
        iso: instant.toISOString(),
        label: formatInZone(instant, visitorTz, date),
      };
    });
  }, [date, visitorTz]);

  if (state?.success) {
    return (
      <div className="card-surface p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15">
          <IconCheck className="h-7 w-7 text-accent" />
        </div>
        <h2 className="mt-5 text-xl font-bold">{dict.successTitle}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">{dict.successBody}</p>
      </div>
    );
  }

  return (
    <form action={action} className="card-surface space-y-5 p-8">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="visitorTz" value={visitorTz} />

      <Field label={dict.name} name="name" type="text" autoComplete="name" required />
      <Field label={dict.email} name="email" type="email" autoComplete="email" required />
      <Field label={dict.phone} name="phone" type="tel" autoComplete="tel" />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label={dict.date}
          name="date"
          type="date"
          dir="ltr"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground/80">{dict.time}</span>
          <select
            name="time"
            dir="ltr"
            required
            defaultValue=""
            disabled={!date}
            className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
          >
            <option value="" disabled>
              --:--
            </option>
            {slots.map((s) => (
              <option key={s.iso} value={s.iso}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="-mt-3 text-xs text-muted">
        {dict.timezoneNote}
        {visitorTz && <span dir="ltr"> ({visitorTz})</span>}
      </p>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-foreground/80">{dict.message}</span>
        <textarea
          name="message"
          rows={4}
          className="w-full resize-none rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
      </label>

      {state?.error && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {state.error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "…" : dict.submit}
      </Button>
    </form>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/80">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
    </label>
  );
}
