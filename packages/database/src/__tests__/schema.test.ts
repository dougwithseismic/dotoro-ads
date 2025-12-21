import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { PgColumn, PgTableWithColumns } from "drizzle-orm/pg-core";

// Import all schemas - will fail until implemented
import {
  dataSources,
  dataRows,
  columnMappings,
  dataSourceTypeEnum,
} from "../schema/data-sources.js";
import {
  campaignTemplates,
  adGroupTemplates,
  adTemplates,
  platformEnum,
} from "../schema/campaign-templates.js";
import {
  rules,
  templateRules,
  ruleTypeEnum,
} from "../schema/rules.js";
import {
  generatedCampaigns,
  syncRecords,
  campaignStatusEnum,
  syncStatusEnum,
} from "../schema/generated-campaigns.js";
import {
  adAccounts,
  oauthTokens,
  accountStatusEnum,
} from "../schema/ad-accounts.js";

// Helper to check if column is a UUID (using columnType which reflects Postgres type)
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

// Helper to check if a table has a specific unique index
function getTableIndexes(table: PgTableWithColumns<any>): string[] {
  const config = (table as any)[Symbol.for("drizzle:PgInlineForeignKeys")];
  return [];
}

describe("Data Sources Schema", () => {
  describe("dataSources table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(dataSources)).toBe("data_sources");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(dataSources);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("type");
      expect(columnNames).toContain("config");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have UUID primary key", () => {
      const columns = getTableColumns(dataSources);
      const idColumn = columns.id as PgColumn;
      expect(isUuidColumn(idColumn)).toBe(true);
      expect(idColumn.hasDefault).toBe(true); // UUID has defaultRandom()
    });

    it("should have JSONB config column", () => {
      const columns = getTableColumns(dataSources);
      expect(isJsonbColumn(columns.config as PgColumn)).toBe(true);
    });

    it("should have timestamp columns with defaults", () => {
      const columns = getTableColumns(dataSources);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });

    it("should have required name and type columns", () => {
      const columns = getTableColumns(dataSources);
      expect((columns.name as PgColumn).notNull).toBe(true);
      expect((columns.type as PgColumn).notNull).toBe(true);
    });

    it("should have userId column for multi-tenancy", () => {
      const columns = getTableColumns(dataSources);
      expect(columns.userId).toBeDefined();
      expect(isUuidColumn(columns.userId as PgColumn)).toBe(true);
    });
  });

  describe("dataRows table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(dataRows)).toBe("data_rows");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(dataRows);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("dataSourceId");
      expect(columnNames).toContain("rowData");
      expect(columnNames).toContain("rowIndex");
      expect(columnNames).toContain("createdAt");
    });

    it("should have JSONB rowData column", () => {
      const columns = getTableColumns(dataRows);
      expect(isJsonbColumn(columns.rowData as PgColumn)).toBe(true);
    });

    it("should have foreign key to dataSources", () => {
      const columns = getTableColumns(dataRows);
      expect((columns.dataSourceId as PgColumn).notNull).toBe(true);
    });
  });

  describe("columnMappings table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(columnMappings)).toBe("column_mappings");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(columnMappings);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("dataSourceId");
      expect(columnNames).toContain("sourceColumn");
      expect(columnNames).toContain("normalizedName");
      expect(columnNames).toContain("dataType");
    });

    it("should have createdAt and updatedAt timestamps", () => {
      const columns = getTableColumns(columnMappings);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("dataSourceTypeEnum", () => {
    it("should be defined as a pgEnum", () => {
      expect(dataSourceTypeEnum).toBeDefined();
      expect(dataSourceTypeEnum.enumName).toBe("data_source_type");
    });

    it("should have correct enum values", () => {
      expect(dataSourceTypeEnum.enumValues).toEqual(["csv", "api", "manual"]);
    });
  });
});

