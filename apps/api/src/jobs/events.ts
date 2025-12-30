/**
 * Job Events Module
 *
 * Provides a typed event emitter for background job progress updates.
 * Used for Server-Sent Events (SSE) streaming of sync progress.
 */
import { EventEmitter } from "events";

/**
 * Event types for sync progress updates.
 */
export type SyncProgressEventType =
  | "progress"
  | "campaign_synced"
  | "campaign_failed"
  | "completed"
  | "error";

/**
 * Data payload for sync progress events.
 */
export interface SyncProgressData {
  /** Number of campaigns synced so far */
  synced?: number;
  /** Number of campaigns that failed */
  failed?: number;
  /** Total number of campaigns to sync */
  total?: number;
  /** Campaign ID (for campaign_synced/campaign_failed) */
  campaignId?: string;
  /** Platform-assigned ID (for campaign_synced) */
  platformId?: string;
  /** Error message (for campaign_failed/error) */
  error?: string;
  /** Whether this is a dry run (validation only) */
  dryRun?: boolean;
  /** Whether validation passed (for dry run) */
  isValid?: boolean;
  /** Total validation errors (for dry run) */
  totalErrors?: number;
  /** Validation time in ms (for dry run) */
  validationTimeMs?: number;
  /** Whether the error was a validation failure */
  validationFailed?: boolean;
  /** Persisted validation result ID for error lookup */
  validationId?: string;
  /** Number of ads that were skipped due to validation */
  skippedAds?: number;
  /** Number of ads that used fallback content */
  fallbacksUsed?: number;
  /** Number of ads that were truncated */
  truncated?: number;
}

/**
 * Sync progress event structure.
 */
export interface SyncProgressEvent {
  /** The pg-boss job ID */
  jobId: string;
  /** The campaign set being synced */
  campaignSetId: string;
  /** Event type */
  type: SyncProgressEventType;
  /** Event data payload */
  data: SyncProgressData;
  /** ISO timestamp of the event */
  timestamp: string;
}

/**
 * Singleton event emitter for job events.
 * Used to communicate between job handlers and SSE endpoints.
 */
export const jobEvents = new EventEmitter();

// Increase max listeners to support multiple concurrent SSE connections
jobEvents.setMaxListeners(100);

/**
 * Emits a typed sync progress event.
 *
 * Events are emitted on the pattern `sync:{jobId}` for progress listeners.
 * For terminal events (completed, error), also emits `sync:{jobId}:done`.
 *
 * @param event - The sync progress event to emit
 */
export function emitSyncProgress(event: SyncProgressEvent): void {
  // Emit to the main sync event channel
  jobEvents.emit(`sync:${event.jobId}`, event);

  // For terminal events, also emit done signal
  if (event.type === "completed" || event.type === "error") {
    jobEvents.emit(`sync:${event.jobId}:done`);
  }
}

// ============================================================================
// Generation Progress Events
// ============================================================================

/**
 * Event types for generation progress updates.
 */
export type GenerationProgressEventType =
  | "started"
  | "progress"
  | "completed"
  | "error";

/**
 * Data payload for generation progress events.
 */
export interface GenerationProgressData {
  /** Number of images processed so far */
  processed?: number;
  /** Number of images that failed */
  failed?: number;
  /** Total number of images to generate */
  total?: number;
  /** Latest generated creative ID */
  latestCreativeId?: string;
  /** All generated creative IDs (for completed) */
  creativeIds?: string[];
  /** Error message (for error type) */
  error?: string;
}

/**
 * Generation progress event structure.
 */
export interface GenerationProgressEvent {
  /** The generation job ID */
  jobId: string;
  /** Event type */
  type: GenerationProgressEventType;
  /** Event data payload */
  data: GenerationProgressData;
  /** ISO timestamp of the event */
  timestamp: string;
}

/**
 * Emits a typed generation progress event.
 *
 * Events are emitted on the pattern `generation:{jobId}` for progress listeners.
 * For terminal events (completed, error), also emits `generation:{jobId}:done`.
 *
 * @param event - The generation progress event to emit
 */
export function emitGenerationProgress(event: GenerationProgressEvent): void {
  // Emit to the main generation event channel
  jobEvents.emit(`generation:${event.jobId}`, event);

  // For terminal events, also emit done signal
  if (event.type === "completed" || event.type === "error") {
    jobEvents.emit(`generation:${event.jobId}:done`);
  }
}
