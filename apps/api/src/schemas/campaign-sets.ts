import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";
import { platformSchema } from "./templates.js";

// ============================================================================
// Status Enums
// ============================================================================

/**
 * Campaign Set Status Enum
 * Matches database enum: campaign_set_status
 */
export const campaignSetStatusSchema = z.enum([
  "draft",
  "pending",
  "syncing",
  "active",
  "paused",
  "completed",
  "archived",
  "error",
]);
export type CampaignSetStatus = z.infer<typeof campaignSetStatusSchema>;

/**
 * Campaign Set Sync Status Enum
 * Matches database enum: campaign_set_sync_status
 */
export const campaignSetSyncStatusSchema = z.enum([
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
]);
export type CampaignSetSyncStatus = z.infer<typeof campaignSetSyncStatusSchema>;

/**
 * Entity Status Enum
 * For ads, ad groups, keywords
 */
export const entityStatusSchema = z.enum(["active", "paused", "removed"]);
export type EntityStatus = z.infer<typeof entityStatusSchema>;

/**
 * Campaign Status Enum
 */
export const campaignStatusSchema = z.enum([
  "draft",
  "pending",
  "active",
  "paused",
  "completed",
  "error",
]);
export type CampaignStatus = z.infer<typeof campaignStatusSchema>;

/**
 * Keyword Match Type Enum
 */
export const keywordMatchTypeSchema = z.enum(["broad", "phrase", "exact"]);
export type KeywordMatchType = z.infer<typeof keywordMatchTypeSchema>;

// ============================================================================
// Supporting Types
// ============================================================================

/**
 * Budget Info Schema
 */
export const budgetInfoSchema = z.object({
  type: z.enum(["daily", "lifetime", "shared"]),
  amount: z.number().nonnegative(),
  currency: z.string().min(1).max(3),
});
export type BudgetInfo = z.infer<typeof budgetInfoSchema>;

/**
 * Budget Config Schema (for CampaignSetConfig)
 */
export const budgetConfigSchema = z.object({
  type: z.enum(["daily", "lifetime", "shared"]),
  amountPattern: z.string(),
  currency: z.string().min(1).max(3),
  pacing: z.enum(["standard", "accelerated"]).optional(),
});
export type BudgetConfig = z.infer<typeof budgetConfigSchema>;

/**
 * Hierarchy Config Snapshot Schema
 * Matches the database schema CampaignSetConfig.hierarchyConfig
 */
export const hierarchyConfigSnapshotSchema = z.object({
  adGroups: z.array(
    z.object({
      namePattern: z.string(),
      keywords: z.array(z.string()).optional(),
      ads: z.array(
        z.object({
          headline: z.string().optional(),
          description: z.string().optional(),
          displayUrl: z.string().optional(),
          finalUrl: z.string().optional(),
          callToAction: z.string().optional(),
        })
      ),
    })
  ),
});
export type HierarchyConfigSnapshot = z.infer<typeof hierarchyConfigSnapshotSchema>;

/**
 * Inline Rule Schema
 * Matches the database schema CampaignSetConfig.inlineRules
 */
export const inlineRuleSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown().optional().default(null), // Ensure value is always defined
  enabled: z.boolean(),
});
export type InlineRule = z.infer<typeof inlineRuleSchema>;

// ============================================================================
// Campaign Set Config
// ============================================================================

/**
 * Campaign Set Config Schema
 * Complete wizard state snapshot stored at creation time
 * Matches the database schema CampaignSetConfig interface
 */
export const campaignSetConfigSchema = z.object({
  dataSourceId: z.string(),
  availableColumns: z.array(z.string()),
  selectedPlatforms: z.array(z.string()), // Database uses string[] not Platform[]
  selectedAdTypes: z.record(z.array(z.string())),
  campaignConfig: z.object({
    namePattern: z.string(),
  }),
  budgetConfig: budgetConfigSchema.optional(),
  biddingConfig: z.record(z.unknown()).optional(),
  hierarchyConfig: hierarchyConfigSnapshotSchema,
  targetingConfig: z.record(z.unknown()).optional(),
  inlineRules: z.array(inlineRuleSchema).optional(),
  generatedAt: z.string(), // Database uses string for ISO date
  rowCount: z.number().int().nonnegative(),
  campaignCount: z.number().int().nonnegative(),
});
export type CampaignSetConfig = z.infer<typeof campaignSetConfigSchema>;

// ============================================================================
// Ad Assets Schema
// ============================================================================

/**
 * Ad Assets Schema
 */
