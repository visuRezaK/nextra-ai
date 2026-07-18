"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const fa = (n: number) => n.toLocaleString("fa-IR-u-nu-latn");

// Upload a PDF/DOCX/TXT/MD file or a URL into the knowledge base.
export function UploadForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/admin/knowledge/upload", { method: "POST", body: data });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        sourceName?: string;
        count?: number;
      };
      if (json.ok) {
        setResult({
          ok: true,
          text: `«${json.sourceName}» با ${fa(json.count ?? 0)} قطعه به پایگاه دانش اضافه شد.`,
        });
        form.reset();
        router.refresh();
      } else {
        setResult({ ok: false, text: json.error ?? "خطای ناشناخته." });
      }
    } catch {
      setResult({ ok: false, text: "ارسال ناموفق بود — دوباره امتحان کنید." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">فایل (PDF / DOCX / TXT / MD)</span>
          <input
            type="file"
            name="file"
            accept=".pdf,.docx,.txt,.md"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm file:me-3 file:rounded-md file:border-0 file:bg-accent/10 file:px-3 file:py-1 file:text-accent"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">یا آدرس صفحه وب (URL)</span>
          <input
            type="url"
            name="url"
            placeholder="https://example.com/article"
            dir="ltr"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span>زبان محتوا:</span>
          <select
            name="locale"
            defaultValue="fa"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="fa">فارسی</option>
            <option value="en">English</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-accent px-5 py-2 text-sm text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {busy ? "در حال پردازش و ساخت embedding…" : "افزودن به پایگاه دانش"}
        </button>
      </div>

      {result ? (
        <p className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-500"}`}>
          {result.text}
        </p>
      ) : null}
    </form>
  );
}
