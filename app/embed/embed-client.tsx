"use client";

import { ChatPanel, type ChatDict } from "@/components/chat/chat-panel";
import type { Locale } from "@/lib/i18n/config";

export function EmbedClient({ locale, dict }: { locale: Locale; dict: ChatDict }) {
  return (
    <div className="flex h-full flex-col">
      <ChatPanel locale={locale} dict={dict} compact />
    </div>
  );
}
