import type { Locale } from "./config";

const dictionaries = {
  fa: () => import("./dictionaries/fa.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
} as const;

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export const getDictionary = async (locale: Locale): Promise<Dictionary> =>
  dictionaries[locale]();
