"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { loginAction, signupAction, googleAction, type AuthState } from "@/app/[locale]/auth-actions";
import type { Locale } from "@/lib/i18n/config";

type AuthDict = {
  loginTitle: string;
  signupTitle: string;
  email: string;
  password: string;
  name: string;
  loginCta: string;
  signupCta: string;
  google: string;
  or: string;
  haveAccount: string;
  noAccount: string;
  checkEmail: string;
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.5h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.6Z" fill="#4285F4" />
      <path d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" fill="#FBBC05" />
      <path d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" fill="#EA4335" />
    </svg>
  );
}

export function AuthForm({
  mode,
  locale,
  dict,
}: {
  mode: "login" | "signup";
  locale: Locale;
  dict: AuthDict;
}) {
  const action = mode === "login" ? loginAction : signupAction;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);

  const base = `/${locale}`;

  if (state?.confirm) {
    return (
      <div className="card-surface w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl">
          ✉️
        </div>
        <p className="mt-5 text-base leading-relaxed text-foreground/90">{dict.checkEmail}</p>
        <Link
          href={`${base}/login`}
          className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover"
        >
          {dict.haveAccount}
        </Link>
      </div>
    );
  }

  return (
    <div className="card-surface w-full max-w-md p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">
        {mode === "login" ? dict.loginTitle : dict.signupTitle}
      </h1>

      {/* Google OAuth */}
      <form action={googleAction} className="mt-6">
        <input type="hidden" name="locale" value={locale} />
        <Button type="submit" variant="secondary" size="lg" className="w-full gap-3">
          <GoogleIcon />
          {dict.google}
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        {dict.or}
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Email / password */}
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="locale" value={locale} />

        {mode === "signup" && (
          <Field label={dict.name} name="name" type="text" autoComplete="name" />
        )}
        <Field label={dict.email} name="email" type="email" autoComplete="email" required />
        <Field
          label={dict.password}
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
        />

        {state?.error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "…" : mode === "login" ? dict.loginCta : dict.signupCta}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          href={mode === "login" ? `${base}/signup` : `${base}/login`}
          className="font-medium text-accent hover:text-accent-hover"
        >
          {mode === "login" ? dict.noAccount : dict.haveAccount}
        </Link>
      </p>
    </div>
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
