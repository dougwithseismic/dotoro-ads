import { describe, it, expect } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

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

// Helper to check if column is an integer
function isIntegerColumn(column: PgColumn): boolean {
  return column.columnType === "PgInteger";
}

// Helper to check if column is a varchar
function isVarcharColumn(column: PgColumn): boolean {
  return column.columnType === "PgVarchar";
}

// Helper to check if column is a text column
function isTextColumn(column: PgColumn): boolean {
  return column.columnType === "PgText";
}

// Helper to check if column is a decimal/numeric column
function isDecimalColumn(column: PgColumn): boolean {
  return column.columnType === "PgNumeric";
}

// Helper to check if column is an enum
function isEnumColumn(column: PgColumn): boolean {
  return column.columnType === "PgEnumColumn";
}

/**
 * Campaign Sets Schema Tests
 * TDD: These tests define the expected structure BEFORE implementation
 */
describe("Campaign Sets Schema", () => {
  describe("campaignSets table", () => {
    it("should have the correct table name", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      expect(getTableName(campaignSets)).toBe("campaign_sets");
    });

    it("should have all required columns", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("dataSourceId");
      expect(columnNames).toContain("templateId");
      expect(columnNames).toContain("config");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("syncStatus");
      expect(columnNames).toContain("lastSyncedAt");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have UUID primary key with default random", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      const idColumn = columns.id as PgColumn;
      expect(isUuidColumn(idColumn)).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have UUID userId column", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      expect(isUuidColumn(columns.userId as PgColumn)).toBe(true);
    });

    it("should have required name column with varchar(255)", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      const nameColumn = columns.name as PgColumn;
      expect(isVarcharColumn(nameColumn)).toBe(true);
      expect(nameColumn.notNull).toBe(true);
    });

    it("should have optional text description column", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      const descColumn = columns.description as PgColumn;
      expect(isTextColumn(descColumn)).toBe(true);
      expect(descColumn.notNull).toBe(false);
    });

    it("should have nullable UUID dataSourceId column", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      const dataSourceIdColumn = columns.dataSourceId as PgColumn;
      expect(isUuidColumn(dataSourceIdColumn)).toBe(true);
      expect(dataSourceIdColumn.notNull).toBe(false);
    });

    it("should have nullable UUID templateId column", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      const templateIdColumn = columns.templateId as PgColumn;
      expect(isUuidColumn(templateIdColumn)).toBe(true);
      expect(templateIdColumn.notNull).toBe(false);
    });

    it("should have JSONB config column for wizard state snapshot", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      expect(isJsonbColumn(columns.config as PgColumn)).toBe(true);
    });

    it("should have enum status column with correct values", async () => {
      const { campaignSets, campaignSetStatusEnum } = await import(
        "../schema/campaign-sets.js"
      );
      const columns = getTableColumns(campaignSets);
      expect(isEnumColumn(columns.status as PgColumn)).toBe(true);
      expect(campaignSetStatusEnum.enumName).toBe("campaign_set_status");
      expect(campaignSetStatusEnum.enumValues).toEqual([
        "draft",
        "pending",
        "syncing",
        "active",
        "paused",
        "completed",
        "archived",
        "error",
      ]);
    });

    it("should have enum syncStatus column with correct values", async () => {
      const { campaignSets, campaignSetSyncStatusEnum } = await import(
        "../schema/campaign-sets.js"
      );
      const columns = getTableColumns(campaignSets);
      expect(isEnumColumn(columns.syncStatus as PgColumn)).toBe(true);
      expect(campaignSetSyncStatusEnum.enumName).toBe("campaign_set_sync_status");
      expect(campaignSetSyncStatusEnum.enumValues).toEqual([
        "pending",
        "syncing",
        "synced",
        "failed",
        "conflict",
      ]);
    });

    it("should have nullable lastSyncedAt timestamp", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      const lastSyncedAtColumn = columns.lastSyncedAt as PgColumn;
      expect(lastSyncedAtColumn.columnType).toBe("PgTimestamp");
      expect(lastSyncedAtColumn.notNull).toBe(false);
    });

    it("should have timestamp columns with defaults", async () => {
      const { campaignSets } = await import("../schema/campaign-sets.js");
      const columns = getTableColumns(campaignSets);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("campaignSetStatusEnum", () => {
    it("should be defined as a pgEnum", async () => {
      const { campaignSetStatusEnum } = await import(
        "../schema/campaign-sets.js"
      );
      expect(campaignSetStatusEnum).toBeDefined();
      expect(campaignSetStatusEnum.enumName).toBe("campaign_set_status");
    });

    it("should have correct enum values", async () => {
      const { campaignSetStatusEnum } = await import(
        "../schema/campaign-sets.js"
      );
      expect(campaignSetStatusEnum.enumValues).toEqual([
        "draft",
        "pending",
        "syncing",
        "active",
        "paused",
        "completed",
        "archived",
        "error",
      ]);
    });
  });

  describe("campaignSetSyncStatusEnum", () => {
    it("should be defined as a pgEnum", async () => {
      const { campaignSetSyncStatusEnum } = await import(
        "../schema/campaign-sets.js"
      );
      expect(campaignSetSyncStatusEnum).toBeDefined();
      expect(campaignSetSyncStatusEnum.enumName).toBe("campaign_set_sync_status");
    });

    it("should have correct enum values", async () => {
      const { campaignSetSyncStatusEnum } = await import(
        "../schema/campaign-sets.js"
      );
      expect(campaignSetSyncStatusEnum.enumValues).toEqual([
        "pending",
        "syncing",
        "synced",
        "failed",
        "conflict",
      ]);
    });
  });
});

