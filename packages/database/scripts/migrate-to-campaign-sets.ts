/**
 * Data Migration Script: Migrate Existing Campaigns to Campaign Sets
 *
 * This script migrates existing generatedCampaigns into campaign sets.
 * For each existing campaign without a campaignSetId:
 * 1. Create a campaign set with name "Migrated - {campaign.name}"
 * 2. Set the campaign's campaignSetId to the new set
 * 3. Extract ad groups from campaignData JSONB into ad_groups table
 * 4. Extract ads from each ad group into ads table
 * 5. Extract keywords from each ad group into keywords table
 *
 * Run with: pnpm db:migrate-campaign-sets
 */

import type { GeneratedCampaignData } from "../src/schema/generated-campaigns.js";
import type { CampaignSetConfig } from "../src/schema/campaign-sets.js";

// ============================================================================
// Types
// ============================================================================

type CampaignStatus = "draft" | "pending" | "active" | "paused" | "completed" | "error";
type CampaignSetStatus =
  | "draft"
  | "pending"
  | "syncing"
  | "active"
  | "paused"
  | "completed"
  | "archived"
  | "error";
type KeywordMatchType = "broad" | "phrase" | "exact";

interface CampaignRecord {
  id: string;
  userId: string | null;
  campaignSetId: string | null;
  templateId: string;
  dataRowId: string;
  campaignData: GeneratedCampaignData;
  status: CampaignStatus;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DataRowRecord {
  id: string;
  dataSourceId: string;
}

interface ParsedKeyword {
  keyword: string;
  matchType: KeywordMatchType;
}

// ============================================================================
// Helper Functions - Exported for Testing
// ============================================================================

/**
 * Maps campaign status enum values to campaign set status enum values.
 * Campaign sets have additional statuses like 'syncing' and 'archived'.
 *
 * @param status - The campaign status to map
 * @returns The corresponding campaign set status
 */
export function mapCampaignStatusToSetStatus(
  status: CampaignStatus | null | undefined
): CampaignSetStatus {
  if (!status) {
    return "draft";
  }

  const statusMap: Record<CampaignStatus, CampaignSetStatus> = {
    draft: "draft",
    pending: "pending",
    active: "active",
    paused: "paused",
    completed: "completed",
    error: "error",
  };

  return statusMap[status] ?? "draft";
}

/**
 * Builds a CampaignSetConfig from an existing campaign's data.
 * This creates a snapshot of the wizard state that would have created this campaign.
 *
 * @param campaign - The campaign record to build config from
 * @param dataRow - The data row associated with the campaign (for dataSourceId)
 * @returns A CampaignSetConfig object
 */
export function buildConfigFromCampaign(
  campaign: CampaignRecord,
  dataRow: DataRowRecord | null
): CampaignSetConfig {
  const campaignData = campaign.campaignData;
  const adGroups = campaignData.adGroups ?? [];

  // Build hierarchy config from existing ad groups
  const hierarchyAdGroups = adGroups.map((adGroup) => ({
    namePattern: adGroup.name,
    keywords: extractKeywordsFromAdGroup(adGroup),
    ads: (adGroup.ads ?? []).map((ad) => ({
      headline: ad.headline,
      description: ad.description,
      displayUrl: undefined, // Not in original schema
      finalUrl: undefined, // Not in original schema
      callToAction: undefined, // Not in original schema
    })),
  }));

  // Build budget config if present
  let budgetConfig: CampaignSetConfig["budgetConfig"] | undefined;
  if (campaignData.budget) {
    budgetConfig = {
      type: campaignData.budget.type,
      amountPattern: String(campaignData.budget.amount),
      currency: campaignData.budget.currency,
    };
  }

  // Build targeting config if present
  const targetingConfig = campaignData.targeting
    ? (campaignData.targeting as Record<string, unknown>)
    : undefined;

  return {
    dataSourceId: dataRow?.dataSourceId ?? "",
    availableColumns: [],
    selectedPlatforms: [],
    selectedAdTypes: {},
    campaignConfig: {
      namePattern: campaignData.name,
    },
    budgetConfig,
    hierarchyConfig: {
      adGroups: hierarchyAdGroups,
    },
    targetingConfig,
    generatedAt: new Date().toISOString(),
    rowCount: 1,
    campaignCount: 1,
  };
}

/**
 * Extracts keywords from an ad group settings object.
 * Keywords might be stored in various formats.
 *
 * @param adGroup - The ad group to extract keywords from
 * @returns Array of keyword strings
 */
function extractKeywordsFromAdGroup(adGroup: {
  name: string;
  settings?: Record<string, unknown>;
  keywords?: string[];
}): string[] {
  // Check for keywords array directly on adGroup
  if (adGroup.keywords && Array.isArray(adGroup.keywords)) {
    return adGroup.keywords;
  }

  // Check in settings
  const settings = adGroup.settings;
  if (settings && typeof settings === "object") {
    if (Array.isArray(settings.keywords)) {
      return settings.keywords as string[];
    }
  }

  return [];
}

/**
 * Determines the keyword match type from bracket/quote notation.
 *
 * Match type notation:
 * - [keyword] = exact match
 * - "keyword" = phrase match
 * - keyword = broad match
 *
 * @param keyword - The keyword string with optional modifiers
 * @returns The match type
 */
export function extractMatchTypeFromKeyword(keyword: string): KeywordMatchType {
  const trimmed = keyword.trim();

  if (!trimmed) {
    return "broad";
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return "exact";
  }

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return "phrase";
  }

  return "broad";
}

/**
 * Parses a keyword string to extract the clean keyword and its match type.
 *
 * @param keywordStr - The keyword string with optional modifiers
 * @returns Object with clean keyword and match type
 */
