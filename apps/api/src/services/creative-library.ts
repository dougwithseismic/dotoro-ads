/**
 * Creative Library Service
 *
 * Manages creative assets in local storage with tagging and filtering capabilities.
 * Uses in-memory storage as a placeholder until database integration.
 */

import { z } from "zod";

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
 * Creative Library Service
 */
export class CreativeLibraryService {
  private creatives: Map<string, Creative> = new Map();

  /**
   * Register a new creative
   */
  async registerCreative(input: RegisterCreativeInput): Promise<Creative> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const creative: Creative = {
      id,
      accountId: input.accountId,
      name: input.name,
      type: input.type,
      mimeType: input.mimeType,
      fileSize: input.fileSize,
      dimensions: input.dimensions,
      storageKey: input.key,
      cdnUrl: input.cdnUrl,
      thumbnailKey: input.thumbnailKey,
      status: "UPLOADED",
      metadata: input.metadata,
      tags: input.tags ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.creatives.set(id, creative);
    return creative;
  }

  /**
   * Get a creative by ID
   */
  async getCreative(id: string): Promise<Creative | null> {
    return this.creatives.get(id) ?? null;
  }

  /**
   * List creatives with filters and pagination
   */
  async listCreatives(
    filters: CreativeFilters
  ): Promise<PaginatedResult<Creative>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const sortBy = filters.sortBy ?? "createdAt";
    const sortOrder = filters.sortOrder ?? "desc";

    // Filter creatives
    let creatives = Array.from(this.creatives.values()).filter(
      (c) => c.accountId === filters.accountId
    );

    if (filters.type) {
      creatives = creatives.filter((c) => c.type === filters.type);
    }

    if (filters.status) {
      creatives = creatives.filter((c) => c.status === filters.status);
    }

    if (filters.tags && filters.tags.length > 0) {
      creatives = creatives.filter((c) =>
        filters.tags!.some((tag) => c.tags.includes(tag))
      );
    }

    // Sort creatives
    creatives.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "fileSize":
          comparison = a.fileSize - b.fileSize;
          break;
        case "createdAt":
        default:
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    const total = creatives.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const data = creatives.slice(start, start + limit);

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
    const creative = this.creatives.get(id);
    if (!creative) {
      throw new Error(`Creative with id "${id}" not found`);
    }

    const updated: Creative = {
      ...creative,
      ...(input.name !== undefined && { name: input.name }),
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.cdnUrl !== undefined && { cdnUrl: input.cdnUrl ?? undefined }),
      ...(input.thumbnailKey !== undefined && {
        thumbnailKey: input.thumbnailKey ?? undefined,
      }),
      updatedAt: new Date().toISOString(),
    };

    this.creatives.set(id, updated);
    return updated;
  }

  /**
   * Delete a creative
   */
  async deleteCreative(id: string): Promise<void> {
    this.creatives.delete(id);
  }

  /**
   * Add tags to a creative
   */
  async addTags(id: string, tags: string[]): Promise<void> {
    const creative = this.creatives.get(id);
    if (!creative) {
      throw new Error(`Creative with id "${id}" not found`);
    }

    // Add only unique tags
    const existingTags = new Set(creative.tags);
    for (const tag of tags) {
      existingTags.add(tag);
    }

    creative.tags = Array.from(existingTags);
    creative.updatedAt = new Date().toISOString();
    this.creatives.set(id, creative);
  }

  /**
   * Remove tags from a creative
   */
  async removeTags(id: string, tags: string[]): Promise<void> {
    const creative = this.creatives.get(id);
    if (!creative) {
      throw new Error(`Creative with id "${id}" not found`);
    }

    const tagsToRemove = new Set(tags);
    creative.tags = creative.tags.filter((t) => !tagsToRemove.has(t));
    creative.updatedAt = new Date().toISOString();
    this.creatives.set(id, creative);
  }

  /**
   * Get creatives by tags (scoped to account for security)
   */
  async getCreativesByTags(
    accountId: string,
    tags: string[],
    matchAll: boolean = false
  ): Promise<Creative[]> {
    // First filter by accountId for security
    const creatives = Array.from(this.creatives.values()).filter(
      (c) => c.accountId === accountId
    );

    if (matchAll) {
      // All tags must be present
      return creatives.filter((c) => tags.every((tag) => c.tags.includes(tag)));
    } else {
      // Any tag matches
      return creatives.filter((c) => tags.some((tag) => c.tags.includes(tag)));
    }
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.creatives.clear();
  }

  /**
   * Get all creative IDs (for debugging)
   */
  getAllIds(): string[] {
    return Array.from(this.creatives.keys());
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