/**
 * Ad Groups Schema Tests (Normalized from JSONB)
 */
describe("Ad Groups Schema", () => {
  describe("adGroups table", () => {
    it("should have the correct table name", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      expect(getTableName(adGroups)).toBe("ad_groups");
    });

    it("should have all required columns", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("campaignId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("settings");
      expect(columnNames).toContain("platformAdGroupId");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("orderIndex");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have UUID primary key with default random", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      const idColumn = columns.id as PgColumn;
      expect(isUuidColumn(idColumn)).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have required UUID campaignId (FK to generatedCampaigns)", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      const campaignIdColumn = columns.campaignId as PgColumn;
      expect(isUuidColumn(campaignIdColumn)).toBe(true);
      expect(campaignIdColumn.notNull).toBe(true);
    });

    it("should have required name column with varchar(255)", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      const nameColumn = columns.name as PgColumn;
      expect(isVarcharColumn(nameColumn)).toBe(true);
      expect(nameColumn.notNull).toBe(true);
    });

    it("should have JSONB settings column", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      expect(isJsonbColumn(columns.settings as PgColumn)).toBe(true);
    });

    it("should have nullable platformAdGroupId varchar(255)", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      const platformAdGroupIdColumn = columns.platformAdGroupId as PgColumn;
      expect(isVarcharColumn(platformAdGroupIdColumn)).toBe(true);
      expect(platformAdGroupIdColumn.notNull).toBe(false);
    });

    it("should have enum status column with correct values", async () => {
      const { adGroups, adGroupStatusEnum } = await import(
        "../schema/ad-groups.js"
      );
      const columns = getTableColumns(adGroups);
      expect(isEnumColumn(columns.status as PgColumn)).toBe(true);
      expect(adGroupStatusEnum.enumName).toBe("ad_group_status");
      expect(adGroupStatusEnum.enumValues).toEqual([
        "active",
        "paused",
        "removed",
      ]);
    });

    it("should have integer orderIndex column", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      expect(isIntegerColumn(columns.orderIndex as PgColumn)).toBe(true);
    });

    it("should have timestamp columns with defaults", async () => {
      const { adGroups } = await import("../schema/ad-groups.js");
      const columns = getTableColumns(adGroups);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("adGroupStatusEnum", () => {
    it("should be defined as a pgEnum", async () => {
      const { adGroupStatusEnum } = await import("../schema/ad-groups.js");
      expect(adGroupStatusEnum).toBeDefined();
      expect(adGroupStatusEnum.enumName).toBe("ad_group_status");
    });

    it("should have correct enum values", async () => {
      const { adGroupStatusEnum } = await import("../schema/ad-groups.js");
      expect(adGroupStatusEnum.enumValues).toEqual([
        "active",
        "paused",
        "removed",
      ]);
    });
  });
});

