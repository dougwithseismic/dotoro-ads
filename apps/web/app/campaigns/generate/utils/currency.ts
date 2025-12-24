/**
 * Currency utilities for budget and bidding components
 */

/** Currency symbol mapping with proper symbols */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  CAD: "CA$",
  AUD: "A$",
  JPY: "\u00A5",
};

/**
 * Get the currency symbol for a given currency code
 * @param currency - ISO 4217 currency code (e.g., "USD", "EUR")
 * @returns The currency symbol or the currency code if not found
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency;
}

/** Currency information for selectors */
export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

/** Supported currencies with full information */
export const CURRENCIES: readonly CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "\u20AC" },
  { code: "GBP", name: "British Pound", symbol: "\u00A3" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "JPY", name: "Japanese Yen", symbol: "\u00A5" },
] as const;
