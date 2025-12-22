/**
 * Transform Service
 *
 * Manages transform lifecycle including:
 * - CRUD operations for transforms
 * - Virtual data source creation and management
 * - Transform execution and preview
 * - Config validation
 */

import { eq, and, count, asc, desc } from "drizzle-orm";
import {
  TransformEngine,
  TransformValidator,
  AggregationExecutor,
  type TransformConfig,
  type TransformResult,
  type TransformValidationResult,
  type FieldSchema,
} from "@repo/core";
import type { Database } from "@repo/database";
import {
  db as defaultDb,
  transforms,
  dataSources,
  dataRows,
  columnMappings,
} from "./db.js";
import type { Transform, NewTransform } from "@repo/database";
import {
  createNotFoundError,
  createValidationError,
  createInternalError,
  ApiException,
  ErrorCode,
} from "../lib/errors.js";

/**
 * Input for creating a transform
 */
export interface CreateTransformInput {
  name: string;
  description?: string;
  sourceDataSourceId: string;
  config: TransformConfig;
  enabled?: boolean;
}

/**
 * Input for updating a transform
 */
export interface UpdateTransformInput {
  name?: string;
  description?: string;
  sourceDataSourceId?: string;
  config?: TransformConfig;
  enabled?: boolean;
}

/**
 * Execute result
 */
export interface ExecuteResult {
  rowsCreated: number;
  groupCount: number;
  sourceRowCount: number;
  executedAt: Date;
}

/**
 * Preview result
 */
export interface PreviewResult {
  rows: Record<string, unknown>[];
  groupCount: number;
  sourceRowCount: number;
  warnings: Array<{
    type: "warning";
    code: string;
    message: string;
    field?: string;
  }>;
}

/**
 * List options
 */
export interface ListOptions {
  page?: number;
  limit?: number;
  sourceDataSourceId?: string;
  enabled?: boolean;
}

/**
 * Transform Service class
 */
export class TransformService {
  private transformEngine: TransformEngine;
  private validator: TransformValidator;
  private db: Database;

  constructor(database?: Database) {
    const aggregationExecutor = new AggregationExecutor();
    this.transformEngine = new TransformEngine(aggregationExecutor);
    this.validator = new TransformValidator();
    this.db = database ?? defaultDb;
  }

  /**
   * List transforms with pagination and filtering
   */
  async list(
    options: ListOptions = {}
  ): Promise<{ transforms: Transform[]; total: number }> {
    const { page = 1, limit = 20, sourceDataSourceId, enabled } = options;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (sourceDataSourceId) {
      conditions.push(eq(transforms.sourceDataSourceId, sourceDataSourceId));
    }
    if (enabled !== undefined) {
      conditions.push(eq(transforms.enabled, enabled));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countQuery = this.db.select({ count: count() }).from(transforms);
    if (whereClause) {
      countQuery.where(whereClause);
    }
    const [countResult] = await countQuery;
    const total = countResult?.count ?? 0;

    // Get paginated data
    const selectQuery = this.db.select().from(transforms);
    if (whereClause) {
      selectQuery.where(whereClause);
    }
    const results = await selectQuery
      .orderBy(desc(transforms.createdAt))
      .limit(limit)
      .offset(offset);

    return { transforms: results, total };
  }

  /**
   * Get a transform by ID
   */
  async getById(id: string): Promise<Transform | null> {
    const [transform] = await this.db
      .select()
      .from(transforms)
      .where(eq(transforms.id, id))
      .limit(1);

    return transform ?? null;
  }

  /**
   * Create a new transform
   * Also creates a virtual data source for the output
   * Uses a transaction to ensure atomicity
   */
  async create(input: CreateTransformInput): Promise<Transform> {
    // Verify source data source exists (outside transaction - read only)
    const [sourceDataSource] = await this.db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, input.sourceDataSourceId))
      .limit(1);

    if (!sourceDataSource) {
      throw createNotFoundError("Data source", input.sourceDataSourceId);
    }