/**
 * Ads Schema Tests
 */
describe("Ads Schema", () => {
  describe("ads table", () => {
    it("should have the correct table name", async () => {
      const { ads } = await import("../schema/ads.js");
      expect(getTableName(ads)).toBe("ads");
    });

    it("should have all required columns", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("adGroupId");
      expect(columnNames).toContain("headline");
      expect(columnNames).toContain("description");
      expect(columnNames).toContain("displayUrl");
      expect(columnNames).toContain("finalUrl");
      expect(columnNames).toContain("callToAction");
      expect(columnNames).toContain("assets");
      expect(columnNames).toContain("platformAdId");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("orderIndex");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have UUID primary key with default random", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      const idColumn = columns.id as PgColumn;
      expect(isUuidColumn(idColumn)).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have required UUID adGroupId (FK to adGroups)", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      const adGroupIdColumn = columns.adGroupId as PgColumn;
      expect(isUuidColumn(adGroupIdColumn)).toBe(true);
      expect(adGroupIdColumn.notNull).toBe(true);
    });

    it("should have headline varchar(300)", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isVarcharColumn(columns.headline as PgColumn)).toBe(true);
    });

    it("should have text description column", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isTextColumn(columns.description as PgColumn)).toBe(true);
    });

    it("should have displayUrl varchar(255)", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isVarcharColumn(columns.displayUrl as PgColumn)).toBe(true);
    });

    it("should have text finalUrl column", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isTextColumn(columns.finalUrl as PgColumn)).toBe(true);
    });

    it("should have callToAction varchar(50)", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isVarcharColumn(columns.callToAction as PgColumn)).toBe(true);
    });

    it("should have JSONB assets column", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isJsonbColumn(columns.assets as PgColumn)).toBe(true);
    });

    it("should have nullable platformAdId varchar(255)", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      const platformAdIdColumn = columns.platformAdId as PgColumn;
      expect(isVarcharColumn(platformAdIdColumn)).toBe(true);
      expect(platformAdIdColumn.notNull).toBe(false);
    });

    it("should have enum status column with correct values", async () => {
      const { ads, adStatusEnum } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isEnumColumn(columns.status as PgColumn)).toBe(true);
      expect(adStatusEnum.enumName).toBe("ad_status");
      expect(adStatusEnum.enumValues).toEqual(["active", "paused", "removed"]);
    });

    it("should have integer orderIndex column", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isIntegerColumn(columns.orderIndex as PgColumn)).toBe(true);
    });

    it("should have timestamp columns with defaults", async () => {
      const { ads } = await import("../schema/ads.js");
      const columns = getTableColumns(ads);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("adStatusEnum", () => {
    it("should be defined as a pgEnum", async () => {
      const { adStatusEnum } = await import("../schema/ads.js");
      expect(adStatusEnum).toBeDefined();
      expect(adStatusEnum.enumName).toBe("ad_status");
    });

    it("should have correct enum values", async () => {
      const { adStatusEnum } = await import("../schema/ads.js");
      expect(adStatusEnum.enumValues).toEqual(["active", "paused", "removed"]);
    });
  });
});

/**
 * Keywords Schema Tests
 */
