import { describe, it, expect } from "vitest";
import {
  validateTargetingConfig,
  validateLocationTarget,
  validateDemographicTarget,
  validateDeviceTarget,
  validateAudienceTarget,
  validatePlacementTarget,
} from "../validation.js";
import type {
  TargetingConfig,
  LocationTarget,
  DemographicTarget,
  DeviceTarget,
  AudienceTarget,
  PlacementTarget,
} from "../types.js";

describe("validateTargetingConfig", () => {
  it("validates empty config (no targeting restrictions)", () => {
    const config: TargetingConfig = {};
    const result = validateTargetingConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("validates config with all targeting types", () => {
    const config: TargetingConfig = {
      locations: [
        { type: "country", value: "US", name: "United States", include: true },
      ],
      demographics: {
        ageMin: 18,
        ageMax: 65,
        genders: ["male", "female"],
      },
      interests: ["technology", "gaming"],
      audiences: [
        { id: "aud-1", name: "Website Visitors", type: "custom" },
      ],
      devices: {
        types: ["desktop", "mobile"],
      },
      placements: {
        platforms: ["facebook_feed", "instagram_feed"],
      },
    };
    const result = validateTargetingConfig(config);
    expect(result.valid).toBe(true);
  });

  it("aggregates errors from all targeting types", () => {
    const config: TargetingConfig = {
      locations: [
        { type: "country", value: "", name: "", include: true }, // invalid
      ],
      demographics: {
        ageMin: 10, // too young
        ageMax: 100, // too old
      },
    };
    const result = validateTargetingConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("warns about narrow targeting", () => {
    const config: TargetingConfig = {
      locations: [
        { type: "city", value: "12345", name: "Small Town", include: true },
      ],
      demographics: {
        ageMin: 25,
        ageMax: 30,
        genders: ["female"],
      },
      devices: {
        types: ["tablet"],
        operatingSystems: ["ios"],
        browsers: ["safari"],
      },
    };
    const result = validateTargetingConfig(config);
    expect(result.warnings).toContain(
      "Targeting may be too narrow. Consider broadening your audience."
    );
  });
});

describe("validateLocationTarget", () => {
  it("validates valid country target", () => {
    const target: LocationTarget = {
      type: "country",
      value: "US",
      name: "United States",
      include: true,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid region target", () => {
    const target: LocationTarget = {
      type: "region",
      value: "US-CA",
      name: "California",
      include: true,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid city target", () => {
    const target: LocationTarget = {
      type: "city",
      value: "1014221",
      name: "Los Angeles",
      include: true,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid radius target", () => {
    const target: LocationTarget = {
      type: "radius",
      value: "34.0522,-118.2437",
      name: "Los Angeles Area",
      include: true,
      radius: 25,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates exclusion target", () => {
    const target: LocationTarget = {
      type: "country",
      value: "CN",
      name: "China",
      include: false,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(true);
  });

  it("fails when value is empty", () => {
    const target: LocationTarget = {
      type: "country",
      value: "",
      name: "United States",
      include: true,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Location value is required");
  });

  it("fails when name is empty", () => {
    const target: LocationTarget = {
      type: "country",
      value: "US",
      name: "",
      include: true,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Location name is required");
  });

  it("fails when radius target has no radius value", () => {
    const target: LocationTarget = {
      type: "radius",
      value: "34.0522,-118.2437",
      name: "Los Angeles Area",
      include: true,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Radius is required for radius targeting");
  });

  it("fails when radius is negative", () => {
    const target: LocationTarget = {
      type: "radius",
      value: "34.0522,-118.2437",
      name: "Los Angeles Area",
      include: true,
      radius: -10,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Radius must be a positive number");
  });

  it("fails when radius exceeds maximum", () => {
    const target: LocationTarget = {
      type: "radius",
      value: "34.0522,-118.2437",
      name: "Los Angeles Area",
      include: true,
      radius: 1000,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Radius cannot exceed 500 kilometers");
  });

  it("fails when radius target has invalid coordinates", () => {
    const target: LocationTarget = {
      type: "radius",
      value: "invalid",
      name: "Los Angeles Area",
      include: true,
      radius: 25,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Radius targeting requires valid coordinates in format 'lat,lng'"
    );
  });

  it("fails when latitude is out of range", () => {
    const target: LocationTarget = {
      type: "radius",
      value: "100.0522,-118.2437",
      name: "Invalid Location",
      include: true,
      radius: 25,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Latitude must be between -90 and 90");
  });

  it("fails when longitude is out of range", () => {
    const target: LocationTarget = {
      type: "radius",
      value: "34.0522,-200.2437",
      name: "Invalid Location",
      include: true,
      radius: 25,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Longitude must be between -180 and 180");
  });

  it("fails when type is invalid", () => {
    const target = {
      type: "invalid" as any,
      value: "US",
      name: "United States",
      include: true,
    };
    const result = validateLocationTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid location type: invalid. Must be one of: country, region, city, postal, radius"
    );
  });
});

describe("validateDemographicTarget", () => {
  it("validates empty demographics (no restrictions)", () => {
    const target: DemographicTarget = {};
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid age range", () => {
    const target: DemographicTarget = {
      ageMin: 18,
      ageMax: 65,
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid genders", () => {
    const target: DemographicTarget = {
      genders: ["male", "female", "other"],
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid languages", () => {
    const target: DemographicTarget = {
      languages: ["en", "es", "fr"],
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(true);
  });

  it("fails when minimum age is below 13", () => {
    const target: DemographicTarget = {
      ageMin: 10,
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Minimum age must be at least 13");
  });

  it("fails when maximum age exceeds 120", () => {
    const target: DemographicTarget = {
      ageMax: 150,
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Maximum age cannot exceed 120");
  });

  it("fails when minimum age exceeds maximum age", () => {
    const target: DemographicTarget = {
      ageMin: 50,
      ageMax: 25,
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Minimum age cannot exceed maximum age");
  });

  it("fails when gender is invalid", () => {
    const target: DemographicTarget = {
      genders: ["male", "invalid" as any],
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid gender: invalid. Must be one of: male, female, other"
    );
  });

  it("fails when language code is invalid", () => {
    const target: DemographicTarget = {
      languages: ["en", "invalid_lang"],
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid language code: invalid_lang. Must be a 2-letter ISO 639-1 code"
    );
  });

  it("warns about narrow age range", () => {
    const target: DemographicTarget = {
      ageMin: 25,
      ageMax: 28,
    };
    const result = validateDemographicTarget(target);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Age range is very narrow (3 years). Consider broadening for better reach."
    );
  });
});

describe("validateDeviceTarget", () => {
  it("validates empty device targeting (all devices)", () => {
    const target: DeviceTarget = {};
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid device types", () => {
    const target: DeviceTarget = {
      types: ["desktop", "mobile", "tablet"],
    };
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid operating systems", () => {
    const target: DeviceTarget = {
      operatingSystems: ["windows", "macos", "ios", "android"],
    };
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid browsers", () => {
    const target: DeviceTarget = {
      browsers: ["chrome", "firefox", "safari", "edge"],
    };
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(true);
  });

  it("fails when device type is invalid", () => {
    const target: DeviceTarget = {
      types: ["desktop", "smartwatch" as any],
    };
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid device type: smartwatch. Must be one of: desktop, mobile, tablet"
    );
  });

  it("fails when operating system is invalid", () => {
    const target: DeviceTarget = {
      operatingSystems: ["windows", "beos" as any],
    };
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid operating system: beos. Must be one of: windows, macos, linux, ios, android, chrome_os"
    );
  });

  it("fails when browser is invalid", () => {
    const target: DeviceTarget = {
      browsers: ["chrome", "netscape" as any],
    };
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid browser: netscape. Must be one of: chrome, firefox, safari, edge, opera"
    );
  });

  it("warns about restrictive device targeting", () => {
    const target: DeviceTarget = {
      types: ["tablet"],
      operatingSystems: ["ios"],
      browsers: ["safari"],
    };
    const result = validateDeviceTarget(target);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Device targeting is very restrictive. This may significantly limit reach."
    );
  });
});

describe("validateAudienceTarget", () => {
  it("validates valid custom audience", () => {
    const target: AudienceTarget = {
      id: "aud-123",
      name: "Website Visitors",
      type: "custom",
    };
    const result = validateAudienceTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid lookalike audience", () => {
    const target: AudienceTarget = {
      id: "aud-456",
      name: "Lookalike - Website Visitors",
      type: "lookalike",
      size: 1500000,
    };
    const result = validateAudienceTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates audience exclusion", () => {
    const target: AudienceTarget = {
      id: "aud-789",
      name: "Existing Customers",
      type: "custom",
      include: false,
    };
    const result = validateAudienceTarget(target);
    expect(result.valid).toBe(true);
  });

  it("fails when audience ID is empty", () => {
    const target: AudienceTarget = {
      id: "",
      name: "Website Visitors",
      type: "custom",
    };
    const result = validateAudienceTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Audience ID is required");
  });

  it("fails when audience name is empty", () => {
    const target: AudienceTarget = {
      id: "aud-123",
      name: "",
      type: "custom",
    };
    const result = validateAudienceTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Audience name is required");
  });

  it("fails when audience type is invalid", () => {
    const target = {
      id: "aud-123",
      name: "Test Audience",
      type: "invalid" as any,
    };
    const result = validateAudienceTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid audience type: invalid. Must be one of: custom, lookalike, saved, retargeting"
    );
  });

  it("warns about small audience size", () => {
    const target: AudienceTarget = {
      id: "aud-123",
      name: "Small Audience",
      type: "custom",
      size: 500,
    };
    const result = validateAudienceTarget(target);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Audience size (500) is very small. Consider using a larger audience for better results."
    );
  });
});

describe("validatePlacementTarget", () => {
  it("validates empty placement (all placements)", () => {
    const target: PlacementTarget = {};
    const result = validatePlacementTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid platform placements", () => {
    const target: PlacementTarget = {
      platforms: ["facebook_feed", "instagram_feed", "instagram_stories"],
    };
    const result = validatePlacementTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates valid positions", () => {
    const target: PlacementTarget = {
      positions: ["top", "sidebar", "in-feed"],
    };
    const result = validatePlacementTarget(target);
    expect(result.valid).toBe(true);
  });

  it("validates URLs for targeting", () => {
    const target: PlacementTarget = {
      urls: ["https://example.com", "https://news.example.com"],
    };
    const result = validatePlacementTarget(target);
    expect(result.valid).toBe(true);
  });

  it("fails when URL is invalid", () => {
    const target: PlacementTarget = {
      urls: ["https://example.com", "not-a-url"],
    };
    const result = validatePlacementTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid URL: not-a-url. Must be a valid URL"
    );
  });

  it("fails when excluded URL is invalid", () => {
    const target: PlacementTarget = {
      excludedUrls: ["invalid-url"],
    };
    const result = validatePlacementTarget(target);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Invalid excluded URL: invalid-url. Must be a valid URL"
    );
  });

  it("warns about restrictive placement targeting", () => {
    const target: PlacementTarget = {
      platforms: ["instagram_reels"],
    };
    const result = validatePlacementTarget(target);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      "Limiting placements to 1 platform(s) may reduce reach. Consider adding more placements."
    );
  });
});
