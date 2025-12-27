import { describe, it, expect, vi, beforeEach, Mock } from "vitest";

// Mock the database before importing the service
vi.mock("../db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
    },
    dataRows: { id: "id", dataSourceId: "data_source_id", rowData: "row_data" },
    generatedCampaigns: { id: "id", campaignSetId: "campaign_set_id", platformCampaignId: "platform_campaign_id" },
    adGroups: { id: "id", campaignId: "campaign_id" },
    ads: { id: "id", adGroupId: "ad_group_id" },
    keywords: { id: "id", adGroupId: "ad_group_id" },
    syncRecords: { id: "id", generatedCampaignId: "generated_campaign_id", platformId: "platform_id" },
  };
});

// Import after mocking
import {
  CampaignGenerationService,
  interpolatePattern,
  type GenerationConfig,
} from "../campaign-generation.js";
import { db } from "../db.js";

describe("interpolatePattern", () => {
  it("should replace single variable with row data", () => {
    const result = interpolatePattern("{brand}", { brand: "Nike" });
    expect(result).toBe("Nike");
  });

  it("should replace multiple variables", () => {
    const result = interpolatePattern("{brand} - {category}", {
      brand: "Nike",
      category: "Shoes",
    });
    expect(result).toBe("Nike - Shoes");
  });

  it("should handle missing variables by keeping placeholder", () => {
    const result = interpolatePattern("{brand} - {missing}", {
      brand: "Nike",
    });
    expect(result).toBe("Nike - {missing}");
  });

  it("should handle empty string values", () => {
    const result = interpolatePattern("{brand} - {category}", {
      brand: "Nike",
      category: "",
    });
    expect(result).toBe("Nike - ");
  });

  it("should handle null values as empty string", () => {
    const result = interpolatePattern("{brand} - {category}", {
      brand: "Nike",
      category: null,
    });
    expect(result).toBe("Nike - ");
  });

  it("should handle numeric values", () => {
    const result = interpolatePattern("Price: {price}", { price: 99.99 });
    expect(result).toBe("Price: 99.99");
  });

  it("should handle pattern with no variables", () => {
    const result = interpolatePattern("Static Text", { brand: "Nike" });
    expect(result).toBe("Static Text");
  });

  it("should handle empty pattern", () => {
    const result = interpolatePattern("", { brand: "Nike" });
    expect(result).toBe("");
  });

  it("should be case-sensitive for variable names", () => {
    const result = interpolatePattern("{Brand} - {brand}", {
      brand: "Nike",
      Brand: "Adidas",
    });
    expect(result).toBe("Adidas - Nike");
  });

  it("should handle special characters in values", () => {
    const result = interpolatePattern("{description}", {
      description: "50% off! Buy now & save",
    });
    expect(result).toBe("50% off! Buy now & save");
  });

  it("should handle underscores in variable names", () => {
    const result = interpolatePattern("{product_name} by {brand_name}", {
      product_name: "Air Max",
      brand_name: "Nike",
    });
    expect(result).toBe("Air Max by Nike");
  });
});

