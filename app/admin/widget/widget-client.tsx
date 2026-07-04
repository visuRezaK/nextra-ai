"use client";

import { useMemo, useState } from "react";

const SITE = "https://nextra-ai-consulting.vercel.app";

export function EmbedCodeGenerator() {
  const [locale, setLocale] = useState<"fa" | "en">("fa");
  const [position, setPosition] = useState<"left" | "right">("left");
  const [copied, setCopied] = useState(false);

  const snippet = useMemo(() => {
    const needsConfig = locale !== "fa" || position !== "left";
    const config = needsConfig
      ? `<script>\n  window.NextraWidgetConfig = { locale: "${locale}", position: "${position}" };\n</script>\n`
      : "";
    return `${config}<script src="${SITE}/nextra-widget.js" defer></script>`;
  }, [locale, position]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the user can still select the text manually.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">زبان ویجت</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as "fa" | "en")}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          >
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">موقعیت دکمه</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as "left" | "right")}
            className="rounded-lg border border-border bg-background px-3 py-2 outline-none focus:border-accent"
          >
            <option value="left">چپ (پیش‌فرض — مناسب سایت فارسی)</option>
            <option value="right">راست</option>
          </select>
        </label>
      </div>

      <pre
        dir="ltr"
        className="overflow-x-auto rounded-lg border border-border bg-surface-2/60 p-4 text-xs leading-6"
      >
        {snippet}
      </pre>

      <button
        type="button"
        onClick={copy}
        className="self-start rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover"
      >
        {copied ? "✓ کپی شد" : "کپی کد"}
      </button>
    </div>
  );
}