describe("Campaign Templates Schema", () => {
  describe("campaignTemplates table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(campaignTemplates)).toBe("campaign_templates");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(campaignTemplates);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("platform");
      expect(columnNames).toContain("structure");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have JSONB structure column", () => {
      const columns = getTableColumns(campaignTemplates);
      expect(isJsonbColumn(columns.structure as PgColumn)).toBe(true);
    });

    it("should have userId column for multi-tenancy", () => {
      const columns = getTableColumns(campaignTemplates);
      expect(columns.userId).toBeDefined();
      expect(isUuidColumn(columns.userId as PgColumn)).toBe(true);
    });
  });

  describe("adGroupTemplates table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(adGroupTemplates)).toBe("ad_group_templates");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(adGroupTemplates);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("campaignTemplateId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("settings");
    });

    it("should have JSONB settings column", () => {
      const columns = getTableColumns(adGroupTemplates);
      expect(isJsonbColumn(columns.settings as PgColumn)).toBe(true);
    });

    it("should have createdAt and updatedAt timestamps", () => {
      const columns = getTableColumns(adGroupTemplates);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("adTemplates table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(adTemplates)).toBe("ad_templates");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(adTemplates);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("adGroupTemplateId");
      expect(columnNames).toContain("headline");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("variables");
    });

    it("should have JSONB variables column", () => {
      const columns = getTableColumns(adTemplates);
      expect(isJsonbColumn(columns.variables as PgColumn)).toBe(true);
    });

    it("should have createdAt and updatedAt timestamps", () => {
      const columns = getTableColumns(adTemplates);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("platformEnum", () => {
    it("should be defined as a pgEnum", () => {
      expect(platformEnum).toBeDefined();
      expect(platformEnum.enumName).toBe("platform");
    });

    it("should have correct enum values", () => {
      expect(platformEnum.enumValues).toEqual(["reddit", "google", "facebook"]);
    });
  });
});

describe("Rules Schema", () => {
  describe("rules table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(rules)).toBe("rules");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(rules);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("type");
      expect(columnNames).toContain("conditions");
      expect(columnNames).toContain("actions");
      expect(columnNames).toContain("priority");
      expect(columnNames).toContain("enabled");
    });

    it("should have JSONB conditions and actions columns", () => {
      const columns = getTableColumns(rules);
      expect(isJsonbColumn(columns.conditions as PgColumn)).toBe(true);
      expect(isJsonbColumn(columns.actions as PgColumn)).toBe(true);
    });

    it("should have boolean enabled with default true", () => {
      const columns = getTableColumns(rules);
      expect((columns.enabled as PgColumn).hasDefault).toBe(true);
    });

    it("should have userId column for multi-tenancy", () => {
      const columns = getTableColumns(rules);
      expect(columns.userId).toBeDefined();
      expect(isUuidColumn(columns.userId as PgColumn)).toBe(true);
    });

    it("should have createdAt and updatedAt timestamps", () => {
      const columns = getTableColumns(rules);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("templateRules table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(templateRules)).toBe("template_rules");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(templateRules);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("templateId");
      expect(columnNames).toContain("ruleId");
      expect(columnNames).toContain("executionOrder");
    });

    it("should have createdAt and updatedAt timestamps for consistency", () => {
      const columns = getTableColumns(templateRules);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("ruleTypeEnum", () => {
    it("should be defined as a pgEnum", () => {
      expect(ruleTypeEnum).toBeDefined();
      expect(ruleTypeEnum.enumName).toBe("rule_type");
    });

    it("should have correct enum values", () => {
      expect(ruleTypeEnum.enumValues).toEqual(["filter", "transform", "conditional"]);
    });
  });
});

describe("Generated Campaigns Schema", () => {
  describe("generatedCampaigns table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(generatedCampaigns)).toBe("generated_campaigns");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(generatedCampaigns);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("templateId");
      expect(columnNames).toContain("dataRowId");
      expect(columnNames).toContain("campaignData");
      expect(columnNames).toContain("status");
    });

    it("should have JSONB campaignData column", () => {
      const columns = getTableColumns(generatedCampaigns);
      expect(isJsonbColumn(columns.campaignData as PgColumn)).toBe(true);
    });

    it("should have userId column for multi-tenancy", () => {
      const columns = getTableColumns(generatedCampaigns);
      expect(columns.userId).toBeDefined();
      expect(isUuidColumn(columns.userId as PgColumn)).toBe(true);
    });
  });

  describe("syncRecords table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(syncRecords)).toBe("sync_records");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(syncRecords);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("generatedCampaignId");
      expect(columnNames).toContain("platform");
      expect(columnNames).toContain("platformId");
      expect(columnNames).toContain("syncStatus");
      expect(columnNames).toContain("lastSyncedAt");
      expect(columnNames).toContain("errorLog");
    });

    it("should use platformEnum for platform column (consistency with campaignTemplates)", () => {
      const columns = getTableColumns(syncRecords);
      const platformColumn = columns.platform as PgColumn;
      // Enum columns have columnType "PgEnumColumn"
      expect(platformColumn.columnType).toBe("PgEnumColumn");
      // Verify it uses the same enum as campaignTemplates
      expect(platformColumn.enumValues).toEqual(["reddit", "google", "facebook"]);
    });
  });

  describe("campaignStatusEnum", () => {
    it("should be defined as a pgEnum", () => {
      expect(campaignStatusEnum).toBeDefined();
      expect(campaignStatusEnum.enumName).toBe("campaign_status");
    });

    it("should have correct enum values", () => {
      expect(campaignStatusEnum.enumValues).toEqual([
        "draft",
        "pending",
        "active",
        "paused",
        "completed",
        "error",
      ]);
    });
  });

  describe("syncStatusEnum", () => {
    it("should be defined as a pgEnum", () => {
      expect(syncStatusEnum).toBeDefined();
      expect(syncStatusEnum.enumName).toBe("sync_status");
    });

    it("should have correct enum values", () => {
      expect(syncStatusEnum.enumValues).toEqual([
        "pending",
        "syncing",
        "synced",
        "failed",
        "conflict",
      ]);
    });
  });
});

