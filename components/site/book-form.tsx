"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/icons";
import { submitContactAction, type ContactState } from "@/app/[locale]/book/actions";

type BookDict = {
  name: string;
  email: string;
  phone: string;
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

      <Field label={dict.name} name="name" type="text" autoComplete="name" required />
      <Field label={dict.email} name="email" type="email" autoComplete="email" required />
      <Field label={dict.phone} name="phone" type="tel" autoComplete="tel" />

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
