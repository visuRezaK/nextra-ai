// Single source of truth for the digital business card (/card).
// The page UI and the downloadable vCard both read from here.
export const CONTACT = {
  nameFa: "رضا کتانچی",
  firstNameFa: "رضا",
  lastNameFa: "کتانچی",
  nameEn: "Reza Katanchi",
  firstNameEn: "Reza",
  lastNameEn: "Katanchi",
  titleFa: "مشاور هوش مصنوعی کسب‌وکار",
  titleEn: "Business AI Consultant",
  org: "Nextra AI Consulting",
  phone: "+14373337216",
  phoneDisplay: "+1 (437) 333-7216",
  email: "rezakatanchi7@gmail.com",
  instagram: "reza.katanchi",
  site: "https://nextra-ai-consulting.vercel.app",
} as const;

export const CARD_URL = `${CONTACT.site}/card`;
export const WHATSAPP_URL = `https://wa.me/${CONTACT.phone.replace("+", "")}`;
export const INSTAGRAM_URL = `https://instagram.com/${CONTACT.instagram}`;