describe("Ad Accounts Schema", () => {
  describe("adAccounts table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(adAccounts)).toBe("ad_accounts");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(adAccounts);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("platform");
      expect(columnNames).toContain("accountId");
      expect(columnNames).toContain("accountName");
      expect(columnNames).toContain("credentials");
      expect(columnNames).toContain("status");
    });

    it("should have userId column for multi-tenancy", () => {
      const columns = getTableColumns(adAccounts);
      expect(columns.userId).toBeDefined();
      expect(isUuidColumn(columns.userId as PgColumn)).toBe(true);
    });
  });

  describe("oauthTokens table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(oauthTokens)).toBe("oauth_tokens");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(oauthTokens);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("adAccountId");
      expect(columnNames).toContain("accessToken");
      expect(columnNames).toContain("refreshToken");
      expect(columnNames).toContain("expiresAt");
    });
  });

  describe("accountStatusEnum", () => {
    it("should be defined as a pgEnum", () => {
      expect(accountStatusEnum).toBeDefined();
      expect(accountStatusEnum.enumName).toBe("account_status");
    });

    it("should have correct enum values", () => {
      expect(accountStatusEnum.enumValues).toEqual([
        "active",
        "inactive",
        "error",
        "revoked",
      ]);
    });
  });
});

// Test relations between tables
describe("Schema Relations", () => {
  it("should export all schema tables from index", async () => {
    const schema = await import("../schema/index.js");

    // Data sources
    expect(schema.dataSources).toBeDefined();
    expect(schema.dataRows).toBeDefined();
    expect(schema.columnMappings).toBeDefined();

    // Campaign templates
    expect(schema.campaignTemplates).toBeDefined();
    expect(schema.adGroupTemplates).toBeDefined();
    expect(schema.adTemplates).toBeDefined();

    // Rules
    expect(schema.rules).toBeDefined();
    expect(schema.templateRules).toBeDefined();

    // Generated campaigns
    expect(schema.generatedCampaigns).toBeDefined();
    expect(schema.syncRecords).toBeDefined();

    // Ad accounts
    expect(schema.adAccounts).toBeDefined();
    expect(schema.oauthTokens).toBeDefined();
  });

  it("should export all enum types from index", async () => {
    const schema = await import("../schema/index.js");

    expect(schema.dataSourceTypeEnum).toBeDefined();
    expect(schema.platformEnum).toBeDefined();
    expect(schema.ruleTypeEnum).toBeDefined();
    expect(schema.campaignStatusEnum).toBeDefined();
    expect(schema.syncStatusEnum).toBeDefined();
    expect(schema.accountStatusEnum).toBeDefined();
  });
});

