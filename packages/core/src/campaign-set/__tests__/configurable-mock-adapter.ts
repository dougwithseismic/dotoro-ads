/**
 * Configurable Mock Platform Adapter for Integration Testing
 *
 * A comprehensive mock implementation of CampaignSetPlatformAdapter that
 * provides fine-grained control over behavior for testing various scenarios:
 *
 * - Configurable success/failure rates
 * - Rate limit simulation (429 responses)
 * - Network error simulation
 * - Partial failures (some operations succeed, others fail)
 * - Operation delays for timing tests
 * - Call tracking for verification
 * - Sequence-based behavior (first call fails, second succeeds)
 */

import type {
  CampaignSetPlatformAdapter,
  PlatformCampaignResult,
  PlatformAdGroupResult,
  PlatformAdResult,
  PlatformKeywordResult,
} from "../platform-adapter.js";
import type { Campaign, AdGroup, Ad, Keyword, Platform } from "../types.js";

// ============================================================================
// Types
// ============================================================================

/**
 * Error types that can be simulated
 */
export type MockErrorType =
  | "rate_limit" // 429 Too Many Requests
  | "network_error" // Network timeout/connection error
  | "validation_error" // Invalid data
  | "auth_error" // Authentication/authorization failure
  | "server_error" // 500 Internal Server Error
  | "not_found"; // 404 Resource not found

/**
 * Operation types for tracking and configuration
 */
export type MockOperationType =
  | "createCampaign"
  | "updateCampaign"
  | "pauseCampaign"
  | "resumeCampaign"
  | "deleteCampaign"
  | "createAdGroup"
  | "updateAdGroup"
  | "deleteAdGroup"
  | "createAd"
  | "updateAd"
  | "deleteAd"
  | "createKeyword"
  | "updateKeyword"
  | "deleteKeyword";

/**
 * Record of an operation that was called
 */
export interface MockOperationCall {
  type: MockOperationType;
  args: unknown[];
  timestamp: number;
  result: "success" | "failure";
  error?: string;
}

/**
 * Configuration for how the mock should behave for specific operations
 */
export interface MockOperationConfig {
  /** Always fail this operation */
  alwaysFail?: boolean;
  /** Fail rate (0-1, where 0.5 = 50% failure rate) */
  failureRate?: number;
  /** Specific error type to return on failure */
  errorType?: MockErrorType;
  /** Custom error message */
  errorMessage?: string;
  /** Delay before responding (ms) */
  delayMs?: number;
  /** Sequence of outcomes: true = success, false = failure */
  sequence?: boolean[];
  /** Return retryable flag on failure */
  retryable?: boolean;
  /** Return retryAfter value on rate limit failures */
  retryAfterSeconds?: number;
}

/**
 * Global configuration for the mock adapter
 */
export interface ConfigurableMockAdapterConfig {
  /** Platform identifier */
  platform?: Platform;
  /** Default delay for all operations (ms) */
  defaultDelayMs?: number;
  /** Default failure rate for all operations (0-1) */
  defaultFailureRate?: number;
  /** Per-operation configurations */
  operationConfigs?: Partial<Record<MockOperationType, MockOperationConfig>>;
  /** Entity-specific configurations (by ID) */
  entityConfigs?: Map<string, MockOperationConfig>;
  /** Enable verbose logging */
  verbose?: boolean;
}

// ============================================================================
// Mock Adapter Implementation
// ============================================================================

/**
 * Configurable Mock Platform Adapter
 *
 * Provides comprehensive testing capabilities for campaign set sync scenarios.
 *
 * @example
 * ```typescript
 * // Basic usage - all operations succeed
 * const adapter = new ConfigurableMockAdapter();
 *
 * // Simulate 20% failure rate
 * const adapter = new ConfigurableMockAdapter({
 *   defaultFailureRate: 0.2,
 * });
 *
 * // Simulate rate limits on createCampaign
 * const adapter = new ConfigurableMockAdapter({
 *   operationConfigs: {
 *     createCampaign: {
 *       alwaysFail: true,
 *       errorType: "rate_limit",
 *       retryable: true,
 *       retryAfterSeconds: 60,
 *     },
 *   },
 * });
 *
 * // First createCampaign fails, second succeeds
 * const adapter = new ConfigurableMockAdapter({
 *   operationConfigs: {
 *     createCampaign: {
 *       sequence: [false, true, true],
 *     },
 *   },
 * });
 * ```
 */
export class ConfigurableMockAdapter implements CampaignSetPlatformAdapter {
  platform: string;

