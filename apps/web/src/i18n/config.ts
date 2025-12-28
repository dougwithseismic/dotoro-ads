/**
 * i18n Configuration
 *
 * Central configuration for internationalization.
 * All locale-related settings should be imported from here.
 */

/**
 * Supported locales for the application.
 * Currently English-only. Additional locales can be added here when needed.
 */
export const locales = ["en"] as const;

/**
 * Locale type derived from the locales array.
 * Use this for type-safe locale handling.
 */
export type Locale = (typeof locales)[number];

/**
 * Default locale for the application.
 * Used when no locale is detected or specified.
 */
export const defaultLocale: Locale = "en";

/**
 * Locale prefix strategy.
 * - 'always': All routes are prefixed with locale (e.g., /en/dashboard)
 * - 'as-needed': Default locale has no prefix, others do
 * - 'never': No locale prefix (uses cookies for state)
 *
 * Using 'as-needed' for cleaner URLs - default locale (en) has no prefix.
 * When additional locales are added, they will have prefixes.
 */
export const localePrefix = "as-needed" as const;

/**
 * Type-safe locale validation.
 * Checks if a given string is a valid locale.
 *
 * @param locale - The string to validate
 * @returns True if the string is a valid locale
 */
export function isValidLocale(locale: string): locale is Locale {
  if (!locale || typeof locale !== "string") {
    return false;
  }
  return (locales as readonly string[]).includes(locale);
}

/**
 * Locale display names for UI.
 * Used in locale switcher components.
 */
export const localeNames: Record<Locale, string> = {
  en: "English",
};

/**
 * Native locale names for UI.
 * Shows the language name in its own script.
 */
export const localeNativeNames: Record<Locale, string> = {
  en: "English",
};
