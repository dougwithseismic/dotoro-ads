/**
 * Column Analysis Service
 *
 * Computes length statistics for data source columns to enable
 * proactive template validation and content length estimation.
 */

import { eq } from "drizzle-orm";
import type { ColumnLengthStats, ColumnLengthStat, DataSourceConfig } from "@repo/database/schema";
import { db, dataRows, dataSources } from "./db.js";

/**
 * Result of computing column length statistics
 */
export interface ComputeStatsResult {
  /** Whether the computation was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Computed statistics keyed by column name */
  stats?: ColumnLengthStats;
  /** Number of rows processed */
  rowCount?: number;
  /** Duration of computation in milliseconds */
  duration?: number;
}

/**
 * Internal structure for accumulating column statistics during computation
 */
interface ColumnAccumulator {
  minLength: number;
  maxLength: number;
  totalLength: number;
  count: number;
  sampleShortest: string;
  sampleLongest: string;
}

/**
 * Computes length statistics for all columns in a data source.
 *
 * This function:
 * 1. Fetches all rows from the data source
 * 2. Iterates through each row to compute min/max/avg lengths
 * 3. Stores the computed stats in the data source config
 *
 * @param dataSourceId - The UUID of the data source to analyze
 * @returns Result object with success status and computed stats
 */
export async function computeColumnLengthStats(
  dataSourceId: string
): Promise<ComputeStatsResult> {
  const startTime = Date.now();

  try {
    // Fetch all rows from the data source
    const rows = await db
      .select()
      .from(dataRows)
      .where(eq(dataRows.dataSourceId, dataSourceId));

    if (rows.length === 0) {
      return {
        success: true,
        stats: {},
        rowCount: 0,
        duration: Date.now() - startTime,
      };
    }

    // Initialize accumulators for each column
    const accumulators: Map<string, ColumnAccumulator> = new Map();

    // Process each row
    for (const row of rows) {
      const rowData = row.rowData as Record<string, unknown>;

      for (const [columnName, value] of Object.entries(rowData)) {
        // Skip null/undefined values
        if (value == null) {
          continue;
        }

        // Convert value to string for length calculation
        const strValue = String(value);
        const length = strValue.length;

        // Get or create accumulator for this column
        let acc = accumulators.get(columnName);
        if (!acc) {
          acc = {
            minLength: length,
            maxLength: length,
            totalLength: 0,
            count: 0,
            sampleShortest: strValue,
            sampleLongest: strValue,
          };
          accumulators.set(columnName, acc);
        }

        // Update statistics
        acc.totalLength += length;
        acc.count += 1;

        if (length < acc.minLength) {
          acc.minLength = length;
          acc.sampleShortest = strValue;
        }

        if (length > acc.maxLength) {
          acc.maxLength = length;
          acc.sampleLongest = strValue;
        }
      }
    }

    // Convert accumulators to final stats format
    const computedAt = new Date().toISOString();
    const stats: ColumnLengthStats = {};

    for (const [columnName, acc] of accumulators.entries()) {
      stats[columnName] = {
        minLength: acc.minLength,
        maxLength: acc.maxLength,
        avgLength: acc.count > 0 ? acc.totalLength / acc.count : 0,
        sampleShortest: acc.sampleShortest,
        sampleLongest: acc.sampleLongest,
        computedAt,
      };
    }

    // Store stats in data source config
    await updateDataSourceStats(dataSourceId, stats);

    return {
      success: true,
      stats,
      rowCount: rows.length,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Updates the data source config with computed column stats.
 *
 * @param dataSourceId - The UUID of the data source
 * @param stats - The computed column length statistics
 */
async function updateDataSourceStats(
  dataSourceId: string,
  stats: ColumnLengthStats
): Promise<void> {
  // Fetch current config
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, dataSourceId));

  if (!dataSource) {
    throw new Error(`Data source not found: ${dataSourceId}`);
  }

  // Merge stats into existing config
  const existingConfig = (dataSource.config as DataSourceConfig) ?? {};
  const newConfig: DataSourceConfig = {
    ...existingConfig,
    columnStats: stats,
  };

  // Update data source
  await db
    .update(dataSources)
    .set({ config: newConfig })
    .where(eq(dataSources.id, dataSourceId));
}

/**
 * Gets the cached column stats from a data source config.
 *
 * @param dataSourceId - The UUID of the data source
 * @returns The cached column stats or undefined if not computed
 */
export async function getCachedColumnStats(
  dataSourceId: string
): Promise<ColumnLengthStats | undefined> {
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, dataSourceId));

  if (!dataSource) {
    return undefined;
  }

  const config = dataSource.config as DataSourceConfig | null;
  return config?.columnStats;
}

/**
 * Clears the cached column stats from a data source.
 * Useful when data source content changes significantly.
 *
 * @param dataSourceId - The UUID of the data source
 */
export async function clearColumnStats(dataSourceId: string): Promise<void> {
  const [dataSource] = await db
    .select()
    .from(dataSources)
    .where(eq(dataSources.id, dataSourceId));

  if (!dataSource) {
    return;
  }

  const existingConfig = (dataSource.config as DataSourceConfig) ?? {};
  const { columnStats: _removed, ...newConfig } = existingConfig;

  await db
    .update(dataSources)
    .set({ config: newConfig })
    .where(eq(dataSources.id, dataSourceId));
}
