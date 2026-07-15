import QRCode from "qrcode";
import { Logo } from "@/components/icons";
import { CONTACT, CARD_URL } from "../contact";

// Print-ready physical business card (front + back).
// Trim size 90x54mm + 3mm bleed on every edge => 96x60mm per face.
// Each face prints on its own sheet; open and "Save as PDF" (or use the
// generated public/nextra-card-print.pdf) and hand it to a print shop.

function IconPhone() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

export default async function CardPrintPage() {
  const qrSvg = await QRCode.toString(CARD_URL, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#071020", light: "#ffffff" },
  });

  return (
    <div className="print-root">
      <style>{`
        .print-root { background: #e5e9f0; padding: 8mm; display: flex; flex-direction: column; align-items: center; gap: 8mm; }
        .print-hint { font-family: var(--font-vazir); direction: rtl; max-width: 96mm; text-align: center; font-size: 13px; line-height: 1.9; color: #334155; }
        .print-hint b { color: #0f172a; }

        .face {
          position: relative;
          width: 96mm; height: 60mm;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(15,23,42,0.18);
        }
        /* safe content area = 3mm bleed + ~3mm quiet margin */
        .safe { position: absolute; inset: 6mm; }

        /* ---------- FRONT ---------- */
        .face--front { background: linear-gradient(155deg, #1e293b 0%, #071020 100%); color: #f8fafc; }
        .face--front .safe { display: flex; flex-direction: column; justify-content: space-between; }
        .brandline { display: flex; align-items: center; gap: 2mm; direction: ltr; }
        .brandline .mark { width: 9mm; height: 9mm; }
        .brandline .name { font-family: var(--font-inter); font-weight: 800; font-size: 16pt; letter-spacing: -0.01em; color: #fff; }
        .brandline .eyebrow { font-family: var(--font-inter); font-weight: 700; font-size: 6pt; letter-spacing: 0.32em; color: #38bdf8; margin-inline-start: 1mm; }
        .person { }
        .person .fa { font-family: var(--font-vazir); font-weight: 800; font-size: 20pt; line-height: 1.1; color: #fff; }
        .person .en { font-family: var(--font-inter); direction: ltr; font-weight: 600; font-size: 9pt; color: #7dd3fc; margin-top: 1mm; }
        .person .title { font-family: var(--font-vazir); font-size: 9.5pt; color: #cbd5e1; margin-top: 2mm; }
        .accent-bar { position: absolute; bottom: 0; inset-inline: 0; height: 3mm; background: linear-gradient(90deg, #0ea5e9, #38bdf8); }

        /* ---------- BACK ---------- */
        .face--back { background: #ffffff; color: #0f172a; }
        .face--back .safe { display: flex; align-items: center; gap: 5mm; }
        .qr-box { flex: 0 0 auto; width: 30mm; height: 30mm; padding: 1.5mm; border: 0.4mm solid #e2e8f0; border-radius: 2mm; background: #fff; }
        .qr-box svg { width: 100%; height: 100%; display: block; }
        .qr-cap { font-family: var(--font-vazir); direction: rtl; text-align: center; font-size: 6.5pt; color: #64748b; margin-top: 1.5mm; }
        .details { flex: 1 1 auto; min-width: 0; }
        .details .title { font-family: var(--font-vazir); font-weight: 800; font-size: 11pt; color: #0f172a; }
        .details .subtitle { font-family: var(--font-vazir); font-size: 7.5pt; color: #0ea5e9; margin-top: 0.5mm; margin-bottom: 3mm; }
        .row { display: flex; align-items: center; gap: 2.5mm; margin-top: 2.2mm; }
        .row .ic { flex: 0 0 auto; width: 5mm; height: 5mm; display: flex; align-items: center; justify-content: center; border-radius: 1.5mm; background: rgba(14,165,233,0.1); color: #0ea5e9; }
        .row .ic svg { width: 3.3mm; height: 3.3mm; }
        .row .tx { font-family: var(--font-inter); direction: ltr; font-size: 8pt; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        @media print {
          @page { size: 96mm 60mm; margin: 0; }
          html, body { margin: 0; background: #fff; }
          .print-root { background: #fff; padding: 0; gap: 0; }
          .print-hint { display: none; }
          .face { box-shadow: none; page-break-after: always; break-after: page; }
          .face:last-of-type { page-break-after: auto; break-after: auto; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <p className="print-hint">
        نسخه چاپی کارت ویزیت — دو صفحه (رو و پشت). برای گرفتن فایل، کلید <b>Ctrl+P</b> را بزنید و
        «Save as PDF» را انتخاب کنید؛ اندازه‌ی هر رو ۹۶×۶۰ میلی‌متر (کارت ۹۰×۵۴ + ۳ میلی‌متر نشتی) است.
      </p>

      {/* FRONT */}
      <div className="face face--front">
        <div className="safe">
          <div className="brandline">
            <Logo className="mark" />
            <span className="name">Nextra AI</span>
            <span className="eyebrow">CONSULTING</span>
          </div>
          <div className="person">
            <div className="fa">{CONTACT.nameFa}</div>
            <div className="en">{CONTACT.nameEn}</div>
            <div className="title">{CONTACT.titleFa}</div>
          </div>
        </div>
        <div className="accent-bar" />
      </div>

      {/* BACK */}
      <div className="face face--back">
        <div className="safe">
          <div>
            <div className="qr-box" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div className="qr-cap">اسکن کنید</div>
          </div>
          <div className="details">
            <div className="title">{CONTACT.nameFa}</div>
            <div className="subtitle">{CONTACT.titleFa}</div>
            <div className="row">
              <span className="ic"><IconPhone /></span>
              <span className="tx">{CONTACT.phoneDisplay}</span>
            </div>
            <div className="row">
              <span className="ic"><IconMail /></span>
              <span className="tx">{CONTACT.email}</span>
            </div>
            <div className="row">
              <span className="ic"><IconInstagram /></span>
              <span className="tx">@{CONTACT.instagram}</span>
            </div>
            <div className="row">
              <span className="ic"><IconGlobe /></span>
              <span className="tx">nextra-ai-consulting.vercel.app</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