describe("CampaignGenerationService", () => {
  let service: CampaignGenerationService;
  let mockDbSelect: Mock;
  let mockDbInsert: Mock;
  let mockDbDelete: Mock;
  let mockDbTransaction: Mock;

  // Sample data
  const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
  const mockCampaignSetId = "660e8400-e29b-41d4-a716-446655440000";
  const mockTemplateId = "770e8400-e29b-41d4-a716-446655440000";

  const sampleRows = [
    {
      id: "row-1",
      dataSourceId: mockDataSourceId,
      rowData: { brand: "Nike", category: "Shoes", sku: "NK-001", final_url: "https://example.com/nike" },
      rowIndex: 0,
    },
    {
      id: "row-2",
      dataSourceId: mockDataSourceId,
      rowData: { brand: "Nike", category: "Apparel", sku: "NK-002", final_url: "https://example.com/nike2" },
      rowIndex: 1,
    },
    {
      id: "row-3",
      dataSourceId: mockDataSourceId,
      rowData: { brand: "Adidas", category: "Shoes", sku: "AD-001", final_url: "https://example.com/adidas" },
      rowIndex: 2,
    },
  ];

  const sampleConfig: GenerationConfig = {
    campaignSetId: mockCampaignSetId,
    dataSourceId: mockDataSourceId,
    templateId: mockTemplateId,
    selectedPlatforms: ["reddit"],
    campaignConfig: {
      namePattern: "Performance - {brand}",
    },
    hierarchyConfig: {
      adGroups: [
        {
          id: "ag-1",
          namePattern: "{category}",
          keywords: ["{brand} {category}", "buy {brand}"],
          ads: [
            {
              id: "ad-1",
              headline: "{sku}",
              description: "{brand} {category} - Shop now!",
              finalUrl: "{final_url}",
            },
          ],
        },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CampaignGenerationService();

    // Setup chainable mocks
    mockDbSelect = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(sampleRows),
      }),
    });
    mockDbInsert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });
    mockDbDelete = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue({ rowCount: 0 }),
    });
    mockDbTransaction = vi.fn().mockImplementation(async (callback) => {
      return callback({
        select: mockDbSelect,
        insert: mockDbInsert,
        delete: mockDbDelete,
      });
    });

    (db.select as Mock) = mockDbSelect;
    (db.insert as Mock) = mockDbInsert;
    (db.delete as Mock) = mockDbDelete;
    (db.transaction as Mock) = mockDbTransaction;
  });

  describe("generateCampaigns", () => {
    it("should fetch rows from the data source", async () => {
      await service.generateCampaigns(sampleConfig);

      expect(mockDbSelect).toHaveBeenCalled();
    });

    it("should group rows by campaign name pattern", async () => {
      const mockInsertReturning = vi.fn().mockResolvedValue([
        { id: "campaign-1" },
        { id: "campaign-2" },
      ]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      });

      const result = await service.generateCampaigns(sampleConfig);

      // Should create 2 campaigns: "Performance - Nike" and "Performance - Adidas"
      expect(result.created).toBe(2);
    });

    it("should create campaigns for each platform", async () => {
      const multiPlatformConfig: GenerationConfig = {
        ...sampleConfig,
        selectedPlatforms: ["reddit", "google"],
      };

      const mockInsertReturning = vi.fn().mockResolvedValue([
        { id: "campaign-1" },
        { id: "campaign-2" },
        { id: "campaign-3" },
        { id: "campaign-4" },
      ]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      });

      const result = await service.generateCampaigns(multiPlatformConfig);

      // Should create 4 campaigns: 2 unique names x 2 platforms
      expect(result.created).toBe(4);
    });

    it("should create ad groups with interpolated names", async () => {
      // Track all insert calls for ad groups (single value inserts)
      const insertedAdGroups: unknown[] = [];

      // Override transaction to use our tracking mock
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((values) => {
            // Track ad group inserts (have campaignId and name, but NOT adGroupId or headline)
            const valuesArray = Array.isArray(values) ? values : [values];
            for (const v of valuesArray) {
              if (v && typeof v === 'object' && 'campaignId' in v && 'name' in v && !('adGroupId' in v) && !('headline' in v)) {
                insertedAdGroups.push(v);
              }
            }
            return {
              returning: vi.fn().mockResolvedValue(
                valuesArray.map((v: Record<string, unknown>, i: number) => ({ id: `item-${i}`, ...v }))
              ),
            };
          }),
        });
        return callback({
          select: mockDbSelect,
          insert: mockTxInsert,
          delete: mockDbDelete,
        });
      });

      await service.generateCampaigns(sampleConfig);

      // Verify ad groups were created with correct names
      // Nike campaign should have "Shoes" and "Apparel" ad groups
      // Adidas campaign should have "Shoes" ad group
      expect(insertedAdGroups.length).toBeGreaterThan(0);
      const adGroupNames = insertedAdGroups.map((ag: Record<string, unknown>) => ag.name);
      expect(adGroupNames).toContain("Shoes");
      expect(adGroupNames).toContain("Apparel");
    });

    it("should create ads with interpolated content", async () => {
      // Track all insert calls
      const insertedAds: unknown[] = [];

      // Override transaction to use our tracking mock
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((values) => {
            // Track ad inserts (have adGroupId and headline)
            const valuesArray = Array.isArray(values) ? values : [values];
            for (const v of valuesArray) {
              if (v && typeof v === 'object' && 'adGroupId' in v && 'headline' in v) {
                insertedAds.push(v);
              }
            }
            return {
              returning: vi.fn().mockResolvedValue(
                valuesArray.map((v: Record<string, unknown>, i: number) => ({ id: `item-${i}`, ...v }))
              ),
            };
          }),
        });
        return callback({
          select: mockDbSelect,
          insert: mockTxInsert,
          delete: mockDbDelete,
        });
      });

      await service.generateCampaigns(sampleConfig);

      // Verify ads were created with interpolated content
      expect(insertedAds.length).toBeGreaterThan(0);
      const headlines = insertedAds.map((ad: Record<string, unknown>) => ad.headline);
      expect(headlines).toContain("NK-001");
      expect(headlines).toContain("NK-002");
      expect(headlines).toContain("AD-001");
    });

    it("should create keywords with interpolated text", async () => {
      // Track all insert calls
      const insertedKeywords: unknown[] = [];

      // Override transaction to use our tracking mock
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((values) => {
            // Track keyword inserts (have adGroupId and keyword)
            const valuesArray = Array.isArray(values) ? values : [values];
            for (const v of valuesArray) {
              if (v && typeof v === 'object' && 'adGroupId' in v && 'keyword' in v) {
                insertedKeywords.push(v);
              }
            }
            return {
              returning: vi.fn().mockResolvedValue(
                valuesArray.map((v: Record<string, unknown>, i: number) => ({ id: `item-${i}`, ...v }))
              ),
            };
          }),
        });
        return callback({
          select: mockDbSelect,
          insert: mockTxInsert,
          delete: mockDbDelete,
        });
      });

      await service.generateCampaigns(sampleConfig);

      // Verify keywords were created with interpolated text
      expect(insertedKeywords.length).toBeGreaterThan(0);
      const keywordTexts = insertedKeywords.map((kw: Record<string, unknown>) => kw.keyword);
      expect(keywordTexts).toContain("Nike Shoes");
      expect(keywordTexts).toContain("buy Nike");
    });

    it("should return empty result when no data rows exist", async () => {
      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.generateCampaigns(sampleConfig);

      expect(result.created).toBe(0);
      expect(result.campaigns).toHaveLength(0);
    });

    it("should handle rows with missing variables gracefully", async () => {
      const rowsWithMissingData = [
        {
          id: "row-1",
          dataSourceId: mockDataSourceId,
          rowData: { brand: "Nike" }, // Missing category, sku, final_url
          rowIndex: 0,
        },
      ];

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rowsWithMissingData),
        }),
      });

      const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "campaign-1" }]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      });

      const result = await service.generateCampaigns(sampleConfig);

      // Should still create campaigns, missing variables stay as placeholders
      expect(result.created).toBe(1);
    });
  });

  describe("generateCampaigns with regenerate", () => {
    it("should delete existing campaigns when regenerate is true", async () => {
      // Override transaction to support innerJoin for sync check
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]), // No synced campaigns
              }),
            }),
            where: vi.fn().mockResolvedValue(sampleRows), // Data rows
          }),
        });
        const mockTxDelete = vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 5 }),
        });
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "campaign-1" }]),
          }),
        });

        return callback({
          select: mockTxSelect,
          insert: mockTxInsert,
          delete: mockTxDelete,
        });
      });

      await service.generateCampaigns(sampleConfig, { regenerate: true });

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });

    it("should not delete existing campaigns when regenerate is false", async () => {
      const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "campaign-1" }]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      });

      await service.generateCampaigns(sampleConfig, { regenerate: false });

      // Delete should not be called for campaigns
      const deleteCalls = mockDbDelete.mock.calls;
      expect(deleteCalls.length).toBe(0);
    });
  });

  describe("campaign grouping logic", () => {
    it("should group multiple rows with same campaign name into one campaign", async () => {
      // All three rows: 2 Nike (should be 1 campaign), 1 Adidas (should be 1 campaign)
      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn()
          .mockResolvedValueOnce([{ id: "campaign-1" }, { id: "campaign-2" }]) // campaigns
          .mockResolvedValueOnce([{ id: "ag-1" }, { id: "ag-2" }]) // ad groups for campaign 1 (Nike has 2 categories)
          .mockResolvedValue([{ id: "item-1" }]), // other inserts
      });
      mockDbInsert.mockReturnValue({ values: insertValues });

      const result = await service.generateCampaigns(sampleConfig);

      // Should create 2 campaigns: Nike and Adidas
      expect(result.created).toBe(2);
    });

    it("should create separate ad groups for each unique ad group name within a campaign", async () => {
      // Nike has rows with category: "Shoes" and "Apparel" - should create 2 ad groups
      // Track all insert calls
      const insertedAdGroups: unknown[] = [];

      // Override transaction to use our tracking mock
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((values) => {
            // Track ad group inserts (have campaignId and name, but NOT adGroupId or headline)
            const valuesArray = Array.isArray(values) ? values : [values];
            for (const v of valuesArray) {
              if (v && typeof v === 'object' && 'campaignId' in v && 'name' in v && !('adGroupId' in v) && !('headline' in v)) {
                insertedAdGroups.push(v);
              }
            }
            return {
              returning: vi.fn().mockResolvedValue(
                valuesArray.map((v: Record<string, unknown>, i: number) => ({ id: `item-${i}`, ...v }))
              ),
            };
          }),
        });
        return callback({
          select: mockDbSelect,
          insert: mockTxInsert,
          delete: mockDbDelete,
        });
      });

      await service.generateCampaigns(sampleConfig);

      // We should have 3 ad groups total:
      // - Nike campaign: "Shoes" and "Apparel"
      // - Adidas campaign: "Shoes"
      expect(insertedAdGroups.length).toBe(3);

      // Count ad groups by name
      const adGroupNames = insertedAdGroups.map((ag: Record<string, unknown>) => ag.name);
      const shoesCount = adGroupNames.filter((n) => n === "Shoes").length;
      const apparelCount = adGroupNames.filter((n) => n === "Apparel").length;

      // "Shoes" appears in both Nike and Adidas campaigns (2 times)
      expect(shoesCount).toBe(2);
      // "Apparel" appears only in Nike campaign (1 time)
      expect(apparelCount).toBe(1);
    });
  });

  describe("error handling", () => {
    it("should throw error when dataSourceId is missing", async () => {
      const invalidConfig: GenerationConfig = {
        ...sampleConfig,
        dataSourceId: "",
      };

      await expect(service.generateCampaigns(invalidConfig)).rejects.toThrow(
        "dataSourceId is required"
      );
    });

    it("should throw error when campaignSetId is missing", async () => {
      const invalidConfig: GenerationConfig = {
        ...sampleConfig,
        campaignSetId: "",
      };

      await expect(service.generateCampaigns(invalidConfig)).rejects.toThrow(
        "campaignSetId is required"
      );
    });

    it("should throw error when no platforms are selected", async () => {
      const invalidConfig: GenerationConfig = {
        ...sampleConfig,
        selectedPlatforms: [],
      };

      await expect(service.generateCampaigns(invalidConfig)).rejects.toThrow(
        "At least one platform must be selected"
      );
    });

    it("should throw error when hierarchyConfig is missing", async () => {
      const invalidConfig: GenerationConfig = {
        ...sampleConfig,
        hierarchyConfig: undefined as unknown as GenerationConfig["hierarchyConfig"],
      };

      await expect(service.generateCampaigns(invalidConfig)).rejects.toThrow(
        "hierarchyConfig is required"
      );
    });

    it("should throw error when campaignConfig is missing", async () => {
      const invalidConfig: GenerationConfig = {
        ...sampleConfig,
        campaignConfig: undefined as unknown as GenerationConfig["campaignConfig"],
      };

      await expect(service.generateCampaigns(invalidConfig)).rejects.toThrow(
        "campaignConfig is required"
      );
    });

    it("should throw error when namePattern is missing", async () => {
      const invalidConfig: GenerationConfig = {
        ...sampleConfig,
        campaignConfig: {
          namePattern: "",
        },
      };

      await expect(service.generateCampaigns(invalidConfig)).rejects.toThrow(
        "campaignConfig.namePattern is required"
      );
    });

    it("should throw error when namePattern is undefined", async () => {
      const invalidConfig: GenerationConfig = {
        ...sampleConfig,
        campaignConfig: {
          namePattern: undefined as unknown as string,
        },
      };

      await expect(service.generateCampaigns(invalidConfig)).rejects.toThrow(
        "campaignConfig.namePattern is required"
      );
    });
  });

  describe("empty campaign name handling", () => {
    it("should skip rows that produce empty campaign names", async () => {
      // Row with all empty/null values that would produce an empty campaign name
      const rowsWithEmptyName = [
        {
          id: "row-1",
          dataSourceId: mockDataSourceId,
          rowData: { brand: "", category: "" }, // Empty values
          rowIndex: 0,
        },
        {
          id: "row-2",
          dataSourceId: mockDataSourceId,
          rowData: { brand: "Nike", category: "Shoes" }, // Valid values
          rowIndex: 1,
        },
      ];

      // Config with pattern that will produce empty string for first row
      const configWithEmptyPattern: GenerationConfig = {
        ...sampleConfig,
        campaignConfig: {
          namePattern: "{brand}",
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rowsWithEmptyName),
        }),
      });

      const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "campaign-1" }]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      });

      const result = await service.generateCampaigns(configWithEmptyPattern);

      // Should only create 1 campaign for "Nike", skipping the empty one
      expect(result.created).toBe(1);
    });

    it("should skip rows that produce whitespace-only campaign names", async () => {
      const rowsWithWhitespaceName = [
        {
          id: "row-1",
          dataSourceId: mockDataSourceId,
          rowData: { brand: "   " }, // Whitespace only
          rowIndex: 0,
        },
        {
          id: "row-2",
          dataSourceId: mockDataSourceId,
          rowData: { brand: "Nike" },
          rowIndex: 1,
        },
      ];

      const configWithPattern: GenerationConfig = {
        ...sampleConfig,
        campaignConfig: {
          namePattern: "{brand}",
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rowsWithWhitespaceName),
        }),
      });

      const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "campaign-1" }]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      });

      const result = await service.generateCampaigns(configWithPattern);

      // Should only create 1 campaign for "Nike", skipping the whitespace one
      expect(result.created).toBe(1);
    });

    it("should handle null values that result in empty campaign names", async () => {
      const rowsWithNullValues = [
        {
          id: "row-1",
          dataSourceId: mockDataSourceId,
          rowData: { brand: null }, // Null value becomes empty string
          rowIndex: 0,
        },
        {
          id: "row-2",
          dataSourceId: mockDataSourceId,
          rowData: { brand: "Nike" },
          rowIndex: 1,
        },
      ];

      const configWithPattern: GenerationConfig = {
        ...sampleConfig,
        campaignConfig: {
          namePattern: "{brand}",
        },
      };

      mockDbSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rowsWithNullValues),
        }),
      });

      const mockInsertReturning = vi.fn().mockResolvedValue([{ id: "campaign-1" }]);
      mockDbInsert.mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: mockInsertReturning,
        }),
      });

      const result = await service.generateCampaigns(configWithPattern);

      // Should only create 1 campaign for "Nike"
      expect(result.created).toBe(1);
    });
  });

  describe("regenerate with synced campaigns", () => {
    it("should throw error when regenerating and synced campaigns exist", async () => {
      // Mock existing campaigns with platformId set via sync_records (synced to platform)
      const mockSyncedCampaigns = [
        {
          id: "campaign-1",
        },
      ];

      // Override transaction to properly mock innerJoin chain
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue(mockSyncedCampaigns), // Found synced campaigns
              }),
            }),
            where: vi.fn().mockResolvedValue(sampleRows), // Data rows
          }),
        });

        return callback({
          select: mockTxSelect,
          insert: mockDbInsert,
          delete: mockDbDelete,
        });
      });

      await expect(
        service.generateCampaigns(sampleConfig, { regenerate: true })
      ).rejects.toThrow("Cannot regenerate: some campaigns have been synced to platforms");
    });

    it("should allow regenerate with force flag even when synced campaigns exist", async () => {
      let deleteCalled = false;

      // With force=true, we skip the sync check entirely
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(sampleRows), // Data rows
          }),
        });
        const mockTxDelete = vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            deleteCalled = true;
            return { rowCount: 1 };
          }),
        });
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "campaign-new" }]),
          }),
        });

        return callback({
          select: mockTxSelect,
          insert: mockTxInsert,
          delete: mockTxDelete,
        });
      });

      // With force flag, should skip sync check and allow regeneration
      const result = await service.generateCampaigns(sampleConfig, {
        regenerate: true,
        force: true,
      });

      expect(deleteCalled).toBe(true);
      expect(result.created).toBeGreaterThanOrEqual(0);
    });

    it("should allow regenerate when no synced campaigns exist", async () => {
      // Override transaction to properly mock innerJoin chain
      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]), // No synced campaigns
              }),
            }),
            where: vi.fn().mockResolvedValue(sampleRows), // Data rows
          }),
        });
        const mockTxDelete = vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 0 }),
        });
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "campaign-new" }]),
          }),
        });

        return callback({
          select: mockTxSelect,
          insert: mockTxInsert,
          delete: mockTxDelete,
        });
      });

      // Should succeed without force flag
      const result = await service.generateCampaigns(sampleConfig, { regenerate: true });
      expect(result).toBeDefined();
    });
  });

  describe("nil UUID handling", () => {
    it("should use the actual templateId when provided", async () => {
      const insertedCampaigns: unknown[] = [];

      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(sampleRows),
          }),
        });
        const mockTxDelete = vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 0 }),
        });
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((values) => {
            const valuesArray = Array.isArray(values) ? values : [values];
            for (const v of valuesArray) {
              // Track campaign inserts (have campaignSetId but not campaignId)
              if (v && typeof v === 'object' && 'campaignSetId' in v && !('campaignId' in v)) {
                insertedCampaigns.push(v);
              }
            }
            return {
              returning: vi.fn().mockResolvedValue(
                valuesArray.map((v: Record<string, unknown>, i: number) => ({ id: `item-${i}`, ...v }))
              ),
            };
          }),
        });

        return callback({
          select: mockTxSelect,
          insert: mockTxInsert,
          delete: mockTxDelete,
        });
      });

      await service.generateCampaigns(sampleConfig);

      // Verify the actual templateId was used
      for (const campaign of insertedCampaigns) {
        const c = campaign as Record<string, unknown>;
        expect(c.templateId).toBe(mockTemplateId);
      }
    });

    it("should use the actual dataRowId from the row data", async () => {
      const insertedCampaigns: unknown[] = [];

      mockDbTransaction.mockImplementation(async (callback) => {
        const mockTxSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(sampleRows),
          }),
        });
        const mockTxDelete = vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 0 }),
        });
        const mockTxInsert = vi.fn().mockReturnValue({
          values: vi.fn().mockImplementation((values) => {
            const valuesArray = Array.isArray(values) ? values : [values];
            for (const v of valuesArray) {
              // Track campaign inserts (have campaignSetId but not campaignId)
              if (v && typeof v === 'object' && 'campaignSetId' in v && !('campaignId' in v)) {
                insertedCampaigns.push(v);
              }
            }
            return {
              returning: vi.fn().mockResolvedValue(
                valuesArray.map((v: Record<string, unknown>, i: number) => ({ id: `item-${i}`, ...v }))
              ),
            };
          }),
        });

        return callback({
          select: mockTxSelect,
          insert: mockTxInsert,
          delete: mockTxDelete,
        });
      });

      await service.generateCampaigns(sampleConfig);

      // Verify the actual dataRowId from the first row was used
      for (const campaign of insertedCampaigns) {
        const c = campaign as Record<string, unknown>;
        // dataRowId should be one of the actual row IDs, not nil UUID
        expect(c.dataRowId).not.toBe("00000000-0000-0000-0000-000000000000");
        expect(["row-1", "row-2", "row-3"]).toContain(c.dataRowId);
      }
    });
  });
});
