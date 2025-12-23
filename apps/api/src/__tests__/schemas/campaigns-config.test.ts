import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  generateFromConfigRequestSchema,
  generateFromConfigResponseSchema,
  previewWithConfigRequestSchema,
  previewWithConfigResponseSchema,
} from "../../schemas/campaigns.js";

describe("generateFromConfigRequestSchema", () => {
  const validRequest = {
    dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
    campaignConfig: {
      namePattern: "{brand}-performance",
      platform: "reddit",
      objective: "CONVERSIONS",
      budget: {
        type: "daily",
        amountPattern: "100",
        currency: "USD",
      },
    },
    hierarchyConfig: {
      adGroupNamePattern: "{product}",
      adMapping: {
        headline: "{headline}",
        description: "{description}",
        displayUrl: "example.com",
        finalUrl: "https://example.com/{product}",
      },
    },
  };

  it("validates a complete valid request", () => {
    const result = generateFromConfigRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("validates request without optional fields", () => {
    const minimalRequest = {
      dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
      campaignConfig: {
        namePattern: "{brand}-campaign",
        platform: "google",
      },
      hierarchyConfig: {
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      },
    };

    const result = generateFromConfigRequestSchema.safeParse(minimalRequest);
    expect(result.success).toBe(true);
  });

  it("validates request with ruleIds", () => {
    const requestWithRules = {
      ...validRequest,
      ruleIds: [
        "660e8400-e29b-41d4-a716-446655440001",
        "660e8400-e29b-41d4-a716-446655440002",
      ],
    };

    const result = generateFromConfigRequestSchema.safeParse(requestWithRules);
    expect(result.success).toBe(true);
  });

  it("validates request with keywordConfig", () => {
    const requestWithKeywords = {
      ...validRequest,
      keywordConfig: {
        enabled: true,
        rules: [
          {
            coreTermPattern: "{product}",
            prefixes: ["buy", "cheap"],
            suffixes: ["online", "sale"],
            matchTypes: ["broad", "exact"],
          },
        ],
      },
    };

    const result = generateFromConfigRequestSchema.safeParse(requestWithKeywords);
    expect(result.success).toBe(true);
  });

  describe("dataSourceId validation", () => {
    it("rejects invalid UUID format", () => {
      const request = { ...validRequest, dataSourceId: "not-a-uuid" };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("rejects missing dataSourceId", () => {
      const { dataSourceId, ...request } = validRequest;
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("campaignConfig validation", () => {
    it("rejects empty namePattern", () => {
      const request = {
        ...validRequest,
        campaignConfig: { ...validRequest.campaignConfig, namePattern: "" },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("rejects invalid platform", () => {
      const request = {
        ...validRequest,
        campaignConfig: { ...validRequest.campaignConfig, platform: "invalid" },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("accepts all valid platforms", () => {
      for (const platform of ["reddit", "google", "facebook"]) {
        const request = {
          ...validRequest,
          campaignConfig: { ...validRequest.campaignConfig, platform },
        };
        const result = generateFromConfigRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }
    });

    it("rejects budget with invalid type", () => {
      const request = {
        ...validRequest,
        campaignConfig: {
          ...validRequest.campaignConfig,
          budget: { type: "invalid", amountPattern: "100", currency: "USD" },
        },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("accepts budget with daily and lifetime types", () => {
      for (const type of ["daily", "lifetime"]) {
        const request = {
          ...validRequest,
          campaignConfig: {
            ...validRequest.campaignConfig,
            budget: { type, amountPattern: "100", currency: "USD" },
          },
        };
        const result = generateFromConfigRequestSchema.safeParse(request);
        expect(result.success).toBe(true);
      }
    });

    it("rejects currency longer than 3 characters", () => {
      const request = {
        ...validRequest,
        campaignConfig: {
          ...validRequest.campaignConfig,
          budget: { type: "daily", amountPattern: "100", currency: "USDD" },
        },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("hierarchyConfig validation", () => {
    it("rejects empty adGroupNamePattern", () => {
      const request = {
        ...validRequest,
        hierarchyConfig: {
          ...validRequest.hierarchyConfig,
          adGroupNamePattern: "",
        },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("rejects missing headline in adMapping", () => {
      const request = {
        ...validRequest,
        hierarchyConfig: {
          adGroupNamePattern: "{product}",
          adMapping: {
            description: "{description}",
          },
        },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("rejects missing description in adMapping", () => {
      const request = {
        ...validRequest,
        hierarchyConfig: {
          adGroupNamePattern: "{product}",
          adMapping: {
            headline: "{headline}",
          },
        },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe("keywordConfig validation", () => {
    it("rejects invalid matchTypes", () => {
      const request = {
        ...validRequest,
        keywordConfig: {
          enabled: true,
          rules: [
            {
              coreTermPattern: "{product}",
              prefixes: [],
              suffixes: [],
              matchTypes: ["invalid"],
            },
          ],
        },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it("accepts all valid matchTypes", () => {
      const request = {
        ...validRequest,
        keywordConfig: {
          enabled: true,
          rules: [
            {
              coreTermPattern: "{product}",
              prefixes: [],
              suffixes: [],
              matchTypes: ["broad", "phrase", "exact"],
            },
          ],
        },
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe("ruleIds validation", () => {
    it("rejects invalid UUID in ruleIds", () => {
      const request = {
        ...validRequest,
        ruleIds: ["valid-uuid-missing", "not-a-uuid"],
      };
      const result = generateFromConfigRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });
});

describe("generateFromConfigResponseSchema", () => {
  const validResponse = {
    campaigns: [
      {
        name: "Nike-performance",
        platform: "reddit",
        objective: "CONVERSIONS",
        budget: {
          type: "daily",
          amount: 100,
          currency: "USD",
        },
        adGroups: [
          {
            name: "Air Max",
            ads: [
              {
                headline: "Run Fast",
                description: "Best shoe",
                displayUrl: "nike.com",
                finalUrl: "https://nike.com/air-max",
              },
            ],
          },
        ],
      },
    ],
    stats: {
      totalCampaigns: 1,
      totalAdGroups: 1,
      totalAds: 1,
      rowsProcessed: 1,
    },
    warnings: [],
  };

  it("validates a complete response", () => {
    const result = generateFromConfigResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("validates response with warnings", () => {
    const responseWithWarnings = {
      ...validResponse,
      warnings: [
        { type: "missing_variable", message: 'Variable "product" not found in row 5' },
        { type: "empty_value", message: 'Variable "headline" resolved to empty string' },
      ],
    };
    const result = generateFromConfigResponseSchema.safeParse(responseWithWarnings);
    expect(result.success).toBe(true);
  });

  it("validates response with minimal campaign data", () => {
    const minimalResponse = {
      campaigns: [
        {
          name: "Test Campaign",
          platform: "google",
          adGroups: [
            {
              name: "Test Ad Group",
              ads: [
                {
                  headline: "Test Headline",
                  description: "Test Description",
                },
              ],
            },
          ],
        },
      ],
      stats: {
        totalCampaigns: 1,
        totalAdGroups: 1,
        totalAds: 1,
        rowsProcessed: 1,
      },
      warnings: [],
    };
    const result = generateFromConfigResponseSchema.safeParse(minimalResponse);
    expect(result.success).toBe(true);
  });

  it("validates empty campaigns array", () => {
    const emptyResponse = {
      campaigns: [],
      stats: {
        totalCampaigns: 0,
        totalAdGroups: 0,
        totalAds: 0,
        rowsProcessed: 0,
      },
      warnings: [{ type: "no_data", message: "No rows found in data source" }],
    };
    const result = generateFromConfigResponseSchema.safeParse(emptyResponse);
    expect(result.success).toBe(true);
  });
});

describe("previewWithConfigRequestSchema", () => {
  const validRequest = {
    dataSourceId: "550e8400-e29b-41d4-a716-446655440000",
    campaignConfig: {
      namePattern: "{brand}-performance",
      platform: "reddit",
    },
    hierarchyConfig: {
      adGroupNamePattern: "{product}",
      adMapping: {
        headline: "{headline}",
        description: "{description}",
      },
    },
    limit: 10,
  };

  it("validates a complete valid request", () => {
    const result = previewWithConfigRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("applies default limit of 20", () => {
    const { limit, ...requestWithoutLimit } = validRequest;
    const result = previewWithConfigRequestSchema.safeParse(requestWithoutLimit);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it("rejects limit over 100", () => {
    const request = { ...validRequest, limit: 101 };
    const result = previewWithConfigRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it("rejects limit under 1", () => {
    const request = { ...validRequest, limit: 0 };
    const result = previewWithConfigRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

describe("previewWithConfigResponseSchema", () => {
  const validResponse = {
    campaignCount: 5,
    adGroupCount: 15,
    adCount: 45,
    rowsProcessed: 50,
    preview: [
      {
        name: "Nike-performance",
        platform: "reddit",
        adGroupCount: 3,
        adGroups: [
          {
            name: "Air Max",
            adCount: 2,
            sampleAds: [
              { headline: "Run Fast", description: "Best shoe" },
            ],
          },
        ],
      },
    ],
    warnings: [],
    metadata: {
      dataSourceName: "Test Data Source",
      generatedAt: "2024-12-22T10:00:00.000Z",
    },
  };

  it("validates a complete response", () => {
    const result = previewWithConfigResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("validates response with warnings", () => {
    const responseWithWarnings = {
      ...validResponse,
      warnings: [
        { type: "missing_variable", message: "Variable 'price' not found" },
      ],
    };
    const result = previewWithConfigResponseSchema.safeParse(responseWithWarnings);
    expect(result.success).toBe(true);
  });
});
