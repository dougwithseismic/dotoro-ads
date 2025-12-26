/**
 * Drizzle Campaign Set Repository
 *
 * Repository implementation for the CampaignSetRepository interface from the sync service.
 * Connects the sync service to the database using Drizzle ORM.
 */

import { eq, and, isNotNull, isNull, sql, lt, lte, or } from "drizzle-orm";
import type { CampaignSetRepository, CampaignWithSet } from "@repo/core/campaign-set";
import type { SyncedCampaign, ConflictDetails, PlatformCampaignStatus } from "@repo/core/campaign-set";
import { calculateBackoffDelay } from "@repo/core/campaign-set";
import type {
  CampaignSet,
  CampaignSetStatus,
  CampaignSetSyncStatus,
  Campaign,
  AdGroup,
  Ad,
  Keyword,
} from "@repo/core/campaign-set";
import type { Platform } from "@repo/core/ad-types";
import type { Database } from "@repo/database";
import {
  campaignSets,
  generatedCampaigns,
  syncRecords,
  adGroups,
  ads,
  keywords,
} from "../services/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// Type Definitions for Database Results
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Database representation of a campaign set with nested relations
 */
interface DbCampaignSetWithRelations {
  id: string;
  userId: string | null;
  name: string;
  description: string | null;
  dataSourceId: string | null;
  templateId: string | null;
  config: CampaignSetConfigDb | null;
  status: "draft" | "pending" | "syncing" | "active" | "paused" | "completed" | "archived" | "error";
  syncStatus: "pending" | "syncing" | "synced" | "failed" | "conflict";
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  campaigns: DbCampaignWithRelations[];
}

interface CampaignSetConfigDb {
  dataSourceId: string;
  availableColumns: string[];
  selectedPlatforms: string[];
  selectedAdTypes: Record<string, string[]>;
  campaignConfig: { namePattern: string };
  hierarchyConfig: {
    adGroups: Array<{
      namePattern: string;
      keywords?: string[];
      ads: Array<{
        headline?: string;
        description?: string;
        displayUrl?: string;
        finalUrl?: string;
        callToAction?: string;
      }>;
    }>;
  };
  budgetConfig?: {
    type: "daily" | "lifetime" | "shared";
    amountPattern: string;
    currency: string;
    pacing?: "standard" | "accelerated";
  };
  biddingConfig?: Record<string, unknown>;
  targetingConfig?: Record<string, unknown>;
  inlineRules?: Array<{
    field: string;
    operator: string;
    value: unknown;
    enabled: boolean;
  }>;
  generatedAt: string;
  rowCount: number;
  campaignCount: number;
}

interface DbCampaignWithRelations {
  id: string;
  userId: string | null;
  campaignSetId: string | null;
  templateId: string;
  dataRowId: string;
  campaignData: CampaignDataDb;
  status: "draft" | "pending" | "active" | "paused" | "completed" | "error";
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  adGroups: DbAdGroupWithRelations[];
  syncRecords: DbSyncRecord[];
  campaignSet?: DbCampaignSetWithRelations;
}

