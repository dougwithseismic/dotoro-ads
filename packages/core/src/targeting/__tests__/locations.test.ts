import { describe, it, expect } from "vitest";
import {
  COUNTRIES,
  US_STATES,
  CA_PROVINCES,
  UK_REGIONS,
  COMMON_LANGUAGES,
  searchLocations,
  getCountryByCode,
  getStatesByCountry,
  getLanguageByCode,
  isValidCountryCode,
  isValidLanguageCode,
} from "../locations.js";

describe("COUNTRIES", () => {
  it("includes major countries", () => {
    const countryCodes = COUNTRIES.map((c) => c.code);
    expect(countryCodes).toContain("US");
    expect(countryCodes).toContain("GB");
    expect(countryCodes).toContain("CA");
    expect(countryCodes).toContain("AU");
    expect(countryCodes).toContain("DE");
    expect(countryCodes).toContain("FR");
    expect(countryCodes).toContain("JP");
  });

  it("has valid structure", () => {
    for (const country of COUNTRIES) {
      expect(country.code).toBeDefined();
      expect(country.code.length).toBe(2);
      expect(country.name).toBeDefined();
      expect(country.name.length).toBeGreaterThan(0);
      expect(country.type).toBe("country");
    }
  });
});

describe("US_STATES", () => {
  it("includes all 50 states plus DC", () => {
    expect(US_STATES.length).toBe(51);
  });

  it("has valid structure", () => {
    for (const state of US_STATES) {
      expect(state.code).toBeDefined();
      expect(state.code).toMatch(/^US-[A-Z]{2}$/);
      expect(state.name).toBeDefined();
      expect(state.parent).toBe("US");
      expect(state.type).toBe("region");
    }
  });

  it("includes California", () => {
    const california = US_STATES.find((s) => s.code === "US-CA");
    expect(california).toBeDefined();
    expect(california?.name).toBe("California");
  });
});

describe("CA_PROVINCES", () => {
  it("includes all 13 provinces and territories", () => {
    expect(CA_PROVINCES.length).toBe(13);
  });

  it("has valid structure", () => {
    for (const province of CA_PROVINCES) {
      expect(province.code).toBeDefined();
      expect(province.code).toMatch(/^CA-[A-Z]{2}$/);
      expect(province.name).toBeDefined();
      expect(province.parent).toBe("CA");
      expect(province.type).toBe("region");
    }
  });

  it("includes Ontario", () => {
    const ontario = CA_PROVINCES.find((p) => p.code === "CA-ON");
    expect(ontario).toBeDefined();
    expect(ontario?.name).toBe("Ontario");
  });
});

describe("UK_REGIONS", () => {
  it("includes major UK regions", () => {
    expect(UK_REGIONS.length).toBeGreaterThanOrEqual(4);
  });

  it("has valid structure", () => {
    for (const region of UK_REGIONS) {
      expect(region.code).toBeDefined();
      expect(region.code).toMatch(/^GB-[A-Z]{3}$/);
      expect(region.name).toBeDefined();
      expect(region.parent).toBe("GB");
      expect(region.type).toBe("region");
    }
  });
});

describe("COMMON_LANGUAGES", () => {
  it("includes major languages", () => {
    const langCodes = COMMON_LANGUAGES.map((l) => l.code);
    expect(langCodes).toContain("en");
    expect(langCodes).toContain("es");
    expect(langCodes).toContain("fr");
    expect(langCodes).toContain("de");
    expect(langCodes).toContain("zh");
    expect(langCodes).toContain("ja");
  });

  it("has valid structure", () => {
    for (const lang of COMMON_LANGUAGES) {
      expect(lang.code).toBeDefined();
      expect(lang.code.length).toBe(2);
      expect(lang.name).toBeDefined();
    }
  });
});