  private config: Required<
    Omit<ConfigurableMockAdapterConfig, "operationConfigs" | "entityConfigs">
  > & {
    operationConfigs: Partial<Record<MockOperationType, MockOperationConfig>>;
    entityConfigs: Map<string, MockOperationConfig>;
  };

  private calls: MockOperationCall[] = [];
  private operationCounters: Map<MockOperationType, number> = new Map();
  private entityOperationCounters: Map<string, number> = new Map();
  private platformIdCounter = 0;

  constructor(config: ConfigurableMockAdapterConfig = {}) {
    this.platform = config.platform ?? "mock";
    this.config = {
      platform: config.platform ?? ("mock" as Platform),
      defaultDelayMs: config.defaultDelayMs ?? 0,
      defaultFailureRate: config.defaultFailureRate ?? 0,
      operationConfigs: config.operationConfigs ?? {},
      entityConfigs: config.entityConfigs ?? new Map(),
      verbose: config.verbose ?? false,
    };
  }

  // ─── Campaign Operations ───────────────────────────────────────────────────

  async createCampaign(campaign: Campaign): Promise<PlatformCampaignResult> {
    return this.executeOperation("createCampaign", campaign.id, [campaign], () => ({
      success: true,
      platformCampaignId: this.generatePlatformId("campaign", campaign.id),
    })) as Promise<PlatformCampaignResult>;
  }

  async updateCampaign(
    campaign: Campaign,
    platformId: string
  ): Promise<PlatformCampaignResult> {
    return this.executeOperation(
      "updateCampaign",
      campaign.id,
      [campaign, platformId],
      () => ({
        success: true,
        platformCampaignId: platformId,
      })
    ) as Promise<PlatformCampaignResult>;
  }

  async pauseCampaign(platformId: string): Promise<void> {
    await this.executeVoidOperation("pauseCampaign", platformId, [platformId]);
  }

  async resumeCampaign(platformId: string): Promise<void> {
    await this.executeVoidOperation("resumeCampaign", platformId, [platformId]);
  }

  async deleteCampaign(platformId: string): Promise<void> {
    await this.executeVoidOperation("deleteCampaign", platformId, [platformId]);
  }

  // ─── Ad Group Operations ───────────────────────────────────────────────────

  async createAdGroup(
    adGroup: AdGroup,
    platformCampaignId: string
  ): Promise<PlatformAdGroupResult> {
    return this.executeOperation(
      "createAdGroup",
      adGroup.id,
      [adGroup, platformCampaignId],
      () => ({
        success: true,
        platformAdGroupId: this.generatePlatformId("adgroup", adGroup.id),
      })
    ) as Promise<PlatformAdGroupResult>;
  }

  async updateAdGroup(
    adGroup: AdGroup,
    platformAdGroupId: string
  ): Promise<PlatformAdGroupResult> {
    return this.executeOperation(
      "updateAdGroup",
      adGroup.id,
      [adGroup, platformAdGroupId],
      () => ({
        success: true,
        platformAdGroupId,
      })
    ) as Promise<PlatformAdGroupResult>;
  }

  async deleteAdGroup(platformAdGroupId: string): Promise<void> {
    await this.executeVoidOperation("deleteAdGroup", platformAdGroupId, [
      platformAdGroupId,
    ]);
  }

  // ─── Ad Operations ─────────────────────────────────────────────────────────

  async createAd(ad: Ad, platformAdGroupId: string): Promise<PlatformAdResult> {
    return this.executeOperation(
      "createAd",
      ad.id,
      [ad, platformAdGroupId],
      () => ({
        success: true,
        platformAdId: this.generatePlatformId("ad", ad.id),
      })
    ) as Promise<PlatformAdResult>;
  }

  async updateAd(ad: Ad, platformAdId: string): Promise<PlatformAdResult> {
    return this.executeOperation("updateAd", ad.id, [ad, platformAdId], () => ({
      success: true,
      platformAdId,
    })) as Promise<PlatformAdResult>;
  }

  async deleteAd(platformAdId: string): Promise<void> {
    await this.executeVoidOperation("deleteAd", platformAdId, [platformAdId]);
  }

  // ─── Keyword Operations ────────────────────────────────────────────────────

  async createKeyword(
    keyword: Keyword,
    platformAdGroupId: string
  ): Promise<PlatformKeywordResult> {
    return this.executeOperation(
      "createKeyword",
      keyword.id,
      [keyword, platformAdGroupId],
      () => ({
        success: true,
        platformKeywordId: this.generatePlatformId("keyword", keyword.id),
      })
    ) as Promise<PlatformKeywordResult>;
  }

