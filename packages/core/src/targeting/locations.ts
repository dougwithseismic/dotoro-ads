/**
 * Location Data for Targeting
 *
 * Provides country, state/province, and language data for ad targeting.
 * Includes search functionality for location autocomplete.
 */

import type { LocationOption, LocationTargetType } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Countries (ISO 3166-1 alpha-2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Common countries for targeting, sorted by advertising market size
 */
export const COUNTRIES: LocationOption[] = [
  // Major advertising markets (Tier 1)
  { code: "US", name: "United States", type: "country" },
  { code: "GB", name: "United Kingdom", type: "country" },
  { code: "CA", name: "Canada", type: "country" },
  { code: "AU", name: "Australia", type: "country" },
  { code: "DE", name: "Germany", type: "country" },
  { code: "FR", name: "France", type: "country" },
  { code: "JP", name: "Japan", type: "country" },
  { code: "KR", name: "South Korea", type: "country" },

  // Europe
  { code: "NL", name: "Netherlands", type: "country" },
  { code: "BE", name: "Belgium", type: "country" },
  { code: "CH", name: "Switzerland", type: "country" },
  { code: "AT", name: "Austria", type: "country" },
  { code: "IT", name: "Italy", type: "country" },
  { code: "ES", name: "Spain", type: "country" },
  { code: "PT", name: "Portugal", type: "country" },
  { code: "IE", name: "Ireland", type: "country" },
  { code: "SE", name: "Sweden", type: "country" },
  { code: "NO", name: "Norway", type: "country" },
  { code: "DK", name: "Denmark", type: "country" },
  { code: "FI", name: "Finland", type: "country" },
  { code: "PL", name: "Poland", type: "country" },
  { code: "CZ", name: "Czech Republic", type: "country" },
  { code: "GR", name: "Greece", type: "country" },
  { code: "HU", name: "Hungary", type: "country" },
  { code: "RO", name: "Romania", type: "country" },

  // Americas
  { code: "MX", name: "Mexico", type: "country" },
  { code: "BR", name: "Brazil", type: "country" },
  { code: "AR", name: "Argentina", type: "country" },
  { code: "CL", name: "Chile", type: "country" },
  { code: "CO", name: "Colombia", type: "country" },
  { code: "PE", name: "Peru", type: "country" },

  // Asia Pacific
  { code: "CN", name: "China", type: "country" },
  { code: "IN", name: "India", type: "country" },
  { code: "SG", name: "Singapore", type: "country" },
  { code: "HK", name: "Hong Kong", type: "country" },
  { code: "TW", name: "Taiwan", type: "country" },
  { code: "TH", name: "Thailand", type: "country" },
  { code: "MY", name: "Malaysia", type: "country" },
  { code: "ID", name: "Indonesia", type: "country" },
  { code: "PH", name: "Philippines", type: "country" },
  { code: "VN", name: "Vietnam", type: "country" },
  { code: "NZ", name: "New Zealand", type: "country" },

  // Middle East & Africa
  { code: "AE", name: "United Arab Emirates", type: "country" },
  { code: "SA", name: "Saudi Arabia", type: "country" },
  { code: "IL", name: "Israel", type: "country" },
  { code: "ZA", name: "South Africa", type: "country" },
  { code: "EG", name: "Egypt", type: "country" },
  { code: "NG", name: "Nigeria", type: "country" },
  { code: "KE", name: "Kenya", type: "country" },

  // Eastern Europe
  { code: "RU", name: "Russia", type: "country" },
  { code: "UA", name: "Ukraine", type: "country" },
  { code: "TR", name: "Turkey", type: "country" },
];

// ─────────────────────────────────────────────────────────────────────────────
// US States (ISO 3166-2:US)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * US States and DC
 */
export const US_STATES: LocationOption[] = [
  { code: "US-AL", name: "Alabama", parent: "US", type: "region" },
  { code: "US-AK", name: "Alaska", parent: "US", type: "region" },
  { code: "US-AZ", name: "Arizona", parent: "US", type: "region" },
  { code: "US-AR", name: "Arkansas", parent: "US", type: "region" },
  { code: "US-CA", name: "California", parent: "US", type: "region" },
  { code: "US-CO", name: "Colorado", parent: "US", type: "region" },
  { code: "US-CT", name: "Connecticut", parent: "US", type: "region" },
  { code: "US-DE", name: "Delaware", parent: "US", type: "region" },
  { code: "US-DC", name: "District of Columbia", parent: "US", type: "region" },
  { code: "US-FL", name: "Florida", parent: "US", type: "region" },
  { code: "US-GA", name: "Georgia", parent: "US", type: "region" },
  { code: "US-HI", name: "Hawaii", parent: "US", type: "region" },
  { code: "US-ID", name: "Idaho", parent: "US", type: "region" },
  { code: "US-IL", name: "Illinois", parent: "US", type: "region" },
  { code: "US-IN", name: "Indiana", parent: "US", type: "region" },
  { code: "US-IA", name: "Iowa", parent: "US", type: "region" },
  { code: "US-KS", name: "Kansas", parent: "US", type: "region" },
  { code: "US-KY", name: "Kentucky", parent: "US", type: "region" },
  { code: "US-LA", name: "Louisiana", parent: "US", type: "region" },
  { code: "US-ME", name: "Maine", parent: "US", type: "region" },
  { code: "US-MD", name: "Maryland", parent: "US", type: "region" },
  { code: "US-MA", name: "Massachusetts", parent: "US", type: "region" },
  { code: "US-MI", name: "Michigan", parent: "US", type: "region" },
  { code: "US-MN", name: "Minnesota", parent: "US", type: "region" },
  { code: "US-MS", name: "Mississippi", parent: "US", type: "region" },
  { code: "US-MO", name: "Missouri", parent: "US", type: "region" },
  { code: "US-MT", name: "Montana", parent: "US", type: "region" },
  { code: "US-NE", name: "Nebraska", parent: "US", type: "region" },
  { code: "US-NV", name: "Nevada", parent: "US", type: "region" },
  { code: "US-NH", name: "New Hampshire", parent: "US", type: "region" },
  { code: "US-NJ", name: "New Jersey", parent: "US", type: "region" },
  { code: "US-NM", name: "New Mexico", parent: "US", type: "region" },
  { code: "US-NY", name: "New York", parent: "US", type: "region" },
  { code: "US-NC", name: "North Carolina", parent: "US", type: "region" },
  { code: "US-ND", name: "North Dakota", parent: "US", type: "region" },
  { code: "US-OH", name: "Ohio", parent: "US", type: "region" },
  { code: "US-OK", name: "Oklahoma", parent: "US", type: "region" },
  { code: "US-OR", name: "Oregon", parent: "US", type: "region" },
  { code: "US-PA", name: "Pennsylvania", parent: "US", type: "region" },
  { code: "US-RI", name: "Rhode Island", parent: "US", type: "region" },
  { code: "US-SC", name: "South Carolina", parent: "US", type: "region" },
  { code: "US-SD", name: "South Dakota", parent: "US", type: "region" },
  { code: "US-TN", name: "Tennessee", parent: "US", type: "region" },
  { code: "US-TX", name: "Texas", parent: "US", type: "region" },
  { code: "US-UT", name: "Utah", parent: "US", type: "region" },
  { code: "US-VT", name: "Vermont", parent: "US", type: "region" },
  { code: "US-VA", name: "Virginia", parent: "US", type: "region" },
  { code: "US-WA", name: "Washington", parent: "US", type: "region" },
  { code: "US-WV", name: "West Virginia", parent: "US", type: "region" },
  { code: "US-WI", name: "Wisconsin", parent: "US", type: "region" },
  { code: "US-WY", name: "Wyoming", parent: "US", type: "region" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Canadian Provinces (ISO 3166-2:CA)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Canadian Provinces and Territories
 */
export const CA_PROVINCES: LocationOption[] = [
  { code: "CA-AB", name: "Alberta", parent: "CA", type: "region" },
  { code: "CA-BC", name: "British Columbia", parent: "CA", type: "region" },
  { code: "CA-MB", name: "Manitoba", parent: "CA", type: "region" },
  { code: "CA-NB", name: "New Brunswick", parent: "CA", type: "region" },
  {
    code: "CA-NL",
    name: "Newfoundland and Labrador",
    parent: "CA",
    type: "region",
  },
  { code: "CA-NS", name: "Nova Scotia", parent: "CA", type: "region" },
  {
    code: "CA-NT",
    name: "Northwest Territories",
    parent: "CA",
    type: "region",
  },
  { code: "CA-NU", name: "Nunavut", parent: "CA", type: "region" },
  { code: "CA-ON", name: "Ontario", parent: "CA", type: "region" },
  {
    code: "CA-PE",
    name: "Prince Edward Island",
    parent: "CA",
    type: "region",
  },
  { code: "CA-QC", name: "Quebec", parent: "CA", type: "region" },
  { code: "CA-SK", name: "Saskatchewan", parent: "CA", type: "region" },
  { code: "CA-YT", name: "Yukon", parent: "CA", type: "region" },
];

// ─────────────────────────────────────────────────────────────────────────────
// UK Regions (ISO 3166-2:GB)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UK Constituent Countries/Regions
 */
export const UK_REGIONS: LocationOption[] = [
  { code: "GB-ENG", name: "England", parent: "GB", type: "region" },
  { code: "GB-SCT", name: "Scotland", parent: "GB", type: "region" },
  { code: "GB-WLS", name: "Wales", parent: "GB", type: "region" },
  { code: "GB-NIR", name: "Northern Ireland", parent: "GB", type: "region" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Languages (ISO 639-1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Language option for targeting
 */
export interface LanguageOption {
  /** ISO 639-1 code */
  code: string;
  /** Language name */
  name: string;
}

/**
 * Common languages for targeting
 */
export const COMMON_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "pt", name: "Portuguese" },
  { code: "nl", name: "Dutch" },
  { code: "ru", name: "Russian" },
  { code: "pl", name: "Polish" },
  { code: "uk", name: "Ukrainian" },
  { code: "sv", name: "Swedish" },
  { code: "no", name: "Norwegian" },
  { code: "da", name: "Danish" },
  { code: "fi", name: "Finnish" },
  { code: "cs", name: "Czech" },
  { code: "el", name: "Greek" },
  { code: "hu", name: "Hungarian" },
  { code: "ro", name: "Romanian" },
  { code: "tr", name: "Turkish" },
  { code: "ar", name: "Arabic" },
  { code: "he", name: "Hebrew" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "th", name: "Thai" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
  { code: "ms", name: "Malay" },
  { code: "hi", name: "Hindi" },
  { code: "bn", name: "Bengali" },
  { code: "ta", name: "Tamil" },
];

// ─────────────────────────────────────────────────────────────────────────────
// All Locations Combined
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All searchable locations
 */
const ALL_LOCATIONS: LocationOption[] = [
  ...COUNTRIES,
  ...US_STATES,
  ...CA_PROVINCES,
  ...UK_REGIONS,
];

// ─────────────────────────────────────────────────────────────────────────────
// Search Functions
// ─────────────────────────────────────────────────────────────────────────────

const MAX_SEARCH_RESULTS = 50;

/**
 * Search locations by query string
 *
 * @param query - Search query (name or code)
 * @param type - Optional filter by location type
 * @returns Matching locations, limited to MAX_SEARCH_RESULTS
 */
export function searchLocations(
  query: string,
  type?: LocationTargetType
): LocationOption[] {
  if (!query || query.trim() === "") {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();

  let results = ALL_LOCATIONS.filter((location) => {
    // Filter by type if specified
    if (type && location.type !== type) {
      return false;
    }

    // Match against name or code
    const matchesName = location.name.toLowerCase().includes(normalizedQuery);
    const matchesCode = location.code.toLowerCase().includes(normalizedQuery);

    return matchesName || matchesCode;
  });

  // Sort: exact matches first, then by name
  results.sort((a, b) => {
    const aExactName = a.name.toLowerCase() === normalizedQuery;
    const bExactName = b.name.toLowerCase() === normalizedQuery;
    const aExactCode = a.code.toLowerCase() === normalizedQuery;
    const bExactCode = b.code.toLowerCase() === normalizedQuery;

    if ((aExactName || aExactCode) && !(bExactName || bExactCode)) return -1;
    if (!(aExactName || aExactCode) && (bExactName || bExactCode)) return 1;

    return a.name.localeCompare(b.name);
  });

  return results.slice(0, MAX_SEARCH_RESULTS);
}

/**
 * Get a country by its ISO 3166-1 alpha-2 code
 */
export function getCountryByCode(code: string): LocationOption | undefined {
  if (!code) return undefined;
  const normalizedCode = code.toUpperCase().trim();
  return COUNTRIES.find((c) => c.code === normalizedCode);
}

/**
 * Get states/provinces/regions for a country
 *
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Array of regions for the country
 */
export function getStatesByCountry(countryCode: string): LocationOption[] {
  if (!countryCode) return [];
  const normalizedCode = countryCode.toUpperCase().trim();

  switch (normalizedCode) {
    case "US":
      return US_STATES;
    case "CA":
      return CA_PROVINCES;
    case "GB":
      return UK_REGIONS;
    default:
      return [];
  }
}

/**
 * Get a language by its ISO 639-1 code
 */
export function getLanguageByCode(code: string): LanguageOption | undefined {
  if (!code) return undefined;
  const normalizedCode = code.toLowerCase().trim();
  return COMMON_LANGUAGES.find((l) => l.code === normalizedCode);
}

/**
 * Check if a country code is valid
 */
export function isValidCountryCode(code: string): boolean {
  if (!code || code.length !== 2) return false;
  return COUNTRIES.some((c) => c.code.toUpperCase() === code.toUpperCase());
}

/**
 * Check if a language code is valid
 */
export function isValidLanguageCode(code: string): boolean {
  if (!code || code.length !== 2) return false;
  return COMMON_LANGUAGES.some(
    (l) => l.code.toLowerCase() === code.toLowerCase()
  );
}
