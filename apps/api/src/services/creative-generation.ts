/**
 * Creative Generation Service
 *
 * Server-side image rendering using Fabric.js with node-canvas backend.
 * Generates images from visual templates combined with data source rows.
 *
 * Features:
 * - Template loading from Fabric.js JSON
 * - Variable interpolation (text and images)
 * - Multiple output formats (PNG, JPEG)
 * - R2 storage integration
 * - Memory-efficient canvas management
 */

import { StaticCanvas, FabricText, FabricImage } from "fabric";
import { eq, and, inArray } from "drizzle-orm";
import {
  db,
  designTemplates,
  dataRows,
  dataSources,
  generatedCreatives,
  generationJobs,
  type FabricCanvasJSON,
  type FabricObject,
  type DataRow,
  type GeneratedCreative,
  type GenerationJob,
  type AspectRatioSpec,
  type RowFilter,
  type GenerationError,
  type VariableValuesSnapshot,
} from "./db.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ============================================================================
// Types
// ============================================================================

export interface AspectRatio {
  width: number;
  height: number;
}

export interface SingleGenerationParams {
  teamId: string;
  templateId: string;
  dataSourceId: string;
  dataRowId: string;
  aspectRatio: AspectRatio;
  format: "png" | "jpeg";
  quality: number;
  generationBatchId?: string;
}

export interface BatchJobParams {
  teamId: string;
  templateId: string;
  dataSourceId: string;
  aspectRatios: AspectRatio[];
  rowFilter?: RowFilter;
  format: "png" | "jpeg";
  quality: number;
}

export interface UploadMetadata {
  teamId: string;
  jobId?: string;
  creativeId: string;
  format: "png" | "jpeg";
}

export interface UploadResult {
  storageKey: string;
  cdnUrl: string;
  fileSize: number;
}

// ============================================================================
// Canvas Management
// ============================================================================

/**
 * Initialize a Fabric.js StaticCanvas for server-side rendering
 */
export function initializeFabricCanvas(width: number, height: number): StaticCanvas {
  const canvas = new StaticCanvas(undefined, {
    width,
    height,
    backgroundColor: "transparent",
    enableRetinaScaling: false,
  });

  return canvas;
}

/**
 * Dispose canvas and free memory
 */
export function disposeCanvas(canvas: StaticCanvas): void {
  try {
    canvas.dispose();
  } catch (error) {
    console.warn("[CreativeGeneration] Canvas disposal warning:", error);
  }
}

// ============================================================================
// Template Loading
// ============================================================================

/**
 * Load template JSON into canvas
 */
