"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { ConversationProvider, useConversation } from "@elevenlabs/react";
import type { Locale } from "@/lib/i18n/config";

export type VoiceDict = {
  open: string;
  close: string;
  connecting: string;
  listening: string;
  speaking: string;
  endCall: string;
  micDenied: string;
  error: string;
  poweredBy: string;
};

// Floating voice-call button shown on every site page (mounted in the locale
// layout, next to ChatWidget's bottom-left FAB — this one sits at left-24 so
// the two never overlap; Telegram/ScrollToTop own the right edge). Talks to a
// public ElevenLabs agent, so no API key is needed client-side. Renders
// nothing until NEXT_PUBLIC_ELEVENLABS_AGENT_ID is configured — note the env
// var is inlined into this module at BUILD time, so changing it on Vercel
// requires a rebuild of this file (a cached-build redeploy is not enough).
// `locale` is accepted for parity with ChatWidget (future per-locale agents).
export function VoiceWidget({
  dict,
}: {
  locale: Locale;
  dict: VoiceDict;
}) {
  const pathname = usePathname();
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID;

  // Same rule as ChatWidget: keep the full-page assistant uncluttered.
  if (!agentId || pathname?.replace(/\/$/, "").endsWith("/chat")) return null;

  return (
    <ConversationProvider>
      <VoiceWidgetInner agentId={agentId} dict={dict} />
    </ConversationProvider>
  );
}

function VoiceWidgetInner({
  agentId,
  dict,
}: {
  agentId: string;
  dict: VoiceDict;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversation = useConversation({
    onError: () => setError(dict.error),
  });

  const status = conversation.status;
  const active = status === "connected" || status === "connecting";

  async function start() {
    setError(null);
    setOpen(true);
    try {
      // Ask for the mic up front so a denial surfaces as micDenied instead of
      // a generic session error.
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError(dict.micDenied);
      return;
    }
    try {
      conversation.startSession({ agentId, connectionType: "webrtc" });
    } catch {
      setError(dict.error);
    }
  }

  function stop() {
    conversation.endSession();
    setOpen(false);
    setError(null);
  }

  const statusLabel = error
    ? error
    : status === "connected"
      ? conversation.isSpeaking
        ? dict.speaking
        : dict.listening
      : dict.connecting;

  return (
    <>
      {/* Call popover */}
      {open && (
        <div className="fixed bottom-24 left-4 z-40 w-64 rounded-2xl border border-border bg-background p-4 shadow-2xl sm:left-24">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              {!error && status === "connected" && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
              )}
              <span
                className={`relative inline-flex h-3 w-3 rounded-full ${
                  error ? "bg-red-500" : status === "connected" ? "bg-accent" : "bg-muted"
                }`}
              />
            </span>
            <span className="text-sm">{statusLabel}</span>
          </div>
          <button
            type="button"
            onClick={stop}
            className="mt-4 w-full rounded-lg bg-accent px-4 py-2 text-sm text-accent-foreground transition-colors hover:opacity-90"
          >
            {dict.endCall}
          </button>
          <p className="mt-3 text-center text-[10px] text-muted" dir="ltr">
            {dict.poweredBy}
          </p>
        </div>
      )}

      {/* Floating action button — beside the chat FAB */}
      <button
        type="button"
        onClick={() => (open ? stop() : start())}
        aria-label={open ? dict.close : dict.open}
        aria-expanded={open}
        title={open ? undefined : dict.open}
        className={`fixed bottom-6 left-24 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-background text-accent shadow-[0_10px_30px_-10px_rgba(14,165,233,0.7)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 ${
          active ? "animate-pulse" : ""
        }`}
      >
        {open ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
            />
          </svg>
        )}
      </button>
    </>
  );
}
