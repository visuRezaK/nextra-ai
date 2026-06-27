"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ChatPanel, type ChatDict } from "./chat-panel";
import { BotMark } from "@/components/icons";
import type { Locale } from "@/lib/i18n/config";

type WidgetDict = ChatDict & {
  title: string;
  widgetOpen: string;
  widgetClose: string;
};

// Floating chat bubble shown on every site page (mounted in the locale layout).
// Sits bottom-left so it never collides with ScrollToTop (bottom-right), which
// also reads naturally on the RTL (fa) site. Hidden on the dedicated /chat page.
export function ChatWidget({
  locale,
  dict,
}: {
  locale: Locale;
  dict: WidgetDict;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Don't double up with the full-page assistant.
  if (pathname?.replace(/\/$/, "").endsWith("/chat")) return null;

  return (
    <>
      {/* Popover panel */}
      {open && (
        <div className="fixed bottom-24 left-4 z-50 flex h-[min(70vh,32rem)] w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-background shadow-2xl sm:left-6 sm:w-96">
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <span className="flex items-center gap-2">
              <BotMark className="h-7 w-7 rounded-full" />
              <span className="text-sm font-bold">{dict.title}</span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={dict.widgetClose}
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col p-3">
            <ChatPanel locale={locale} dict={dict} compact />
          </div>
        </div>
      )}

      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? dict.widgetClose : dict.widgetOpen}
        aria-expanded={open}
        className="fixed bottom-6 left-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_30px_-10px_rgba(14,165,233,0.7)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {open ? (
          <span className="flex h-full w-full items-center justify-center rounded-full bg-accent text-accent-foreground">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        ) : (
          <>
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full">
              <BotMark className="h-full w-full" />
            </span>
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-accent text-accent-foreground">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </span>
          </>
        )}
      </button>
    </>
  );
}