export function parseKeywordWithMatchType(keywordStr: string): ParsedKeyword {
  const trimmed = keywordStr.trim();

  if (!trimmed) {
    return { keyword: "", matchType: "broad" };
  }

  // Exact match: [keyword]
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return {
      keyword: trimmed.slice(1, -1),
      matchType: "exact",
    };
  }

  // Phrase match: "keyword"
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return {
      keyword: trimmed.slice(1, -1),
      matchType: "phrase",
    };
  }

  // Broad match: keyword as-is
  return {
    keyword: trimmed,
    matchType: "broad",
  };
}

// ============================================================================
// Migration Logic
// ============================================================================

/**
 * Main migration function - to be run when connected to database
 */
export async function migrateToCampaignSets(db: any, schema: any): Promise<void> {
  const { eq, isNull } = await import("drizzle-orm");

  console.log("Starting campaign set migration...");

  // 1. Find all campaigns without a campaign set
  const orphanedCampaigns = await db
    .select()
    .from(schema.generatedCampaigns)
    .where(isNull(schema.generatedCampaigns.campaignSetId));

  console.log(`Found ${orphanedCampaigns.length} campaigns to migrate`);

  if (orphanedCampaigns.length === 0) {
    console.log("No campaigns to migrate. Migration complete!");
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const campaign of orphanedCampaigns) {
    try {
      // Wrap the entire per-campaign migration in a transaction
      // If any operation fails, the transaction is automatically rolled back
      await db.transaction(async (tx: any) => {
        // Get data row for dataSourceId
        let dataRow: DataRowRecord | null = null;
        if (campaign.dataRowId) {
          const [row] = await tx
            .select({
              id: schema.dataRows.id,
              dataSourceId: schema.dataRows.dataSourceId,
            })
            .from(schema.dataRows)
            .where(eq(schema.dataRows.id, campaign.dataRowId))
            .limit(1);
          dataRow = row ?? null;
        }

        // 2. Create a campaign set for this campaign
        const campaignData = campaign.campaignData as GeneratedCampaignData;
        const setName = `Migrated - ${campaignData?.name || "Untitled Campaign"}`;

        const [newSet] = await tx
          .insert(schema.campaignSets)
          .values({
            userId: campaign.userId,
            name: setName,
            description: "Automatically created during migration",
            dataSourceId: dataRow?.dataSourceId ?? null,
            templateId: campaign.templateId,
            config: buildConfigFromCampaign(campaign as CampaignRecord, dataRow),
            status: mapCampaignStatusToSetStatus(campaign.status),
            syncStatus: "pending",
          })
          .returning();

        // 3. Update campaign with set ID
        await tx
          .update(schema.generatedCampaigns)
          .set({ campaignSetId: newSet.id, orderIndex: 0 })
          .where(eq(schema.generatedCampaigns.id, campaign.id));

        // 4. Check for idempotency - skip ad group extraction if already done
        // This prevents duplicates if migration is run multiple times
        const existingAdGroups = await tx
          .select()
          .from(schema.adGroups)
          .where(eq(schema.adGroups.campaignId, campaign.id))
          .limit(1);

        if (existingAdGroups.length > 0) {
          console.log(
            `Ad groups already exist for campaign ${campaign.id}, skipping extraction`
          );
          // Still count as success since campaignSetId was updated
          return;
        }

        // 5. Extract ad groups from JSONB and insert into ad_groups table
        if (campaignData?.adGroups && Array.isArray(campaignData.adGroups)) {
          for (let i = 0; i < campaignData.adGroups.length; i++) {
            const adGroupData = campaignData.adGroups[i];

            const [newAdGroup] = await tx
              .insert(schema.adGroups)
              .values({
                campaignId: campaign.id,
                name: adGroupData.name || `Ad Group ${i + 1}`,
                settings: adGroupData.settings ?? null,
                orderIndex: i,
                status: "active",
              })
              .returning();

            // 6. Extract ads
            if (adGroupData.ads && Array.isArray(adGroupData.ads)) {
              for (let j = 0; j < adGroupData.ads.length; j++) {
                const adData = adGroupData.ads[j];
                await tx.insert(schema.ads).values({
                  adGroupId: newAdGroup.id,
                  headline: adData.headline ?? null,
                  description: adData.description ?? null,
                  displayUrl: null, // Not in original JSONB
                  finalUrl: null, // Not in original JSONB
                  callToAction: null, // Not in original JSONB
                  assets: adData.assets ?? null,
                  orderIndex: j,
                  status: "active",
                });
              }
            }

            // 7. Extract keywords (if present in settings or directly on ad group)
            const keywords = extractKeywordsFromAdGroup(adGroupData);
            for (const keywordStr of keywords) {
              const { keyword, matchType } = parseKeywordWithMatchType(keywordStr);
              if (keyword) {
                await tx.insert(schema.keywords).values({
                  adGroupId: newAdGroup.id,
                  keyword,
                  matchType,
                  status: "active",
                });
              }
            }
          }
        }

        console.log(`Migrated campaign ${campaign.id} to set ${newSet.id}`);
      });

      successCount++;
    } catch (error) {
      errorCount++;
      // Transaction automatically rolled back on error
      console.error(`Failed to migrate campaign ${campaign.id}:`, error);
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${errorCount}`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main(): Promise<void> {
  // Dynamic import to avoid issues when testing
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = await import("postgres");
  const schema = await import("../src/schema/index.js");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const sql = postgres.default(connectionString, { max: 1 });
  const db = drizzle(sql, { schema });

  try {
    await migrateToCampaignSets(db, schema);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Only run main when executed directly (not when imported for tests)
if (process.argv[1]?.endsWith("migrate-to-campaign-sets.ts") ||
    process.argv[1]?.endsWith("migrate-to-campaign-sets.js")) {
  main();
}