    // Get source schema for validation (outside transaction - read only)
    const sourceSchema = await this.getSourceSchema(input.sourceDataSourceId);

    // Validate config (outside transaction - no DB operations)
    const validationResult = this.validator.validateConfig(
      input.config,
      sourceSchema
    );
    if (!validationResult.valid) {
      throw createValidationError("Invalid transform configuration", {
        errors: validationResult.errors,
      });
    }

    // Use transaction for creating output data source and transform
    return await this.db.transaction(async (tx) => {
      // Create virtual output data source
      // Note: Using "manual" type as the closest to "virtual" - in a real implementation,
      // we might want to add a "virtual" type to the data_source_type enum
      const [outputDataSource] = await tx
        .insert(dataSources)
        .values({
          name: `${input.name} (Output)`,
          type: "manual", // Using "manual" as virtual type placeholder
          config: {
            isVirtual: true,
            transformName: input.name,
            sourceDataSourceId: input.sourceDataSourceId,
          },
        })
        .returning();

      if (!outputDataSource) {
        throw createInternalError("Failed to create output data source");
      }

      // Create the transform
      const [transform] = await tx
        .insert(transforms)
        .values({
          name: input.name,
          description: input.description,
          sourceDataSourceId: input.sourceDataSourceId,
          outputDataSourceId: outputDataSource.id,
          config: input.config,
          enabled: input.enabled ?? true,
        })
        .returning();

      if (!transform) {
        throw createInternalError("Failed to create transform");
      }

      return transform;
    });
  }

  /**
   * Update a transform
   */
  async update(id: string, input: UpdateTransformInput): Promise<Transform> {
    // Check if transform exists
    const existing = await this.getById(id);
    if (!existing) {
      throw createNotFoundError("Transform", id);
    }

    // If config is being updated, validate it
    if (input.config) {
      const sourceDataSourceId =
        input.sourceDataSourceId ?? existing.sourceDataSourceId;
      const sourceSchema = await this.getSourceSchema(sourceDataSourceId);
      const validationResult = this.validator.validateConfig(
        input.config,
        sourceSchema
      );
      if (!validationResult.valid) {
        throw createValidationError("Invalid transform configuration", {
          errors: validationResult.errors,
        });
      }
    }

    // If source data source is changing, verify it exists
    if (input.sourceDataSourceId && input.sourceDataSourceId !== existing.sourceDataSourceId) {
      const [sourceDataSource] = await this.db
        .select()
        .from(dataSources)
        .where(eq(dataSources.id, input.sourceDataSourceId))
        .limit(1);

      if (!sourceDataSource) {
        throw createNotFoundError("Data source", input.sourceDataSourceId);
      }
    }

    // Build update object
    const updates: Partial<NewTransform> = {};
    if (input.name !== undefined) updates.name = input.name;
    if (input.description !== undefined) updates.description = input.description;
    if (input.sourceDataSourceId !== undefined) updates.sourceDataSourceId = input.sourceDataSourceId;
    if (input.config !== undefined) updates.config = input.config;
    if (input.enabled !== undefined) updates.enabled = input.enabled;

    // Update the transform
    const [updated] = await this.db
      .update(transforms)
      .set(updates)
      .where(eq(transforms.id, id))
      .returning();

    if (!updated) {
      throw createNotFoundError("Transform", id);
    }

    // Update the output data source name if transform name changed
    if (input.name) {
      const [updatedDataSource] = await this.db
        .update(dataSources)
        .set({ name: `${input.name} (Output)` })
        .where(eq(dataSources.id, existing.outputDataSourceId))
        .returning();

      if (!updatedDataSource) {
        console.error(
          `Failed to update output data source name for transform ${id}, ` +
          `outputDataSourceId: ${existing.outputDataSourceId}`
        );
      }
    }

    return updated;
  }

  /**
   * Delete a transform
   * Explicitly deletes transform, output data rows, and output data source in a transaction
   */
  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) {
      throw createNotFoundError("Transform", id);
    }

    await this.db.transaction(async (tx) => {
      // Delete transform first
      await tx.delete(transforms).where(eq(transforms.id, id));
      // Explicitly delete output data source rows
      await tx.delete(dataRows).where(eq(dataRows.dataSourceId, existing.outputDataSourceId));
      // Delete the output data source itself
      await tx.delete(dataSources).where(eq(dataSources.id, existing.outputDataSourceId));
    });
  }

  /**
   * Execute a transform
   * Fetches source data, runs the transform engine, and persists results
   * Uses a transaction to ensure atomicity of output data operations
   */
  async execute(id: string): Promise<ExecuteResult> {
    const transform = await this.getById(id);
    if (!transform) {
      throw createNotFoundError("Transform", id);
    }

    if (!transform.enabled) {
      throw createValidationError("Cannot execute disabled transform");
    }

    // Fetch source rows (outside transaction - read only)
    const sourceRows = await this.db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, transform.sourceDataSourceId))
      .orderBy(asc(dataRows.rowIndex));

    const sourceData = sourceRows.map((row) => row.rowData);

    // Execute transform (outside transaction - no DB operations)
    const result = this.transformEngine.execute(transform.config, sourceData);

    if (result.errors.length > 0) {
      throw createValidationError("Transform execution failed", {
        errors: result.errors,
      });
    }

    // Use transaction for all output data operations
    await this.db.transaction(async (tx) => {
      // Clear existing output rows
      await tx
        .delete(dataRows)
        .where(eq(dataRows.dataSourceId, transform.outputDataSourceId));

      // Insert new output rows
      if (result.rows.length > 0) {
        const newRows = result.rows.map((rowData, index) => ({
          dataSourceId: transform.outputDataSourceId,
          rowData,
          rowIndex: index,
        }));

        await tx.insert(dataRows).values(newRows);
      }

      // Update output data source column mappings using transaction
      await this.updateOutputColumnMappingsWithTx(tx, transform, result.rows);
    });

    return {
      rowsCreated: result.rows.length,
      groupCount: result.groupCount,
      sourceRowCount: result.sourceRowCount,
      executedAt: new Date(),
    };
  }

  /**
   * Preview a transform without persisting
   */
  async preview(
    sourceDataSourceId: string,
    config: TransformConfig,
    limit = 10
  ): Promise<PreviewResult> {
    // Verify source data source exists
    const [sourceDataSource] = await this.db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, sourceDataSourceId))
      .limit(1);

    if (!sourceDataSource) {
      throw createNotFoundError("Data source", sourceDataSourceId);
    }

    // Fetch source rows
    const sourceRows = await this.db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, sourceDataSourceId))
      .orderBy(asc(dataRows.rowIndex));

    const sourceData = sourceRows.map((row) => row.rowData);

    // Run preview
    const result = this.transformEngine.preview(config, sourceData, limit);

    return {
      rows: result.rows,
      groupCount: result.groupCount,
      sourceRowCount: result.sourceRowCount,
      warnings: result.warnings.map((w) => ({
        type: "warning" as const,
        code: w.code,
        message: w.message,
        field: w.field,
      })),
    };
  }

  /**
   * Preview an existing transform
   */
  async previewExisting(id: string, limit = 10): Promise<PreviewResult> {
    const transform = await this.getById(id);
    if (!transform) {
      throw createNotFoundError("Transform", id);
    }

    return this.preview(
      transform.sourceDataSourceId,
      transform.config,
      limit
    );
  }

  /**
   * Validate a transform config against source schema
   */
  async validateConfig(
    sourceDataSourceId: string,
    config: TransformConfig
  ): Promise<TransformValidationResult> {
    // Verify source data source exists
    const [sourceDataSource] = await this.db
      .select()
      .from(dataSources)
      .where(eq(dataSources.id, sourceDataSourceId))
      .limit(1);

    if (!sourceDataSource) {
      throw createNotFoundError("Data source", sourceDataSourceId);
    }

    const sourceSchema = await this.getSourceSchema(sourceDataSourceId);
    return this.validator.validateConfig(config, sourceSchema);
  }

  /**
   * Get the source schema for a data source
   */
  private async getSourceSchema(dataSourceId: string): Promise<FieldSchema[]> {
    // Try to get schema from column mappings
    const mappings = await this.db
      .select()
      .from(columnMappings)
      .where(eq(columnMappings.dataSourceId, dataSourceId));

    if (mappings.length > 0) {
      return mappings.map((m) => ({
        name: m.normalizedName,
        type: this.mapDataType(m.dataType),
      }));
    }

    // If no column mappings, infer schema from first few rows
    const rows = await this.db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId))
      .limit(10);

    if (rows.length === 0) {
      return [];
    }

    return this.inferSchemaFromRows(rows.map((r) => r.rowData));
  }

  /**
   * Map database data type to FieldSchema type
   */
  private mapDataType(
    dataType: string
  ): FieldSchema["type"] {
    switch (dataType.toLowerCase()) {
      case "string":
      case "text":
        return "string";
      case "number":
      case "integer":
      case "float":
      case "decimal":
        return "number";
      case "boolean":
      case "bool":
        return "boolean";
      case "array":
        return "array";
      case "object":
      case "json":
        return "object";
      default:
        return "unknown";
    }
  }

  /**
   * Infer schema from sample rows
   */
  private inferSchemaFromRows(
    rows: Record<string, unknown>[]
  ): FieldSchema[] {
    const fieldTypes = new Map<string, Set<string>>();

    const processObject = (obj: Record<string, unknown>, prefix: string) => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        const type = this.inferType(value);

        if (!fieldTypes.has(fullPath)) {
          fieldTypes.set(fullPath, new Set());
        }
        fieldTypes.get(fullPath)!.add(type);

        // Recurse into objects
        if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          processObject(value as Record<string, unknown>, fullPath);
        }
      }
    };

    for (const row of rows) {
      processObject(row, "");
    }

    const schema: FieldSchema[] = [];
    for (const [name, types] of fieldTypes) {
      // If multiple types seen, use "unknown"
      const type: FieldSchema["type"] =
        types.size === 1
          ? (Array.from(types)[0] as FieldSchema["type"])
          : "unknown";
      schema.push({ name, type });
    }

    return schema;
  }

  /**
   * Infer the type of a value
   */
  private inferType(value: unknown): FieldSchema["type"] {
    if (value === null || value === undefined) {
      return "unknown";
    }
    if (typeof value === "string") {
      return "string";
    }
    if (typeof value === "number") {
      return "number";
    }
    if (typeof value === "boolean") {
      return "boolean";
    }
    if (Array.isArray(value)) {
      return "array";
    }
    if (typeof value === "object") {
      return "object";
    }
    return "unknown";
  }

  /**
   * Update column mappings for the output data source using a transaction context
   * This version accepts a transaction object for use within a transaction block
   */
  private async updateOutputColumnMappingsWithTx(
    tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
    transform: Transform,
    outputRows: Record<string, unknown>[]
  ): Promise<void> {
    if (outputRows.length === 0) {
      return;
    }

    // Clear existing mappings
    await tx
      .delete(columnMappings)
      .where(eq(columnMappings.dataSourceId, transform.outputDataSourceId));

    // Infer schema from output
    const schema = this.inferSchemaFromRows(outputRows);

    // Create new mappings
    if (schema.length > 0) {
      const newMappings = schema.map((field) => ({
        dataSourceId: transform.outputDataSourceId,
        sourceColumn: field.name,
        normalizedName: field.name,
        dataType: field.type,
      }));

      await tx.insert(columnMappings).values(newMappings);
    }
  }
}

// Export singleton instance
export const transformService = new TransformService();