export async function loadTemplateIntoCanvas(
  canvas: StaticCanvas,
  templateJson: FabricCanvasJSON
): Promise<void> {
  try {
    // Set canvas dimensions if specified in template
    if (templateJson.width) canvas.width = templateJson.width;
    if (templateJson.height) canvas.height = templateJson.height;

    // Set background if specified
    if (templateJson.background) {
      canvas.backgroundColor = templateJson.background;
    }

    // Load objects from template
    if (templateJson.objects && templateJson.objects.length > 0) {
      await canvas.loadFromJSON(templateJson);
    }
  } catch (error) {
    throw new Error(
      `Failed to load template: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Validate template JSON structure
 */
export function validateTemplateJson(templateJson: unknown): templateJson is FabricCanvasJSON {
  if (!templateJson || typeof templateJson !== "object") return false;
  const json = templateJson as Record<string, unknown>;
  if (!json.version || typeof json.version !== "string") return false;
  if (!Array.isArray(json.objects)) return false;
  return true;
}

// ============================================================================
// Variable Extraction and Interpolation
// ============================================================================

/**
 * Extract all variable placeholders from template JSON
 * - Text variables: {{variable_name}}
 * - Image variables: {variable_name} (via variableBinding property)
 */
export function extractVariables(templateJson: FabricCanvasJSON): string[] {
  const variables: Set<string> = new Set();
  const textVarRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

  for (const obj of templateJson.objects) {
    // Extract text variables
    if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
      const text = obj.text as string | undefined;
      if (text) {
        for (const match of text.matchAll(textVarRegex)) {
          if (match[1]) variables.add(match[1]);
        }
      }
    }

    // Extract image variable bindings
    if (obj.type === "image" && obj.variableBinding) {
      const binding = obj.variableBinding as string;
      // Single brace pattern: {variable_name}
      const imageVarMatch = binding.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/);
      if (imageVarMatch?.[1]) {
        variables.add(imageVarMatch[1]);
      }
    }
  }

  return Array.from(variables);
}

/**
 * Interpolate text variables in canvas objects
 * Replaces {{variable}} patterns with data values
 */
export function interpolateTextVariables(
  canvas: StaticCanvas,
  data: Record<string, unknown>
): Record<string, string> {
  const textVarRegex = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;
  const resolvedVariables: Record<string, string> = {};

  const objects = canvas.getObjects();

  for (const obj of objects) {
    if (obj.type === "text" || obj.type === "i-text" || obj.type === "textbox") {
      const textObj = obj as FabricText;
      const originalText = textObj.text || "";

      const interpolated = originalText.replace(textVarRegex, (match, varName) => {
        const value = data[varName];
        const resolved = value !== undefined && value !== null ? String(value) : "";
        resolvedVariables[varName] = resolved;
        return resolved;
      });

      if (interpolated !== originalText) {
        textObj.set("text", interpolated);
      }
    }
  }

  return resolvedVariables;
}

/**
 * Load image variables from URLs into canvas
 * Handles {variable_name} bindings on image objects
 */
export async function loadImageVariables(
  canvas: StaticCanvas,
  data: Record<string, unknown>
): Promise<Record<string, string>> {
  const resolvedVariables: Record<string, string> = {};
  const objects = canvas.getObjects();
  const imageLoadPromises: Promise<void>[] = [];

  for (const obj of objects) {
    if (obj.type === "image") {
      const fabricObj = obj as unknown as FabricObject;
      const binding = fabricObj.variableBinding as string | undefined;

      if (binding) {
        const match = binding.match(/^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/);
        if (match?.[1]) {
          const varName = match[1];
          const imageUrl = data[varName];

          if (typeof imageUrl === "string" && imageUrl.trim()) {
            resolvedVariables[varName] = imageUrl;

            const loadPromise = loadImageFromUrl(imageUrl)
              .then((imgElement) => {
                if (imgElement) {
                  const imgObj = obj as FabricImage;
                  imgObj.setElement(imgElement);
                  canvas.renderAll();
                }
              })
              .catch((err) => {
                console.warn(`[CreativeGeneration] Failed to load image for ${varName}:`, err);
              });

            imageLoadPromises.push(loadPromise);
          }
        }
      }
    }
  }

  await Promise.all(imageLoadPromises);
  return resolvedVariables;
}

/**
 * Load image from URL with timeout
 */
async function loadImageFromUrl(url: string, timeoutMs = 10000): Promise<HTMLImageElement | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Dotoro-Creative-Generation/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/png";
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Use Fabric's utility to create image from URL
    const img = await FabricImage.fromURL(dataUrl);
    return (img as unknown as { _element: HTMLImageElement })._element;
  } catch (error) {
    console.warn(`[CreativeGeneration] Image load failed for ${url}:`, error);
    return null;
  }
}

// ============================================================================
// Rendering
// ============================================================================

/**
 * Render canvas to PNG or JPEG buffer
 */
export async function renderToBuffer(
  canvas: StaticCanvas,
  format: "png" | "jpeg",
  quality = 90
): Promise<Buffer> {
  // Ensure canvas is rendered
  canvas.renderAll();

  // Get the node-canvas element
  const canvasElement = canvas.getElement() as unknown as {
    toBuffer: (mimeType: string, config?: { quality?: number }) => Buffer;
  };

  if (!canvasElement || typeof canvasElement.toBuffer !== "function") {
    throw new Error("Canvas element does not support toBuffer - node-canvas may not be available");
  }

  if (format === "jpeg") {
    return canvasElement.toBuffer("image/jpeg", { quality: quality / 100 });
  }

  return canvasElement.toBuffer("image/png");
}

/**
 * Render canvas to data URL (for preview)
 */
export function renderToDataUrl(
  canvas: StaticCanvas,
  format: "png" | "jpeg",
  quality = 90
): string {
  canvas.renderAll();

  const multiplier = 1;
  // Fabric.js uses 'jpeg' or 'png' as format values, not MIME types
  const formatStr = format === "jpeg" ? "jpeg" : "png";

  return canvas.toDataURL({
    format: formatStr as "jpeg" | "png",
    quality: quality / 100,
    multiplier,
  });
}

// ============================================================================
// Storage Integration
// ============================================================================

/**
 * Upload generated creative to R2 storage
 */
export async function uploadGeneratedCreative(
  buffer: Buffer,
  metadata: UploadMetadata
): Promise<UploadResult> {
  const { teamId, jobId, creativeId, format } = metadata;

  // Generate storage key
  const folder = jobId ? `generated/${teamId}/${jobId}` : `generated/${teamId}/single`;
  const storageKey = `${folder}/${creativeId}.${format}`;

  // Get storage configuration
  const endpoint = process.env.STORAGE_ENDPOINT;
  const bucket = process.env.STORAGE_BUCKET;
  const accessKey = process.env.STORAGE_ACCESS_KEY;
  const secretKey = process.env.STORAGE_SECRET_KEY;
  const cdnUrl = process.env.CDN_URL;

  if (!endpoint || !bucket || !accessKey || !secretKey) {
    // In test/dev mode without storage, return mock result
    if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
      return {
        storageKey,
        cdnUrl: `https://mock-cdn.example.com/${storageKey}`,
        fileSize: buffer.length,
      };
    }
    throw new Error("Storage configuration not available");
  }

  // Create S3 client for direct upload
  const client = new S3Client({
    endpoint,
    region: process.env.STORAGE_REGION ?? "auto",
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    forcePathStyle: true,
  });

  const contentType = format === "jpeg" ? "image/jpeg" : "image/png";

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const resultCdnUrl = cdnUrl ? `${cdnUrl}/${storageKey}` : `${endpoint}/${bucket}/${storageKey}`;

  return {
    storageKey,
    cdnUrl: resultCdnUrl,
    fileSize: buffer.length,
  };
}

