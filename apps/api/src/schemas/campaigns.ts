import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";
import { platformSchema } from "./templates.js";

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
 * Sync Status Enum
 */
export const syncStatusSchema = z.enum([
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
]);
export type SyncStatus = z.infer<typeof syncStatusSchema>;

/**
 * Generated Campaign Data Schema
 */
export const generatedCampaignDataSchema = z.object({
  name: z.string().min(1),
  objective: z.string().optional(),
  budget: z
    .object({
      type: z.enum(["daily", "lifetime"]),
      amount: z.number().positive(),
      currency: z.string().min(1).max(3),
    })
    .optional(),
  targeting: z.record(z.unknown()).optional(),
  adGroups: z
    .array(
      z.object({
        name: z.string(),
        settings: z.record(z.unknown()).optional(),
        ads: z
          .array(
            z.object({
              headline: z.string().optional(),
              description: z.string().optional(),
              assets: z.record(z.unknown()).optional(),
            })
          )
          .optional(),
      })
    )
    .optional(),
});

export type GeneratedCampaignData = z.infer<typeof generatedCampaignDataSchema>;

/**
 * Generated Campaign Schema - full representation
 */
export const generatedCampaignSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  templateId: uuidSchema,
  dataRowId: uuidSchema,
  campaignData: generatedCampaignDataSchema,
  status: campaignStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GeneratedCampaign = z.infer<typeof generatedCampaignSchema>;

/**
 * Sync Record Schema
 */
export const syncRecordSchema = z.object({
  id: uuidSchema,
  generatedCampaignId: uuidSchema,
  platform: platformSchema,
  platformId: z.string().max(255).nullable(),
  syncStatus: syncStatusSchema,
  lastSyncedAt: z.string().datetime().nullable(),
  errorLog: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SyncRecord = z.infer<typeof syncRecordSchema>;

/**
 * Campaign with Sync Records
 */
export const campaignWithSyncSchema = generatedCampaignSchema.extend({
  syncRecords: z.array(syncRecordSchema),
});

export type CampaignWithSync = z.infer<typeof campaignWithSyncSchema>;

/**
 * Generate Campaigns Request Schema
 */
export const generateCampaignsRequestSchema = z.object({
  templateId: uuidSchema,
  dataSourceId: uuidSchema,
  ruleIds: z.array(uuidSchema).optional(),
});

export type GenerateCampaignsRequest = z.infer<typeof generateCampaignsRequestSchema>;

/**
 * Generate Campaigns Response Schema
 */
export const generateCampaignsResponseSchema = z.object({
  generatedCount: z.number(),
  campaigns: z.array(generatedCampaignSchema),
  warnings: z.array(z.string()),
});

export type GenerateCampaignsResponse = z.infer<typeof generateCampaignsResponseSchema>;

/**
 * Sync Request Schema
 */
export const syncRequestSchema = z.object({
  platform: platformSchema,
  accountId: uuidSchema,
});

export type SyncRequest = z.infer<typeof syncRequestSchema>;

/**
 * Sync Response Schema
 */
export const syncResponseSchema = z.object({
  campaignId: uuidSchema,
  syncRecord: syncRecordSchema,
  message: z.string(),
});

export type SyncResponse = z.infer<typeof syncResponseSchema>;

/**
 * Diff Item Schema
 */
export const diffItemSchema = z.object({
  field: z.string(),
  localValue: z.unknown(),
  platformValue: z.unknown(),
});

export type DiffItem = z.infer<typeof diffItemSchema>;

/**
 * Diff Response Schema
 */
export const diffResponseSchema = z.object({
  campaignId: uuidSchema,
  platform: platformSchema,
  status: z.enum(["in_sync", "local_ahead", "platform_ahead", "conflict"]),
  differences: z.array(diffItemSchema),
  lastChecked: z.string().datetime(),
});

export type DiffResponse = z.infer<typeof diffResponseSchema>;

/**
 * Campaign List Response
 */
export const campaignListResponseSchema = z.object({
  data: z.array(generatedCampaignSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type CampaignListResponse = z.infer<typeof campaignListResponseSchema>;

/**
 * Campaign Query Parameters
 */
export const campaignQuerySchema = paginationSchema.extend({
  status: campaignStatusSchema.optional(),
  templateId: uuidSchema.optional(),
});

export type CampaignQuery = z.infer<typeof campaignQuerySchema>;

// ============================================================================
// Preview API Schemas
// ============================================================================

/**
 * Preview Request Schema
 * Fetches template and data source by ID, applies rules, and generates preview
 */
export const previewRequestSchema = z.object({
  template_id: uuidSchema,
  data_source_id: uuidSchema,
  rules: z.array(uuidSchema).optional().default([]),
  limit: z.number().min(1).max(100).optional().default(20),
});

export type PreviewRequest = z.infer<typeof previewRequestSchema>;

/**
 * Generated Ad Schema for Preview
 */
export const generatedAdPreviewSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  headline: z.string(),
  description: z.string(),
  displayUrl: z.string().optional(),
  finalUrl: z.string().optional(),
  callToAction: z.string().optional(),
  sourceRowId: z.string(),
  warnings: z.array(z.string()),
});

/**
 * Generated Ad Group Schema for Preview
 */
export const generatedAdGroupPreviewSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  targeting: z.record(z.unknown()).optional(),
  bidStrategy: z.string().optional(),
  bidAmount: z.number().optional(),
  ads: z.array(generatedAdPreviewSchema),
});

/**
 * Generated Campaign Schema for Preview
 */
export const generatedCampaignPreviewSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  name: z.string(),
  platform: platformSchema,
  objective: z.string().optional(),
  budget: z
    .object({
      type: z.enum(["daily", "lifetime"]),
      amount: z.number(),
      currency: z.string(),
    })
    .optional(),
  targeting: z.record(z.unknown()).optional(),
  adGroups: z.array(generatedAdGroupPreviewSchema),
  sourceRowId: z.string(),
  groups: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * Preview Metadata Schema
 */
export const previewMetadataSchema = z.object({
  template_name: z.string(),
  data_source_name: z.string(),
  generated_at: z.string(),
});

export type PreviewMetadata = z.infer<typeof previewMetadataSchema>;

/**
 * Preview Response Schema
 * Matches the format specified in TODO.md
 */
export const previewResponseSchema = z.object({
  campaign_count: z.number(),
  ad_group_count: z.number(),
  ad_count: z.number(),
  preview: z.array(generatedCampaignPreviewSchema),
  warnings: z.array(z.string()),
  metadata: previewMetadataSchema,
});

export type PreviewResponse = z.infer<typeof previewResponseSchema>;
