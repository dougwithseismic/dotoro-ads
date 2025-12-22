import { describe, it, expect } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

// Import transforms schema - will fail until implemented
import {
  transforms,
  transformsRelations,
} from "../transforms.js";

import type {
  Transform,
  NewTransform,
  TransformConfig,
  AggregationConfig,
  AggregationFunction,
} from "../transforms.js";

// Helper to check if column is a UUID
function isUuidColumn(column: PgColumn): boolean {
  return column.columnType === "PgUUID";
}

// Helper to check if column is a timestamp with default now()
function isTimestampWithDefault(column: PgColumn): boolean {
  return column.columnType === "PgTimestamp" && column.hasDefault;
}

// Helper to check if column is JSONB
function isJsonbColumn(column: PgColumn): boolean {
  return column.columnType === "PgJsonb";
}

// Helper to check if column is boolean
function isBooleanColumn(column: PgColumn): boolean {
  return column.columnType === "PgBoolean";
}

describe("Transforms Schema", () => {
  describe("transforms table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(transforms)).toBe("transforms");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(transforms);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("sourceDataSourceId");
      expect(columnNames).toContain("outputDataSourceId");
      expect(columnNames).toContain("config");
      expect(columnNames).toContain("enabled");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have UUID primary key with default random", () => {
      const columns = getTableColumns(transforms);
      const idColumn = columns.id as PgColumn;
      expect(isUuidColumn(idColumn)).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have required name column", () => {
      const columns = getTableColumns(transforms);
      expect((columns.name as PgColumn).notNull).toBe(true);
    });

    it("should have optional description column", () => {
      const columns = getTableColumns(transforms);
      expect((columns.description as PgColumn).notNull).toBe(false);
    });

    it("should have UUID foreign key columns for data sources", () => {
      const columns = getTableColumns(transforms);

      const sourceColumn = columns.sourceDataSourceId as PgColumn;
      expect(isUuidColumn(sourceColumn)).toBe(true);
      expect(sourceColumn.notNull).toBe(true);

      const outputColumn = columns.outputDataSourceId as PgColumn;
      expect(isUuidColumn(outputColumn)).toBe(true);
      expect(outputColumn.notNull).toBe(true);
    });

    it("should have JSONB config column", () => {
      const columns = getTableColumns(transforms);
      const configColumn = columns.config as PgColumn;
      expect(isJsonbColumn(configColumn)).toBe(true);
      expect(configColumn.notNull).toBe(true);
    });

    it("should have boolean enabled column with default true", () => {
      const columns = getTableColumns(transforms);
      const enabledColumn = columns.enabled as PgColumn;
      expect(isBooleanColumn(enabledColumn)).toBe(true);
      expect(enabledColumn.hasDefault).toBe(true);
    });

    it("should have timestamp columns with defaults", () => {
      const columns = getTableColumns(transforms);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });

    it("should have userId column for multi-tenancy", () => {
      const columns = getTableColumns(transforms);
      expect(columns.userId).toBeDefined();
      expect(isUuidColumn(columns.userId as PgColumn)).toBe(true);
    });
  });

  describe("transforms relations", () => {
    it("should export transformsRelations", () => {
      expect(transformsRelations).toBeDefined();
    });
  });
});

