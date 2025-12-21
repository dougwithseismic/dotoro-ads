import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";

/**
 * Platform Enum
 */
export const platformSchema = z.enum(["reddit", "google", "facebook"]);
export type Platform = z.infer<typeof platformSchema>;

/**
 * Campaign Structure Schema
 */
export const campaignStructureSchema = z.object({
  objective: z.string().optional(),
  budget: z
    .object({
      type: z.enum(["daily", "lifetime"]),
      amount: z.number().positive(),
      currency: z.string().min(1).max(3),
    })
    .optional(),
  targeting: z.record(z.unknown()).optional(),
  schedule: z
    .object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    })
    .optional(),
});

export type CampaignStructure = z.infer<typeof campaignStructureSchema>;

/**
 * Campaign Template Schema - full representation
 */
export const campaignTemplateSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema.nullable(),
  name: z.string().min(1).max(255),
  platform: platformSchema,
  structure: campaignStructureSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type CampaignTemplate = z.infer<typeof campaignTemplateSchema>;

/**
 * Create Campaign Template Schema
 */
export const createCampaignTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  platform: platformSchema,
  structure: campaignStructureSchema.optional(),
});

export type CreateCampaignTemplate = z.infer<typeof createCampaignTemplateSchema>;

/**
 * Update Campaign Template Schema
 */
export const updateCampaignTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  platform: platformSchema.optional(),
  structure: campaignStructureSchema.optional(),
});

export type UpdateCampaignTemplate = z.infer<typeof updateCampaignTemplateSchema>;

/**
 * Ad Group Settings Schema
 */
export const adGroupSettingsSchema = z.object({
  bidStrategy: z.string().optional(),
  bidAmount: z.number().positive().optional(),
  targeting: z.record(z.unknown()).optional(),
  placement: z.array(z.string()).optional(),
});

export type AdGroupSettings = z.infer<typeof adGroupSettingsSchema>;

/**
 * Ad Group Template Schema
 */
