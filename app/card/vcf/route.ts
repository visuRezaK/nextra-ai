import { CONTACT, CARD_URL, INSTAGRAM_URL } from "../contact";
import { VCARD_PHOTO_B64 } from "../photo";

// vCard 3.0 requires long lines to be folded at 75 octets with a
// leading space on continuation lines (RFC 2425 §5.8.1).
function fold(line: string): string {
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += 74) {
    chunks.push((i === 0 ? "" : " ") + line.slice(i, i + 74));
  }
  return chunks.join("\r\n");
}

export function GET() {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${CONTACT.lastNameFa};${CONTACT.firstNameFa};;;`,
    `FN:${CONTACT.nameFa}`,
    // Phonetic fields give iOS/Android the Latin spelling for search & sort.
    `X-PHONETIC-FIRST-NAME:${CONTACT.firstNameEn}`,
    `X-PHONETIC-LAST-NAME:${CONTACT.lastNameEn}`,
    `NICKNAME:${CONTACT.nameEn}`,
    `ORG:${CONTACT.org}`,
    `TITLE:${CONTACT.titleFa}`,
    `TEL;TYPE=CELL,VOICE:${CONTACT.phone}`,
    `EMAIL;TYPE=INTERNET,WORK:${CONTACT.email}`,
    `URL:${CONTACT.site}`,
    "item1.URL:" + INSTAGRAM_URL,
    "item1.X-ABLabel:Instagram",
    `X-SOCIALPROFILE;TYPE=instagram:${INSTAGRAM_URL}`,
    fold(`PHOTO;ENCODING=b;TYPE=JPEG:${VCARD_PHOTO_B64}`),
    `NOTE:${CONTACT.titleEn} — ${CARD_URL}`,
    "REV:" + new Date().toISOString(),
    "END:VCARD",
  ];

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="reza-katanchi.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