export const adAssetsSchema = z
  .object({
    images: z
      .array(
        z.object({
          id: z.string().optional(),
          url: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
          altText: z.string().optional(),
          type: z.enum(["square", "landscape", "portrait"]).optional(),
        })
      )
      .optional(),
    videos: z
      .array(
        z.object({
          id: z.string().optional(),
          url: z.string(),
          thumbnailUrl: z.string().optional(),
          duration: z.number().optional(),
        })
      )
      .optional(),
    logos: z
      .array(
        z.object({
          id: z.string().optional(),
          url: z.string(),
          width: z.number().optional(),
          height: z.number().optional(),
        })
      )
      .optional(),
    additionalHeadlines: z.array(z.string()).optional(),
    additionalDescriptions: z.array(z.string()).optional(),
    sitelinks: z
      .array(
        z.object({
          text: z.string(),
          url: z.string(),
          description: z.string().optional(),
        })
      )
      .optional(),
    callouts: z.array(z.string()).optional(),
    structuredSnippets: z
      .object({
        header: z.string(),
        values: z.array(z.string()),
      })
      .optional(),
  })
  .passthrough();
export type AdAssets = z.infer<typeof adAssetsSchema>;

// ============================================================================
// Entity Schemas (Keyword, Ad, AdGroup, Campaign)
// ============================================================================

/**
 * Keyword Schema
 */
