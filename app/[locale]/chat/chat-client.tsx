"use client";

import { ChatPanel, type ChatDict } from "@/components/chat/chat-panel";
import type { Locale } from "@/lib/i18n/config";

// Full-page assistant. Thin wrapper over the shared ChatPanel so the page and the
// floating widget (components/chat/chat-widget) stay in sync.
export function ChatClient({
  locale,
  dict,
}: {
  locale: Locale;
  dict: ChatDict;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <ChatPanel locale={locale} dict={dict} />
    </div>
  );
}