interface CampaignDataDb {
  name: string;
  platform?: string;
  objective?: string;
  budget?: {
    type: "daily" | "lifetime";
    amount: number;
    currency: string;
  };
  targeting?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DbAdGroupWithRelations {
  id: string;
  campaignId: string;
  name: string;
  settings: Record<string, unknown> | null;
  platformAdGroupId: string | null;
  status: "active" | "paused" | "removed";
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
  ads: DbAd[];
  keywords: DbKeyword[];
}

interface DbAd {
  id: string;
  adGroupId: string;
  headline: string | null;
  description: string | null;
  displayUrl: string | null;
  finalUrl: string | null;
  callToAction: string | null;
  assets: Record<string, unknown> | null;
  platformAdId: string | null;
  status: "active" | "paused" | "removed";
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

interface DbKeyword {
  id: string;
  adGroupId: string;
  keyword: string;
  matchType: "broad" | "phrase" | "exact";
  bid: string | null;
  platformKeywordId: string | null;
  status: "active" | "paused" | "removed";
  createdAt: Date;
  updatedAt: Date;
}

interface DbSyncRecord {
  id: string;
  generatedCampaignId: string;
  platform: "reddit" | "google" | "facebook";
  platformId: string | null;
  syncStatus: "pending" | "syncing" | "synced" | "failed" | "conflict";
  lastSyncedAt: Date | null;
  errorLog: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DrizzleCampaignSetRepository
 *
 * Implements CampaignSetRepository using Drizzle ORM for database access.
 * Transforms between database types (snake_case) and core types (camelCase).
 */
export class DrizzleCampaignSetRepository implements CampaignSetRepository {
  private readonly db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Get a campaign set with all related entities (campaigns, ad groups, ads, keywords)
   */
  async getCampaignSetWithRelations(setId: string): Promise<CampaignSet | null> {
    const result = await this.db.query.campaignSets.findFirst({
      where: eq(campaignSets.id, setId),
      with: {
        campaigns: {
          with: {
            adGroups: {
              with: {
                ads: true,
                keywords: true,
              },
            },
            syncRecords: true,
          },
        },
      },
    });

    if (!result) {
      return null;
    }

    return this.transformDbCampaignSetToCore(result as unknown as DbCampaignSetWithRelations);
  }

  /**
   * Get a campaign by ID with its parent set ID
   */
  async getCampaignById(campaignId: string): Promise<CampaignWithSet | null> {
    const result = await this.db.query.generatedCampaigns.findFirst({
      where: eq(generatedCampaigns.id, campaignId),
      with: {
        adGroups: {
          with: {
            ads: true,
            keywords: true,
          },
        },
        syncRecords: true,
        campaignSet: true,
      },
    });

    if (!result || !result.campaignSetId) {
      return null;
    }

    const dbCampaign = result as unknown as DbCampaignWithRelations;
    const campaign = this.transformDbCampaignToCore(dbCampaign);

    return {
      campaign,
      setId: result.campaignSetId,
    };
  }

  /**
   * Update campaign set status and sync status
   */
  async updateCampaignSetStatus(
    setId: string,
    status: CampaignSetStatus,
    syncStatus: CampaignSetSyncStatus
  ): Promise<void> {
    const now = new Date();
    // Only update lastSyncedAt when sync is complete, not when it starts
    const shouldUpdateLastSynced = syncStatus === "synced";

    await this.db
      .update(campaignSets)
      .set({
        status,
        syncStatus,
        updatedAt: now,
        ...(shouldUpdateLastSynced && { lastSyncedAt: now }),
      })
      .where(eq(campaignSets.id, setId));
  }

