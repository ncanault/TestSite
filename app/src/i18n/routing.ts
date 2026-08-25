import { defineRouting } from "next-intl/routing";

// Minimum supported set: English, French, Chinese, Vietnamese, Japanese,
// Portuguese. English is the default (unprefixed URLs); the others are
// prefixed (/fr, /zh, /vi, /ja, /pt).
export const routing = defineRouting({
  locales: ["en", "fr", "zh", "vi", "ja", "pt"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // localeDetection defaults to true and stays that way on purpose: a
  // fresh visit picks whichever of the locales above best matches the
  // browser's Accept-Language header (French browser -> /fr, etc.), and
  // falls back to defaultLocale (English) only when none of them match —
  // e.g. a German or Korean browser, since neither is a supported locale.
});

export type AppLocale = (typeof routing.locales)[number];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  fr: "Français",
  zh: "中文",
  vi: "Tiếng Việt",
  ja: "日本語",
  pt: "Português",
};
