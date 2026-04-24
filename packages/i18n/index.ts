import en from "./locales/en.json";
import tr from "./locales/tr.json";

export type Locale = "en" | "tr";

export type TranslationKeys = typeof en;

export const translations: Record<Locale, TranslationKeys> = {
  en,
  tr,
};

export const defaultLocale: Locale = "en";

export const locales: Locale[] = ["en", "tr"];

export const localeNames: Record<Locale, string> = {
  en: "English",
  tr: "Türkçe",
};

/**
 * Retrieve a nested translation value using dot-notation keys.
 * Example: t("en", "nav.dashboard") → "Dashboard"
 */
export function t(locale: Locale, key: string): string {
  const keys = key.split(".");
  let value: unknown = translations[locale];

  for (const k of keys) {
    if (value && typeof value === "object" && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key; // fallback to key if path not found
    }
  }

  return typeof value === "string" ? value : key;
}

export { en, tr };