// ============================================================================
// Creative Generation Service
// ============================================================================

/**
 * Creative Generation Service
 * Main service class for generating images from templates
 */
export class CreativeGenerationService {
  /**
   * Generate preview (returns data URL, no storage)
   */
  async generatePreview(
    templateId: string,
    teamId: string,
    variableData: Record<string, unknown>,
    aspectRatio: AspectRatio
  ): Promise<{ dataUrl: string; width: number; height: number; renderDurationMs: number }> {
    const startTime = Date.now();

    // Fetch template
    const [template] = await db
      .select()
      .from(designTemplates)
      .where(and(eq(designTemplates.id, templateId), eq(designTemplates.teamId, teamId)))
      .limit(1);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Initialize canvas
    const canvas = initializeFabricCanvas(aspectRatio.width, aspectRatio.height);

    try {
      // Load template
      await loadTemplateIntoCanvas(canvas, template.canvasJson);

      // Interpolate variables
      interpolateTextVariables(canvas, variableData);
      await loadImageVariables(canvas, variableData);

      // Render to data URL
      const dataUrl = renderToDataUrl(canvas, "png");

      const renderDurationMs = Date.now() - startTime;

      return {
        dataUrl,
        width: aspectRatio.width,
        height: aspectRatio.height,
        renderDurationMs,
      };
    } finally {
      disposeCanvas(canvas);
    }
  }

