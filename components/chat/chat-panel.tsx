"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, isToolUIPart } from "ai";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";

export type ChatDict = {
  placeholder: string;
  send: string;
  greeting: string;
  suggestions: string[];
  leadSaved: string;
  thinking: string;
  error: string;
};

// Shared conversation UI for the chatbot. Used both by the full-page assistant
// (app/[locale]/chat) and the floating widget (components/chat/chat-widget).
// `compact` tightens spacing/heights for the smaller widget popover.
export function ChatPanel({
  locale,
  dict,
  compact = false,
}: {
  locale: Locale;
  dict: ChatDict;
  compact?: boolean;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat", body: { locale } }),
  });

  const busy = status === "submitted" || status === "streaming";
  const empty = messages.length === 0;

  // Autoscroll to the latest message as it streams.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  function submit(text: string) {
    const value = text.trim();
    if (!value || busy) return;
    sendMessage({ text: value });
    setInput("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div
        ref={scrollRef}
        className={`card-surface flex-1 space-y-4 overflow-y-auto p-4 ${compact ? "" : "p-5"}`}
        style={compact ? undefined : { minHeight: "50vh", maxHeight: "62vh" }}
      >
        {/* Greeting + suggestions when the conversation is empty */}
        {empty && (
          <div className="space-y-4">
            <Bubble role="assistant">{dict.greeting}</Bubble>
            <div className="flex flex-wrap gap-2">
              {dict.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => submit(s)}
                  className="rounded-full border border-border bg-surface-2/60 px-3.5 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-accent/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, mi) => (
          <div key={message.id} className="space-y-2">
            {message.parts.map((part, i) => {
              if (part.type === "text") {
                const isLastAssistantText =
                  message.role === "assistant" &&
                  i === message.parts.length - 1 &&
                  part.text.trim().length > 0;
                return (
                  <div key={`${message.id}-${i}`}>
                    <Bubble role={message.role}>{part.text}</Bubble>
                    {/* 👍/👎 under the finished assistant answer */}
                    {isLastAssistantText && !(busy && mi === messages.length - 1) && (
                      <FeedbackRow
                        messageId={message.id}
                        answer={part.text}
                        question={lastUserTextBefore(messages, mi)}
                        locale={locale}
                      />
                    )}
                  </div>
                );
              }
              // Lead-capture tool result -> small confirmation badge.
              if (
                isToolUIPart(part) &&
                part.type === "tool-captureLead" &&
                part.state === "output-available"
              ) {
                const out = part.output as { ok?: boolean; message?: string };
                if (out?.ok) {
                  return (
                    <div
                      key={`${message.id}-${i}`}
                      className="self-start rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs font-medium text-accent"
                    >
                      {dict.leadSaved}
                    </div>
                  );
                }
              }
              return null;
            })}
          </div>
        ))}

        {/* Typing indicator while the model works on the first token */}
        {busy && messages[messages.length - 1]?.role === "user" && (
          <Bubble role="assistant">
            <span className="inline-flex gap-1">
              <Dot /> <Dot /> <Dot />
            </span>
          </Bubble>
        )}

        {error && (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {dict.error}
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit(input);
            }
          }}
          rows={1}
          placeholder={dict.placeholder}
          className="max-h-32 min-h-[3rem] flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-4 py-3 text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <Button
          type="submit"
          size={compact ? "md" : "lg"}
          disabled={busy || !input.trim()}
          className="shrink-0"
        >
          {dict.send}
        </Button>
      </form>
    </div>
  );
}

type PanelMessage = { role: string; parts: { type: string; text?: string }[] };

// The user question that preceded the assistant message at `index`.
function lastUserTextBefore(messages: PanelMessage[], index: number): string {
  for (let i = index - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join(" ")
      .trim();
  }
  return "";
}

// Thumbs up/down for an assistant answer. Fire-and-forget POST; the vote is
// locked in locally so a flaky network never blocks the conversation.
function FeedbackRow({
  messageId,
  question,
  answer,
  locale,
}: {
  messageId: string;
  question: string;
  answer: string;
  locale: Locale;
}) {
  const [vote, setVote] = useState<1 | -1 | null>(null);

  function send(rating: 1 | -1) {
    if (vote) return;
    setVote(rating);
    fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, question, answer, locale }),
    }).catch(() => {});
  }

  return (
    <div key={messageId} className="mt-1 flex gap-1">
      {([1, -1] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => send(r)}
          disabled={vote !== null}
          aria-label={r === 1 ? "پاسخ مفید بود" : "پاسخ مفید نبود"}
          className={`rounded-full px-2 py-1 text-xs transition-colors ${
            vote === r
              ? "bg-accent/15 text-accent"
              : vote
                ? "text-muted/40"
                : "text-muted hover:bg-foreground/5 hover:text-foreground"
          }`}
        >
          {r === 1 ? "👍" : "👎"}
        </button>
      ))}
    </div>
  );
}

function Bubble({
  role,
  children,
}: {
  role: string;
  children: React.ReactNode;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-accent text-accent-foreground"
            : "border border-border bg-surface-2/70 text-foreground"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Dot() {
  return (
    <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms] [&:nth-child(2)]:[animation-delay:150ms] [&:nth-child(3)]:[animation-delay:300ms]" />
  );
}
