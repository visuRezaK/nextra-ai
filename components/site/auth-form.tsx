"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  loginAction,
  signupAction,
  googleAction,
  forgotPasswordAction,
  resetPasswordAction,
  type AuthState,
} from "@/app/[locale]/auth-actions";
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
  forgot: string;
  forgotTitle: string;
  forgotDesc: string;
  forgotCta: string;
  resetSent: string;
  resetTitle: string;
  newPassword: string;
  resetCta: string;
  resetExpired: string;
  showPassword: string;
  hidePassword: string;
  backToLogin: string;
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
        <Field label={dict.email} name="email" type="email" autoComplete="email" required dir="ltr" />
        <PasswordField
          label={dict.password}
          name="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
          minLength={6}
          showLabel={dict.showPassword}
          hideLabel={dict.hidePassword}
        />

        {mode === "login" && (
          <div className="text-start">
            <Link
              href={`${base}/forgot-password`}
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              {dict.forgot}
            </Link>
          </div>
        )}

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

// "Forgot password" — asks for the email, always answers with "sent".
export function ForgotPasswordForm({ locale, dict }: { locale: Locale; dict: AuthDict }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    forgotPasswordAction,
    undefined,
  );

  if (state?.confirm) {
    return (
      <div className="card-surface w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-2xl">
          ✉️
        </div>
        <p className="mt-5 text-base leading-relaxed text-foreground/90">{dict.resetSent}</p>
        <Link
          href={`/${locale}/login`}
          className="mt-6 inline-block text-sm font-medium text-accent hover:text-accent-hover"
        >
          {dict.backToLogin}
        </Link>
      </div>
    );
  }

  return (
    <div className="card-surface w-full max-w-md p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">{dict.forgotTitle}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">{dict.forgotDesc}</p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <Field label={dict.email} name="email" type="email" autoComplete="email" required dir="ltr" />

        {state?.error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "…" : dict.forgotCta}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          href={`/${locale}/login`}
          className="font-medium text-accent hover:text-accent-hover"
        >
          {dict.backToLogin}
        </Link>
      </p>
    </div>
  );
}

// New-password form, reached from the recovery-email link via /auth/callback.
export function ResetPasswordForm({ locale, dict }: { locale: Locale; dict: AuthDict }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    resetPasswordAction,
    undefined,
  );

  return (
    <div className="card-surface w-full max-w-md p-8">
      <h1 className="text-2xl font-extrabold tracking-tight">{dict.resetTitle}</h1>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="locale" value={locale} />
        <PasswordField
          label={dict.newPassword}
          name="password"
          autoComplete="new-password"
          required
          minLength={6}
          showLabel={dict.showPassword}
          hideLabel={dict.hidePassword}
        />

        {state?.error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error === "expired" ? dict.resetExpired : state.error}
          </p>
        )}
        {state?.error === "expired" && (
          <p className="text-center text-sm">
            <Link
              href={`/${locale}/forgot-password`}
              className="font-medium text-accent hover:text-accent-hover"
            >
              {dict.forgotTitle}
            </Link>
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "…" : dict.resetCta}
        </Button>
      </form>
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

// Password input: always LTR (passwords are Latin-keyboard input even on the
// RTL pages) with a show/hide toggle sitting on the input's right edge.
function PasswordField({
  label,
  showLabel,
  hideLabel,
  ...props
}: {
  label: string;
  showLabel: string;
  hideLabel: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground/80">{label}</span>
      <div className="relative" dir="ltr">
        <input
          {...props}
          type={visible ? "text" : "password"}
          dir="ltr"
          className="w-full rounded-xl border border-border bg-surface-2 py-2.5 pl-4 pr-11 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          title={visible ? hideLabel : showLabel}
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-foreground"
        >
          {visible ? (
            // eye-off
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
              />
            </svg>
          ) : (
            // eye
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>
      </div>
    </label>
  );
}
