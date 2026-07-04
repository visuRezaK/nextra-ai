import { NextRequest, NextResponse } from "next/server";
import { getStaffUser } from "@/lib/admin/auth";
import { logAudit } from "@/lib/admin/audit";
import { extractPdf, extractDocx, extractUrl, ingestUpload } from "@/lib/chatbot/upload";
import { isLocale, type Locale } from "@/lib/i18n/config";

// Multipart upload endpoint for KB documents (route handler instead of a
// server action to sidestep the 1MB action body limit).
export const maxDuration = 120;

const MAX_FILE_BYTES = 8 * 1024 * 1024; // Vercel request cap is ~4.5MB anyway

export async function POST(request: NextRequest) {
  const staff = await getStaffUser();
  if (!staff || !["admin", "editor"].includes(staff.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const form = await request.formData();
    const localeRaw = String(form.get("locale") ?? "fa");
    const locale: Locale = isLocale(localeRaw) ? localeRaw : "fa";
    const url = String(form.get("url") ?? "").trim();
    const file = form.get("file");

    let text: string;
    let sourceName: string;

    if (file instanceof File && file.size > 0) {
      if (file.size > MAX_FILE_BYTES) {
        return NextResponse.json(
          { ok: false, error: "حجم فایل بیش از حد مجاز است (حداکثر ~۴ مگابایت)." },
          { status: 400 },
        );
      }
      sourceName = file.name;
      const buffer = await file.arrayBuffer();
      const name = file.name.toLowerCase();

      if (name.endsWith(".pdf")) text = await extractPdf(buffer);
      else if (name.endsWith(".docx")) text = await extractDocx(buffer);
      else if (name.endsWith(".txt") || name.endsWith(".md"))
        text = new TextDecoder("utf-8").decode(buffer);
      else {
        return NextResponse.json(
          { ok: false, error: "فرمت پشتیبانی‌نشده — فقط PDF، DOCX، TXT و MD." },
          { status: 400 },
        );
      }
    } else if (url) {
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        return NextResponse.json({ ok: false, error: "آدرس نامعتبر است." }, { status: 400 });
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json({ ok: false, error: "فقط آدرس http/https." }, { status: 400 });
      }
      sourceName = parsed.hostname + parsed.pathname;
      text = await extractUrl(url);
    } else {
      return NextResponse.json(
        { ok: false, error: "فایل یا آدرس URL وارد کنید." },
        { status: 400 },
      );
    }

    const count = await ingestUpload({
      sourceName,
      text,
      locale,
      uploadedBy: staff.user.email ?? undefined,
    });

    await logAudit({
      actor: staff.user,
      action: "kb.upload",
      target: sourceName,
      meta: { locale, chunks: count },
    });

    return NextResponse.json({ ok: true, sourceName, count });
  } catch (err) {
    console.error("kb upload error:", err);
    const message =
      err instanceof Error && err.message === "no extractable text"
        ? "متنی از این سند قابل استخراج نبود."
        : "پردازش سند ناموفق بود.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
