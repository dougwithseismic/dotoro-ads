/**
 * Fallback Ad System Module
 *
 * Exports types, strategy engine, and utilities for handling ads
 * that exceed platform character limits.
 */

// Export types
export type {
  CampaignSetFallbackStrategy,
  FallbackAdDefinition,
  TruncationConfig,
  SkippedAdRecord,
  StrategyAction,
  StrategyResult,
  StrategyContext,
  ExtendedSyncResult,
} from "./types.js";

export { DEFAULT_TRUNCATION_CONFIG } from "./types.js";

// Export strategy engine
export {
  FallbackStrategyEngine,
  createStrategyEngine,
  type StrategyEngineConfig,
} from "./strategy-engine.js";
