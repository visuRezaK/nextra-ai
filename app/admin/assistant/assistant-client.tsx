"use client";

import { useState } from "react";
import { askAssistant, type AssistantMessage } from "./actions";

const SUGGESTIONS = [
  "آمار کلی CRM را بده",
  "کدام معاملات باز است؟",
  "وظایف معوق را نشان بده",
  "چند لید تبدیل‌شده داریم؟",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setError("");
    setInput("");
    const next: AssistantMessage[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setPending(true);
    const res = await askAssistant(next);
    setPending(false);
    if (res.ok) setMessages([...next, { role: "assistant", content: res.answer }]);
    else {
      setError(res.error);
      setMessages(next);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card-surface flex min-h-[50vh] flex-col gap-3 p-5">
        {messages.length === 0 ? (
          <div className="m-auto flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-muted">دربارهٔ لیدها، معاملات، وظایف و آمار CRM بپرسید.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:border-accent/60"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${
                m.role === "user"
                  ? "self-end border border-accent/20 bg-accent/10"
                  : "self-start bg-surface-2"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))
        )}
        {pending ? (
          <div className="self-start rounded-2xl bg-surface-2 px-4 py-3 text-sm text-muted">
            در حال بررسی داده‌ها…
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="سؤالتان را بنویسید…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          ارسال
        </button>
      </form>
    </div>
  );
}