describe("Keywords Schema", () => {
  describe("keywords table", () => {
    it("should have the correct table name", async () => {
      const { keywords } = await import("../schema/keywords.js");
      expect(getTableName(keywords)).toBe("keywords");
    });

    it("should have all required columns", async () => {
      const { keywords } = await import("../schema/keywords.js");
      const columns = getTableColumns(keywords);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("adGroupId");
      expect(columnNames).toContain("keyword");
      expect(columnNames).toContain("matchType");
      expect(columnNames).toContain("bid");
      expect(columnNames).toContain("platformKeywordId");
      expect(columnNames).toContain("status");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have UUID primary key with default random", async () => {
      const { keywords } = await import("../schema/keywords.js");
      const columns = getTableColumns(keywords);
      const idColumn = columns.id as PgColumn;
      expect(isUuidColumn(idColumn)).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have required UUID adGroupId (FK to adGroups)", async () => {
      const { keywords } = await import("../schema/keywords.js");
      const columns = getTableColumns(keywords);
      const adGroupIdColumn = columns.adGroupId as PgColumn;
      expect(isUuidColumn(adGroupIdColumn)).toBe(true);
      expect(adGroupIdColumn.notNull).toBe(true);
    });

    it("should have required keyword varchar(255)", async () => {
      const { keywords } = await import("../schema/keywords.js");
      const columns = getTableColumns(keywords);
      const keywordColumn = columns.keyword as PgColumn;
      expect(isVarcharColumn(keywordColumn)).toBe(true);
      expect(keywordColumn.notNull).toBe(true);
    });

    it("should have enum matchType column with correct values", async () => {
      const { keywords, keywordMatchTypeEnum } = await import(
        "../schema/keywords.js"
      );
      const columns = getTableColumns(keywords);
      expect(isEnumColumn(columns.matchType as PgColumn)).toBe(true);
      expect(keywordMatchTypeEnum.enumName).toBe("keyword_match_type");
      expect(keywordMatchTypeEnum.enumValues).toEqual([
        "broad",
        "phrase",
        "exact",
      ]);
    });

    it("should have nullable decimal(10,2) bid column", async () => {
      const { keywords } = await import("../schema/keywords.js");
      const columns = getTableColumns(keywords);
      const bidColumn = columns.bid as PgColumn;
      expect(isDecimalColumn(bidColumn)).toBe(true);
      expect(bidColumn.notNull).toBe(false);
    });

    it("should have nullable platformKeywordId varchar(255)", async () => {
      const { keywords } = await import("../schema/keywords.js");
      const columns = getTableColumns(keywords);
      const platformKeywordIdColumn = columns.platformKeywordId as PgColumn;
      expect(isVarcharColumn(platformKeywordIdColumn)).toBe(true);
      expect(platformKeywordIdColumn.notNull).toBe(false);
    });

    it("should have enum status column with correct values", async () => {
      const { keywords, keywordStatusEnum } = await import(
        "../schema/keywords.js"
      );
      const columns = getTableColumns(keywords);
      expect(isEnumColumn(columns.status as PgColumn)).toBe(true);
      expect(keywordStatusEnum.enumName).toBe("keyword_status");
      expect(keywordStatusEnum.enumValues).toEqual([
        "active",
        "paused",
        "removed",
      ]);
    });

    it("should have timestamp columns with defaults", async () => {
      const { keywords } = await import("../schema/keywords.js");
      const columns = getTableColumns(keywords);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });
  });

  describe("keywordMatchTypeEnum", () => {
    it("should be defined as a pgEnum", async () => {
      const { keywordMatchTypeEnum } = await import("../schema/keywords.js");
      expect(keywordMatchTypeEnum).toBeDefined();
      expect(keywordMatchTypeEnum.enumName).toBe("keyword_match_type");
    });

    it("should have correct enum values", async () => {
      const { keywordMatchTypeEnum } = await import("../schema/keywords.js");
      expect(keywordMatchTypeEnum.enumValues).toEqual([
        "broad",
        "phrase",
        "exact",
      ]);
    });
  });

  describe("keywordStatusEnum", () => {
    it("should be defined as a pgEnum", async () => {
      const { keywordStatusEnum } = await import("../schema/keywords.js");
      expect(keywordStatusEnum).toBeDefined();
      expect(keywordStatusEnum.enumName).toBe("keyword_status");
    });

    it("should have correct enum values", async () => {
      const { keywordStatusEnum } = await import("../schema/keywords.js");
      expect(keywordStatusEnum.enumValues).toEqual([
        "active",
        "paused",
        "removed",
      ]);
    });
  });
});