  async updateKeyword(
    keyword: Keyword,
    platformKeywordId: string
  ): Promise<PlatformKeywordResult> {
    return this.executeOperation(
      "updateKeyword",
      keyword.id,
      [keyword, platformKeywordId],
      () => ({
        success: true,
        platformKeywordId,
      })
    ) as Promise<PlatformKeywordResult>;
  }

  async deleteKeyword(platformKeywordId: string): Promise<void> {
    await this.executeVoidOperation("deleteKeyword", platformKeywordId, [
      platformKeywordId,
    ]);
  }

  // ─── Configuration Methods ─────────────────────────────────────────────────

  /**
   * Configure behavior for a specific operation type
   */
  setOperationConfig(
    operation: MockOperationType,
    config: MockOperationConfig
  ): void {
    this.config.operationConfigs[operation] = config;
  }

  /**
   * Configure behavior for a specific entity by ID
   */
  setEntityConfig(entityId: string, config: MockOperationConfig): void {
    this.config.entityConfigs.set(entityId, config);
  }

  /**
   * Make a specific entity always fail
   */
  failEntity(
    entityId: string,
    errorType: MockErrorType = "server_error",
    errorMessage?: string
  ): void {
    this.setEntityConfig(entityId, {
      alwaysFail: true,
      errorType,
      errorMessage,
    });
  }

  /**
   * Configure rate limit response for an operation
   */
  simulateRateLimit(
    operation: MockOperationType,
    retryAfterSeconds = 60
  ): void {
    this.setOperationConfig(operation, {
      alwaysFail: true,
      errorType: "rate_limit",
      retryable: true,
      retryAfterSeconds,
    });
  }

  /**
   * Reset all configuration to defaults
   */
  resetConfig(): void {
    this.config.operationConfigs = {};
    this.config.entityConfigs.clear();
  }

  // ─── Call Tracking Methods ─────────────────────────────────────────────────

  /**
   * Get all recorded operation calls
   */
  getCalls(): MockOperationCall[] {
    return [...this.calls];
  }

  /**
   * Get calls for a specific operation type
   */
  getCallsForOperation(type: MockOperationType): MockOperationCall[] {
    return this.calls.filter((call) => call.type === type);
  }

  /**
   * Get the number of times an operation was called
   */
  getCallCount(type: MockOperationType): number {
    return this.operationCounters.get(type) ?? 0;
  }

  /**
   * Get total call count across all operations
   */
  getTotalCallCount(): number {
    return this.calls.length;
  }

  /**
   * Clear all recorded calls
   */
  clearCalls(): void {
    this.calls = [];
    this.operationCounters.clear();
    this.entityOperationCounters.clear();
  }

  /**
   * Reset everything (config and calls)
   */
  reset(): void {
    this.resetConfig();
    this.clearCalls();
    this.platformIdCounter = 0;
  }

  // ─── Internal Methods ──────────────────────────────────────────────────────

