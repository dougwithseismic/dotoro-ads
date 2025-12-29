import { z } from "zod";
import { paginationSchema, paginatedResponseSchema, uuidSchema } from "./common.js";

// ============================================================================
// Aspect Ratio Schema
// ============================================================================

/**
 * Aspect ratio dimensions
 */
export const aspectRatioDimensionsSchema = z.object({
  width: z.number().int().min(1).max(4096),
  height: z.number().int().min(1).max(4096),
});

export type AspectRatioDimensions = z.infer<typeof aspectRatioDimensionsSchema>;

// ============================================================================
// Preview Schemas
// ============================================================================

/**
 * Preview request - generates a single image and returns data URL
 */
export const previewRequestSchema = z.object({
  templateId: uuidSchema,
  variableData: z.record(z.string(), z.unknown()),
  aspectRatio: aspectRatioDimensionsSchema,
});

export type PreviewRequest = z.infer<typeof previewRequestSchema>;

/**
 * Preview response - data URL and metadata
 */
export const previewResponseSchema = z.object({
  dataUrl: z.string(),
  width: z.number(),
  height: z.number(),
  renderDurationMs: z.number(),
});

export type PreviewResponse = z.infer<typeof previewResponseSchema>;

// ============================================================================
// Single Generation Schemas
// ============================================================================

/**
 * Single generation request - generates and uploads one image
 */
export const singleGenerationRequestSchema = z.object({
  templateId: uuidSchema,
  dataSourceId: uuidSchema,
  dataRowId: uuidSchema,
  aspectRatio: aspectRatioDimensionsSchema,
  format: z.enum(["png", "jpeg"]).default("png"),
  quality: z.number().int().min(1).max(100).default(90),
});

export type SingleGenerationRequest = z.infer<typeof singleGenerationRequestSchema>;

// ============================================================================
// Batch Generation Schemas
// ============================================================================

/**
 * Row filter for batch generation
 */
export const rowFilterSchema = z.object({
  includeIds: z.array(uuidSchema).optional(),
  excludeIds: z.array(uuidSchema).optional(),
  indexRange: z.object({
    start: z.number().int().min(0),
    end: z.number().int().min(0),
  }).optional(),
}).optional();

export type RowFilterInput = z.infer<typeof rowFilterSchema>;

/**
 * Batch generation request - queues a job to generate multiple images
 */
export const batchGenerationRequestSchema = z.object({
  templateId: uuidSchema,
  dataSourceId: uuidSchema,
  aspectRatios: z.array(aspectRatioDimensionsSchema).min(1).max(10),
  rowFilter: rowFilterSchema,
  format: z.enum(["png", "jpeg"]).default("png"),
  quality: z.number().int().min(1).max(100).default(90),
});

export type BatchGenerationRequest = z.infer<typeof batchGenerationRequestSchema>;

/**
 * Batch generation response - job queued
 */
export const batchGenerationResponseSchema = z.object({
  jobId: uuidSchema,
  status: z.literal("queued"),
  message: z.string(),
  totalItems: z.number().int(),
});

export type BatchGenerationResponse = z.infer<typeof batchGenerationResponseSchema>;

// ============================================================================
// Generation Job Schemas
// ============================================================================

/**
 * Generation job status enum
 */
export const generationJobStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
]);

export type GenerationJobStatus = z.infer<typeof generationJobStatusSchema>;

/**
 * Generation error entry
 */
export const generationErrorSchema = z.object({
  rowId: uuidSchema,
  aspectRatio: aspectRatioDimensionsSchema,
  error: z.string(),
  timestamp: z.string().datetime(),
});

export type GenerationErrorOutput = z.infer<typeof generationErrorSchema>;

/**
 * Generation job response
 */
export const generationJobSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  templateId: uuidSchema,
  dataSourceId: uuidSchema,
  aspectRatios: z.array(aspectRatioDimensionsSchema),
  rowFilter: rowFilterSchema,
  outputFormat: z.string(),
  quality: z.number().int(),
  status: generationJobStatusSchema,
  totalItems: z.number().int(),
  processedItems: z.number().int(),
  failedItems: z.number().int(),
  outputCreativeIds: z.array(uuidSchema),
  errorLog: z.array(generationErrorSchema),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type GenerationJobOutput = z.infer<typeof generationJobSchema>;

/**
 * Paginated jobs list response
 */
export const generationJobListResponseSchema = paginatedResponseSchema(generationJobSchema);

// ============================================================================
// Generated Creative Schemas
// ============================================================================

/**
 * Generated creative status enum
 */
export const generatedCreativeStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export type GeneratedCreativeStatus = z.infer<typeof generatedCreativeStatusSchema>;

/**
 * Variable values snapshot
 */
export const variableValuesSnapshotSchema = z.object({
  text: z.record(z.string(), z.string()).optional(),
  images: z.record(z.string(), z.string()).optional(),
});

export type VariableValuesSnapshotOutput = z.infer<typeof variableValuesSnapshotSchema>;

/**
 * Generated creative response
 */
export const generatedCreativeSchema = z.object({
  id: uuidSchema,
  teamId: uuidSchema,
  templateId: uuidSchema,
  variantId: uuidSchema.nullable(),
  dataSourceId: uuidSchema,
  dataRowId: uuidSchema,
  variableValues: variableValuesSnapshotSchema.nullable(),
  storageKey: z.string().nullable(),
  cdnUrl: z.string().url().nullable(),
  width: z.number().int(),
  height: z.number().int(),
  fileSize: z.number().int().nullable(),
  format: z.string(),
  generationBatchId: uuidSchema.nullable(),
  status: generatedCreativeStatusSchema,
  errorMessage: z.string().nullable(),
  renderDurationMs: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});

export type GeneratedCreativeOutput = z.infer<typeof generatedCreativeSchema>;

/**
 * Paginated creatives list response
 */
export const generatedCreativeListResponseSchema = paginatedResponseSchema(generatedCreativeSchema);

// ============================================================================
// Query Schemas
// ============================================================================

/**
 * List generation jobs query parameters
 */
export const generationJobQuerySchema = paginationSchema.extend({
  status: generationJobStatusSchema.optional(),
});

export type GenerationJobQuery = z.infer<typeof generationJobQuerySchema>;

/**
 * List generated creatives query parameters
 */
export const generatedCreativeQuerySchema = paginationSchema.extend({
  status: generatedCreativeStatusSchema.optional(),
});

export type GeneratedCreativeQuery = z.infer<typeof generatedCreativeQuerySchema>;

// ============================================================================
// Path Parameter Schemas
// ============================================================================

export const jobIdParamSchema = z.object({
  id: uuidSchema,
});

export type JobIdParam = z.infer<typeof jobIdParamSchema>;

// ============================================================================
// Delete Response Schema
// ============================================================================

export const cancelJobResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type CancelJobResponse = z.infer<typeof cancelJobResponseSchema>;