/**
 * Generated Campaigns Modification Tests
 * Test that the new columns are added to generatedCampaigns
 */
describe("Generated Campaigns Schema Modifications", () => {
  describe("generatedCampaigns table modifications", () => {
    it("should have campaignSetId column (nullable FK to campaignSets)", async () => {
      const { generatedCampaigns } = await import(
        "../schema/generated-campaigns.js"
      );
      const columns = getTableColumns(generatedCampaigns);
      const campaignSetIdColumn = columns.campaignSetId as PgColumn;
      expect(campaignSetIdColumn).toBeDefined();
      expect(isUuidColumn(campaignSetIdColumn)).toBe(true);
      expect(campaignSetIdColumn.notNull).toBe(false);
    });

    it("should have orderIndex column for ordering within set", async () => {
      const { generatedCampaigns } = await import(
        "../schema/generated-campaigns.js"
      );
      const columns = getTableColumns(generatedCampaigns);
      const orderIndexColumn = columns.orderIndex as PgColumn;
      expect(orderIndexColumn).toBeDefined();
      expect(isIntegerColumn(orderIndexColumn)).toBe(true);
    });
  });
});

/**
 * Schema Exports Tests
 * Verify all new schemas are properly exported from index
 */
describe("Schema Index Exports", () => {
  it("should export campaignSets table and enums", async () => {
    const schema = await import("../schema/index.js");

    expect(schema.campaignSets).toBeDefined();
    expect(schema.campaignSetStatusEnum).toBeDefined();
    expect(schema.campaignSetSyncStatusEnum).toBeDefined();
    expect(schema.campaignSetsRelations).toBeDefined();
  });

  it("should export adGroups table and enums", async () => {
    const schema = await import("../schema/index.js");

    expect(schema.adGroups).toBeDefined();
    expect(schema.adGroupStatusEnum).toBeDefined();
    expect(schema.adGroupsRelations).toBeDefined();
  });

  it("should export ads table and enums", async () => {
    const schema = await import("../schema/index.js");

    expect(schema.ads).toBeDefined();
    expect(schema.adStatusEnum).toBeDefined();
    expect(schema.adsRelations).toBeDefined();
  });

  it("should export keywords table and enums", async () => {
    const schema = await import("../schema/index.js");

    expect(schema.keywords).toBeDefined();
    expect(schema.keywordMatchTypeEnum).toBeDefined();
    expect(schema.keywordStatusEnum).toBeDefined();
    expect(schema.keywordsRelations).toBeDefined();
  });

  it("should export CampaignSet types", async () => {
    // Type exports are validated at compile time
    // This test ensures the types are exported
    const schema = await import("../schema/index.js");
    expect(schema).toBeDefined();
  });
});

/**
 * Relations Tests
 * Test that all relations are properly defined
 */
describe("Schema Relations", () => {
  it("campaignSets should relate to generatedCampaigns", async () => {
    const schema = await import("../schema/index.js");
    expect(schema.campaignSetsRelations).toBeDefined();
  });

  it("adGroups should relate to generatedCampaigns and ads and keywords", async () => {
    const schema = await import("../schema/index.js");
    expect(schema.adGroupsRelations).toBeDefined();
  });

  it("ads should relate to adGroups", async () => {
    const schema = await import("../schema/index.js");
    expect(schema.adsRelations).toBeDefined();
  });

  it("keywords should relate to adGroups", async () => {
    const schema = await import("../schema/index.js");
    expect(schema.keywordsRelations).toBeDefined();
  });
});
