import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeColumnLengthStats,
  type ComputeStatsResult,
} from "../../services/column-analysis.js";
import { db, dataRows } from "../../services/db.js";
import { eq } from "drizzle-orm";

// Mock the db module
vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => []),
        })),
      })),
    })),
  },
  dataRows: {},
  dataSources: {},
}));

describe("computeColumnLengthStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("basic functionality", () => {
    it("should compute min, max, avg lengths for each column", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "Short", description: "A" }, rowIndex: 0, createdAt: new Date() },
        { id: "2", dataSourceId: "ds1", rowData: { name: "Medium Name", description: "AB" }, rowIndex: 1, createdAt: new Date() },
        { id: "3", dataSourceId: "ds1", rowData: { name: "This is a longer name", description: "ABC" }, rowIndex: 2, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => mockRows),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => [{ id: "ds1" }]),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await computeColumnLengthStats("ds1");

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();

      // Check "name" column stats
      expect(result.stats!.name.minLength).toBe(5); // "Short"
      expect(result.stats!.name.maxLength).toBe(21); // "This is a longer name"
      expect(result.stats!.name.avgLength).toBeCloseTo((5 + 11 + 21) / 3, 1);
      expect(result.stats!.name.sampleShortest).toBe("Short");
      expect(result.stats!.name.sampleLongest).toBe("This is a longer name");

      // Check "description" column stats
      expect(result.stats!.description.minLength).toBe(1); // "A"
      expect(result.stats!.description.maxLength).toBe(3); // "ABC"
      expect(result.stats!.description.avgLength).toBeCloseTo((1 + 2 + 3) / 3, 1);
    });

    it("should handle empty data source", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => []),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await computeColumnLengthStats("empty-ds");

      expect(result.success).toBe(true);
      expect(result.stats).toEqual({});
      expect(result.rowCount).toBe(0);
    });

    it("should handle null and undefined values", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "Hello", value: null }, rowIndex: 0, createdAt: new Date() },
        { id: "2", dataSourceId: "ds1", rowData: { name: "World", value: undefined }, rowIndex: 1, createdAt: new Date() },
        { id: "3", dataSourceId: "ds1", rowData: { name: "Test" }, rowIndex: 2, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => mockRows),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => [{ id: "ds1" }]),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await computeColumnLengthStats("ds1");

      expect(result.success).toBe(true);
      expect(result.stats!.name).toBeDefined();
      // "value" column should only have non-null values counted
      expect(result.stats!.value).toBeUndefined();
    });

    it("should handle numeric values by converting to string", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { price: 99, quantity: 1000 }, rowIndex: 0, createdAt: new Date() },
        { id: "2", dataSourceId: "ds1", rowData: { price: 1999, quantity: 5 }, rowIndex: 1, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => mockRows),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => [{ id: "ds1" }]),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await computeColumnLengthStats("ds1");

      expect(result.success).toBe(true);
      // "99" = 2 chars, "1999" = 4 chars
      expect(result.stats!.price.minLength).toBe(2);
      expect(result.stats!.price.maxLength).toBe(4);
    });

    it("should include computedAt timestamp", async () => {
      const mockRows = [
        { id: "1", dataSourceId: "ds1", rowData: { name: "Test" }, rowIndex: 0, createdAt: new Date() },
      ];

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => mockRows),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => [{ id: "ds1" }]),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const before = new Date().toISOString();
      const result = await computeColumnLengthStats("ds1");
      const after = new Date().toISOString();

      expect(result.stats!.name.computedAt).toBeDefined();
      expect(result.stats!.name.computedAt >= before).toBe(true);
      expect(result.stats!.name.computedAt <= after).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should return error result when database query fails", async () => {
      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            throw new Error("Database connection failed");
          }),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await computeColumnLengthStats("ds1");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Database connection failed");
    });
  });

  describe("performance", () => {
    it("should handle large datasets (10000 rows) efficiently", async () => {
      // Generate 10000 mock rows
      const mockRows = Array.from({ length: 10000 }, (_, i) => ({
        id: `row-${i}`,
        dataSourceId: "ds1",
        rowData: {
          product_name: `Product ${i} with some additional text`.slice(0, Math.floor(Math.random() * 50) + 5),
          description: `Description for item ${i}`,
        },
        rowIndex: i,
        createdAt: new Date(),
      }));

      const mockSelect = vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => mockRows),
        })),
      }));

      const mockUpdate = vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => [{ id: "ds1" }]),
          })),
        })),
      }));

      vi.mocked(db.select).mockImplementation(mockSelect);
      vi.mocked(db.update).mockImplementation(mockUpdate);

      const start = Date.now();
      const result = await computeColumnLengthStats("ds1");
      const elapsed = Date.now() - start;

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(10000);
      // Should complete within 2 seconds (generous limit for test stability)
      expect(elapsed).toBeLessThan(2000);
    });
  });
});
