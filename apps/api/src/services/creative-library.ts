/**
 * Creative Library Service
 *
 * Manages creative assets in the database with tagging and filtering capabilities.
 */

import { z } from "zod";
import { eq, and, or, count, asc, desc, inArray, sql } from "drizzle-orm";
import { db, creatives, creativeTags } from "./db.js";

/**
 * Creative types
 */
export type CreativeType = "IMAGE" | "VIDEO" | "CAROUSEL";

/**
 * Creative status
 */
export type CreativeStatus =
  | "PENDING"
  | "UPLOADED"
  | "PROCESSING"
  | "READY"
  | "FAILED";

/**
 * Creative dimensions
 */
export interface CreativeDimensions {
  width: number;
  height: number;
}

/**
 * Creative metadata
 */
export interface CreativeMetadata {
  durationSeconds?: number;
  frameRate?: number;
  codec?: string;
  originalFilename?: string;
  uploadedBy?: string;
  [key: string]: unknown;
}

/**
 * Stored creative entity
 */
export interface Creative {
  id: string;
  accountId: string;
  name: string;
  type: CreativeType;
  mimeType: string;
  fileSize: number;
  dimensions?: CreativeDimensions;
  storageKey: string;
  cdnUrl?: string;
  thumbnailKey?: string;
  status: CreativeStatus;
  metadata?: CreativeMetadata;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for registering a new creative
 */
export interface RegisterCreativeInput {
  key: string;
  name: string;
  type: CreativeType;
  accountId: string;
  mimeType: string;
  fileSize: number;
  dimensions?: CreativeDimensions;
  cdnUrl?: string;
  thumbnailKey?: string;
  metadata?: CreativeMetadata;
  tags?: string[];
}

/**
 * Input for updating a creative
 */
export interface UpdateCreativeInput {
  name?: string;
  metadata?: CreativeMetadata;
  status?: CreativeStatus;
  cdnUrl?: string;
  thumbnailKey?: string;
}

/**
 * Filters for listing creatives
 */
export interface CreativeFilters {
  accountId: string;
  type?: CreativeType;
  tags?: string[];
  status?: CreativeStatus;
  page?: number;
  limit?: number;
  sortBy?: "name" | "createdAt" | "fileSize";
  sortOrder?: "asc" | "desc";
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Zod schemas for validation
 */
export const registerCreativeSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1).max(255),
  type: z.enum(["IMAGE", "VIDEO", "CAROUSEL"]),
  accountId: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  dimensions: z
    .object({
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    })
    .optional(),
  cdnUrl: z.string().url().optional(),
  thumbnailKey: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string().min(1).max(100)).optional(),
});

export const updateCreativeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(["PENDING", "UPLOADED", "PROCESSING", "READY", "FAILED"]).optional(),
  cdnUrl: z.string().url().optional().nullable(),
  thumbnailKey: z.string().optional().nullable(),
});

