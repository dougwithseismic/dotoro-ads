/**
 * Generate Creatives Job Handler
 *
 * Background job handler that processes batch image generation jobs.
 * Generates images from visual templates combined with data source rows.
 *
 * Features:
 * - Batch processing with progress tracking
 * - Memory-efficient canvas management (cleanup after each render)
 * - Error logging for failed items (doesn't fail entire job)
 * - SSE progress events for real-time updates
 */

import { PgBoss } from "pg-boss";
import { emitGenerationProgress } from "../events.js";
import {
  getCreativeGenerationService,
  type AspectRatio,
} from "../../services/creative-generation.js";
import type {
  GenerateCreativesJob,
  GenerateCreativesResult,
} from "../types.js";
import type { GenerationError, RowFilter } from "../../services/db.js";

/**
 * Job name constant for generate creatives jobs.
 */
export const GENERATE_CREATIVES_JOB = "generate-creatives";

/**
 * Maximum concurrent renders per worker to control memory usage
 */
const MAX_CONCURRENT_RENDERS = 3;

/**
 * Creates the generate creatives job handler function.
 *
 * This factory pattern allows for dependency injection in tests.
 *
 * @returns The job handler function
 */
export function createGenerateCreativesHandler(): (
  data: GenerateCreativesJob,
  jobId: string
) => Promise<GenerateCreativesResult> {
  return async (
    data: GenerateCreativesJob,
    jobId: string
  ): Promise<GenerateCreativesResult> => {
    const {
      jobId: generationJobId,
      teamId,
      templateId,
      dataSourceId,
      aspectRatios,
      rowFilter,
      format,
      quality,
    } = data;

    const service = getCreativeGenerationService();

    // Mark job as processing
    await service.markJobProcessing(generationJobId);

    // Emit starting event
    emitGenerationProgress({
      jobId: generationJobId,
      type: "started",
      data: {
        processed: 0,
        failed: 0,
        total: 0,
      },
      timestamp: new Date().toISOString(),
    });

    // Get data rows to process
    const dataRows = await service.getDataRowsForJob(dataSourceId, rowFilter);

    const total = dataRows.length * aspectRatios.length;
    let processed = 0;
    let failed = 0;
    const creativeIds: string[] = [];
    const errors: GenerationError[] = [];

    console.log(
      `[Job ${jobId}] Starting generation: ${dataRows.length} rows x ${aspectRatios.length} aspect ratios = ${total} items`
    );

    // Emit total count
    emitGenerationProgress({
      jobId: generationJobId,
      type: "progress",
      data: {
        processed: 0,
        failed: 0,
        total,
      },
      timestamp: new Date().toISOString(),
    });

    // Process each row x aspect ratio combination
    for (const row of dataRows) {
      // Check if job was cancelled
      const currentJob = await service.getJob(generationJobId, teamId);
      if (currentJob?.status === "cancelled") {
        console.log(`[Job ${jobId}] Job cancelled, stopping processing`);
        break;
      }

      for (const aspectRatio of aspectRatios) {
        try {
          const creative = await service.processItem(
            generationJobId,
            teamId,
            templateId,
            dataSourceId,
            row.id,
            aspectRatio as AspectRatio,
            format,
            quality
          );

          creativeIds.push(creative.id);
          processed++;

          // Update progress every 10 items or on completion
          if (processed % 10 === 0 || processed === total) {
            await service.updateJobProgress(
              generationJobId,
              processed,
              failed,
              creativeIds,
              errors
            );

            emitGenerationProgress({
              jobId: generationJobId,
              type: "progress",
              data: {
                processed,
                failed,
                total,
                latestCreativeId: creative.id,
              },
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          failed++;
          const errorMessage = error instanceof Error ? error.message : "Unknown error";

          errors.push({
            rowId: row.id,
            aspectRatio: aspectRatio as { width: number; height: number },
            error: errorMessage,
            timestamp: new Date().toISOString(),
          });

          console.warn(
            `[Job ${jobId}] Failed to generate for row ${row.id} at ${aspectRatio.width}x${aspectRatio.height}: ${errorMessage}`
          );

          // Continue processing (don't fail entire job)
        }
      }
    }

    // Update final progress
    await service.updateJobProgress(
      generationJobId,
      processed,
      failed,
      creativeIds,
      errors
    );

    // Mark job as completed or failed
    if (failed === total) {
      await service.markJobFailed(generationJobId, "All items failed to generate");
      emitGenerationProgress({
        jobId: generationJobId,
        type: "error",
        data: {
          error: "All items failed to generate",
          processed,
          failed,
          total,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      await service.markJobCompleted(generationJobId);
      emitGenerationProgress({
        jobId: generationJobId,
        type: "completed",
        data: {
          processed,
          failed,
          total,
          creativeIds,
        },
        timestamp: new Date().toISOString(),
      });
    }

    console.log(
      `[Job ${jobId}] Generation completed: processed=${processed}, failed=${failed}, total=${total}`
    );

    return {
      processed,
      failed,
      creativeIds,
      errors,
    };
  };
}

/**
 * Registers the generate creatives job handler with pg-boss.
 *
 * @param boss - The pg-boss instance to register with
 */
export async function registerGenerateCreativesHandler(boss: PgBoss): Promise<void> {
  const handler = createGenerateCreativesHandler();

  // Create the queue before registering the worker (required in pg-boss v10+)
  await boss.createQueue(GENERATE_CREATIVES_JOB);

  // pg-boss v10+ passes an array of jobs to the handler (batch processing)
  // We process jobs sequentially and return results for each
  await boss.work<GenerateCreativesJob, GenerateCreativesResult[]>(
    GENERATE_CREATIVES_JOB,
    {
      // Process one job at a time for memory efficiency
      batchSize: 1,
      // Allow longer running time for large batches
      includeMetadata: true,
    },
    async (jobs) => {
      const results: GenerateCreativesResult[] = [];

      for (const job of jobs) {
        const data = job.data;

        console.log(
          `[Job ${job.id}] Starting creative generation for job: ${data.jobId}`
        );

        try {
          const result = await handler(data, job.id);

          console.log(
            `[Job ${job.id}] Generation completed: processed=${result.processed}, failed=${result.failed}`
          );

          results.push(result);
        } catch (error) {
          console.error(
            `[Job ${job.id}] Generation failed:`,
            error instanceof Error ? error.message : error
          );
          throw error;
        }
      }

      return results;
    }
  );
}
