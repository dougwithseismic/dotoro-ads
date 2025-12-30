import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateTemplateAgainstData,
  expandTemplate,
  type TemplateValidationResult,
  type InvalidRowDetail,
} from "../../services/template-validation.js";
import { db, dataRows } from "../../services/db.js";

// Mock the db module
vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => []),
        })),
      })),
    })),
  },
  dataRows: {},
}));

describe("expandTemplate", () => {
  it("should expand simple variables", () => {
    const result = expandTemplate(
      "Buy {{product_name}} today!",
      { product_name: "Nike Shoes" }
    );
    expect(result).toBe("Buy Nike Shoes today!");
  });

  it("should expand multiple variables", () => {
    const result = expandTemplate(
      "{{brand}} - {{product}} for {{price}}",
      { brand: "Nike", product: "Air Max", price: "$99" }
    );
    expect(result).toBe("Nike - Air Max for $99");
  });

  it("should handle missing variables as empty string", () => {
    const result = expandTemplate(
      "{{brand}} - {{missing}}",
      { brand: "Nike" }
    );
    expect(result).toBe("Nike - ");
  });

  it("should handle curly brace syntax {var}", () => {
    const result = expandTemplate(
      "Buy {product_name} today!",
      { product_name: "Nike Shoes" }
    );
    expect(result).toBe("Buy Nike Shoes today!");
  });

  it("should handle mixed syntax", () => {
    const result = expandTemplate(
      "{{brand}} sells {product}",
      { brand: "Nike", product: "Shoes" }
    );
    expect(result).toBe("Nike sells Shoes");
  });

  it("should handle null/undefined values as empty string", () => {
    const result = expandTemplate(
      "Value: {{val}}",
      { val: null }
    );
    expect(result).toBe("Value: ");
  });

  it("should convert numbers to strings", () => {
    const result = expandTemplate(
      "Price: {{price}}",
      { price: 99.99 }
    );
    expect(result).toBe("Price: 99.99");
  });
});

describe("validateTemplateAgainstData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic validation", () => {
    it("should identify rows exceeding character limit", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "Short" }, rowIndex: 0, createdAt: new Date() },
        { id: "2", dataSourceId: "ds1", rowData: { name: "This is a very long product name that exceeds the limit" }, rowIndex: 1, createdAt: new Date() },
        { id: "3", dataSourceId: "ds1", rowData: { name: "Another short" }, rowIndex: 2, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(3);
      expect(result.invalidRows).toBe(1);
      expect(result.validRows).toBe(2);
      expect(result.invalidRowDetails).toHaveLength(1);
      expect(result.invalidRowDetails[0].rowIndex).toBe(1);
      expect(result.invalidRowDetails[0].overflow).toBeGreaterThan(0);
    });

    it("should handle all rows being valid", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "Short" }, rowIndex: 0, createdAt: new Date() },
        { id: "2", dataSourceId: "ds1", rowData: { name: "Also short" }, rowIndex: 1, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      expect(result.success).toBe(true);
      expect(result.invalidRows).toBe(0);
      expect(result.validRows).toBe(2);
      expect(result.invalidRowDetails).toHaveLength(0);
    });

    it("should handle static template with no variables", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "Anything" }, rowIndex: 0, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "Buy Now!", // 8 chars, under Google headline limit of 30
        "headline",
        "google"
      );

      expect(result.success).toBe(true);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(0);
    });
  });

  describe("platform limits", () => {
    it("should use Google headline limit of 30 chars", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "A".repeat(25) }, rowIndex: 0, createdAt: new Date() }, // 25 chars - valid
        { id: "2", dataSourceId: "ds1", rowData: { name: "A".repeat(35) }, rowIndex: 1, createdAt: new Date() }, // 35 chars - invalid
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      expect(result.invalidRows).toBe(1);
      expect(result.invalidRowDetails[0].limit).toBe(30);
    });

    it("should use Google description limit of 90 chars", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { desc: "A".repeat(100) }, rowIndex: 0, createdAt: new Date() }, // 100 chars - invalid
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{desc}}",
        "description",
        "google"
      );

      expect(result.invalidRows).toBe(1);
      expect(result.invalidRowDetails[0].limit).toBe(90);
    });

    it("should use Facebook headline limit of 40 chars", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "A".repeat(45) }, rowIndex: 0, createdAt: new Date() }, // 45 chars - invalid
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "facebook"
      );

      expect(result.invalidRows).toBe(1);
      expect(result.invalidRowDetails[0].limit).toBe(40);
    });

    it("should use Reddit title limit of 300 chars", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { title: "A".repeat(290) }, rowIndex: 0, createdAt: new Date() }, // Valid
        { id: "2", dataSourceId: "ds1", rowData: { title: "A".repeat(310) }, rowIndex: 1, createdAt: new Date() }, // Invalid
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{title}}",
        "title",
        "reddit"
      );

      expect(result.invalidRows).toBe(1);
      expect(result.invalidRowDetails[0].limit).toBe(300);
    });
  });

  describe("summary generation", () => {
    it("should generate correct summary message", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "Short" }, rowIndex: 0, createdAt: new Date() },
        { id: "2", dataSourceId: "ds1", rowData: { name: "A".repeat(50) }, rowIndex: 1, createdAt: new Date() },
        { id: "3", dataSourceId: "ds1", rowData: { name: "A".repeat(50) }, rowIndex: 2, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      expect(result.summary).toContain("2");
      expect(result.summary).toContain("3");
      expect(result.summary).toContain("headline");
    });

    it("should generate singular/plural summary correctly", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "A".repeat(50) }, rowIndex: 0, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      expect(result.summary).toContain("1 of 1");
    });
  });

  describe("invalid row details", () => {
    it("should include generated value in details", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "A".repeat(50) }, rowIndex: 0, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "Buy {{name}}!",
        "headline",
        "google"
      );

      expect(result.invalidRowDetails[0].generatedValue).toBe("Buy " + "A".repeat(50) + "!");
      expect(result.invalidRowDetails[0].generatedLength).toBe(55); // "Buy " (4) + 50 + "!" (1)
    });

    it("should calculate correct overflow", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "A".repeat(40) }, rowIndex: 0, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      // 40 chars, limit is 30, overflow is 10
      expect(result.invalidRowDetails[0].overflow).toBe(10);
      expect(result.invalidRowDetails[0].generatedLength).toBe(40);
      expect(result.invalidRowDetails[0].limit).toBe(30);
    });
  });

  describe("error handling", () => {
    it("should handle database errors gracefully", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => {
              throw new Error("Database connection failed");
            }),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
    });

    it("should handle empty data source", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => []),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "google"
      );

      expect(result.success).toBe(true);
      expect(result.totalRows).toBe(0);
      expect(result.validRows).toBe(0);
      expect(result.invalidRows).toBe(0);
    });

    it("should handle unknown platform by returning success with no limit", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "A".repeat(1000) }, rowIndex: 0, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => mockRows),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await validateTemplateAgainstData(
        "ds1",
        "{{name}}",
        "headline",
        "unknown-platform"
      );

      // With no defined limit, all rows should be valid
      expect(result.success).toBe(true);
      expect(result.validRows).toBe(1);
      expect(result.invalidRows).toBe(0);
    });
  });
});
