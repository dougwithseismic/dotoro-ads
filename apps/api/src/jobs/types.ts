/**
 * Job Types Module
 *
 * Defines TypeScript types for background jobs in the system.
 */

/**
 * Supported platforms for campaign sync.
 */
export type Platform = "reddit" | "google" | "facebook";

/**
 * Job states matching pg-boss states.
 */
export type JobState = "created" | "active" | "completed" | "failed" | "cancelled";

/**
 * Data payload for sync campaign set jobs.
 */
export interface SyncCampaignSetJob {
  /** The campaign set ID to sync */
  campaignSetId: string;

  /** The team who owns this campaign set */
  teamId: string;

  /** The ad account ID to use for the sync */
  adAccountId: string;

  /** The funding instrument ID for the platform (optional in Reddit v3 API) */
  fundingInstrumentId?: string;

  /** The platform to sync to */
  platform: Platform;

  /**
   * If true, only validate without executing sync.
   * Returns validation result instead of sync result.
   */
  dryRun?: boolean;
}

/**
 * Status information for a job.
 */
export interface JobStatus {
  /** Unique job identifier */
  id: string;

  /** Job name/type */
  name: string;

  /** Current job state */
  state: JobState;

  /** Job input data */
  data: unknown;

  /** Progress percentage (0-100) */
  progress?: number;

  /** Job output/result on completion */
  output?: unknown;

  /** Error message for failed jobs */
  error?: string;

  /** When the job started processing */
  startedAt?: Date;

  /** When the job completed (success or failure) */
  completedAt?: Date;

  /** When the job was created */
  createdAt: Date;
}

/**
 * Record of an ad that was skipped during sync.
 * Contains full context for debugging and user review.
 */
export interface SkippedAdRecord {
  /** ID of the skipped ad */
  adId: string;
  /** ID of the ad group containing this ad */
  adGroupId: string;
  /** ID of the campaign containing this ad */
  campaignId: string;
  /** Reason for skipping */
  reason: string;
  /** Field(s) that caused the skip */
  fields: string[];
  /** Overflow amounts per field */
  overflow: Record<string, number>;
  /** Original ad content snapshot */
  originalAd: {
    headline?: string;
    description?: string;
    displayUrl?: string;
    finalUrl?: string;
  };
  /** Timestamp when the ad was skipped */
  skippedAt: string;
}

/**
 * Result of a sync operation.
 */
export interface SyncResult {
  /** Number of campaigns successfully synced */
  synced: number;

  /** Number of campaigns that failed to sync */
  failed: number;

  /** Number of campaigns skipped */
  skipped: number;

  /** Number of ads that were skipped due to validation */
  skippedAds?: number;

  /** Number of ads that used fallback content */
  fallbacksUsed?: number;

  /** Number of ads that were truncated */
  truncated?: number;

  /** Detailed records of skipped ads */
  skippedAdRecords?: SkippedAdRecord[];

  /** Array of error details for failed campaigns */
  errors: Array<{
    campaignId: string;
    message: string;
  }>;
}

/**
 * Response when a job is queued.
 */
export interface QueuedJobResponse {
  /** The job ID for tracking */
  jobId: string;

  /** Job status */
  status: "queued";

  /** Human-readable message */
  message: string;
}

/**
 * Data payload for sync-from-platform jobs (bidirectional sync).
 */
export interface SyncFromPlatformJob {
  /** The ad account ID to sync from */
  adAccountId: string;

  /** The user who initiated the sync */
  userId: string;

  /** The platform to sync from */
  platform: Platform;
}

/**
 * Result of a sync-from-platform operation.
 */
export interface SyncFromPlatformResult {
  /** Number of campaigns updated from platform */
  updated: number;

  /** Number of conflicts detected */
  conflicts: number;

  /** Number of campaigns unchanged */
  unchanged: number;

  /** Number of deleted campaigns detected */
  deleted: number;

  /** Number of errors encountered */
  errors: number;

  /** Error messages if any */
  errorMessages: Array<{
    campaignId: string;
    message: string;
  }>;
}

// ============================================================================
// Creative Generation Jobs
// ============================================================================

/**
 * Aspect ratio specification for generation.
 */
export interface AspectRatioSpec {
  width: number;
  height: number;
}

/**
 * Row filter for selective generation.
 */
export interface RowFilter {
  includeIds?: string[];
  excludeIds?: string[];
  indexRange?: {
    start: number;
    end: number;
  };
}

/**
 * Data payload for generate creatives jobs.
 */
export interface GenerateCreativesJob {
  /** The generation job ID (from generation_jobs table) */
  jobId: string;

  /** The team who owns this job */
  teamId: string;

  /** The design template ID to use */
  templateId: string;

  /** The data source ID containing rows */
  dataSourceId: string;

  /** Aspect ratios to generate for each row */
  aspectRatios: AspectRatioSpec[];

  /** Optional filter for which rows to include */
  rowFilter?: RowFilter;

  /** Output format */
  format: "png" | "jpeg";

  /** JPEG quality (1-100) */
  quality: number;
}

/**
 * Result of a generate creatives operation.
 */
export interface GenerateCreativesResult {
  /** Number of images successfully generated */
  processed: number;

  /** Number of images that failed to generate */
  failed: number;

  /** IDs of successfully generated creatives */
  creativeIds: string[];

  /** Error log for failed items */
  errors: Array<{
    rowId: string;
    aspectRatio: AspectRatioSpec;
    error: string;
    timestamp: string;
  }>;
}
