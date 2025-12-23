/**
 * Database seed script
 *
 * Seeds the database with sample data that matches the UI mock data patterns.
 * Run with: pnpm db:seed
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";
import { sql } from "drizzle-orm";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/dotoro";

console.log("Connecting to database...");
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// Helper to generate UUIDs consistently for foreign key relationships
const uuids = {
  // Data sources
  dataSource1: "11111111-1111-1111-1111-111111111111",
  dataSource2: "22222222-2222-2222-2222-222222222222",
  dataSource3: "33333333-3333-3333-3333-333333333333",

  // Campaign templates
  template1: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  template2: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  template3: "cccccccc-cccc-cccc-cccc-cccccccccccc",

  // Ad group templates
  adGroup1: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  adGroup2: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  adGroup3: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  adGroup4: "00000000-0001-0000-0000-000000000001",

  // Ad templates
  adTemplate1: "00000000-0002-0000-0000-000000000001",
  adTemplate2: "00000000-0002-0000-0000-000000000002",
  adTemplate3: "00000000-0002-0000-0000-000000000003",
  adTemplate4: "00000000-0002-0000-0000-000000000004",

  // Data rows
  dataRow1: "00000000-0003-0000-0000-000000000001",
  dataRow2: "00000000-0003-0000-0000-000000000002",
  dataRow3: "00000000-0003-0000-0000-000000000003",
  dataRow4: "00000000-0003-0000-0000-000000000004",
  dataRow5: "00000000-0003-0000-0000-000000000005",
  dataRow6: "00000000-0003-0000-0000-000000000006",

  // Rules
  rule1: "00000000-0004-0000-0000-000000000001",
  rule2: "00000000-0004-0000-0000-000000000002",
  rule3: "00000000-0004-0000-0000-000000000003",

  // Generated campaigns
  campaign1: "00000000-0005-0000-0000-000000000001",
  campaign2: "00000000-0005-0000-0000-000000000002",
  campaign3: "00000000-0005-0000-0000-000000000003",
  campaign4: "00000000-0005-0000-0000-000000000004",
  campaign5: "00000000-0005-0000-0000-000000000005",
  campaign6: "00000000-0005-0000-0000-000000000006",

  // Ad accounts
  account1: "00000000-0006-0000-0000-000000000001",
  account2: "00000000-0006-0000-0000-000000000002",

  // Creatives
  creative1: "00000000-0007-0000-0000-000000000001",
  creative2: "00000000-0007-0000-0000-000000000002",
  creative3: "00000000-0007-0000-0000-000000000003",
};

async function seed() {
  console.log("Seeding database...\n");

  // Clear existing data (in reverse order of dependencies)
  console.log("Clearing existing data...");
  await db.delete(schema.creativeTemplateLinks);
  await db.delete(schema.creativeTags);
  await db.delete(schema.creatives);
  await db.delete(schema.syncRecords);
  await db.delete(schema.generatedCampaigns);
  await db.delete(schema.templateRules);
  await db.delete(schema.rules);
  await db.delete(schema.adTemplates);
  await db.delete(schema.adGroupTemplates);
  await db.delete(schema.campaignTemplates);
  await db.delete(schema.columnMappings);
  await db.delete(schema.dataRows);
  await db.delete(schema.dataSources);
  await db.delete(schema.oauthTokens);
  await db.delete(schema.adAccounts);

  // ============================================
  // 1. DATA SOURCES
  // ============================================
  console.log("Seeding data sources...");
  await db.insert(schema.dataSources).values([
    {
      id: uuids.dataSource1,
      name: "Product Catalog Q1 2025",
      type: "csv",
      config: {
        originalFileName: "products_q1_2025.csv",
        encoding: "utf-8",
        delimiter: ",",
        hasHeader: true,
        // Note: rowCount is computed dynamically from actual data rows
      },
      createdAt: new Date("2025-01-10T09:00:00Z"),
      updatedAt: new Date("2025-01-15T14:30:00Z"),
    },
    {
      id: uuids.dataSource2,
      name: "Store Locations",
      type: "csv",
      config: {
        originalFileName: "store_locations.csv",
        encoding: "utf-8",
        delimiter: ",",
        hasHeader: true,
        // Note: No rows seeded for this data source
      },
      createdAt: new Date("2025-01-08T10:00:00Z"),
      updatedAt: new Date("2025-01-08T10:00:00Z"),
    },
    {
      id: uuids.dataSource3,
      name: "Holiday Promotions",
      type: "manual",
      config: {
        description: "Manual entry for holiday campaign data",
        // Note: No rows seeded for this data source
      },
      createdAt: new Date("2025-01-05T16:00:00Z"),
      updatedAt: new Date("2025-01-12T09:00:00Z"),
    },
  ]);

  // ============================================
  // 2. DATA ROWS (Sample product data)
  // ============================================
  console.log("Seeding data rows...");
  await db.insert(schema.dataRows).values([
    {
      id: uuids.dataRow1,
      dataSourceId: uuids.dataSource1,
      rowIndex: 0,
      rowData: {
        product_name: "Nike Air Max 90",
        brand: "Nike",
        category: "Footwear",
        price: 149.99,
        sale_price: 119.99,
        stock_quantity: 245,
        product_description: "Classic comfort meets modern style",
        target_subreddit: "r/sneakers",
      },
    },
    {
      id: uuids.dataRow2,
      dataSourceId: uuids.dataSource1,
      rowIndex: 1,
      rowData: {
        product_name: "Adidas Ultraboost",
        brand: "Adidas",
        category: "Footwear",
        price: 189.99,
        sale_price: null,
        stock_quantity: 178,
        product_description: "Energy-returning comfort for every run",
        target_subreddit: "r/running",
      },
    },
    {
      id: uuids.dataRow3,
      dataSourceId: uuids.dataSource1,
      rowIndex: 2,
      rowData: {
        product_name: "Sony WH-1000XM5",
        brand: "Sony",
        category: "Electronics",
        price: 399.99,
        sale_price: 349.99,
        stock_quantity: 89,
        product_description: "Industry-leading noise cancellation",
        target_subreddit: "r/headphones",
      },
    },
    {
      id: uuids.dataRow4,
      dataSourceId: uuids.dataSource1,
      rowIndex: 3,
      rowData: {
        product_name: "Apple AirPods Pro 2",
        brand: "Apple",
        category: "Electronics",
        price: 249.99,
        sale_price: 199.99,
        stock_quantity: 412,
        product_description: "Active Noise Cancellation. Adaptive Audio.",
        target_subreddit: "r/apple",
      },
    },
    {
      id: uuids.dataRow5,
      dataSourceId: uuids.dataSource1,
      rowIndex: 4,
      rowData: {
        product_name: "Patagonia Better Sweater",
        brand: "Patagonia",
        category: "Apparel",
        price: 139.0,
        sale_price: null,
        stock_quantity: 67,
        product_description: "Classic fleece with a conscience",
        target_subreddit: "r/malefashionadvice",
      },
    },
    {
      id: uuids.dataRow6,
      dataSourceId: uuids.dataSource1,
      rowIndex: 5,
      rowData: {
        product_name: "Bundle: Gaming Starter Kit",
        brand: "Various",
        category: "Electronics",
        price: 599.99,
        sale_price: 499.99,
        stock_quantity: 5,
        product_description: "Everything you need to start gaming",
        target_subreddit: "r/gaming",
      },
    },
  ]);

  // ============================================
  // 3. COLUMN MAPPINGS
  // ============================================
  console.log("Seeding column mappings...");
  await db.insert(schema.columnMappings).values([
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Product Name",
      normalizedName: "product_name",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Brand",
      normalizedName: "brand",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Category",
      normalizedName: "category",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Price ($)",
      normalizedName: "price",
      dataType: "number",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Sale Price ($)",
      normalizedName: "sale_price",
      dataType: "number",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Stock Qty",
      normalizedName: "stock_quantity",
      dataType: "number",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Description",
      normalizedName: "product_description",
      dataType: "string",
    },
    {
      dataSourceId: uuids.dataSource1,
      sourceColumn: "Target Subreddit",
      normalizedName: "target_subreddit",
      dataType: "string",
    },
  ]);

  // ============================================
  // 4. CAMPAIGN TEMPLATES
  // ============================================
  console.log("Seeding campaign templates...");
  await db.insert(schema.campaignTemplates).values([
    {
      id: uuids.template1,
      name: "Summer Sale Template",
      platform: "reddit",
      structure: {
        objective: "CONVERSIONS",
        budget: {
          type: "daily",
          amount: 50,
          currency: "USD",
        },
        targeting: {
          subreddits: ["{target_subreddit}"],
          interests: ["shopping", "deals"],
        },
        schedule: {
          startDate: "2025-01-01",
          endDate: "2025-03-31",
        },
      },
      createdAt: new Date("2025-01-05T10:00:00Z"),
      updatedAt: new Date("2025-01-10T14:00:00Z"),
    },
    {
      id: uuids.template2,
      name: "Winter Campaign",
      platform: "google",
      structure: {
        objective: "AWARENESS",
        budget: {
          type: "daily",
          amount: 100,
          currency: "USD",
        },
        targeting: {
          keywords: ["{brand}", "{category}"],
          demographics: { ageRange: "25-54" },
        },
      },
      createdAt: new Date("2025-01-08T11:00:00Z"),
      updatedAt: new Date("2025-01-08T11:00:00Z"),
    },
    {
      id: uuids.template3,
      name: "Holiday Promo",
      platform: "facebook",
      structure: {
        objective: "CONVERSIONS",
        budget: {
          type: "lifetime",
          amount: 5000,
          currency: "USD",
        },
        targeting: {
          interests: ["holiday shopping", "gifts"],
          lookalike: true,
        },
      },
      createdAt: new Date("2025-01-12T09:00:00Z"),
      updatedAt: new Date("2025-01-14T16:00:00Z"),
    },
  ]);

  // ============================================
  // 5. AD GROUP TEMPLATES
  // ============================================
  console.log("Seeding ad group templates...");
  await db.insert(schema.adGroupTemplates).values([
    {
      id: uuids.adGroup1,
      campaignTemplateId: uuids.template1,
      name: "Interest Targeting",
      settings: {
        bidStrategy: "AUTO",
        placement: ["feed", "sidebar"],
      },
    },
    {
      id: uuids.adGroup2,
      campaignTemplateId: uuids.template1,
      name: "Retargeting",
      settings: {
        bidStrategy: "MANUAL",
        bidAmount: 0.75,
        placement: ["feed"],
      },
    },
    {
      id: uuids.adGroup3,
      campaignTemplateId: uuids.template2,
      name: "Search Ads",
      settings: {
        bidStrategy: "TARGET_CPA",
        targetCpa: 25,
      },
    },
    {
      id: uuids.adGroup4,
      campaignTemplateId: uuids.template2,
      name: "Display Ads",
      settings: {
        bidStrategy: "TARGET_ROAS",
        targetRoas: 400,
      },
    },
  ]);

  // ============================================
  // 6. AD TEMPLATES
  // ============================================
  console.log("Seeding ad templates...");
  await db.insert(schema.adTemplates).values([
    {
      id: uuids.adTemplate1,
      adGroupTemplateId: uuids.adGroup1,
      headline: "Get {product_name} for ${sale_price|price}",
      description: "{product_description}. Shop now!",
      variables: {
        placeholders: [
          { name: "product_name", type: "text", sourceColumn: "product_name" },
          { name: "sale_price", type: "text", sourceColumn: "sale_price" },
          { name: "price", type: "text", sourceColumn: "price" },
          {
            name: "product_description",
            type: "text",
            sourceColumn: "product_description",
          },
        ],
      },
    },
    {
      id: uuids.adTemplate2,
      adGroupTemplateId: uuids.adGroup1,
      headline: "Shop {brand} - {product_name}",
      description: "Premium quality from {brand}. Starting at ${price}.",
      variables: {
        placeholders: [
          { name: "brand", type: "text", sourceColumn: "brand" },
          { name: "product_name", type: "text", sourceColumn: "product_name" },
          { name: "price", type: "text", sourceColumn: "price" },
        ],
      },
    },
    {
      id: uuids.adTemplate3,
      adGroupTemplateId: uuids.adGroup2,
      headline: "Still thinking about {product_name}?",
      description: "Come back and get it before it's gone!",
      variables: {
        placeholders: [
          { name: "product_name", type: "text", sourceColumn: "product_name" },
        ],
      },
    },
    {
      id: uuids.adTemplate4,
      adGroupTemplateId: uuids.adGroup3,
      headline: "{brand} {category} - Shop Now",
      description: "Find the best {category} from top brands.",
      variables: {
        placeholders: [
          { name: "brand", type: "text", sourceColumn: "brand" },
          { name: "category", type: "text", sourceColumn: "category" },
        ],
      },
    },
  ]);

  // ============================================
  // 7. RULES
  // ============================================
  console.log("Seeding rules...");
  await db.insert(schema.rules).values([
    {
      id: uuids.rule1,
      name: "Skip Low Stock Items",
      type: "filter",
      priority: 10,
      enabled: true,
      conditions: [
        {
          field: "stock_quantity",
          operator: "less_than",
          value: 10,
        },
      ],
      actions: [
        {
          type: "set",
          target: "_skip",
          value: true,
        },
      ],
      createdAt: new Date("2025-01-10T10:00:00Z"),
      updatedAt: new Date("2025-01-10T10:00:00Z"),
    },
    {
      id: uuids.rule2,
      name: "Premium Electronics Targeting",
      type: "conditional",
      priority: 5,
      enabled: true,
      conditions: [
        {
          field: "category",
          operator: "equals",
          value: "Electronics",
        },
        {
          field: "price",
          operator: "greater_than",
          value: 100,
          logicalOperator: "AND",
        },
      ],
      actions: [
        {
          type: "set",
          target: "ad_group",
          value: "Premium Tech",
        },
      ],
      createdAt: new Date("2025-01-11T09:00:00Z"),
      updatedAt: new Date("2025-01-11T09:00:00Z"),
    },
    {
      id: uuids.rule3,
      name: "Bundle Product Headlines",
      type: "transform",
      priority: 1,
      enabled: true,
      conditions: [
        {
          field: "product_name",
          operator: "contains",
          value: "Bundle",
        },
      ],
      actions: [
        {
          type: "set",
          target: "headline_prefix",
          value: "Save on ",
        },
      ],
      createdAt: new Date("2025-01-12T14:00:00Z"),
      updatedAt: new Date("2025-01-12T14:00:00Z"),
    },
  ]);

  // ============================================
  // 8. TEMPLATE RULES (Link rules to templates)
  // ============================================
  console.log("Seeding template rules...");
  await db.insert(schema.templateRules).values([
    {
      templateId: uuids.template1,
      ruleId: uuids.rule1,
      executionOrder: 1,
    },
    {
      templateId: uuids.template1,
      ruleId: uuids.rule2,
      executionOrder: 2,
    },
    {
      templateId: uuids.template1,
      ruleId: uuids.rule3,
      executionOrder: 3,
    },
    {
      templateId: uuids.template2,
      ruleId: uuids.rule1,
      executionOrder: 1,
    },
  ]);

  // ============================================
  // 9. AD ACCOUNTS (Matching UI mock data)
  // ============================================
  console.log("Seeding ad accounts...");
  await db.insert(schema.adAccounts).values([
    {
      id: uuids.account1,
      platform: "reddit",
      accountId: "t2_abc123",
      accountName: "Reddit Ads - Main",
      status: "active",
      credentials: null, // Encrypted in production
      createdAt: new Date("2024-11-15T10:00:00Z"),
      updatedAt: new Date("2025-01-15T08:30:00Z"),
    },
    {
      id: uuids.account2,
      platform: "reddit",
      accountId: "t2_xyz789",
      accountName: "Reddit Ads - Secondary",
      status: "error", // Token expired scenario
      credentials: null,
      createdAt: new Date("2024-10-01T14:00:00Z"),
      updatedAt: new Date("2025-01-10T16:00:00Z"),
    },
  ]);

  // ============================================
  // 10. OAUTH TOKENS
  // ============================================
  console.log("Seeding OAuth tokens...");
  await db.insert(schema.oauthTokens).values([
    {
      adAccountId: uuids.account1,
      accessToken: "encrypted_access_token_placeholder",
      refreshToken: "encrypted_refresh_token_placeholder",
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
      scopes: "ads_read,ads_write,account",
    },
    {
      adAccountId: uuids.account2,
      accessToken: "expired_access_token_placeholder",
      refreshToken: "expired_refresh_token_placeholder",
      expiresAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (expired)
      scopes: "ads_read,ads_write,account",
    },
  ]);

  // ============================================
  // 11. GENERATED CAMPAIGNS (Matching UI mock data)
  // ============================================
  console.log("Seeding generated campaigns...");
  await db.insert(schema.generatedCampaigns).values([
    {
      id: uuids.campaign1,
      templateId: uuids.template1,
      dataRowId: uuids.dataRow1,
      status: "active",
      campaignData: {
        name: "Summer Sale - Nike Air Max 90",
        objective: "CONVERSIONS",
        budget: { type: "daily", amount: 50, currency: "USD" },
        adGroups: [
          {
            name: "Interest Targeting",
            ads: [
              {
                headline: "Get Nike Air Max 90 for $119.99",
                description: "Classic comfort meets modern style. Shop now!",
              },
            ],
          },
          {
            name: "Retargeting",
            ads: [
              {
                headline: "Still thinking about Nike Air Max 90?",
                description: "Come back and get it before it's gone!",
              },
            ],
          },
        ],
      },
      createdAt: new Date("2025-01-10T09:00:00Z"),
      updatedAt: new Date("2025-01-15T08:30:00Z"),
    },
    {
      id: uuids.campaign2,
      templateId: uuids.template1,
      dataRowId: uuids.dataRow2,
      status: "pending",
      campaignData: {
        name: "Summer Sale - Adidas Ultraboost",
        objective: "CONVERSIONS",
        budget: { type: "daily", amount: 50, currency: "USD" },
        adGroups: [
          {
            name: "Interest Targeting",
            ads: [
              {
                headline: "Get Adidas Ultraboost for $189.99",
                description: "Energy-returning comfort for every run. Shop now!",
              },
            ],
          },
        ],
      },
      createdAt: new Date("2025-01-11T09:00:00Z"),
      updatedAt: new Date("2025-01-11T09:00:00Z"),
    },
    {
      id: uuids.campaign3,
      templateId: uuids.template2,
      dataRowId: uuids.dataRow3,
      status: "error",
      campaignData: {
        name: "Winter Campaign - Sony WH-1000XM5",
        objective: "AWARENESS",
        budget: { type: "daily", amount: 100, currency: "USD" },
      },
      createdAt: new Date("2025-01-12T09:00:00Z"),
      updatedAt: new Date("2025-01-12T10:00:00Z"),
    },
    {
      id: uuids.campaign4,
      templateId: uuids.template2,
      dataRowId: uuids.dataRow4,
      status: "draft",
      campaignData: {
        name: "Draft Campaign - Apple AirPods",
        objective: "AWARENESS",
        budget: { type: "daily", amount: 100, currency: "USD" },
      },
      createdAt: new Date("2025-01-13T09:00:00Z"),
      updatedAt: new Date("2025-01-13T09:00:00Z"),
    },
    {
      id: uuids.campaign5,
      templateId: uuids.template1,
      dataRowId: uuids.dataRow5,
      status: "paused",
      campaignData: {
        name: "Summer Sale - Patagonia Sweater",
        objective: "CONVERSIONS",
        budget: { type: "daily", amount: 50, currency: "USD" },
      },
      createdAt: new Date("2025-01-08T09:00:00Z"),
      updatedAt: new Date("2025-01-13T14:00:00Z"),
    },
    {
      id: uuids.campaign6,
      templateId: uuids.template3,
      dataRowId: uuids.dataRow6,
      status: "pending",
      campaignData: {
        name: "Holiday Promo - Gaming Bundle",
        objective: "CONVERSIONS",
        budget: { type: "lifetime", amount: 5000, currency: "USD" },
        adGroups: [
          { name: "Lookalike Audience", ads: [] },
          { name: "Custom Audience", ads: [] },
        ],
      },
      createdAt: new Date("2025-01-14T09:00:00Z"),
      updatedAt: new Date("2025-01-14T09:00:00Z"),
    },
  ]);

  // ============================================
  // 12. SYNC RECORDS
  // ============================================
  console.log("Seeding sync records...");
  await db.insert(schema.syncRecords).values([
    {
      generatedCampaignId: uuids.campaign1,
      platform: "reddit",
      platformId: "ext-123",
      syncStatus: "synced",
      lastSyncedAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
    },
    {
      generatedCampaignId: uuids.campaign3,
      platform: "google",
      platformId: null,
      syncStatus: "failed",
      errorLog: "API rate limit exceeded. Please wait 5 minutes before retrying.",
      lastSyncedAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
    {
      generatedCampaignId: uuids.campaign5,
      platform: "reddit",
      platformId: "ext-456",
      syncStatus: "synced",
      lastSyncedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  ]);

  // ============================================
  // 13. CREATIVES
  // ============================================
  console.log("Seeding creatives...");
  await db.insert(schema.creatives).values([
    {
      id: uuids.creative1,
      accountId: "t2_abc123",
      name: "Summer Sale Banner",
      type: "IMAGE",
      mimeType: "image/jpeg",
      fileSize: 245000,
      dimensions: { width: 1200, height: 628 },
      storageKey: "creatives/summer-sale-banner.jpg",
      cdnUrl: "https://cdn.example.com/creatives/summer-sale-banner.jpg",
      status: "READY",
      metadata: {
        originalFilename: "summer_banner_v2.jpg",
        uploadedBy: "marketing@mycompany.com",
      },
      createdAt: new Date("2025-01-05T10:00:00Z"),
      updatedAt: new Date("2025-01-05T10:00:00Z"),
    },
    {
      id: uuids.creative2,
      accountId: "t2_abc123",
      name: "Product Showcase Video",
      type: "VIDEO",
      mimeType: "video/mp4",
      fileSize: 15000000,
      dimensions: { width: 1920, height: 1080 },
      storageKey: "creatives/product-showcase.mp4",
      cdnUrl: "https://cdn.example.com/creatives/product-showcase.mp4",
      thumbnailKey: "creatives/product-showcase-thumb.jpg",
      status: "READY",
      metadata: {
        durationSeconds: 30,
        frameRate: 30,
        codec: "h264",
        originalFilename: "showcase_final.mp4",
      },
      createdAt: new Date("2025-01-08T14:00:00Z"),
      updatedAt: new Date("2025-01-08T14:00:00Z"),
    },
    {
      id: uuids.creative3,
      accountId: "t2_abc123",
      name: "Holiday Theme",
      type: "IMAGE",
      mimeType: "image/png",
      fileSize: 380000,
      dimensions: { width: 1080, height: 1080 },
      storageKey: "creatives/holiday-theme.png",
      status: "PENDING",
      metadata: {
        originalFilename: "holiday_v1.png",
      },
      createdAt: new Date("2025-01-12T16:00:00Z"),
      updatedAt: new Date("2025-01-12T16:00:00Z"),
    },
  ]);

  // ============================================
  // 14. CREATIVE TAGS
  // ============================================
  console.log("Seeding creative tags...");
  await db.insert(schema.creativeTags).values([
    { creativeId: uuids.creative1, tag: "summer" },
    { creativeId: uuids.creative1, tag: "sale" },
    { creativeId: uuids.creative1, tag: "banner" },
    { creativeId: uuids.creative2, tag: "video" },
    { creativeId: uuids.creative2, tag: "product" },
    { creativeId: uuids.creative3, tag: "holiday" },
    { creativeId: uuids.creative3, tag: "seasonal" },
  ]);

  // ============================================
  // 15. CREATIVE TEMPLATE LINKS
  // ============================================
  console.log("Seeding creative template links...");
  await db.insert(schema.creativeTemplateLinks).values([
    {
      templateId: uuids.template1,
      slotName: "main_banner",
      creativeId: uuids.creative1,
      priority: 0,
      conditions: [
        {
          field: "category",
          operator: "equals",
          value: "Footwear",
        },
      ],
    },
    {
      templateId: uuids.template1,
      slotName: "video_ad",
      creativeId: uuids.creative2,
      priority: 0,
    },
    {
      templateId: uuids.template3,
      slotName: "main_banner",
      creativeId: uuids.creative3,
      priority: 0,
    },
  ]);

  console.log("\nSeed completed successfully!");
  console.log("\nSeeded data summary:");
  console.log("  - 3 data sources");
  console.log("  - 6 data rows");
  console.log("  - 8 column mappings");
  console.log("  - 3 campaign templates");
  console.log("  - 4 ad group templates");
  console.log("  - 4 ad templates");
  console.log("  - 3 rules");
  console.log("  - 4 template rules");
  console.log("  - 2 ad accounts");
  console.log("  - 2 OAuth tokens");
  console.log("  - 6 generated campaigns");
  console.log("  - 3 sync records");
  console.log("  - 3 creatives");
  console.log("  - 7 creative tags");
  console.log("  - 3 creative template links");

  await client.end();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