export const keywordSchema = z.object({
  id: uuidSchema,
  adGroupId: uuidSchema,
  keyword: z.string().min(1),
  matchType: keywordMatchTypeSchema,
  bid: z.number().nonnegative().optional(),
  platformKeywordId: z.string().optional(),
  status: entityStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Keyword = z.infer<typeof keywordSchema>;

/**
 * Ad Schema
 */
export const adSchema = z.object({
  id: uuidSchema,
  adGroupId: uuidSchema,
  orderIndex: z.number().int().nonnegative(),
  headline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  displayUrl: z.string().nullable().optional(),
  finalUrl: z.string().nullable().optional(),
  callToAction: z.string().nullable().optional(),
  assets: adAssetsSchema.nullable().optional(),
  platformAdId: z.string().nullable().optional(),
  status: entityStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Ad = z.infer<typeof adSchema>;

/**
 * Ad Group Settings Schema
 */
export const adGroupSettingsSchema = z.record(z.unknown()).nullable().optional();
export type AdGroupSettings = z.infer<typeof adGroupSettingsSchema>;

/**
 * Ad Group Schema
 */
export const adGroupSchema = z.object({
  id: uuidSchema,
  campaignId: uuidSchema,
  name: z.string().min(1),
  orderIndex: z.number().int().nonnegative(),
  settings: adGroupSettingsSchema,
  platformAdGroupId: z.string().optional(),
  status: entityStatusSchema,
  ads: z.array(adSchema),
  keywords: z.array(keywordSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdGroup = z.infer<typeof adGroupSchema>;

/**
 * Campaign Schema (within a campaign set)
 */
export const campaignSchema = z.object({
  id: uuidSchema,
  campaignSetId: uuidSchema,
  name: z.string().min(1),
  platform: platformSchema,
  orderIndex: z.number().int().nonnegative(),
  templateId: uuidSchema.nullable().optional(),
  dataRowId: uuidSchema.nullable().optional(),
  campaignData: z.record(z.unknown()).nullable().optional(),
  status: campaignStatusSchema,
  syncStatus: campaignSetSyncStatusSchema,
  lastSyncedAt: z.string().datetime().nullable().optional(),
  syncError: z.string().nullable().optional(),
  platformCampaignId: z.string().nullable().optional(),
  platformData: z.record(z.unknown()).nullable().optional(),
  adGroups: z.array(adGroupSchema),
  budget: budgetInfoSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Campaign = z.infer<typeof campaignSchema>;

// ============================================================================
// Campaign Set Schema
// ============================================================================

/**
 * Campaign Set Schema
 * Full representation with all nested relations
 */
export const campaignSetSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  dataSourceId: uuidSchema.nullable().optional(),
  templateId: uuidSchema.nullable().optional(),
  config: campaignSetConfigSchema,
  campaigns: z.array(campaignSchema),
  status: campaignSetStatusSchema,
  syncStatus: campaignSetSyncStatusSchema,
  lastSyncedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CampaignSet = z.infer<typeof campaignSetSchema>;

/**
 * Campaign Set Summary Schema
 * Lightweight representation for list views
 */
export const campaignSetSummarySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  description: z.string().nullable().optional(),
  status: campaignSetStatusSchema,
  syncStatus: campaignSetSyncStatusSchema,
  campaignCount: z.number().int().nonnegative(),
  adGroupCount: z.number().int().nonnegative(),
  adCount: z.number().int().nonnegative(),
  platforms: z.array(platformSchema),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CampaignSetSummary = z.infer<typeof campaignSetSummarySchema>;

// ============================================================================
// Request/Response Schemas
// ============================================================================

/**
 * Create Campaign Set Request Schema
 */
export const createCampaignSetRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  dataSourceId: uuidSchema.optional(),
  templateId: uuidSchema.optional(),
  config: campaignSetConfigSchema,
  status: campaignSetStatusSchema.optional().default("draft"),
  syncStatus: campaignSetSyncStatusSchema.optional().default("pending"),
});
export type CreateCampaignSetRequest = z.infer<typeof createCampaignSetRequestSchema>;

/**
 * Update Campaign Set Request Schema
 */
export const updateCampaignSetRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  dataSourceId: uuidSchema.nullable().optional(),
  templateId: uuidSchema.nullable().optional(),
  config: campaignSetConfigSchema.optional(),
  status: campaignSetStatusSchema.optional(),
  syncStatus: campaignSetSyncStatusSchema.optional(),
});
export type UpdateCampaignSetRequest = z.infer<typeof updateCampaignSetRequestSchema>;

/**
 * Campaign Set Query Parameters
 */
export const campaignSetQuerySchema = paginationSchema.extend({
  status: campaignSetStatusSchema.optional(),
  syncStatus: campaignSetSyncStatusSchema.optional(),
});
export type CampaignSetQuery = z.infer<typeof campaignSetQuerySchema>;

/**
 * Campaign Set List Response Schema
 */
export const campaignSetListResponseSchema = z.object({
  data: z.array(campaignSetSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
export type CampaignSetListResponse = z.infer<typeof campaignSetListResponseSchema>;

/**
 * Campaign Set Path Parameters
 */
export const setIdParamSchema = z.object({
  setId: uuidSchema,
});
export type SetIdParam = z.infer<typeof setIdParamSchema>;

/**
 * Campaign Path Parameters (within set)
 */
export const campaignIdParamSchema = z.object({
  setId: uuidSchema,
  campaignId: uuidSchema,
});
export type CampaignIdParam = z.infer<typeof campaignIdParamSchema>;

// ============================================================================
// Action Schemas
// ============================================================================

/**
 * Generate Campaigns Request Schema
 */
export const generateCampaignsRequestSchema = z.object({
  regenerate: z.boolean().optional().default(false),
});
export type GenerateCampaignsRequest = z.infer<typeof generateCampaignsRequestSchema>;

/**
 * Generate Campaigns Response Schema
 */
export const generateCampaignsResponseSchema = z.object({
  campaigns: z.array(campaignSchema),
  created: z.number().int().nonnegative(),
  updated: z.number().int().nonnegative(),
});
export type GenerateCampaignsResponse = z.infer<typeof generateCampaignsResponseSchema>;

/**
 * Sync Error Item Schema
 * Detailed error information for individual campaign sync failures
 */
export const syncErrorItemSchema = z.object({
  campaignId: uuidSchema,
  message: z.string(),
});
export type SyncErrorItem = z.infer<typeof syncErrorItemSchema>;

/**
 * Sync Response Schema (for inline sync - kept for backwards compatibility)
 */
export const syncResponseSchema = z.object({
  synced: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(syncErrorItemSchema),
});
export type SyncResponse = z.infer<typeof syncResponseSchema>;

/**
 * Queued Job Response Schema
 * Returned when a background job is queued (202 Accepted)
 */
export const queuedJobResponseSchema = z.object({
  jobId: z.string().uuid(),
  status: z.literal("queued"),
  message: z.string(),
});
export type QueuedJobResponse = z.infer<typeof queuedJobResponseSchema>;

/**
 * Pause Response Schema
 */
export const pauseResponseSchema = z.object({
  paused: z.number().int().nonnegative(),
});
export type PauseResponse = z.infer<typeof pauseResponseSchema>;

/**
 * Resume Response Schema
 */
export const resumeResponseSchema = z.object({
  resumed: z.number().int().nonnegative(),
});
export type ResumeResponse = z.infer<typeof resumeResponseSchema>;

// Note: DELETE endpoints return 204 No Content, so no response schema is needed

/**
 * Campaigns List Response Schema (within set)
 */
export const campaignsListResponseSchema = z.object({
  campaigns: z.array(campaignSchema),
});
export type CampaignsListResponse = z.infer<typeof campaignsListResponseSchema>;

/**
 * Update Campaign Request Schema
 */
export const updateCampaignRequestSchema = z.object({
  name: z.string().min(1).optional(),
  status: campaignStatusSchema.optional(),
  syncStatus: campaignSetSyncStatusSchema.optional(),
  budget: budgetInfoSchema.optional(),
  platformData: z.record(z.unknown()).optional(),
});
export type UpdateCampaignRequest = z.infer<typeof updateCampaignRequestSchema>;

// ============================================================================
// SSE Streaming Schemas
// ============================================================================

/**
 * Sync Stream Query Parameters Schema
 * Required parameters for SSE sync progress streaming
 */
export const syncStreamQuerySchema = z.object({
  jobId: z.string().uuid({
    message: "jobId must be a valid UUID",
  }),
});
export type SyncStreamQuery = z.infer<typeof syncStreamQuerySchema>;
