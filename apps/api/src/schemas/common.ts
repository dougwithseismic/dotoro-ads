import { z } from "zod";

/**
 * Common schema definitions used across the API
 */

// UUID validation
export const uuidSchema = z.string().uuid();

// Pagination query parameters
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

// Paginated response wrapper
export const paginatedResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(dataSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  });

// Standard error response
export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string(),
  details: z.record(z.unknown()).optional(),
  errorId: z.string().uuid().optional(),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;

// Standard success message response
export const successMessageSchema = z.object({
  message: z.string(),
});

// Path parameter with UUID
export const idParamSchema = z.object({
  id: uuidSchema,
});

export type IdParam = z.infer<typeof idParamSchema>;

// Account ID query parameter for authorization
export const accountIdQuerySchema = z.object({
  accountId: z.string().min(1),
});

export type AccountIdQuery = z.infer<typeof accountIdQuerySchema>;

// Timestamps (read-only, returned from server)
export const timestampsSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