describe("searchLocations", () => {
  it("searches countries by name", () => {
    const results = searchLocations("united");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.name === "United States")).toBe(true);
    expect(results.some((r) => r.name === "United Kingdom")).toBe(true);
  });

  it("searches countries by code", () => {
    const results = searchLocations("US");
    expect(results.some((r) => r.code === "US")).toBe(true);
  });

  it("searches case-insensitively", () => {
    const resultsLower = searchLocations("germany");
    const resultsUpper = searchLocations("GERMANY");
    expect(resultsLower.length).toBeGreaterThan(0);
    expect(resultsLower).toEqual(resultsUpper);
  });

  it("searches states by name", () => {
    const results = searchLocations("california");
    expect(results.some((r) => r.name === "California")).toBe(true);
  });

  it("filters by type when specified", () => {
    const countryResults = searchLocations("united", "country");
    const regionResults = searchLocations("california", "region");

    expect(countryResults.every((r) => r.type === "country")).toBe(true);
    expect(regionResults.every((r) => r.type === "region")).toBe(true);
  });

  it("returns empty array for no matches", () => {
    const results = searchLocations("xyznonexistent");
    expect(results).toEqual([]);
  });

  it("limits results to prevent overload", () => {
    const results = searchLocations("a"); // Very broad search
    expect(results.length).toBeLessThanOrEqual(50);
  });

  it("searches provinces", () => {
    const results = searchLocations("ontario");
    expect(results.some((r) => r.name === "Ontario")).toBe(true);
  });
});

describe("getCountryByCode", () => {
  it("returns country for valid code", () => {
    const us = getCountryByCode("US");
    expect(us).toBeDefined();
    expect(us?.name).toBe("United States");
  });

  it("returns undefined for invalid code", () => {
    const result = getCountryByCode("XX");
    expect(result).toBeUndefined();
  });

  it("is case-insensitive", () => {
    const usLower = getCountryByCode("us");
    const usUpper = getCountryByCode("US");
    expect(usLower).toEqual(usUpper);
  });
});

describe("getStatesByCountry", () => {
  it("returns US states for US", () => {
    const states = getStatesByCountry("US");
    expect(states.length).toBe(51);
    expect(states.every((s) => s.parent === "US")).toBe(true);
  });

  it("returns Canadian provinces for CA", () => {
    const provinces = getStatesByCountry("CA");
    expect(provinces.length).toBe(13);
    expect(provinces.every((p) => p.parent === "CA")).toBe(true);
  });

  it("returns UK regions for GB", () => {
    const regions = getStatesByCountry("GB");
    expect(regions.length).toBeGreaterThan(0);
    expect(regions.every((r) => r.parent === "GB")).toBe(true);
  });

  it("returns empty array for country without regions", () => {
    const result = getStatesByCountry("XX");
    expect(result).toEqual([]);
  });
});

describe("getLanguageByCode", () => {
  it("returns language for valid code", () => {
    const english = getLanguageByCode("en");
    expect(english).toBeDefined();
    expect(english?.name).toBe("English");
  });

  it("returns undefined for invalid code", () => {
    const result = getLanguageByCode("xx");
    expect(result).toBeUndefined();
  });
});

describe("isValidCountryCode", () => {
  it("returns true for valid country codes", () => {
    expect(isValidCountryCode("US")).toBe(true);
    expect(isValidCountryCode("GB")).toBe(true);
    expect(isValidCountryCode("JP")).toBe(true);
  });

  it("returns false for invalid country codes", () => {
    expect(isValidCountryCode("XX")).toBe(false);
    expect(isValidCountryCode("")).toBe(false);
    expect(isValidCountryCode("USA")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isValidCountryCode("us")).toBe(true);
    expect(isValidCountryCode("Us")).toBe(true);
  });
});

describe("isValidLanguageCode", () => {
  it("returns true for valid language codes", () => {
    expect(isValidLanguageCode("en")).toBe(true);
    expect(isValidLanguageCode("es")).toBe(true);
    expect(isValidLanguageCode("fr")).toBe(true);
  });

  it("returns false for invalid language codes", () => {
    expect(isValidLanguageCode("xx")).toBe(false);
    expect(isValidLanguageCode("")).toBe(false);
    expect(isValidLanguageCode("eng")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isValidLanguageCode("EN")).toBe(true);
    expect(isValidLanguageCode("Es")).toBe(true);
  });
});
