import Link from "next/link";
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ChatClient } from "./chat-client";

// The assistant page is interactive, not content to be indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ChatPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const isRtl = locale === "fa";

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-5 py-8">
      <Link
        href={`/${locale}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-accent"
      >
        <svg
          className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        {dict.chat.back}
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {dict.chat.title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {dict.chat.subtitle}
        </p>
      </header>

      <ChatClient locale={locale} dict={dict.chat} />
    </main>
  );
}
