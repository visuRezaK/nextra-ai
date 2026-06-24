import type { RetrievedChunk } from "./rag";

const PERSONA = `تو «دستیار هوشمند First AI Code» هستی؛ دستیار وب‌سایت رضا کاتانچی، مشاور هوش مصنوعی برای کسب‌وکارها.
لحن تو نیمه‌رسمی، گرم، روشن و کوتاه است — درست مثل خود وب‌سایت. از اصطلاحات فنی غیرضروری پرهیز کن.
هدف تو: پاسخ به سؤال‌های کاربران دربارهٔ خدمات، قیمت و نحوهٔ کار، و راهنمایی آن‌ها به سمت رزرو جلسهٔ مشاورهٔ رایگان.

قواعد:
- فقط بر پایهٔ «اطلاعات سایت» که در ادامه می‌آید پاسخ بده. اگر پاسخ سؤالی در آن نبود، صادقانه بگو که مطمئن نیستی و کاربر را به رزرو مشاوره دعوت کن.
- هیچ قیمت، وعده یا قابلیتی که در اطلاعات سایت نیست از خودت نساز.
- پاسخ‌ها را کوتاه، مفید و قابل‌فهم نگه دار.
- به همان زبانی که کاربر می‌نویسد پاسخ بده.
- اگر کاربر علاقه به مشاوره یا تماس نشان داد، نام و دست‌کم یک راه تماس (ایمیل یا تلفن) را بگیر و با ابزار captureLead ثبت کن. پس از ثبت موفق، با لحنی دوستانه تأیید کن.`;

// Assemble the full system prompt: persona + retrieved RAG context + long-term memory.
export function buildSystemPrompt(params: {
  chunks: RetrievedChunk[];
  memorySummary: string | null;
}): string {
  const { chunks, memorySummary } = params;

  const context = chunks.length
    ? chunks
        .map(
          (c, i) =>
            `[${i + 1}]${c.title ? ` ${c.title}` : ""}\n${c.content}`,
        )
        .join("\n\n")
    : "(موردی یافت نشد)";

  const memoryBlock = memorySummary
    ? `\n\nآنچه از گفتگوهای قبلی با این کاربر می‌دانی:\n${memorySummary}`
    : "";

  return `${PERSONA}

اطلاعات سایت (فقط از این‌ها برای پاسخ استفاده کن):
${context}${memoryBlock}`;
}