  private async executeOperation(
    type: MockOperationType,
    entityId: string,
    args: unknown[],
    onSuccess: () =>
      | PlatformCampaignResult
      | PlatformAdGroupResult
      | PlatformAdResult
      | PlatformKeywordResult
  ): Promise<
    | PlatformCampaignResult
    | PlatformAdGroupResult
    | PlatformAdResult
    | PlatformKeywordResult
  > {
    const config = this.getEffectiveConfig(type, entityId);

    // Apply delay if configured
    if (config.delayMs && config.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delayMs));
    }

    // Increment counters
    const operationCount = (this.operationCounters.get(type) ?? 0) + 1;
    this.operationCounters.set(type, operationCount);

    const entityOpKey = `${type}:${entityId}`;
    const entityOpCount = (this.entityOperationCounters.get(entityOpKey) ?? 0) + 1;
    this.entityOperationCounters.set(entityOpKey, entityOpCount);

    // Determine if this call should fail
    const shouldFail = this.shouldFail(config, operationCount);

    if (shouldFail) {
      const errorResult = this.createFailureResult(config);
      this.recordCall(type, args, "failure", errorResult.error);
      this.log(`${type}(${entityId}): FAILED - ${errorResult.error}`);
      return errorResult;
    }

    const successResult = onSuccess();
    this.recordCall(type, args, "success");
    this.log(`${type}(${entityId}): SUCCESS`);
    return successResult;
  }

  private async executeVoidOperation(
    type: MockOperationType,
    entityId: string,
    args: unknown[]
  ): Promise<void> {
    const config = this.getEffectiveConfig(type, entityId);

    // Apply delay if configured
    if (config.delayMs && config.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, config.delayMs));
    }

    // Increment counters
    const operationCount = (this.operationCounters.get(type) ?? 0) + 1;
    this.operationCounters.set(type, operationCount);

    // Determine if this call should fail
    const shouldFail = this.shouldFail(config, operationCount);

    if (shouldFail) {
      const error = this.createError(config);
      this.recordCall(type, args, "failure", error.message);
      this.log(`${type}(${entityId}): FAILED - ${error.message}`);
      throw error;
    }

    this.recordCall(type, args, "success");
    this.log(`${type}(${entityId}): SUCCESS`);
  }

  private getEffectiveConfig(
    type: MockOperationType,
    entityId: string
  ): MockOperationConfig {
    // Entity-specific config takes precedence
    const entityConfig = this.config.entityConfigs.get(entityId);
    if (entityConfig) {
      return entityConfig;
    }

    // Then operation-specific config
    const operationConfig = this.config.operationConfigs[type];
    if (operationConfig) {
      return operationConfig;
    }

    // Fall back to defaults
    return {
      delayMs: this.config.defaultDelayMs,
      failureRate: this.config.defaultFailureRate,
    };
  }

  private shouldFail(config: MockOperationConfig, callNumber: number): boolean {
    // Check sequence first
    if (config.sequence && config.sequence.length > 0) {
      const index = (callNumber - 1) % config.sequence.length;
      return !config.sequence[index];
    }

    // Check alwaysFail
    if (config.alwaysFail) {
      return true;
    }

    // Check failure rate
    const failureRate = config.failureRate ?? 0;
    if (failureRate > 0) {
      return Math.random() < failureRate;
    }

    return false;
  }

  private createFailureResult(
    config: MockOperationConfig
  ): PlatformCampaignResult {
    const errorMessage =
      config.errorMessage ?? this.getDefaultErrorMessage(config.errorType);

    return {
      success: false,
      error: errorMessage,
      retryable: config.retryable,
      retryAfter: config.retryAfterSeconds,
    };
  }

  private createError(config: MockOperationConfig): Error {
    const errorMessage =
      config.errorMessage ?? this.getDefaultErrorMessage(config.errorType);
    return new Error(errorMessage);
  }

  private getDefaultErrorMessage(errorType?: MockErrorType): string {
    switch (errorType) {
      case "rate_limit":
        return "Rate limit exceeded (429 Too Many Requests)";
      case "network_error":
        return "Network connection failed";
      case "validation_error":
        return "Validation failed: Invalid data";
      case "auth_error":
        return "Authentication failed";
      case "server_error":
        return "Internal server error (500)";
      case "not_found":
        return "Resource not found (404)";
      default:
        return "Mock adapter simulated failure";
    }
  }

  private recordCall(
    type: MockOperationType,
    args: unknown[],
    result: "success" | "failure",
    error?: string
  ): void {
    this.calls.push({
      type,
      args,
      timestamp: Date.now(),
      result,
      error,
    });
  }

  private generatePlatformId(entityType: string, localId: string): string {
    this.platformIdCounter++;
    return `mock_${entityType}_${localId}_${this.platformIdCounter}`;
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[ConfigurableMockAdapter] ${message}`);
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a mock adapter that always succeeds
 */
export function createSuccessAdapter(
  platform: Platform = "mock" as Platform
): ConfigurableMockAdapter {
  return new ConfigurableMockAdapter({ platform });
}

/**
 * Create a mock adapter that simulates rate limiting
 */
export function createRateLimitedAdapter(
  platform: Platform = "mock" as Platform,
  retryAfterSeconds = 60
): ConfigurableMockAdapter {
  return new ConfigurableMockAdapter({
    platform,
    operationConfigs: {
      createCampaign: {
        alwaysFail: true,
        errorType: "rate_limit",
        retryable: true,
        retryAfterSeconds,
      },
    },
  });
}

/**
 * Create a mock adapter with partial failures (some operations succeed, others fail)
 */
export function createPartialFailureAdapter(
  platform: Platform = "mock" as Platform,
  failureRate = 0.3
): ConfigurableMockAdapter {
  return new ConfigurableMockAdapter({
    platform,
    defaultFailureRate: failureRate,
  });
}

/**
 * Create a mock adapter that fails on first attempt but succeeds on retry
 */
export function createRetryableAdapter(
  platform: Platform = "mock" as Platform
): ConfigurableMockAdapter {
  return new ConfigurableMockAdapter({
    platform,
    operationConfigs: {
      createCampaign: {
        sequence: [false, true],
        errorType: "server_error",
        retryable: true,
      },
    },
  });
}

/**
 * Create a mock adapter with configurable delays for performance testing
 */
export function createSlowAdapter(
  platform: Platform = "mock" as Platform,
  delayMs = 100
): ConfigurableMockAdapter {
  return new ConfigurableMockAdapter({
    platform,
    defaultDelayMs: delayMs,
  });
}