export const adGroupTemplateSchema = z.object({
  id: uuidSchema,
  campaignTemplateId: uuidSchema,
  name: z.string().min(1).max(255),
  settings: adGroupSettingsSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AdGroupTemplate = z.infer<typeof adGroupTemplateSchema>;

/**
 * Ad Template Variables Schema
 */
export const adTemplateVariablesSchema = z.object({
  placeholders: z.array(
    z.object({
      name: z.string(),
      type: z.enum(["text", "image", "url", "dynamic"]),
      defaultValue: z.string().optional(),
      sourceColumn: z.string().optional(),
    })
  ),
});

export type AdTemplateVariables = z.infer<typeof adTemplateVariablesSchema>;

/**
 * Ad Template Schema
 */
export const adTemplateSchema = z.object({
  id: uuidSchema,
  adGroupTemplateId: uuidSchema,
  headline: z.string().nullable(),
  description: z.string().nullable(),
  variables: adTemplateVariablesSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AdTemplate = z.infer<typeof adTemplateSchema>;

/**
 * Template with full structure
 */
export const templateWithStructureSchema = campaignTemplateSchema.extend({
  adGroupTemplates: z.array(
    adGroupTemplateSchema.extend({
      adTemplates: z.array(adTemplateSchema),
    })
  ),
});

export type TemplateWithStructure = z.infer<typeof templateWithStructureSchema>;

/**
 * Preview Request Schema
 */
export const templatePreviewRequestSchema = z.object({
  dataSourceId: uuidSchema,
  limit: z.number().int().min(1).max(50).default(5),
});

export type TemplatePreviewRequest = z.infer<typeof templatePreviewRequestSchema>;

/**
 * Preview Ad Schema
 */
export const previewAdSchema = z.object({
  headline: z.string().nullable(),
  description: z.string().nullable(),
  sourceRow: z.record(z.unknown()),
});

export type PreviewAd = z.infer<typeof previewAdSchema>;

/**
 * Preview Response Schema
 */
export const templatePreviewResponseSchema = z.object({
  templateId: uuidSchema,
  dataSourceId: uuidSchema,
  previewAds: z.array(previewAdSchema),
  totalRows: z.number(),
  warnings: z.array(z.string()),
});

export type TemplatePreviewResponse = z.infer<typeof templatePreviewResponseSchema>;

/**
 * Template List Response
 */
export const templateListResponseSchema = z.object({
  data: z.array(campaignTemplateSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export type TemplateListResponse = z.infer<typeof templateListResponseSchema>;

/**
 * Template Query Parameters
 */
export const templateQuerySchema = paginationSchema.extend({
  platform: platformSchema.optional(),
});

export type TemplateQuery = z.infer<typeof templateQuerySchema>;

/**
 * Ad Template Config for variable operations
 */
export const adTemplateConfigSchema = z.object({
  headline: z.string(),
  description: z.string().optional(),
  displayUrl: z.string().optional(),
  finalUrl: z.string().optional(),
  callToAction: z.string().optional(),
});

export type AdTemplateConfig = z.infer<typeof adTemplateConfigSchema>;

/**
 * Variable Extraction Request
 */
export const extractVariablesRequestSchema = z.object({
  template: adTemplateConfigSchema,
});

export type ExtractVariablesRequest = z.infer<typeof extractVariablesRequestSchema>;

/**
 * Variable Extraction Response
 */
export const extractVariablesResponseSchema = z.object({
  variables: z.array(z.string()),
});

export type ExtractVariablesResponse = z.infer<typeof extractVariablesResponseSchema>;

/**
 * Template Validation Request
 */
export const validateTemplateRequestSchema = z.object({
  template: adTemplateConfigSchema,
  platform: platformSchema,
  sampleData: z.record(z.unknown()).optional(),
});

export type ValidateTemplateRequest = z.infer<typeof validateTemplateRequestSchema>;

/**
 * Template Validation Response
 */
export const validateTemplateResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(
    z.object({
      field: z.string(),
      code: z.string(),
      message: z.string(),
    })
  ),
  warnings: z.array(
    z.object({
      field: z.string(),
      message: z.string(),
    })
  ),
  extractedVariables: z.array(z.string()),
});

export type ValidateTemplateResponse = z.infer<typeof validateTemplateResponseSchema>;

/**
 * Substitute Variables Request
 */
export const substituteVariablesRequestSchema = z.object({
  template: z.string(),
  data: z.record(z.unknown()),
});

export type SubstituteVariablesRequest = z.infer<typeof substituteVariablesRequestSchema>;

/**
 * Substitute Variables Response
 */
export const substituteVariablesResponseSchema = z.object({
  text: z.string(),
  success: z.boolean(),
  warnings: z.array(
    z.object({
      variable: z.string(),
      message: z.string(),
    })
  ),
  substitutions: z.array(
    z.object({
      variable: z.string(),
      originalValue: z.string(),
      transformedValue: z.string(),
      filters: z.array(z.string()),
    })
  ),
});

export type SubstituteVariablesResponse = z.infer<typeof substituteVariablesResponseSchema>;

/**
 * Preview with Sample Data Request
 */
export const previewWithDataRequestSchema = z.object({
  template: adTemplateConfigSchema,
  platform: platformSchema,
  dataRows: z.array(z.record(z.unknown())),
  limit: z.number().int().min(1).max(50).default(5),
});

export type PreviewWithDataRequest = z.infer<typeof previewWithDataRequestSchema>;

/**
 * Generated Ad Schema (for preview)
 */
export const generatedAdSchema = z.object({
  headline: z.string().nullable(),
  description: z.string().nullable(),
  displayUrl: z.string().nullable().optional(),
  finalUrl: z.string().nullable().optional(),
  callToAction: z.string().optional(),
  sourceRow: z.record(z.unknown()),
  warnings: z.array(z.string()),
});

export type GeneratedAd = z.infer<typeof generatedAdSchema>;

/**
 * Preview with Data Response
 */
export const previewWithDataResponseSchema = z.object({
  previewAds: z.array(generatedAdSchema),
  validationErrors: z.array(
    z.object({
      rowIndex: z.number(),
      errors: z.array(
        z.object({
          field: z.string(),
          message: z.string(),
        })
      ),
    })
  ),
  warnings: z.array(z.string()),
});

export type PreviewWithDataResponse = z.infer<typeof previewWithDataResponseSchema>;
