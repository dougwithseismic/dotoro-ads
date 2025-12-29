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
 * Platform Budgets Schema
 * Per-platform budget configuration for multi-platform campaigns
 */
export const platformBudgetsSchema = z.record(
  z.string(), // Platform key (google, reddit, facebook)
  budgetConfigSchema.nullable()
);
export type PlatformBudgets = z.infer<typeof platformBudgetsSchema>;

/**
 * Fallback Strategy Schema
 * Defines how to handle text that exceeds platform character limits
 */
export const fallbackStrategySchema = z.enum(["truncate", "truncate_word", "error"]);
export type FallbackStrategy = z.infer<typeof fallbackStrategySchema>;

/**
 * Ad Definition Schema (within hierarchy config)
 * Enhanced with IDs for editing and fallback strategies
 */
export const adDefinitionSchema = z.object({
  id: z.string().optional(), // Optional ID for editing existing ads
  headline: z.string().optional(),
  headlineFallback: fallbackStrategySchema.optional(),
  description: z.string().optional(),
  descriptionFallback: fallbackStrategySchema.optional(),
  displayUrl: z.string().optional(),
  finalUrl: z.string().optional(),
  callToAction: z.string().optional(),
});
export type AdDefinition = z.infer<typeof adDefinitionSchema>;

/**
 * Ad Group Definition Schema (within hierarchy config)
 * Enhanced with IDs for editing
 */
export const adGroupDefinitionSchema = z.object({
  id: z.string().optional(), // Optional ID for editing existing ad groups
  namePattern: z.string(),
  keywords: z.array(z.string()).optional(),
  ads: z.array(adDefinitionSchema),
});
export type AdGroupDefinition = z.infer<typeof adGroupDefinitionSchema>;

/**
 * Hierarchy Config Snapshot Schema
 * Matches the database schema CampaignSetConfig.hierarchyConfig
 * Enhanced with IDs and fallback strategies for round-trip editing
 */
export const hierarchyConfigSnapshotSchema = z.object({
  adGroups: z.array(adGroupDefinitionSchema),
});
export type HierarchyConfigSnapshot = z.infer<typeof hierarchyConfigSnapshotSchema>;

/**
 * Inline Condition Schema
 * A single condition in an inline rule
 */
export const inlineConditionSchema = z.object({
  id: z.string(),
  field: z.string(),
  operator: z.string(),
  value: z.string(),
});
export type InlineCondition = z.infer<typeof inlineConditionSchema>;

/**
 * Inline Action Schema
 * An action to take when rule conditions are met
 */
export const inlineActionSchema = z.object({
  id: z.string(),
  type: z.enum(["skip", "set_field", "modify_field", "add_tag"]),
  field: z.string().optional(),
  value: z.string().optional(),
  operation: z.enum(["append", "prepend", "replace"]).optional(),
  tag: z.string().optional(),
});
export type InlineAction = z.infer<typeof inlineActionSchema>;

/**
 * Enhanced Inline Rule Schema
 * Full rule structure with conditions and actions for data transformation
 */
export const enhancedInlineRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  logic: z.enum(["AND", "OR"]),
  conditions: z.array(inlineConditionSchema),
  actions: z.array(inlineActionSchema),
});
export type EnhancedInlineRule = z.infer<typeof enhancedInlineRuleSchema>;

/**
 * Legacy Inline Rule Schema (for backwards compatibility)
 * Simple rule format from older versions
 */
export const legacyInlineRuleSchema = z.object({
  field: z.string(),
  operator: z.string(),
  value: z.unknown().optional().default(null),
  enabled: z.boolean(),
});
export type LegacyInlineRule = z.infer<typeof legacyInlineRuleSchema>;

/**
 * Inline Rule Schema (union of enhanced and legacy formats)
 * Accepts both the new full structure and legacy simple format for backwards compatibility
 */
export const inlineRuleSchema = z.union([enhancedInlineRuleSchema, legacyInlineRuleSchema]);
export type InlineRule = z.infer<typeof inlineRuleSchema>;

// ============================================================================
// Thread Config Schemas (Reddit Threads)
// ============================================================================

/**
 * Persona Role Schema
 */
export const personaRoleSchema = z.enum([
  "op",
  "community_member",
  "skeptic",
  "enthusiast",
  "expert",
  "curious",
  "moderator",
]);
export type PersonaRole = z.infer<typeof personaRoleSchema>;

/**
 * Persona Tone Schema
 */
export const personaToneSchema = z.enum([
  "friendly",
  "skeptical",
  "enthusiastic",
  "neutral",
  "curious",
]);
export type PersonaTone = z.infer<typeof personaToneSchema>;