  /**
   * Update campaign sync status with optional error message
   */
  async updateCampaignSyncStatus(
    campaignId: string,
    syncStatus: CampaignSetSyncStatus,
    error?: string
  ): Promise<void> {
    const now = new Date();

    // Find existing sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (existingRecord) {
      // Update existing record
      await this.db
        .update(syncRecords)
        .set({
          syncStatus,
          errorLog: error ?? null,
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(eq(syncRecords.id, existingRecord.id));
    } else {
      // Get campaign to determine platform
      const campaign = await this.db.query.generatedCampaigns.findFirst({
        where: eq(generatedCampaigns.id, campaignId),
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      const campaignData = campaign.campaignData as CampaignDataDb | null;
      const platform = campaignData?.platform;

      if (!platform) {
        throw new Error(`Campaign ${campaignId} is missing platform in campaignData`);
      }

      // Create new sync record
      await this.db.insert(syncRecords).values({
        generatedCampaignId: campaignId,
        platform: platform as "reddit" | "google" | "facebook",
        syncStatus,
        errorLog: error ?? null,
        lastSyncedAt: now,
      });
    }
  }

  /**
   * Update platform campaign ID in sync record
   */
  async updateCampaignPlatformId(campaignId: string, platformId: string): Promise<void> {
    const now = new Date();

    // Find existing sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (existingRecord) {
      // Update existing record
      await this.db
        .update(syncRecords)
        .set({
          platformId,
          updatedAt: now,
        })
        .where(eq(syncRecords.id, existingRecord.id));
    } else {
      // Get campaign to determine platform
      const campaign = await this.db.query.generatedCampaigns.findFirst({
        where: eq(generatedCampaigns.id, campaignId),
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      const campaignData = campaign.campaignData as CampaignDataDb | null;
      const platform = campaignData?.platform;

      if (!platform) {
        throw new Error(`Campaign ${campaignId} is missing platform in campaignData`);
      }

      // Create new sync record with platform ID
      await this.db.insert(syncRecords).values({
        generatedCampaignId: campaignId,
        platform: platform as "reddit" | "google" | "facebook",
        platformId,
        syncStatus: "synced",
        lastSyncedAt: now,
      });
    }
  }

  /**
   * Update platform ad group ID
   */
  async updateAdGroupPlatformId(adGroupId: string, platformId: string): Promise<void> {
    const now = new Date();

    await this.db
      .update(adGroups)
      .set({
        platformAdGroupId: platformId,
        updatedAt: now,
      })
      .where(eq(adGroups.id, adGroupId));
  }

  /**
   * Update platform ad ID
   */
  async updateAdPlatformId(adId: string, platformId: string): Promise<void> {
    const now = new Date();

    await this.db
      .update(ads)
      .set({
        platformAdId: platformId,
        updatedAt: now,
      })
      .where(eq(ads.id, adId));
  }

  /**
   * Update platform keyword ID
   */
  async updateKeywordPlatformId(keywordId: string, platformId: string): Promise<void> {
    const now = new Date();

    await this.db
      .update(keywords)
      .set({
        platformKeywordId: platformId,
        updatedAt: now,
      })
      .where(eq(keywords.id, keywordId));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private Transformation Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Transform database campaign set to core CampaignSet type
   */
  private transformDbCampaignSetToCore(dbSet: DbCampaignSetWithRelations): CampaignSet {
    return {
      id: dbSet.id,
      userId: dbSet.userId || "",
      name: dbSet.name,
      description: dbSet.description || undefined,
      dataSourceId: dbSet.dataSourceId || undefined,
      templateId: dbSet.templateId || undefined,
      config: this.transformDbConfigToCore(dbSet.config),
      campaigns: dbSet.campaigns.map((c) => this.transformDbCampaignToCore(c)),
      status: dbSet.status,
      syncStatus: dbSet.syncStatus,
      lastSyncedAt: dbSet.lastSyncedAt || undefined,
      createdAt: dbSet.createdAt,
      updatedAt: dbSet.updatedAt,
    };
  }

  /**
   * Transform database config to core CampaignSetConfig type
   */
  private transformDbConfigToCore(dbConfig: CampaignSetConfigDb | null): CampaignSet["config"] {
    if (!dbConfig) {
      return {
        dataSourceId: "",
        availableColumns: [],
        selectedPlatforms: [],
        selectedAdTypes: {},
        campaignConfig: { namePattern: "" },
        hierarchyConfig: { adGroups: [] },
        generatedAt: new Date().toISOString(),
        rowCount: 0,
        campaignCount: 0,
      };
    }

    return {
      dataSourceId: dbConfig.dataSourceId,
      availableColumns: dbConfig.availableColumns,
      selectedPlatforms: dbConfig.selectedPlatforms as Platform[],
      selectedAdTypes: dbConfig.selectedAdTypes as Partial<Record<Platform, string[]>>,
      campaignConfig: dbConfig.campaignConfig,
      budgetConfig: dbConfig.budgetConfig,
      biddingConfig: dbConfig.biddingConfig,
      hierarchyConfig: {
        adGroups: dbConfig.hierarchyConfig.adGroups.map((ag) => ({
          namePattern: ag.namePattern,
          keywords: ag.keywords,
          ads: ag.ads.map((ad) => ({
            headline: ad.headline,
            description: ad.description,
            displayUrl: ad.displayUrl,
            finalUrl: ad.finalUrl,
            callToAction: ad.callToAction,
          })),
        })),
      },
      targetingConfig: dbConfig.targetingConfig,
      inlineRules: dbConfig.inlineRules?.map((rule) => ({
        id: `rule-${rule.field}`,
        name: rule.field,
        enabled: rule.enabled,
        conditions: { field: rule.field, operator: rule.operator, value: rule.value },
        actions: {},
      })),
      generatedAt: dbConfig.generatedAt,
      rowCount: dbConfig.rowCount,
      campaignCount: dbConfig.campaignCount,
    };
  }

  /**
   * Transform database campaign to core Campaign type
   */
  private transformDbCampaignToCore(dbCampaign: DbCampaignWithRelations): Campaign {
    const campaignData = dbCampaign.campaignData;

    // Get platform campaign ID from sync records
    const syncRecord = dbCampaign.syncRecords.find(
      (sr) => sr.platformId !== null
    );

    return {
      id: dbCampaign.id,
      campaignSetId: dbCampaign.campaignSetId || "",
      name: campaignData.name || `Campaign ${dbCampaign.id}`,
      platform: (campaignData.platform || "reddit") as Platform,
      orderIndex: dbCampaign.orderIndex,
      templateId: dbCampaign.templateId,
      dataRowId: dbCampaign.dataRowId,
      campaignData: campaignData,
      status: dbCampaign.status,
      syncStatus: this.getSyncStatusFromRecords(dbCampaign.syncRecords),
      lastSyncedAt: this.getLastSyncedAt(dbCampaign.syncRecords),
      syncError: this.getSyncError(dbCampaign.syncRecords),
      platformCampaignId: syncRecord?.platformId || undefined,
      platformData: undefined,
      adGroups: dbCampaign.adGroups.map((ag) => this.transformDbAdGroupToCore(ag)),
      budget: campaignData.budget
        ? {
            type: campaignData.budget.type,
            amount: campaignData.budget.amount,
            currency: campaignData.budget.currency,
          }
        : undefined,
      createdAt: dbCampaign.createdAt,
      updatedAt: dbCampaign.updatedAt,
    };
  }

  /**
   * Transform database ad group to core AdGroup type
   */
  private transformDbAdGroupToCore(dbAdGroup: DbAdGroupWithRelations): AdGroup {
    return {
      id: dbAdGroup.id,
      campaignId: dbAdGroup.campaignId,
      name: dbAdGroup.name,
      orderIndex: dbAdGroup.orderIndex,
      settings: dbAdGroup.settings || undefined,
      platformAdGroupId: dbAdGroup.platformAdGroupId || undefined,
      status: dbAdGroup.status,
      ads: dbAdGroup.ads.map((ad) => this.transformDbAdToCore(ad)),
      keywords: dbAdGroup.keywords.map((kw) => this.transformDbKeywordToCore(kw)),
      createdAt: dbAdGroup.createdAt,
      updatedAt: dbAdGroup.updatedAt,
    };
  }

  /**
   * Transform database ad to core Ad type
   */
  private transformDbAdToCore(dbAd: DbAd): Ad {
    return {
      id: dbAd.id,
      adGroupId: dbAd.adGroupId,
      orderIndex: dbAd.orderIndex,
      headline: dbAd.headline || undefined,
      description: dbAd.description || undefined,
      displayUrl: dbAd.displayUrl || undefined,
      finalUrl: dbAd.finalUrl || undefined,
      callToAction: dbAd.callToAction || undefined,
      assets: dbAd.assets || undefined,
      platformAdId: dbAd.platformAdId || undefined,
      status: dbAd.status,
      createdAt: dbAd.createdAt,
      updatedAt: dbAd.updatedAt,
    };
  }

  /**
   * Transform database keyword to core Keyword type
   */
  private transformDbKeywordToCore(dbKeyword: DbKeyword): Keyword {
    return {
      id: dbKeyword.id,
      adGroupId: dbKeyword.adGroupId,
      keyword: dbKeyword.keyword,
      matchType: dbKeyword.matchType,
      bid: dbKeyword.bid ? parseFloat(dbKeyword.bid) : undefined,
      platformKeywordId: dbKeyword.platformKeywordId || undefined,
      status: dbKeyword.status,
      createdAt: dbKeyword.createdAt,
      updatedAt: dbKeyword.updatedAt,
    };
  }

  /**
   * Get sync status from sync records
   */
  private getSyncStatusFromRecords(records: DbSyncRecord[]): CampaignSetSyncStatus {
    if (records.length === 0) {
      return "pending";
    }

    // Return the most recent sync status
    const latestRecord = records.reduce((latest, current) => {
      if (!latest.lastSyncedAt) return current;
      if (!current.lastSyncedAt) return latest;
      return current.lastSyncedAt > latest.lastSyncedAt ? current : latest;
    });

    return latestRecord.syncStatus;
  }

  /**
   * Get last synced at timestamp from sync records
   */
  private getLastSyncedAt(records: DbSyncRecord[]): Date | undefined {
    if (records.length === 0) {
      return undefined;
    }

    const latestDate = records.reduce<Date | null>((latest, current) => {
      if (!current.lastSyncedAt) return latest;
      if (!latest) return current.lastSyncedAt;
      return current.lastSyncedAt > latest ? current.lastSyncedAt : latest;
    }, null);

    return latestDate || undefined;
  }

  /**
   * Get sync error from sync records
   */
  private getSyncError(records: DbSyncRecord[]): string | undefined {
    const failedRecord = records.find(
      (r) => r.syncStatus === "failed" && r.errorLog
    );
    return failedRecord?.errorLog || undefined;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Sync-Back Methods (Bidirectional Sync)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Get all synced campaigns for an ad account
   *
   * Returns campaigns that have a platformId set in their sync record,
   * meaning they've been successfully synced to the platform.
   *
   * SECURITY: This method filters by adAccountId to ensure account isolation.
   * The adAccountId is stored in the campaignSet's config JSONB field.
   *
   * @param adAccountId - The ad account ID to query
   * @returns Array of synced campaigns with their platform IDs
   */
  async getSyncedCampaignsForAccount(adAccountId: string): Promise<SyncedCampaign[]> {
    // Query sync records joined with campaigns and campaign sets to filter by account
    // SECURITY FIX: Join through tables to filter by adAccountId
    const syncedRecords = await this.db
      .select({
        campaignId: syncRecords.generatedCampaignId,
        platformId: syncRecords.platformId,
        platform: syncRecords.platform,
        lastSyncedAt: syncRecords.lastSyncedAt,
        localStatus: generatedCampaigns.status,
        localUpdatedAt: generatedCampaigns.updatedAt,
      })
      .from(syncRecords)
      .innerJoin(generatedCampaigns, eq(syncRecords.generatedCampaignId, generatedCampaigns.id))
      .innerJoin(campaignSets, eq(generatedCampaigns.campaignSetId, campaignSets.id))
      .where(and(
        isNotNull(syncRecords.platformId),
        // Filter by adAccountId stored in campaignSet config JSONB
        sql`${campaignSets.config}->>'adAccountId' = ${adAccountId}`
      ));

    if (syncedRecords.length === 0) {
      return [];
    }

    // Transform to SyncedCampaign format
    const result: SyncedCampaign[] = [];

    for (const record of syncedRecords) {
      if (!record.campaignId || !record.platformId || !record.platform) {
        continue;
      }

      result.push({
        id: record.campaignId,
        platformCampaignId: record.platformId,
        localStatus: record.localStatus,
        lastSyncedAt: record.lastSyncedAt || new Date(0),
        localUpdatedAt: record.localUpdatedAt,
        platform: record.platform,
      });
    }

    return result;
  }

  /**
   * Mark a campaign as deleted on the platform
   *
   * Used when a campaign is no longer found on the platform during sync-back.
   * Updates the sync record to indicate the campaign was deleted externally.
   *
   * @param campaignId - The local campaign ID
   */
  async markCampaignDeletedOnPlatform(campaignId: string): Promise<void> {
    const now = new Date();

    // Find existing sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (existingRecord) {
      // Update sync record to indicate campaign was deleted on platform
      await this.db
        .update(syncRecords)
        .set({
          syncStatus: "failed",
          errorLog: "Campaign was deleted on the ad platform",
          updatedAt: now,
        })
        .where(eq(syncRecords.id, existingRecord.id));
    }

    // Also update the campaign status to error
    await this.db
      .update(generatedCampaigns)
      .set({
        status: "error",
        updatedAt: now,
      })
      .where(eq(generatedCampaigns.id, campaignId));
  }

  /**
   * Mark a campaign as having a conflict between local and platform state
   *
   * @param campaignId - The local campaign ID
   * @param conflictDetails - Details about the conflict
   */
  async markCampaignConflict(
    campaignId: string,
    conflictDetails: ConflictDetails
  ): Promise<void> {
    const now = new Date();

    // Find existing sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (existingRecord) {
      // Update existing record with conflict status
      await this.db
        .update(syncRecords)
        .set({
          syncStatus: "conflict",
          errorLog: JSON.stringify(conflictDetails),
          updatedAt: now,
        })
        .where(eq(syncRecords.id, existingRecord.id));
    } else {
      // Get campaign to determine platform
      const campaign = await this.db.query.generatedCampaigns.findFirst({
        where: eq(generatedCampaigns.id, campaignId),
      });

      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }

      const campaignData = campaign.campaignData as CampaignDataDb | null;
      const platform = campaignData?.platform;

      if (!platform) {
        throw new Error(`Campaign ${campaignId} is missing platform in campaignData`);
      }

      // Create new sync record with conflict status
      await this.db.insert(syncRecords).values({
        generatedCampaignId: campaignId,
        platform: platform as "reddit" | "google" | "facebook",
        syncStatus: "conflict",
        errorLog: JSON.stringify(conflictDetails),
      });
    }
  }

  /**
   * Update a campaign from platform status (platform wins)
   *
   * Used when platform status differs from local but local wasn't modified
   * after the last sync. In this case, platform changes take precedence.
   *
   * @param campaignId - The local campaign ID
   * @param platformStatus - The status from the platform
   */
  async updateCampaignFromPlatform(
    campaignId: string,
    platformStatus: PlatformCampaignStatus
  ): Promise<void> {
    const now = new Date();

    // Map platform status to our campaign status
    const statusMap: Record<string, "draft" | "pending" | "active" | "paused" | "completed" | "error"> = {
      active: "active",
      paused: "paused",
      completed: "completed",
      deleted: "error", // Deleted campaigns are marked as error locally
      error: "error",
    };

    const newStatus = statusMap[platformStatus.status] || "error";

    // Get the existing campaign to update its data
    const campaign = await this.db.query.generatedCampaigns.findFirst({
      where: eq(generatedCampaigns.id, campaignId),
    });

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // Update campaign status
    const campaignData = (campaign.campaignData || {}) as Record<string, unknown>;

    // Update budget if provided
    if (platformStatus.budget) {
      campaignData.budget = {
        type: platformStatus.budget.type,
        amount: platformStatus.budget.amount,
        currency: (campaignData.budget as { currency?: string })?.currency || "USD",
      };
    }

    await this.db
      .update(generatedCampaigns)
      .set({
        status: newStatus,
        campaignData: campaignData,
        updatedAt: now,
      })
      .where(eq(generatedCampaigns.id, campaignId));

    // Update sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (existingRecord) {
      await this.db
        .update(syncRecords)
        .set({
          syncStatus: "synced",
          lastSyncedAt: now,
          errorLog: null, // Clear any previous errors
          updatedAt: now,
        })
        .where(eq(syncRecords.id, existingRecord.id));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Retry Logic Methods
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Failed campaign data for retry processing
   *
   * Returns campaigns that:
   * - Have failed sync status
   * - Are not permanently failed
   * - Have retry count below max
   * - Belong to the specified user
   * - Have nextRetryAt either null (never retried) or in the past (ready for retry)
   */
  async getFailedCampaignsForRetry(
    userId: string,
    maxRetries: number
  ): Promise<FailedCampaignForRetry[]> {
    const now = new Date();

    const results = await this.db
      .select({
        syncRecordId: syncRecords.id,
        campaignId: syncRecords.generatedCampaignId,
        platform: syncRecords.platform,
        retryCount: syncRecords.retryCount,
        errorLog: syncRecords.errorLog,
        lastRetryAt: syncRecords.lastRetryAt,
        nextRetryAt: syncRecords.nextRetryAt,
      })
      .from(syncRecords)
      .innerJoin(
        generatedCampaigns,
        eq(syncRecords.generatedCampaignId, generatedCampaigns.id)
      )
      .where(
        and(
          eq(syncRecords.syncStatus, "failed"),
          eq(syncRecords.permanentFailure, false),
          lt(syncRecords.retryCount, maxRetries),
          eq(generatedCampaigns.userId, userId),
          // Only return campaigns ready for retry:
          // - nextRetryAt is null (first retry attempt)
          // - nextRetryAt is in the past or now (ready for retry)
          or(
            isNull(syncRecords.nextRetryAt),
            lte(syncRecords.nextRetryAt, now)
          )
        )
      );

    return results.map((r) => ({
      syncRecordId: r.syncRecordId,
      campaignId: r.campaignId,
      platform: r.platform,
      retryCount: r.retryCount,
      errorLog: r.errorLog,
      lastRetryAt: r.lastRetryAt,
      nextRetryAt: r.nextRetryAt,
    }));
  }

  /**
   * Increment the retry count for a campaign's sync record
   *
   * Uses the shared calculateBackoffDelay utility which includes jitter
   * to prevent the "thundering herd" problem where many clients retry
   * at exactly the same time after a service recovers.
   *
   * @param campaignId - The local campaign ID
   * @returns The new retry count
   */
  async incrementRetryCount(campaignId: string): Promise<number> {
    const now = new Date();

    // Find existing sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (!existingRecord) {
      throw new Error(`Sync record not found for campaign: ${campaignId}`);
    }

    const newRetryCount = (existingRecord.retryCount ?? 0) + 1;

    // Use shared backoff utility which includes jitter for distributed retry spread
    const delayMs = calculateBackoffDelay(newRetryCount);
    const nextRetryAt = new Date(now.getTime() + delayMs);

    await this.db
      .update(syncRecords)
      .set({
        retryCount: newRetryCount,
        lastRetryAt: now,
        nextRetryAt,
        updatedAt: now,
      })
      .where(eq(syncRecords.id, existingRecord.id));

    return newRetryCount;
  }

  /**
   * Mark a campaign sync as permanently failed (no more retries)
   *
   * @param campaignId - The local campaign ID
   * @param reason - Optional reason for permanent failure
   */
  async markPermanentFailure(campaignId: string, reason?: string): Promise<void> {
    const now = new Date();

    // Find existing sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (!existingRecord) {
      throw new Error(`Sync record not found for campaign: ${campaignId}`);
    }

    const errorLog = reason
      ? `PERMANENT FAILURE: ${reason}`
      : existingRecord.errorLog
        ? `PERMANENT FAILURE: ${existingRecord.errorLog}`
        : "PERMANENT FAILURE: Max retries exceeded";

    await this.db
      .update(syncRecords)
      .set({
        permanentFailure: true,
        nextRetryAt: null,
        errorLog,
        updatedAt: now,
      })
      .where(eq(syncRecords.id, existingRecord.id));

    // Also update the campaign status to error
    await this.db
      .update(generatedCampaigns)
      .set({
        status: "error",
        updatedAt: now,
      })
      .where(eq(generatedCampaigns.id, campaignId));
  }

  /**
   * Reset a sync record for retry
   *
   * @param campaignId - The local campaign ID
   */
  async resetSyncForRetry(campaignId: string): Promise<void> {
    const now = new Date();

    // Find existing sync record
    const existingRecord = await this.db.query.syncRecords.findFirst({
      where: eq(syncRecords.generatedCampaignId, campaignId),
    });

    if (!existingRecord) {
      throw new Error(`Sync record not found for campaign: ${campaignId}`);
    }

    await this.db
      .update(syncRecords)
      .set({
        syncStatus: "pending",
        errorLog: null,
        updatedAt: now,
      })
      .where(eq(syncRecords.id, existingRecord.id));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Type Exports
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Failed campaign data structure for retry processing
 */
export interface FailedCampaignForRetry {
  syncRecordId: string;
  campaignId: string;
  platform: "reddit" | "google" | "facebook";
  retryCount: number;
  errorLog: string | null;
  lastRetryAt: Date | null;
  nextRetryAt: Date | null;
}
