import { describe, it, expect } from "vitest";
import {
  HierarchicalGrouper,
  groupRowsIntoCampaigns,
  type GroupingConfig,
  type GroupingResult,
  type GroupedCampaign,
  type GroupedAdGroup,
  type GroupedAd,
  type GroupingWarning,
  type AdFieldMapping,
} from "../hierarchical-grouper.js";

describe("HierarchicalGrouper", () => {
  const grouper = new HierarchicalGrouper();

  describe("basic grouping by campaign pattern", () => {
    it("groups rows by interpolated campaign name", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
        { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
        { brand: "Adidas", product: "Ultra Boost", headline: "Speed Up", description: "Top rated" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}-performance",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns).toHaveLength(2);
      expect(result.stats.totalCampaigns).toBe(2);

      const nikeCampaign = result.campaigns.find((c) => c.name === "Nike-performance");
      const adidasCampaign = result.campaigns.find((c) => c.name === "Adidas-performance");

      expect(nikeCampaign).toBeDefined();
      expect(adidasCampaign).toBeDefined();
      expect(nikeCampaign?.sourceRows).toHaveLength(2);
      expect(adidasCampaign?.sourceRows).toHaveLength(1);
    });

    it("preserves grouping key separately from interpolated name", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}-performance",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns[0]?.name).toBe("Nike-performance");
      expect(result.campaigns[0]?.groupingKey).toBe("Nike-performance");
    });

    it("handles static campaign names (no variables)", () => {
      const rows = [
        { product: "Widget A", headline: "Buy Now", description: "Great" },
        { product: "Widget B", headline: "Shop Today", description: "Best" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "All Products Campaign",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]?.name).toBe("All Products Campaign");
      expect(result.campaigns[0]?.sourceRows).toHaveLength(2);
    });
  });

  describe("ad group grouping within campaigns", () => {
    it("groups rows within a campaign by ad group pattern", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
        { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" },
        { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}-performance",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns).toHaveLength(1);
      const campaign = result.campaigns[0]!;
      expect(campaign.adGroups).toHaveLength(2);

      const airMaxGroup = campaign.adGroups.find((ag) => ag.name === "Air Max");
      const jordanGroup = campaign.adGroups.find((ag) => ag.name === "Jordan");

      expect(airMaxGroup).toBeDefined();
      expect(jordanGroup).toBeDefined();
      expect(airMaxGroup?.ads).toHaveLength(2);
      expect(jordanGroup?.ads).toHaveLength(1);
    });

    it("handles compound ad group patterns", () => {
      const rows = [
        { brand: "Nike", category: "Running", model: "Air Max", headline: "Run", description: "Fast" },
        { brand: "Nike", category: "Running", model: "Free Run", headline: "Run", description: "Light" },
        { brand: "Nike", category: "Basketball", model: "Jordan", headline: "Jump", description: "High" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{category}-{model}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns[0]?.adGroups).toHaveLength(3);
      expect(result.campaigns[0]?.adGroups.map((ag) => ag.name).sort()).toEqual([
        "Basketball-Jordan",
        "Running-Air Max",
        "Running-Free Run",
      ]);
    });
  });

  describe("ad field mapping", () => {
    it("creates ads with mapped fields from row data", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      const ad = result.campaigns[0]?.adGroups[0]?.ads[0];
      expect(ad?.headline).toBe("Run Fast");
      expect(ad?.description).toBe("Best shoe");
      expect(ad?.sourceRow).toEqual(rows[0]);
    });

    it("supports optional ad fields (displayUrl, finalUrl)", () => {
      const rows = [
        {
          brand: "Nike",
          product: "Air Max",
          headline: "Run Fast",
          description: "Best shoe",
          url: "https://nike.com/air-max",
          display: "nike.com",
        },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
          finalUrl: "{url}",
          displayUrl: "{display}",
        },
      };

      const result = grouper.groupRows(rows, config);

      const ad = result.campaigns[0]?.adGroups[0]?.ads[0];
      expect(ad?.headline).toBe("Run Fast");
      expect(ad?.description).toBe("Best shoe");
      expect(ad?.finalUrl).toBe("https://nike.com/air-max");
      expect(ad?.displayUrl).toBe("nike.com");
    });

    it("supports static text in ad field mappings", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "Shop the best {product} today!",
        },
      };

      const result = grouper.groupRows(rows, config);

      const ad = result.campaigns[0]?.adGroups[0]?.ads[0];
      expect(ad?.description).toBe("Shop the best Air Max today!");
    });
  });

  describe("variable interpolation with fallback syntax", () => {
    it("uses fallback value when primary variable is missing", () => {
      const rows = [
        { brand: "Nike", headline: "Run Fast", description: "Best shoe" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product|default_product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      // Should use the fallback variable name as literal when fallback is also missing
      expect(result.campaigns[0]?.adGroups[0]?.name).toBe("");
      expect(result.warnings.some((w) => w.type === "missing_variable")).toBe(true);
    });

    it("uses fallback value from row data when available", () => {
      const rows = [
        { brand: "Nike", default_product: "General", headline: "Run", description: "Fast" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product|default_product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns[0]?.adGroups[0]?.name).toBe("General");
    });

    it("handles empty string values vs missing values", () => {
      const rows = [
        { brand: "Nike", product: "", headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns[0]?.adGroups[0]?.name).toBe("");
      expect(result.warnings.some((w) => w.type === "empty_value")).toBe(true);
    });
  });

  describe("warning collection", () => {
    it("collects warnings for missing variables", () => {
      const rows = [
        { brand: "Nike", headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{missing_field}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          type: "missing_variable",
          variableName: "missing_field",
          rowIndex: 0,
        })
      );
    });

    it("collects warnings for empty interpolation results", () => {
      const rows = [
        { brand: "Nike", product: "", headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.warnings.some((w) => w.type === "empty_value")).toBe(true);
    });

    it("includes row index in warnings", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Test", description: "Test" },
        { brand: "Adidas", headline: "Test", description: "Test" }, // missing product
        { brand: "Puma", product: "RS-X", headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      const missingProductWarning = result.warnings.find(
        (w) => w.variableName === "product"
      );
      expect(missingProductWarning?.rowIndex).toBe(1);
    });

    it("tracks rows with missing variables in stats", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Test", description: "Test" },
        { brand: "Adidas", headline: "Test", description: "Test" },
        { brand: "Puma", headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.stats.rowsWithMissingVariables).toBe(2);
    });
  });

  describe("statistics", () => {
    it("calculates correct statistics", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best" },
        { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top" },
        { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
        { brand: "Adidas", product: "Ultra Boost", headline: "Run Light", description: "Soft" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}-performance",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.stats.totalRows).toBe(4);
      expect(result.stats.totalCampaigns).toBe(2);
      expect(result.stats.totalAdGroups).toBe(3);
      expect(result.stats.totalAds).toBe(4);
    });
  });

  describe("edge cases", () => {
    it("handles empty rows array", () => {
      const rows: Record<string, unknown>[] = [];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns).toHaveLength(0);
      expect(result.stats.totalRows).toBe(0);
      expect(result.stats.totalCampaigns).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it("handles rows with null values", () => {
      const rows = [
        { brand: "Nike", product: null, headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]?.adGroups[0]?.name).toBe("");
      expect(result.warnings.some((w) => w.type === "missing_variable")).toBe(true);
    });

    it("handles rows with undefined values", () => {
      const rows = [
        { brand: "Nike", product: undefined, headline: "Test", description: "Test" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns).toHaveLength(1);
      expect(result.warnings.some((w) => w.type === "missing_variable")).toBe(true);
    });

    it("handles numeric values in variables", () => {
      const rows = [
        { brand: "Nike", year: 2024, price: 99.99, headline: "Buy Now", description: "Great" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}-{year}",
        adGroupNamePattern: "price-{price}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns[0]?.name).toBe("Nike-2024");
      expect(result.campaigns[0]?.adGroups[0]?.name).toBe("price-99.99");
    });

    it("handles special characters in variable values", () => {
      const rows = [
        { brand: "Nike & Co.", product: "Air Max (2024)", headline: "Buy!", description: "Great" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      expect(result.campaigns[0]?.name).toBe("Nike & Co.");
      expect(result.campaigns[0]?.adGroups[0]?.name).toBe("Air Max (2024)");
    });
  });

  describe("deduplication", () => {
    it("groups rows with same interpolated campaign name together", () => {
      const rows = [
        { brand: "Nike", variant: "A", product: "Shoes", headline: "Buy", description: "Now" },
        { brand: "Nike", variant: "B", product: "Shoes", headline: "Shop", description: "Today" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}-campaign",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      // Both rows should be in same campaign since interpolated name is the same
      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]?.name).toBe("Nike-campaign");
      expect(result.campaigns[0]?.sourceRows).toHaveLength(2);
    });

    it("groups rows with same interpolated ad group name together within campaign", () => {
      const rows = [
        { brand: "Nike", product: "Shoes", color: "Red", headline: "Buy Red", description: "Nice" },
        { brand: "Nike", product: "Shoes", color: "Blue", headline: "Buy Blue", description: "Cool" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = grouper.groupRows(rows, config);

      // Both rows should be in same ad group since product is the same
      expect(result.campaigns[0]?.adGroups).toHaveLength(1);
      expect(result.campaigns[0]?.adGroups[0]?.name).toBe("Shoes");
      expect(result.campaigns[0]?.adGroups[0]?.ads).toHaveLength(2);
    });
  });

  describe("functional API", () => {
    it("exposes groupRowsIntoCampaigns as standalone function", () => {
      const rows = [
        { brand: "Nike", product: "Air Max", headline: "Run", description: "Fast" },
      ];

      const config: GroupingConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: {
          headline: "{headline}",
          description: "{description}",
        },
      };

      const result = groupRowsIntoCampaigns(rows, config);

      expect(result.campaigns).toHaveLength(1);
      expect(result.campaigns[0]?.name).toBe("Nike");
    });
  });
});

describe("HierarchicalGrouper - Example from TODO", () => {
  it("correctly groups the example from TODO documentation", () => {
    // Example from TODO-CAMPAIGN-GENERATION.md
    const rows = [
      { brand: "Nike", product: "Air Max", headline: "Run Fast", description: "Best shoe" },
      { brand: "Nike", product: "Air Max", headline: "Speed Up", description: "Top rated" },
      { brand: "Nike", product: "Jordan", headline: "Jump High", description: "Classic" },
    ];

    const config: GroupingConfig = {
      campaignNamePattern: "{brand}-performance",
      adGroupNamePattern: "{product}",
      adMapping: {
        headline: "{headline}",
        description: "{description}",
      },
    };

    const result = groupRowsIntoCampaigns(rows, config);

    // Should have 1 campaign: Nike-performance
    expect(result.campaigns).toHaveLength(1);
    expect(result.campaigns[0]?.name).toBe("Nike-performance");

    // Should have 2 ad groups: Air Max and Jordan
    expect(result.campaigns[0]?.adGroups).toHaveLength(2);

    const airMaxGroup = result.campaigns[0]?.adGroups.find((ag) => ag.name === "Air Max");
    const jordanGroup = result.campaigns[0]?.adGroups.find((ag) => ag.name === "Jordan");

    expect(airMaxGroup).toBeDefined();
    expect(jordanGroup).toBeDefined();

    // Air Max should have 2 ads
    expect(airMaxGroup?.ads).toHaveLength(2);
    expect(airMaxGroup?.ads.map((a) => a.headline).sort()).toEqual(["Run Fast", "Speed Up"]);
    expect(airMaxGroup?.ads.map((a) => a.description).sort()).toEqual(["Best shoe", "Top rated"]);

    // Jordan should have 1 ad
    expect(jordanGroup?.ads).toHaveLength(1);
    expect(jordanGroup?.ads[0]?.headline).toBe("Jump High");
    expect(jordanGroup?.ads[0]?.description).toBe("Classic");
  });
});

describe("HierarchicalGrouper - Variable Filters", () => {
  const grouper = new HierarchicalGrouper();

  it("supports variable filters in patterns", () => {
    const rows = [
      { brand: "nike", product: "air max", headline: "Run", description: "Fast" },
    ];

    const config: GroupingConfig = {
      campaignNamePattern: "{brand|uppercase}",
      adGroupNamePattern: "{product|titlecase}",
      adMapping: {
        headline: "{headline}",
        description: "{description}",
      },
    };

    const result = grouper.groupRows(rows, config);

    expect(result.campaigns[0]?.name).toBe("NIKE");
    expect(result.campaigns[0]?.adGroups[0]?.name).toBe("Air Max");
  });
});

describe("HierarchicalGrouper - Input Validation", () => {
  const grouper = new HierarchicalGrouper();

  const validConfig: GroupingConfig = {
    campaignNamePattern: "{brand}",
    adGroupNamePattern: "{product}",
    adMapping: {
      headline: "{headline}",
      description: "{description}",
    },
  };

  describe("rows validation", () => {
    it("throws error when rows is null", () => {
      expect(() => {
        grouper.groupRows(null as unknown as Record<string, unknown>[], validConfig);
      }).toThrow("rows must be a non-null array");
    });

    it("throws error when rows is undefined", () => {
      expect(() => {
        grouper.groupRows(undefined as unknown as Record<string, unknown>[], validConfig);
      }).toThrow("rows must be a non-null array");
    });

    it("throws error when rows is not an array", () => {
      expect(() => {
        grouper.groupRows({} as unknown as Record<string, unknown>[], validConfig);
      }).toThrow("rows must be a non-null array");
    });
  });

  describe("config validation", () => {
    it("throws error when config is null", () => {
      expect(() => {
        grouper.groupRows([], null as unknown as GroupingConfig);
      }).toThrow("config must be a non-null object");
    });

    it("throws error when config is undefined", () => {
      expect(() => {
        grouper.groupRows([], undefined as unknown as GroupingConfig);
      }).toThrow("config must be a non-null object");
    });

    it("throws error when campaignNamePattern is missing", () => {
      const invalidConfig = {
        adGroupNamePattern: "{product}",
        adMapping: { headline: "{headline}", description: "{description}" },
      } as unknown as GroupingConfig;

      expect(() => {
        grouper.groupRows([], invalidConfig);
      }).toThrow("config.campaignNamePattern is required");
    });

    it("throws error when adGroupNamePattern is missing", () => {
      const invalidConfig = {
        campaignNamePattern: "{brand}",
        adMapping: { headline: "{headline}", description: "{description}" },
      } as unknown as GroupingConfig;

      expect(() => {
        grouper.groupRows([], invalidConfig);
      }).toThrow("config.adGroupNamePattern is required");
    });

    it("throws error when adMapping is missing", () => {
      const invalidConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
      } as unknown as GroupingConfig;

      expect(() => {
        grouper.groupRows([], invalidConfig);
      }).toThrow("config.adMapping is required");
    });

    it("throws error when adMapping.headline is missing", () => {
      const invalidConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: { description: "{description}" },
      } as unknown as GroupingConfig;

      expect(() => {
        grouper.groupRows([], invalidConfig);
      }).toThrow("config.adMapping.headline is required");
    });

    it("throws error when adMapping.description is missing", () => {
      const invalidConfig = {
        campaignNamePattern: "{brand}",
        adGroupNamePattern: "{product}",
        adMapping: { headline: "{headline}" },
      } as unknown as GroupingConfig;

      expect(() => {
        grouper.groupRows([], invalidConfig);
      }).toThrow("config.adMapping.description is required");
    });
  });

  describe("valid inputs", () => {
    it("accepts empty rows array without throwing", () => {
      expect(() => {
        grouper.groupRows([], validConfig);
      }).not.toThrow();
    });

    it("accepts valid rows and config", () => {
      const rows = [{ brand: "Nike", product: "Shoes", headline: "Buy Now", description: "Great" }];
      expect(() => {
        grouper.groupRows(rows, validConfig);
      }).not.toThrow();
    });
  });
});

describe("HierarchicalGrouper - Performance", () => {
  const grouper = new HierarchicalGrouper();

  it("handles large datasets efficiently", () => {
    // Generate 1000 rows with 10 brands, 10 products each
    const rows: Record<string, unknown>[] = [];
    for (let brand = 0; brand < 10; brand++) {
      for (let product = 0; product < 10; product++) {
        for (let ad = 0; ad < 10; ad++) {
          rows.push({
            brand: `Brand${brand}`,
            product: `Product${product}`,
            headline: `Headline ${brand}-${product}-${ad}`,
            description: `Description ${brand}-${product}-${ad}`,
          });
        }
      }
    }

    const config: GroupingConfig = {
      campaignNamePattern: "{brand}",
      adGroupNamePattern: "{product}",
      adMapping: {
        headline: "{headline}",
        description: "{description}",
      },
    };

    const start = performance.now();
    const result = grouper.groupRows(rows, config);
    const duration = performance.now() - start;

    expect(result.stats.totalRows).toBe(1000);
    expect(result.stats.totalCampaigns).toBe(10);
    expect(result.stats.totalAdGroups).toBe(100);
    expect(result.stats.totalAds).toBe(1000);
    expect(duration).toBeLessThan(1000); // Should complete in under 1 second
  });
});