/**
 * Reddit Post Type Schema
 */
export const redditPostTypeSchema = z.enum(["text", "link", "image", "video"]);
export type RedditPostType = z.infer<typeof redditPostTypeSchema>;

/**
 * Author Persona Schema
 */
export const authorPersonaSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  role: personaRoleSchema,
  tone: personaToneSchema.optional(),
});
export type AuthorPersona = z.infer<typeof authorPersonaSchema>;

/**
 * Reddit Post Config Schema
 */
export const redditPostConfigSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  url: z.string().optional(),
  type: redditPostTypeSchema,
  subreddit: z.string(),
  flair: z.string().optional(),
  nsfw: z.boolean().optional(),
  spoiler: z.boolean().optional(),
  sendReplies: z.boolean().optional(),
});
export type RedditPostConfig = z.infer<typeof redditPostConfigSchema>;

/**
 * Comment Definition Schema
 */
export const commentDefinitionSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable().optional(),
  persona: z.string(),
  body: z.string(),
  depth: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});
export type CommentDefinition = z.infer<typeof commentDefinitionSchema>;

/**
 * Thread Config Schema
 * Configuration for Reddit organic thread generation
 */
export const threadConfigSchema = z.object({
  post: redditPostConfigSchema,
  comments: z.array(commentDefinitionSchema),
  personas: z.array(authorPersonaSchema),
});
export type ThreadConfig = z.infer<typeof threadConfigSchema>;

// ============================================================================
// Available Column Schema (Enhanced)
// ============================================================================

/**
 * Data Source Column Schema
 * Column with type information for better autocomplete and validation
 */
export const dataSourceColumnSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "date", "unknown"]),
  sampleValues: z.array(z.string()).optional(),
});
export type DataSourceColumn = z.infer<typeof dataSourceColumnSchema>;

/**
 * Available Columns Schema
 * Accepts both simple string array (legacy) and full column objects (enhanced)
 */
export const availableColumnsSchema = z.union([
  z.array(z.string()),
  z.array(dataSourceColumnSchema),
]);
export type AvailableColumns = z.infer<typeof availableColumnsSchema>;

// ============================================================================
// Campaign Set Config
// ============================================================================

/**
 * Campaign Config Schema (Enhanced)
 * Campaign-level configuration with optional objective
 */
export const campaignConfigSchema = z.object({
  namePattern: z.string(),
  objective: z.string().optional(),
});
export type CampaignConfigType = z.infer<typeof campaignConfigSchema>;

/**
 * Campaign Set Config Schema
 * Complete wizard state snapshot stored at creation time
 * Enhanced to support all fields needed for round-trip editing
 */
export const campaignSetConfigSchema = z.object({
  // Core required fields
  dataSourceId: z.string(),
  availableColumns: availableColumnsSchema, // Enhanced: accepts string[] or DataSourceColumn[]
  selectedPlatforms: z.array(z.string()), // Database uses string[] not Platform[]
  selectedAdTypes: z.record(z.array(z.string())),
  campaignConfig: campaignConfigSchema, // Enhanced: includes objective
  hierarchyConfig: hierarchyConfigSnapshotSchema, // Enhanced: includes IDs and fallbacks
  generatedAt: z.string(), // ISO date string
  rowCount: z.number().int().nonnegative(),
  campaignCount: z.number().int().nonnegative(),

  // Budget configuration (legacy single budget and new per-platform)
  budgetConfig: budgetConfigSchema.optional(), // Legacy single budget
  platformBudgets: platformBudgetsSchema.optional(), // NEW: Per-platform budgets

  // Bidding and targeting
  biddingConfig: z.record(z.unknown()).optional(),
  targetingConfig: z.record(z.unknown()).optional(),

  // Rules (legacy and enhanced)
  ruleIds: z.array(z.string()).optional(), // NEW: Rule template IDs
  inlineRules: z.array(inlineRuleSchema).optional(), // Enhanced: supports full structure

  // Thread config (for Reddit)
  threadConfig: threadConfigSchema.optional(), // NEW: Reddit thread configuration

  // Platform-specific account fields (for syncing to ad platforms)
  /** Reddit Ad Account ID - required for syncing to Reddit Ads platform */
  adAccountId: z.string().optional(),
  /** Reddit Funding Instrument ID - optional for Reddit v3 API */
  fundingInstrumentId: z.string().optional(),
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
  teamId: uuidSchema.nullable(),
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
  teamId: uuidSchema.nullable(),
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
