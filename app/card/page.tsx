import Image from "next/image";
import QRCode from "qrcode";
import { Logo } from "@/components/icons";
import { CONTACT, CARD_URL, WHATSAPP_URL, INSTAGRAM_URL } from "./contact";

function IconPhone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function IconWhatsApp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.074-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function IconMail({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function IconInstagram({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function IconContactSave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const actions = [
  { href: `tel:${CONTACT.phone}`, label: "تماس", sub: CONTACT.phoneDisplay, Icon: IconPhone },
  { href: WHATSAPP_URL, label: "واتساپ", sub: "پیام مستقیم", Icon: IconWhatsApp },
  { href: `mailto:${CONTACT.email}`, label: "ایمیل", sub: CONTACT.email, Icon: IconMail },
  { href: INSTAGRAM_URL, label: "اینستاگرام", sub: `@${CONTACT.instagram}`, Icon: IconInstagram },
  { href: `${CONTACT.site}/fa`, label: "وب‌سایت", sub: "nextra-ai-consulting.vercel.app", Icon: IconGlobe },
];

export default async function CardPage() {
  const qrSvg = await QRCode.toString(CARD_URL, {
    type: "svg",
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <main className="bg-grid flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="card-surface glow-accent overflow-hidden">
          {/* Header band */}
          <div className="surface-ink relative px-6 py-5 text-center">
            <div className="mx-auto flex items-center justify-center gap-2" dir="ltr">
              <Logo className="h-7 w-7" />
              <span className="text-sm font-bold tracking-wide text-white">Nextra AI</span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-300">
                Consulting
              </span>
            </div>
          </div>

          {/* Photo below the band, on the light surface */}
          <div className="mt-6 flex justify-center">
            <Image
              src="/images/profile-reza.jpeg"
              alt={CONTACT.nameFa}
              width={112}
              height={112}
              priority
              className="h-28 w-28 rounded-full border-4 border-background object-cover object-top shadow-lg"
            />
          </div>

          <div className="px-6 pb-6 pt-3 text-center">
            <h1 className="text-2xl font-black tracking-tight">{CONTACT.nameFa}</h1>
            <p className="mt-0.5 text-sm font-medium text-muted" dir="ltr">
              {CONTACT.nameEn}
            </p>
            <p className="mt-2 inline-block rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">
              {CONTACT.titleFa}
            </p>

            {/* Save to contacts */}
            <a
              href="/card/vcf"
              download
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#38BDF8] text-base font-semibold text-white shadow-[0_10px_30px_-10px_rgba(56,189,248,0.6)] transition-colors hover:bg-[#0EA5E9]"
            >
              <IconContactSave className="h-5 w-5" />
              ذخیره در مخاطبین
            </a>

            {/* Contact actions */}
            <div className="mt-4 space-y-2 text-start">
              {actions.map(({ href, label, sub, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:border-accent/50 hover:bg-surface-2"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{label}</span>
                    <span className="block truncate text-xs text-muted" dir="ltr">
                      {sub}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* QR code */}
        <div className="card-surface mt-4 flex items-center gap-4 p-4">
          <div
            className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-white p-1.5 [&_svg]:h-full [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="text-sm leading-relaxed text-muted">
            این کد را اسکن کنید تا کارت ویزیت باز شود و شماره در گوشی ذخیره شود.
          </p>
        </div>
      </div>
    </main>
  );
}