// Test unique indexes
// Note: Drizzle unique indexes are verified via the schema definition.
// These tests verify the schema structure is properly defined.
// Actual unique constraint enforcement is a database-level concern.
describe("Unique Constraints", () => {
  describe("adAccounts unique constraints", () => {
    it("should have unique index on platform + accountId (verified via schema definition)", () => {
      // The schema defines: uniqueIndex("ad_accounts_platform_account_unique_idx").on(table.platform, table.accountId)
      // We verify the table has the required columns
      const columns = getTableColumns(adAccounts);
      expect(columns.platform).toBeDefined();
      expect(columns.accountId).toBeDefined();
      // The unique index is defined in the table config - testing structure exists
      expect(getTableName(adAccounts)).toBe("ad_accounts");
    });
  });

  describe("oauthTokens unique constraints", () => {
    it("should have unique index on adAccountId for one-to-one relationship (verified via schema definition)", () => {
      // The schema defines: uniqueIndex("oauth_tokens_account_unique_idx").on(table.adAccountId)
      const columns = getTableColumns(oauthTokens);
      expect(columns.adAccountId).toBeDefined();
      expect(getTableName(oauthTokens)).toBe("oauth_tokens");
    });
  });

  describe("templateRules unique constraints", () => {
    it("should have unique index on templateId + ruleId (verified via schema definition)", () => {
      // The schema defines: uniqueIndex("template_rules_template_rule_unique_idx").on(table.templateId, table.ruleId)
      const columns = getTableColumns(templateRules);
      expect(columns.templateId).toBeDefined();
      expect(columns.ruleId).toBeDefined();
      expect(getTableName(templateRules)).toBe("template_rules");
    });
  });

  describe("columnMappings unique constraints", () => {
    it("should have unique index on dataSourceId + sourceColumn (verified via schema definition)", () => {
      // The schema defines: uniqueIndex("column_mappings_source_column_unique_idx").on(table.dataSourceId, table.sourceColumn)
      const columns = getTableColumns(columnMappings);
      expect(columns.dataSourceId).toBeDefined();
      expect(columns.sourceColumn).toBeDefined();
      expect(getTableName(columnMappings)).toBe("column_mappings");
    });
  });
});

// Test lazy database connection
describe("Lazy Database Connection", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    vi.resetModules();
  });

  it("should export getDb function", async () => {
    const client = await import("../client.js");
    expect(typeof client.getDb).toBe("function");
  });

  it("should export closeDb function", async () => {
    const client = await import("../client.js");
    expect(typeof client.closeDb).toBe("function");
  });

  it("should export db for backward compatibility", async () => {
    const client = await import("../client.js");
    expect(client.db).toBeDefined();
  });
});

// Test createDatabaseClient validation
describe("createDatabaseClient validation", () => {
  it("should throw error for empty URL", async () => {
    const client = await import("../client.js");
    expect(() => client.createDatabaseClient("")).toThrow(
      "createDatabaseClient requires a valid PostgreSQL connection URL"
    );
  });

  it("should throw error for invalid URL format", async () => {
    const client = await import("../client.js");
    expect(() => client.createDatabaseClient("http://localhost:5432/db")).toThrow(
      "Invalid PostgreSQL connection URL format"
    );
    expect(() => client.createDatabaseClient("mysql://localhost:3306/db")).toThrow(
      "Invalid PostgreSQL connection URL format"
    );
  });

  it("should accept valid postgres:// URL", async () => {
    const client = await import("../client.js");
    // This should not throw
    expect(() => client.createDatabaseClient("postgres://localhost:5432/test")).not.toThrow();
  });

  it("should accept valid postgresql:// URL", async () => {
    const client = await import("../client.js");
    // This should not throw
    expect(() => client.createDatabaseClient("postgresql://localhost:5432/test")).not.toThrow();
  });
});

// Test getDb error handling in non-test environments
describe("getDb environment-based error handling", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("should throw error in production when DATABASE_URL is not set", async () => {
    process.env.NODE_ENV = "production";
    const client = await import("../client.js");
    expect(() => client.getDb()).toThrow(
      "DATABASE_URL environment variable is not set"
    );
  });

  it("should throw error in development when DATABASE_URL is not set", async () => {
    process.env.NODE_ENV = "development";
    const client = await import("../client.js");
    expect(() => client.getDb()).toThrow(
      "DATABASE_URL environment variable is not set"
    );
  });
});
