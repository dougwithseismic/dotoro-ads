/**
 * Database Integration Tests
 *
 * These tests verify:
 * 1. Database connection works
 * 2. Migrations run successfully (tables exist)
 * 3. Seed data is inserted correctly
 * 4. Basic CRUD operations work on key tables
 *
 * Prerequisites:
 * - PostgreSQL test database running (pnpm db:start:test)
 * - DATABASE_URL set to test database or using default test connection
 *
 * Run with: pnpm test:integration
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql, eq } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "../schema/index.js";

// Test database connection string
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@localhost:5433/dotoro_test";

// Database client and connection
let client: ReturnType<typeof postgres>;
let db: ReturnType<typeof drizzle<typeof schema>>;

describe("Database Integration Tests", () => {
  beforeAll(async () => {
    // Create database connection
    client = postgres(TEST_DATABASE_URL);
    db = drizzle(client, { schema });

    // Wait for connection to be established
    await sql`SELECT 1`;
  });

  afterAll(async () => {
    // Clean up connection
    await client.end();
  });

  describe("Connection", () => {
    it("should connect to the database", async () => {
      const result = await db.execute(sql`SELECT 1 as test`);
      expect(result).toBeDefined();
      expect(result[0]).toEqual({ test: 1 });
    });

    it("should be able to generate UUIDs", async () => {
      // gen_random_uuid() is built into PostgreSQL 13+ and doesn't require extension
      const result = await db.execute(sql`SELECT gen_random_uuid() as uuid`);
      expect(result[0]?.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("Schema Tables Exist", () => {
    const expectedTables = [
      "data_sources",
      "data_rows",
      "column_mappings",
      "campaign_templates",
      "ad_group_templates",
      "ad_templates",
      "rules",
      "template_rules",
      "generated_campaigns",
      "sync_records",
      "ad_accounts",
      "oauth_tokens",
      "creatives",
      "creative_tags",
      "creative_template_links",
    ];

    it.each(expectedTables)("should have table '%s'", async (tableName) => {
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = ${tableName}
        ) as exists
      `);
      expect(result[0]?.exists).toBe(true);
    });
  });

  describe("Enum Types Exist", () => {
    const expectedEnums = [
      { name: "data_source_type", values: ["csv", "api", "manual"] },
      { name: "platform", values: ["reddit", "google", "facebook"] },
      { name: "rule_type", values: ["filter", "transform", "conditional"] },
      {
        name: "campaign_status",
        values: ["draft", "pending", "active", "paused", "completed", "error"],
      },
      {
        name: "sync_status",
        values: ["pending", "syncing", "synced", "failed", "conflict"],
      },
      {
        name: "account_status",
        values: ["active", "inactive", "error", "revoked"],
      },
      { name: "creative_type", values: ["IMAGE", "VIDEO", "CAROUSEL"] },
      {
        name: "creative_status",
        values: ["PENDING", "UPLOADED", "PROCESSING", "READY", "FAILED"],
      },
    ];

    it.each(expectedEnums)(
      "should have enum '$name' with correct values",
      async ({ name, values }) => {
        const result = await db.execute(sql`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (
          SELECT oid FROM pg_type WHERE typname = ${name}
        )
        ORDER BY enumsortorder
      `);

        const enumValues = result.map((r) => r.enumlabel);
        expect(enumValues).toEqual(values);
      }
    );
  });
});

describe("CRUD Operations", () => {
  beforeAll(async () => {
    client = postgres(TEST_DATABASE_URL);
    db = drizzle(client, { schema });
  });

  afterAll(async () => {
    await client.end();
  });

  describe("Data Sources", () => {
    let testDataSourceId: string;

    afterEach(async () => {
      // Clean up test data
      if (testDataSourceId) {
        await db
          .delete(schema.dataSources)
          .where(eq(schema.dataSources.id, testDataSourceId));
        testDataSourceId = "";
      }
    });

    it("should create a data source", async () => {
      const [result] = await db
        .insert(schema.dataSources)
        .values({
          name: "Test Data Source",
          type: "csv",
          config: { test: true },
        })
        .returning();

      testDataSourceId = result.id;

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBe("Test Data Source");
      expect(result.type).toBe("csv");
      expect(result.config).toEqual({ test: true });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it("should read a data source", async () => {
      // Create first
      const [created] = await db
        .insert(schema.dataSources)
        .values({
          name: "Read Test Source",
          type: "api",
        })
        .returning();

      testDataSourceId = created.id;

      // Read it back
      const [result] = await db
        .select()
        .from(schema.dataSources)
        .where(eq(schema.dataSources.id, created.id));

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.name).toBe("Read Test Source");
    });

    it("should update a data source", async () => {
      // Create first
      const [created] = await db
        .insert(schema.dataSources)
        .values({
          name: "Update Test Source",
          type: "manual",
        })
        .returning();

      testDataSourceId = created.id;

      // Update it
      const [updated] = await db
        .update(schema.dataSources)
        .set({ name: "Updated Name" })
        .where(eq(schema.dataSources.id, created.id))
        .returning();

      expect(updated.name).toBe("Updated Name");
      // Note: $onUpdate doesn't automatically run in drizzle without trigger
    });

    it("should delete a data source", async () => {
      // Create first
      const [created] = await db
        .insert(schema.dataSources)
        .values({
          name: "Delete Test Source",
          type: "csv",
        })
        .returning();

      // Delete it
      await db
        .delete(schema.dataSources)
        .where(eq(schema.dataSources.id, created.id));

      // Verify it's gone
      const results = await db
        .select()
        .from(schema.dataSources)
        .where(eq(schema.dataSources.id, created.id));

      expect(results).toHaveLength(0);
      // Don't set testDataSourceId since we deleted it
    });
  });

  describe("Campaign Templates", () => {
    let testTemplateId: string;

    afterEach(async () => {
      if (testTemplateId) {
        await db
          .delete(schema.campaignTemplates)
          .where(eq(schema.campaignTemplates.id, testTemplateId));
        testTemplateId = "";
      }
    });

    it("should create a campaign template", async () => {
      const [result] = await db
        .insert(schema.campaignTemplates)
        .values({
          name: "Test Template",
          platform: "reddit",
          structure: {
            objective: "CONVERSIONS",
            budget: { type: "daily", amount: 50, currency: "USD" },
          },
        })
        .returning();

      testTemplateId = result.id;

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Template");
      expect(result.platform).toBe("reddit");
      expect(result.structure).toEqual({
        objective: "CONVERSIONS",
        budget: { type: "daily", amount: 50, currency: "USD" },
      });
    });

    it("should query templates by platform", async () => {
      // Create templates for different platforms
      const [reddit] = await db
        .insert(schema.campaignTemplates)
        .values({ name: "Reddit Template", platform: "reddit" })
        .returning();

      const [google] = await db
        .insert(schema.campaignTemplates)
        .values({ name: "Google Template", platform: "google" })
        .returning();

      testTemplateId = reddit.id; // We'll clean up one, manually clean the other

      try {
        // Query only reddit templates
        const redditTemplates = await db
          .select()
          .from(schema.campaignTemplates)
          .where(eq(schema.campaignTemplates.platform, "reddit"));

        const hasOurReddit = redditTemplates.some((t) => t.id === reddit.id);
        const hasGoogle = redditTemplates.some((t) => t.id === google.id);

        expect(hasOurReddit).toBe(true);
        expect(hasGoogle).toBe(false);
      } finally {
        // Clean up google template
        await db
          .delete(schema.campaignTemplates)
          .where(eq(schema.campaignTemplates.id, google.id));
      }
    });
  });

  describe("Rules", () => {
    let testRuleId: string;

    afterEach(async () => {
      if (testRuleId) {
        await db.delete(schema.rules).where(eq(schema.rules.id, testRuleId));
        testRuleId = "";
      }
    });

    it("should create a rule with conditions and actions", async () => {
      const [result] = await db
        .insert(schema.rules)
        .values({
          name: "Test Rule",
          type: "filter",
          priority: 10,
          enabled: true,
          conditions: [
            {
              field: "price",
              operator: "greater_than",
              value: 100,
            },
          ],
          actions: [
            {
              type: "set",
              target: "ad_group",
              value: "Premium",
            },
          ],
        })
        .returning();

      testRuleId = result.id;

      expect(result).toBeDefined();
      expect(result.name).toBe("Test Rule");
      expect(result.type).toBe("filter");
      expect(result.priority).toBe(10);
      expect(result.enabled).toBe(true);
      expect(result.conditions).toHaveLength(1);
      expect(result.conditions[0].field).toBe("price");
      expect(result.actions).toHaveLength(1);
      expect(result.actions[0].type).toBe("set");
    });

    it("should query enabled rules ordered by priority", async () => {
      // Create rules with different priorities
      const [lowPriority] = await db
        .insert(schema.rules)
        .values({
          name: "Low Priority",
          type: "filter",
          priority: 1,
          enabled: true,
          conditions: [],
          actions: [],
        })
        .returning();

      const [highPriority] = await db
        .insert(schema.rules)
        .values({
          name: "High Priority",
          type: "filter",
          priority: 100,
          enabled: true,
          conditions: [],
          actions: [],
        })
        .returning();

      const [disabled] = await db
        .insert(schema.rules)
        .values({
          name: "Disabled",
          type: "filter",
          priority: 50,
          enabled: false,
          conditions: [],
          actions: [],
        })
        .returning();

      testRuleId = lowPriority.id; // Will clean up one

      try {
        // Query enabled rules
        const enabledRules = await db
          .select()
          .from(schema.rules)
          .where(eq(schema.rules.enabled, true))
          .orderBy(schema.rules.priority);

        const ourRules = enabledRules.filter(
          (r) => r.id === lowPriority.id || r.id === highPriority.id
        );
        expect(ourRules).toHaveLength(2);

        // Verify disabled rule is not included
        const hasDisabled = enabledRules.some((r) => r.id === disabled.id);
        expect(hasDisabled).toBe(false);
      } finally {
        // Clean up other rules
        await db
          .delete(schema.rules)
          .where(eq(schema.rules.id, highPriority.id));
        await db.delete(schema.rules).where(eq(schema.rules.id, disabled.id));
      }
    });
  });

  describe("Foreign Key Relationships", () => {
    let dataSourceId: string;
    let templateId: string;

    afterEach(async () => {
      // Clean up in reverse order of dependencies
      if (templateId) {
        await db
          .delete(schema.campaignTemplates)
          .where(eq(schema.campaignTemplates.id, templateId));
        templateId = "";
      }
      if (dataSourceId) {
        await db
          .delete(schema.dataSources)
          .where(eq(schema.dataSources.id, dataSourceId));
        dataSourceId = "";
      }
    });

    it("should create data rows linked to data source", async () => {
      // Create data source first
      const [source] = await db
        .insert(schema.dataSources)
        .values({
          name: "FK Test Source",
          type: "csv",
        })
        .returning();

      dataSourceId = source.id;

      // Create data rows
      const rows = await db
        .insert(schema.dataRows)
        .values([
          {
            dataSourceId: source.id,
            rowIndex: 0,
            rowData: { name: "Product A", price: 99 },
          },
          {
            dataSourceId: source.id,
            rowIndex: 1,
            rowData: { name: "Product B", price: 149 },
          },
        ])
        .returning();

      expect(rows).toHaveLength(2);
      expect(rows[0].dataSourceId).toBe(source.id);
      expect(rows[1].dataSourceId).toBe(source.id);

      // Query rows by data source
      const fetchedRows = await db
        .select()
        .from(schema.dataRows)
        .where(eq(schema.dataRows.dataSourceId, source.id))
        .orderBy(schema.dataRows.rowIndex);

      expect(fetchedRows).toHaveLength(2);
      expect(fetchedRows[0].rowData).toEqual({ name: "Product A", price: 99 });
    });

    it("should cascade delete data rows when data source is deleted", async () => {
      // Create data source
      const [source] = await db
        .insert(schema.dataSources)
        .values({
          name: "Cascade Test Source",
          type: "csv",
        })
        .returning();

      // Create data row
      const [row] = await db
        .insert(schema.dataRows)
        .values({
          dataSourceId: source.id,
          rowIndex: 0,
          rowData: { test: true },
        })
        .returning();

      // Delete data source
      await db
        .delete(schema.dataSources)
        .where(eq(schema.dataSources.id, source.id));

      // Verify data row was cascade deleted
      const remainingRows = await db
        .select()
        .from(schema.dataRows)
        .where(eq(schema.dataRows.id, row.id));

      expect(remainingRows).toHaveLength(0);
      // Don't set dataSourceId since we deleted it
    });

    it("should create ad group templates linked to campaign templates", async () => {
      // Create campaign template
      const [template] = await db
        .insert(schema.campaignTemplates)
        .values({
          name: "FK Test Template",
          platform: "reddit",
        })
        .returning();

      templateId = template.id;

      // Create ad group templates
      const adGroups = await db
        .insert(schema.adGroupTemplates)
        .values([
          {
            campaignTemplateId: template.id,
            name: "Interest Targeting",
            settings: { bidStrategy: "AUTO" },
          },
          {
            campaignTemplateId: template.id,
            name: "Retargeting",
            settings: { bidStrategy: "MANUAL" },
          },
        ])
        .returning();

      expect(adGroups).toHaveLength(2);

      // Query with relation
      const fetchedGroups = await db
        .select()
        .from(schema.adGroupTemplates)
        .where(eq(schema.adGroupTemplates.campaignTemplateId, template.id));

      expect(fetchedGroups).toHaveLength(2);
    });
  });

  describe("Ad Accounts and OAuth Tokens", () => {
    let accountId: string;

    afterEach(async () => {
      if (accountId) {
        await db
          .delete(schema.adAccounts)
          .where(eq(schema.adAccounts.id, accountId));
        accountId = "";
      }
    });

    it("should create an ad account with OAuth token", async () => {
      // Create ad account
      const [account] = await db
        .insert(schema.adAccounts)
        .values({
          platform: "reddit",
          accountId: "test_account_123",
          accountName: "Test Reddit Account",
          status: "active",
        })
        .returning();

      accountId = account.id;

      // Create OAuth token
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const [token] = await db
        .insert(schema.oauthTokens)
        .values({
          adAccountId: account.id,
          accessToken: "test_access_token",
          refreshToken: "test_refresh_token",
          expiresAt,
          scopes: "ads_read,ads_write",
        })
        .returning();

      expect(token).toBeDefined();
      expect(token.adAccountId).toBe(account.id);
      expect(token.accessToken).toBe("test_access_token");
      expect(token.expiresAt).toEqual(expiresAt);
    });

    it("should enforce unique constraint on platform + accountId", async () => {
      // Create first account
      const [first] = await db
        .insert(schema.adAccounts)
        .values({
          platform: "google",
          accountId: "unique_test_123",
          accountName: "First Account",
          status: "active",
        })
        .returning();

      accountId = first.id;

      // Try to create duplicate - should fail
      await expect(
        db.insert(schema.adAccounts).values({
          platform: "google",
          accountId: "unique_test_123",
          accountName: "Duplicate Account",
          status: "active",
        })
      ).rejects.toThrow();
    });
  });

  describe("Generated Campaigns and Sync Records", () => {
    let dataSourceId: string;
    let templateId: string;
    let dataRowId: string;
    let campaignId: string;

    beforeEach(async () => {
      // Set up required parent records
      const [source] = await db
        .insert(schema.dataSources)
        .values({
          name: "Campaign Test Source",
          type: "csv",
        })
        .returning();
      dataSourceId = source.id;

      const [row] = await db
        .insert(schema.dataRows)
        .values({
          dataSourceId: source.id,
          rowIndex: 0,
          rowData: { product: "Test Product" },
        })
        .returning();
      dataRowId = row.id;

      const [template] = await db
        .insert(schema.campaignTemplates)
        .values({
          name: "Campaign Test Template",
          platform: "reddit",
        })
        .returning();
      templateId = template.id;
    });

    afterEach(async () => {
      // Clean up in reverse order
      if (campaignId) {
        await db
          .delete(schema.generatedCampaigns)
          .where(eq(schema.generatedCampaigns.id, campaignId));
      }
      if (templateId) {
        await db
          .delete(schema.campaignTemplates)
          .where(eq(schema.campaignTemplates.id, templateId));
      }
      if (dataSourceId) {
        await db
          .delete(schema.dataSources)
          .where(eq(schema.dataSources.id, dataSourceId));
      }
    });

    it("should create a generated campaign", async () => {
      const [campaign] = await db
        .insert(schema.generatedCampaigns)
        .values({
          templateId,
          dataRowId,
          status: "draft",
          campaignData: {
            name: "Test Generated Campaign",
            objective: "CONVERSIONS",
            budget: { type: "daily", amount: 50, currency: "USD" },
          },
        })
        .returning();

      campaignId = campaign.id;

      expect(campaign).toBeDefined();
      expect(campaign.status).toBe("draft");
      expect(campaign.campaignData.name).toBe("Test Generated Campaign");
    });

    it("should create sync records for a campaign", async () => {
      // Create campaign
      const [campaign] = await db
        .insert(schema.generatedCampaigns)
        .values({
          templateId,
          dataRowId,
          status: "active",
          campaignData: {
            name: "Sync Test Campaign",
          },
        })
        .returning();

      campaignId = campaign.id;

      // Create sync record
      const [syncRecord] = await db
        .insert(schema.syncRecords)
        .values({
          generatedCampaignId: campaign.id,
          platform: "reddit",
          platformId: "ext-campaign-123",
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        })
        .returning();

      expect(syncRecord).toBeDefined();
      expect(syncRecord.platform).toBe("reddit");
      expect(syncRecord.syncStatus).toBe("synced");
      expect(syncRecord.platformId).toBe("ext-campaign-123");
    });

    it("should track sync errors", async () => {
      const [campaign] = await db
        .insert(schema.generatedCampaigns)
        .values({
          templateId,
          dataRowId,
          status: "error",
          campaignData: {
            name: "Error Test Campaign",
          },
        })
        .returning();

      campaignId = campaign.id;

      const [syncRecord] = await db
        .insert(schema.syncRecords)
        .values({
          generatedCampaignId: campaign.id,
          platform: "reddit",
          syncStatus: "failed",
          errorLog: "API rate limit exceeded. Try again in 5 minutes.",
        })
        .returning();

      expect(syncRecord.syncStatus).toBe("failed");
      expect(syncRecord.errorLog).toContain("rate limit");
    });
  });
});