export const creativeFiltersSchema = z.object({
  accountId: z.string().min(1),
  type: z.enum(["IMAGE", "VIDEO", "CAROUSEL"]).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["PENDING", "UPLOADED", "PROCESSING", "READY", "FAILED"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(["name", "createdAt", "fileSize"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

/**
 * Convert database creative to API format
 */
async function toApiCreative(dbCreative: typeof creatives.$inferSelect): Promise<Creative> {
  // Get tags for this creative
  const tags = await db
    .select({ tag: creativeTags.tag })
    .from(creativeTags)
    .where(eq(creativeTags.creativeId, dbCreative.id));

  return {
    id: dbCreative.id,
    accountId: dbCreative.accountId,
    name: dbCreative.name,
    type: dbCreative.type as CreativeType,
    mimeType: dbCreative.mimeType,
    fileSize: dbCreative.fileSize,
    dimensions: dbCreative.dimensions as CreativeDimensions | undefined,
    storageKey: dbCreative.storageKey,
    cdnUrl: dbCreative.cdnUrl ?? undefined,
    thumbnailKey: dbCreative.thumbnailKey ?? undefined,
    status: dbCreative.status as CreativeStatus,
    metadata: dbCreative.metadata as CreativeMetadata | undefined,
    tags: tags.map(t => t.tag),
    createdAt: dbCreative.createdAt.toISOString(),
    updatedAt: dbCreative.updatedAt.toISOString(),
  };
}

/**
 * Creative Library Service
 */
export class CreativeLibraryService {
  /**
   * Register a new creative
   */
  async registerCreative(input: RegisterCreativeInput): Promise<Creative> {
    const [newCreative] = await db
      .insert(creatives)
      .values({
        accountId: input.accountId,
        name: input.name,
        type: input.type,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        dimensions: input.dimensions ?? null,
        storageKey: input.key,
        cdnUrl: input.cdnUrl ?? null,
        thumbnailKey: input.thumbnailKey ?? null,
        status: "UPLOADED",
        metadata: input.metadata ?? null,
      })
      .returning();

    // Add tags if provided
    if (newCreative && input.tags && input.tags.length > 0) {
      await db.insert(creativeTags).values(
        input.tags.map(tagName => ({
          creativeId: newCreative.id,
          tag: tagName,
        }))
      );
    }

    if (!newCreative) {
      throw new Error("Failed to create creative");
    }

    return toApiCreative(newCreative);
  }

  /**
   * Get a creative by ID
   */
  async getCreative(id: string): Promise<Creative | null> {
    const [creative] = await db
      .select()
      .from(creatives)
      .where(eq(creatives.id, id))
      .limit(1);

    if (!creative) {
      return null;
    }

    return toApiCreative(creative);
  }

  /**
   * List creatives with filters and pagination
   */
  async listCreatives(
    filters: CreativeFilters
  ): Promise<PaginatedResult<Creative>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;
    const sortBy = filters.sortBy ?? "createdAt";
    const sortOrder = filters.sortOrder ?? "desc";

    // Build conditions
    const conditions = [eq(creatives.accountId, filters.accountId)];

    if (filters.type) {
      conditions.push(eq(creatives.type, filters.type));
    }

    if (filters.status) {
      conditions.push(eq(creatives.status, filters.status));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(creatives)
      .where(whereClause);
    const total = countResult?.count ?? 0;

    // Build sort
    const sortColumn = sortBy === "name"
      ? creatives.name
      : sortBy === "fileSize"
        ? creatives.fileSize
        : creatives.createdAt;
    const orderBy = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

    // Get paginated data
    const dbCreatives = await db
      .select()
      .from(creatives)
      .where(whereClause)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // If filtering by tags, we need to filter after fetching
    // Use batch query to avoid N+1 problem
    let filteredCreatives = dbCreatives;
    if (filters.tags && filters.tags.length > 0) {
      // Get all creative IDs first
      const creativeIds = dbCreatives.map(c => c.id);

      // Batch fetch all tags in one query
      const allTags = await db
        .select()
        .from(creativeTags)
        .where(inArray(creativeTags.creativeId, creativeIds));

      // Group tags by creative ID
      const tagsByCreativeId = new Map<string, string[]>();
      for (const tag of allTags) {
        const existing = tagsByCreativeId.get(tag.creativeId) ?? [];
        existing.push(tag.tag);
        tagsByCreativeId.set(tag.creativeId, existing);
      }

      // Filter creatives that have at least one of the requested tags
      filteredCreatives = dbCreatives.filter(c => {
        const creativeTags = tagsByCreativeId.get(c.id) ?? [];
        return filters.tags!.some(tag => creativeTags.includes(tag));
      });
    }

    // Convert to API format
    const data = await Promise.all(filteredCreatives.map(toApiCreative));

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update a creative
   */
  async updateCreative(
    id: string,
    input: UpdateCreativeInput
  ): Promise<Creative> {
    const updates: Partial<{
      name: string;
      metadata: Record<string, unknown> | null;
      status: CreativeStatus;
      cdnUrl: string | null;
      thumbnailKey: string | null;
    }> = {};

    if (input.name !== undefined) {
      updates.name = input.name;
    }
    if (input.metadata !== undefined) {
      updates.metadata = input.metadata;
    }
    if (input.status !== undefined) {
      updates.status = input.status;
    }
    if (input.cdnUrl !== undefined) {
      updates.cdnUrl = input.cdnUrl ?? null;
    }
    if (input.thumbnailKey !== undefined) {
      updates.thumbnailKey = input.thumbnailKey ?? null;
    }

    const [updated] = await db
      .update(creatives)
      .set(updates)
      .where(eq(creatives.id, id))
      .returning();

    if (!updated) {
      throw new Error(`Creative with id "${id}" not found`);
    }

    return toApiCreative(updated);
  }

  /**
   * Delete a creative
   */
  async deleteCreative(id: string): Promise<void> {
    // Tags will be cascade deleted
    await db.delete(creatives).where(eq(creatives.id, id));
  }

  /**
   * Add tags to a creative
   */
  async addTags(id: string, tags: string[]): Promise<void> {
    // Get existing tags
    const existingTags = await db
      .select({ tag: creativeTags.tag })
      .from(creativeTags)
      .where(eq(creativeTags.creativeId, id));

    const existingTagNames = new Set(existingTags.map(t => t.tag));

    // Only add new tags
    const newTags = tags.filter(tag => !existingTagNames.has(tag));

    if (newTags.length > 0) {
      await db.insert(creativeTags).values(
        newTags.map(tagName => ({
          creativeId: id,
          tag: tagName,
        }))
      );
    }
  }

  /**
   * Remove tags from a creative
   */
  async removeTags(id: string, tags: string[]): Promise<void> {
    if (tags.length > 0) {
      await db
        .delete(creativeTags)
        .where(
          and(
            eq(creativeTags.creativeId, id),
            inArray(creativeTags.tag, tags)
          )
        );
    }
  }

  /**
   * Get creatives by tags (scoped to account for security)
   */
  async getCreativesByTags(
    accountId: string,
    tags: string[],
    matchAll: boolean = false
  ): Promise<Creative[]> {
    // Get all creatives for this account
    const accountCreatives = await db
      .select()
      .from(creatives)
      .where(eq(creatives.accountId, accountId));

    // Get tags for each creative and filter
    const creativesWithTags = await Promise.all(
      accountCreatives.map(async (c) => {
        const creativeTags_ = await db
          .select({ tag: creativeTags.tag })
          .from(creativeTags)
          .where(eq(creativeTags.creativeId, c.id));
        return { creative: c, tags: creativeTags_.map(t => t.tag) };
      })
    );

    const filtered = creativesWithTags.filter(({ tags: creativeTags_ }) => {
      if (matchAll) {
        return tags.every(tag => creativeTags_.includes(tag));
      } else {
        return tags.some(tag => creativeTags_.includes(tag));
      }
    });

    return Promise.all(filtered.map(({ creative }) => toApiCreative(creative)));
  }

  /**
   * Clear all data (for testing)
   */
  async clear(): Promise<void> {
    await db.delete(creativeTags);
    await db.delete(creatives);
  }

  /**
   * Get all creative IDs (for debugging)
   */
  async getAllIds(): Promise<string[]> {
    const result = await db.select({ id: creatives.id }).from(creatives);
    return result.map(r => r.id);
  }
}

// Singleton instance
let serviceInstance: CreativeLibraryService | null = null;

/**
 * Get the creative library service singleton
 */
export function getCreativeLibraryService(): CreativeLibraryService {
  if (!serviceInstance) {
    serviceInstance = new CreativeLibraryService();
  }
  return serviceInstance;
}

/**
 * Reset the service (for testing)
 */
export function resetCreativeLibraryService(): void {
  serviceInstance = null;
}