  /**
   * Generate single image and upload to storage
   */
  async generateSingle(params: SingleGenerationParams): Promise<GeneratedCreative> {
    const { teamId, templateId, dataSourceId, dataRowId, aspectRatio, format, quality, generationBatchId } = params;
    const startTime = Date.now();

    // Fetch template
    const [template] = await db
      .select()
      .from(designTemplates)
      .where(and(eq(designTemplates.id, templateId), eq(designTemplates.teamId, teamId)))
      .limit(1);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Fetch data row
    const [dataRow] = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.id, dataRowId))
      .limit(1);

    if (!dataRow) {
      throw new Error(`Data row not found: ${dataRowId}`);
    }

    // Verify data source belongs to team
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(and(eq(dataSources.id, dataSourceId), eq(dataSources.teamId, teamId)))
      .limit(1);

    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    // Create pending creative record
    const [creative] = await db
      .insert(generatedCreatives)
      .values({
        teamId,
        templateId,
        dataSourceId,
        dataRowId,
        width: aspectRatio.width,
        height: aspectRatio.height,
        format,
        generationBatchId,
        status: "processing",
      })
      .returning();

    if (!creative) {
      throw new Error("Failed to create creative record");
    }

    const canvas = initializeFabricCanvas(aspectRatio.width, aspectRatio.height);

    try {
      // Load template
      await loadTemplateIntoCanvas(canvas, template.canvasJson);

      // Interpolate variables
      const textVars = interpolateTextVariables(canvas, dataRow.rowData as Record<string, unknown>);
      const imageVars = await loadImageVariables(canvas, dataRow.rowData as Record<string, unknown>);

      // Render to buffer
      const buffer = await renderToBuffer(canvas, format, quality);

      // Upload to storage
      const uploadResult = await uploadGeneratedCreative(buffer, {
        teamId,
        jobId: generationBatchId,
        creativeId: creative.id,
        format,
      });

      const renderDurationMs = Date.now() - startTime;

      // Update creative with results
      const variableValues: VariableValuesSnapshot = {
        text: textVars,
        images: imageVars,
      };

      const [updated] = await db
        .update(generatedCreatives)
        .set({
          storageKey: uploadResult.storageKey,
          cdnUrl: uploadResult.cdnUrl,
          fileSize: uploadResult.fileSize,
          variableValues,
          renderDurationMs,
          status: "completed",
        })
        .where(eq(generatedCreatives.id, creative.id))
        .returning();

      return updated || creative;
    } catch (error) {
      // Update creative with error
      await db
        .update(generatedCreatives)
        .set({
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        })
        .where(eq(generatedCreatives.id, creative.id));

      throw error;
    } finally {
      disposeCanvas(canvas);
    }
  }

  /**
   * Start a batch generation job
   * Returns immediately with job ID - processing happens in background
   */
  async startBatchJob(params: BatchJobParams): Promise<GenerationJob> {
    const { teamId, templateId, dataSourceId, aspectRatios, rowFilter, format, quality } = params;

    // Verify template exists
    const [template] = await db
      .select()
      .from(designTemplates)
      .where(and(eq(designTemplates.id, templateId), eq(designTemplates.teamId, teamId)))
      .limit(1);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Verify data source exists
    const [dataSource] = await db
      .select()
      .from(dataSources)
      .where(and(eq(dataSources.id, dataSourceId), eq(dataSources.teamId, teamId)))
      .limit(1);

    if (!dataSource) {
      throw new Error(`Data source not found: ${dataSourceId}`);
    }

    // Count rows to process
    let rowCount = 0;
    if (rowFilter?.includeIds && rowFilter.includeIds.length > 0) {
      rowCount = rowFilter.includeIds.length;
    } else {
      const [countResult] = await db
        .select({ count: db.$count(dataRows) })
        .from(dataRows)
        .where(eq(dataRows.dataSourceId, dataSourceId));
      rowCount = countResult?.count ?? 0;
    }

    const totalItems = rowCount * aspectRatios.length;

    // Create job record
    const [job] = await db
      .insert(generationJobs)
      .values({
        teamId,
        templateId,
        dataSourceId,
        aspectRatios: aspectRatios as AspectRatioSpec[],
        rowFilter,
        outputFormat: format,
        quality,
        totalItems,
        status: "pending",
      })
      .returning();

    if (!job) {
      throw new Error("Failed to create generation job");
    }

    return job;
  }

  /**
   * Process a single item within a batch job
   */
  async processItem(
    jobId: string,
    teamId: string,
    templateId: string,
    dataSourceId: string,
    rowId: string,
    aspectRatio: AspectRatio,
    format: "png" | "jpeg",
    quality: number
  ): Promise<GeneratedCreative> {
    return this.generateSingle({
      teamId,
      templateId,
      dataSourceId,
      dataRowId: rowId,
      aspectRatio,
      format,
      quality,
      generationBatchId: jobId,
    });
  }

  /**
   * Get job with current progress
   */
  async getJob(jobId: string, teamId: string): Promise<GenerationJob | null> {
    const [job] = await db
      .select()
      .from(generationJobs)
      .where(and(eq(generationJobs.id, jobId), eq(generationJobs.teamId, teamId)))
      .limit(1);

    return job ?? null;
  }

  /**
   * Update job progress
   */
  async updateJobProgress(
    jobId: string,
    processed: number,
    failed: number,
    creativeIds: string[],
    errors: GenerationError[]
  ): Promise<void> {
    await db
      .update(generationJobs)
      .set({
        processedItems: processed,
        failedItems: failed,
        outputCreativeIds: creativeIds,
        errorLog: errors,
      })
      .where(eq(generationJobs.id, jobId));
  }

  /**
   * Mark job as processing
   */
  async markJobProcessing(jobId: string): Promise<void> {
    await db
      .update(generationJobs)
      .set({
        status: "processing",
        startedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
  }

  /**
   * Mark job as completed
   */
  async markJobCompleted(jobId: string): Promise<void> {
    await db
      .update(generationJobs)
      .set({
        status: "completed",
        completedAt: new Date(),
      })
      .where(eq(generationJobs.id, jobId));
  }

  /**
   * Mark job as failed
   */
  async markJobFailed(jobId: string, error: string): Promise<void> {
    await db
      .update(generationJobs)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorLog: [{ rowId: "", aspectRatio: { width: 0, height: 0 }, error, timestamp: new Date().toISOString() }],
      })
      .where(eq(generationJobs.id, jobId));
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string, teamId: string): Promise<boolean> {
    const job = await this.getJob(jobId, teamId);
    if (!job) return false;

    if (job.status === "completed" || job.status === "failed") {
      return false; // Cannot cancel finished jobs
    }

    await db
      .update(generationJobs)
      .set({
        status: "cancelled",
        completedAt: new Date(),
      })
      .where(and(eq(generationJobs.id, jobId), eq(generationJobs.teamId, teamId)));

    return true;
  }

  /**
   * List jobs for a team
   */
  async listJobs(
    teamId: string,
    options: { page?: number; limit?: number; status?: string }
  ): Promise<{ data: GenerationJob[]; total: number }> {
    const { page = 1, limit = 20, status } = options;

    const conditions = [eq(generationJobs.teamId, teamId)];
    if (status) {
      conditions.push(eq(generationJobs.status, status as GenerationJob["status"]));
    }

    const whereClause = and(...conditions);

    const [countResult] = await db
      .select({ count: db.$count(generationJobs) })
      .from(generationJobs)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const jobs = await db
      .select()
      .from(generationJobs)
      .where(whereClause)
      .orderBy(generationJobs.createdAt)
      .limit(limit)
      .offset((page - 1) * limit);

    return { data: jobs, total };
  }

  /**
   * Get results (generated creatives) for a job
   */
  async getJobResults(
    jobId: string,
    teamId: string,
    options: { page?: number; limit?: number }
  ): Promise<{ data: GeneratedCreative[]; total: number }> {
    const { page = 1, limit = 20 } = options;

    // Verify job belongs to team
    const job = await this.getJob(jobId, teamId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    const whereClause = eq(generatedCreatives.generationBatchId, jobId);

    const [countResult] = await db
      .select({ count: db.$count(generatedCreatives) })
      .from(generatedCreatives)
      .where(whereClause);

    const total = countResult?.count ?? 0;

    const creatives = await db
      .select()
      .from(generatedCreatives)
      .where(whereClause)
      .orderBy(generatedCreatives.createdAt)
      .limit(limit)
      .offset((page - 1) * limit);

    return { data: creatives, total };
  }

  /**
   * Get data rows for a job (with optional filter)
   */
  async getDataRowsForJob(
    dataSourceId: string,
    rowFilter?: RowFilter
  ): Promise<DataRow[]> {
    if (rowFilter?.includeIds && rowFilter.includeIds.length > 0) {
      return db
        .select()
        .from(dataRows)
        .where(
          and(
            eq(dataRows.dataSourceId, dataSourceId),
            inArray(dataRows.id, rowFilter.includeIds)
          )
        )
        .orderBy(dataRows.rowIndex);
    }

    if (rowFilter?.excludeIds && rowFilter.excludeIds.length > 0) {
      const allRows = await db
        .select()
        .from(dataRows)
        .where(eq(dataRows.dataSourceId, dataSourceId))
        .orderBy(dataRows.rowIndex);

      return allRows.filter((row) => !rowFilter.excludeIds!.includes(row.id));
    }

    if (rowFilter?.indexRange) {
      return db
        .select()
        .from(dataRows)
        .where(eq(dataRows.dataSourceId, dataSourceId))
        .orderBy(dataRows.rowIndex)
        .limit(rowFilter.indexRange.end - rowFilter.indexRange.start + 1)
        .offset(rowFilter.indexRange.start);
    }

    return db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId))
      .orderBy(dataRows.rowIndex);
  }
}

// ============================================================================
// Singleton
// ============================================================================

let serviceInstance: CreativeGenerationService | null = null;

/**
 * Get the creative generation service singleton
 */
export function getCreativeGenerationService(): CreativeGenerationService {
  if (!serviceInstance) {
    serviceInstance = new CreativeGenerationService();
  }
  return serviceInstance;
}

/**
 * Reset service (for testing)
 */
export function resetCreativeGenerationService(): void {
  serviceInstance = null;
}
