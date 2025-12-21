import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.js";

/**
 * Creative Type Enum
 */
export const creativeTypeSchema = z.enum(["IMAGE", "VIDEO", "CAROUSEL"]);
export type CreativeType = z.infer<typeof creativeTypeSchema>;

/**
 * Creative Status Enum
 */
export const creativeStatusSchema = z.enum([
  "PENDING",
  "UPLOADED",
  "PROCESSING",
  "READY",
  "FAILED",
]);
export type CreativeStatus = z.infer<typeof creativeStatusSchema>;

/**
 * Creative Dimensions Schema
 */
export const dimensionsSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export type Dimensions = z.infer<typeof dimensionsSchema>;

/**
 * Creative Metadata Schema
 */
export const creativeMetadataSchema = z.object({
  durationSeconds: z.number().positive().optional(),
  frameRate: z.number().positive().optional(),
  codec: z.string().optional(),
  originalFilename: z.string().optional(),
  uploadedBy: z.string().optional(),
}).passthrough();
export type CreativeMetadata = z.infer<typeof creativeMetadataSchema>;

/**
 * Creative Schema - full representation
 */
export const creativeSchema = z.object({
  id: uuidSchema,
  accountId: z.string().min(1).max(255),
  name: z.string().min(1).max(255),
  type: creativeTypeSchema,
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  dimensions: dimensionsSchema.optional().nullable(),
  storageKey: z.string().min(1),
  cdnUrl: z.string().url().optional().nullable(),
  thumbnailKey: z.string().optional().nullable(),
  status: creativeStatusSchema,
  metadata: creativeMetadataSchema.optional().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Creative = z.infer<typeof creativeSchema>;

/**
 * Request Upload URL Schema
 */
export const requestUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});
export type RequestUploadUrl = z.infer<typeof requestUploadUrlSchema>;

/**
 * Upload URL Response Schema
 */
export const uploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  key: z.string(),
  expiresAt: z.string().datetime(),
});
export type UploadUrlResponse = z.infer<typeof uploadUrlResponseSchema>;

/**
 * Register Creative Schema
 */
export const registerCreativeSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1).max(255),
  type: creativeTypeSchema,
  accountId: z.string().min(1).max(255),
  tags: z.array(z.string().min(1).max(100)).optional(),
});
export type RegisterCreative = z.infer<typeof registerCreativeSchema>;

/**
 * Update Creative Schema
 */
export const updateCreativeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  tags: z.array(z.string().min(1).max(100)).optional(),
});
export type UpdateCreative = z.infer<typeof updateCreativeSchema>;

/**
 * Creative Query Parameters
 */
export const creativeQuerySchema = paginationSchema.extend({
  accountId: z.string().min(1),
  type: creativeTypeSchema.optional(),
  status: creativeStatusSchema.optional(),
  tags: z.string().optional(), // Comma-separated tags
  sortBy: z.enum(["name", "createdAt", "fileSize"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});
export type CreativeQuery = z.infer<typeof creativeQuerySchema>;

/**
 * Creative List Response
 */
export const creativeListResponseSchema = z.object({
  data: z.array(creativeSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});
export type CreativeListResponse = z.infer<typeof creativeListResponseSchema>;

/**
 * Add/Remove Tags Schema
 */
export const modifyTagsSchema = z.object({
  tags: z.array(z.string().min(1).max(100)).min(1),
});
export type ModifyTags = z.infer<typeof modifyTagsSchema>;

/**
 * Delete Response Schema
 */
export const deleteResponseSchema = z.object({
  success: z.boolean(),
});
export type DeleteResponse = z.infer<typeof deleteResponseSchema>;

/**
 * Creative With Download URL Schema
 */
export const creativeWithUrlSchema = creativeSchema.extend({
  downloadUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
});
export type CreativeWithUrl = z.infer<typeof creativeWithUrlSchema>;