describe("Transform TypeScript Types", () => {
  describe("AggregationFunction type", () => {
    it("should accept valid aggregation functions", () => {
      const validFunctions: AggregationFunction[] = [
        "COUNT",
        "SUM",
        "MIN",
        "MAX",
        "AVG",
        "FIRST",
        "LAST",
        "CONCAT",
        "COLLECT",
        "DISTINCT_COUNT",
        "COUNT_IF",
      ];

      // Type-check: if this compiles, the type is correct
      expect(validFunctions).toHaveLength(11);
    });
  });

  describe("AggregationConfig type", () => {
    it("should accept valid aggregation config", () => {
      const config: AggregationConfig = {
        outputField: "product_count",
        function: "COUNT",
      };

      expect(config.outputField).toBe("product_count");
      expect(config.function).toBe("COUNT");
    });

    it("should accept aggregation config with sourceField", () => {
      const config: AggregationConfig = {
        sourceField: "price",
        outputField: "min_price",
        function: "MIN",
      };

      expect(config.sourceField).toBe("price");
      expect(config.outputField).toBe("min_price");
      expect(config.function).toBe("MIN");
    });

    it("should accept aggregation config with options", () => {
      const config: AggregationConfig = {
        sourceField: "name",
        outputField: "all_names",
        function: "CONCAT",
        options: {
          separator: ", ",
        },
      };

      expect(config.options?.separator).toBe(", ");
    });

    it("should accept COUNT config with distinct option", () => {
      const config: AggregationConfig = {
        sourceField: "category",
        outputField: "category_count",
        function: "COUNT",
        options: {
          distinct: true,
        },
      };

      expect(config.options?.distinct).toBe(true);
    });

    it("should accept COLLECT config with limit option", () => {
      const config: AggregationConfig = {
        sourceField: "sku",
        outputField: "all_skus",
        function: "COLLECT",
        options: {
          limit: 10,
        },
      };

      expect(config.options?.limit).toBe(10);
    });
  });

  describe("TransformConfig type", () => {
    it("should accept config with single groupBy field", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { outputField: "count", function: "COUNT" },
        ],
        includeGroupKey: true,
      };

      expect(config.groupBy).toBe("brand");
      expect(config.includeGroupKey).toBe(true);
    });

    it("should accept config with multiple groupBy fields", () => {
      const config: TransformConfig = {
        groupBy: ["category", "brand"],
        aggregations: [
          { outputField: "count", function: "COUNT" },
        ],
        includeGroupKey: true,
      };

      expect(config.groupBy).toEqual(["category", "brand"]);
    });

    it("should accept config with outputFieldPrefix", () => {
      const config: TransformConfig = {
        groupBy: "brand",
        aggregations: [
          { sourceField: "price", outputField: "price", function: "MIN" },
        ],
        includeGroupKey: true,
        outputFieldPrefix: "agg_",
      };

      expect(config.outputFieldPrefix).toBe("agg_");
    });

    it("should accept complex config with multiple aggregations", () => {
      const config: TransformConfig = {
        groupBy: "item.brand",
        aggregations: [
          { outputField: "product_count", function: "COUNT" },
          { sourceField: "price", outputField: "min_price", function: "MIN" },
          { sourceField: "price", outputField: "max_price", function: "MAX" },
          { sourceField: "price", outputField: "avg_price", function: "AVG" },
          { sourceField: "sku", outputField: "all_skus", function: "COLLECT" },
          {
            sourceField: "name",
            outputField: "names",
            function: "CONCAT",
            options: { separator: " | " },
          },
        ],
        includeGroupKey: true,
      };

      expect(config.aggregations).toHaveLength(6);
    });
  });

  describe("Transform and NewTransform types", () => {
    it("should be exportable types", () => {
      // These are compile-time checks - if they compile, the types exist
      const transform: Partial<Transform> = {
        id: "test-uuid",
        name: "Test Transform",
      };

      const newTransform: Partial<NewTransform> = {
        name: "New Transform",
      };

      expect(transform.name).toBe("Test Transform");
      expect(newTransform.name).toBe("New Transform");
    });
  });
});

describe("Schema Index Exports", () => {
  it("should export transforms table from index", async () => {
    const schema = await import("../index.js");
    expect(schema.transforms).toBeDefined();
  });

  it("should export transformsRelations from index", async () => {
    const schema = await import("../index.js");
    expect(schema.transformsRelations).toBeDefined();
  });

  it("should export Transform type from index", async () => {
    // Type import check - this is a compile-time verification
    type TransformFromIndex = import("../index.js").Transform;
    const _typeCheck: TransformFromIndex | null = null;
    expect(_typeCheck).toBeNull();
  });

  it("should export NewTransform type from index", async () => {
    type NewTransformFromIndex = import("../index.js").NewTransform;
    const _typeCheck: NewTransformFromIndex | null = null;
    expect(_typeCheck).toBeNull();
  });

  it("should export TransformConfig type from index", async () => {
    type TransformConfigFromIndex = import("../index.js").TransformConfig;
    const _typeCheck: TransformConfigFromIndex | null = null;
    expect(_typeCheck).toBeNull();
  });

  it("should export AggregationConfig type from index", async () => {
    type AggregationConfigFromIndex = import("../index.js").AggregationConfig;
    const _typeCheck: AggregationConfigFromIndex | null = null;
    expect(_typeCheck).toBeNull();
  });

  it("should export AggregationFunction type from index", async () => {
    type AggregationFunctionFromIndex =
      import("../index.js").AggregationFunction;
    const _typeCheck: AggregationFunctionFromIndex | null = null;
    expect(_typeCheck).toBeNull();
  });
});
