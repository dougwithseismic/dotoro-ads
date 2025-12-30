/**
 * Mock Platform Adapter
 *
 * A mock implementation of the CampaignSetPlatformAdapter interface
 * for testing and development purposes. Simulates platform sync behavior
 * with configurable success/failure modes.
 */

import type {
  CampaignSetPlatformAdapter,
  PlatformCampaignResult,
  PlatformAdGroupResult,
  PlatformAdResult,
  PlatformKeywordResult,
} from "../platform-adapter.js";
import type { Campaign, AdGroup, Ad, Keyword } from "../types.js";

/**
 * Represents an existing entity on the mock platform for deduplication testing
 */
export interface MockExistingEntity {
  id: string;
  name: string;
  parentId?: string;
}

/**
 * Configuration options for the mock adapter
 */
export interface MockAdapterOptions {
  /**
   * Simulated delay in milliseconds for each operation
   * @default 0
   */
  delay?: number;

  /**
   * Failure rate as a number between 0 and 1 (0 = never fail, 1 = always fail)
   * @default 0
   */
  failureRate?: number;

  /**
   * Custom error message to use when simulating failures
   * @default "Mock adapter simulated failure"
   */
  failureMessage?: string;

  /**
   * Whether to log operations to console for debugging
   * @default false
   */
  verbose?: boolean;

  /**
   * Pre-seeded existing campaigns for deduplication testing
   */
  existingCampaigns?: MockExistingEntity[];

  /**
   * Pre-seeded existing ad groups for deduplication testing
   */
  existingAdGroups?: MockExistingEntity[];

  /**
   * Pre-seeded existing ads for deduplication testing
   */
  existingAds?: MockExistingEntity[];
}

/**
 * Mock platform adapter for testing campaign set sync
 *
 * This adapter simulates the behavior of a real platform adapter without
 * making actual API calls. Useful for:
 * - Unit and integration testing
 * - Local development without platform credentials
 * - Demonstrating sync behavior
 *
 * @example
 * ```typescript
 * // Basic usage
 * const adapter = new MockPlatformAdapter();
 *
 * // With simulated delay
 * const adapter = new MockPlatformAdapter({ delay: 100 });
 *
 * // With simulated failures (20% failure rate)
 * const adapter = new MockPlatformAdapter({ failureRate: 0.2 });
 * ```
 */
export class MockPlatformAdapter implements CampaignSetPlatformAdapter {
  platform = "mock";

  private readonly options: Required<Omit<MockAdapterOptions, 'existingCampaigns' | 'existingAdGroups' | 'existingAds'>> & {
    existingCampaigns: MockExistingEntity[];
    existingAdGroups: MockExistingEntity[];
    existingAds: MockExistingEntity[];
  };
  private operationCount = 0;

  constructor(options: MockAdapterOptions = {}) {
    this.options = {
      delay: options.delay ?? 0,
      failureRate: options.failureRate ?? 0,
      failureMessage: options.failureMessage ?? "Mock adapter simulated failure",
      verbose: options.verbose ?? false,
      existingCampaigns: options.existingCampaigns ?? [],
      existingAdGroups: options.existingAdGroups ?? [],
      existingAds: options.existingAds ?? [],
    };
  }

  // ─── Campaign Operations ───────────────────────────────────────────────────

  async createCampaign(campaign: Campaign): Promise<PlatformCampaignResult> {
    await this.simulateDelay();
    this.log("createCampaign", campaign.id);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    const platformCampaignId = this.generatePlatformId("campaign", campaign.id);
    return { success: true, platformCampaignId };
  }

  async updateCampaign(
    campaign: Campaign,
    platformId: string
  ): Promise<PlatformCampaignResult> {
    await this.simulateDelay();
    this.log("updateCampaign", platformId);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    return { success: true, platformCampaignId: platformId };
  }

  async pauseCampaign(platformId: string): Promise<void> {
    await this.simulateDelay();
    this.log("pauseCampaign", platformId);

    if (this.shouldFail()) {
      throw new Error(this.options.failureMessage);
    }
  }

  async resumeCampaign(platformId: string): Promise<void> {
    await this.simulateDelay();
    this.log("resumeCampaign", platformId);

    if (this.shouldFail()) {
      throw new Error(this.options.failureMessage);
    }
  }

  async deleteCampaign(platformId: string): Promise<void> {
    await this.simulateDelay();
    this.log("deleteCampaign", platformId);

    if (this.shouldFail()) {
      throw new Error(this.options.failureMessage);
    }
  }

  // ─── Ad Group Operations ───────────────────────────────────────────────────

  async createAdGroup(
    adGroup: AdGroup,
    platformCampaignId: string
  ): Promise<PlatformAdGroupResult> {
    await this.simulateDelay();
    this.log("createAdGroup", adGroup.id, `parent: ${platformCampaignId}`);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    const platformAdGroupId = this.generatePlatformId("adgroup", adGroup.id);
    return { success: true, platformAdGroupId };
  }

  async updateAdGroup(
    adGroup: AdGroup,
    platformAdGroupId: string
  ): Promise<PlatformAdGroupResult> {
    await this.simulateDelay();
    this.log("updateAdGroup", platformAdGroupId);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    return { success: true, platformAdGroupId };
  }

  async deleteAdGroup(platformAdGroupId: string): Promise<void> {
    await this.simulateDelay();
    this.log("deleteAdGroup", platformAdGroupId);

    if (this.shouldFail()) {
      throw new Error(this.options.failureMessage);
    }
  }

  // ─── Ad Operations ─────────────────────────────────────────────────────────

  async createAd(
    ad: Ad,
    platformAdGroupId: string
  ): Promise<PlatformAdResult> {
    await this.simulateDelay();
    this.log("createAd", ad.id, `parent: ${platformAdGroupId}`);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    const platformAdId = this.generatePlatformId("ad", ad.id);
    return { success: true, platformAdId };
  }

  async updateAd(ad: Ad, platformAdId: string): Promise<PlatformAdResult> {
    await this.simulateDelay();
    this.log("updateAd", platformAdId);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    return { success: true, platformAdId };
  }

  async deleteAd(platformAdId: string): Promise<void> {
    await this.simulateDelay();
    this.log("deleteAd", platformAdId);

    if (this.shouldFail()) {
      throw new Error(this.options.failureMessage);
    }
  }

  // ─── Keyword Operations ────────────────────────────────────────────────────

  async createKeyword(
    keyword: Keyword,
    platformAdGroupId: string
  ): Promise<PlatformKeywordResult> {
    await this.simulateDelay();
    this.log("createKeyword", keyword.id, `parent: ${platformAdGroupId}`);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    const platformKeywordId = this.generatePlatformId("keyword", keyword.id);
    return { success: true, platformKeywordId };
  }

  async updateKeyword(
    keyword: Keyword,
    platformKeywordId: string
  ): Promise<PlatformKeywordResult> {
    await this.simulateDelay();
    this.log("updateKeyword", platformKeywordId);

    if (this.shouldFail()) {
      return { success: false, error: this.options.failureMessage };
    }

    return { success: true, platformKeywordId };
  }

  async deleteKeyword(platformKeywordId: string): Promise<void> {
    await this.simulateDelay();
    this.log("deleteKeyword", platformKeywordId);

    if (this.shouldFail()) {
      throw new Error(this.options.failureMessage);
    }
  }

  // ─── Deduplication Queries ────────────────────────────────────────────────

  /**
   * Find an existing campaign by name for deduplication testing
   */
  async findExistingCampaign(_accountId: string, name: string): Promise<string | null> {
    await this.simulateDelay();
    this.log("findExistingCampaign", name);

    const existing = this.options.existingCampaigns.find(c => c.name === name);
    return existing?.id ?? null;
  }

  /**
   * Find an existing ad group by name within a campaign for deduplication testing
   */
  async findExistingAdGroup(campaignId: string, name: string): Promise<string | null> {
    await this.simulateDelay();
    this.log("findExistingAdGroup", name, `parent: ${campaignId}`);

    const existing = this.options.existingAdGroups.find(
      ag => ag.name === name && ag.parentId === campaignId
    );
    return existing?.id ?? null;
  }

  /**
   * Find an existing ad by name within an ad group for deduplication testing
   */
  async findExistingAd(adGroupId: string, name: string): Promise<string | null> {
    await this.simulateDelay();
    this.log("findExistingAd", name, `parent: ${adGroupId}`);

    const existing = this.options.existingAds.find(
      ad => ad.name === name && ad.parentId === adGroupId
    );
    return existing?.id ?? null;
  }

  // ─── Helper Methods ────────────────────────────────────────────────────────

  /**
   * Simulate network delay
   */
  private async simulateDelay(): Promise<void> {
    if (this.options.delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.options.delay));
    }
  }

  /**
   * Determine if this operation should fail based on failure rate
   */
  private shouldFail(): boolean {
    if (this.options.failureRate <= 0) return false;
    if (this.options.failureRate >= 1) return true;
    return Math.random() < this.options.failureRate;
  }

  /**
   * Generate a unique platform ID for an entity
   */
  private generatePlatformId(entityType: string, localId: string): string {
    this.operationCount++;
    return `mock_${entityType}_${localId}_${Date.now()}_${this.operationCount}`;
  }

  /**
   * Log operation if verbose mode is enabled
   */
  private log(operation: string, ...args: string[]): void {
    if (this.options.verbose) {
      console.log(`[MockAdapter] ${operation}:`, ...args);
    }
  }

  // ─── Testing Utilities ─────────────────────────────────────────────────────

  /**
   * Reset the operation counter (useful for testing)
   */
  resetOperationCount(): void {
    this.operationCount = 0;
  }

  /**
   * Get the current operation count
   */
  getOperationCount(): number {
    return this.operationCount;
  }

  /**
   * Add an existing campaign for deduplication testing
   */
  addExistingCampaign(entity: MockExistingEntity): void {
    this.options.existingCampaigns.push(entity);
  }

  /**
   * Add an existing ad group for deduplication testing
   */
  addExistingAdGroup(entity: MockExistingEntity): void {
    this.options.existingAdGroups.push(entity);
  }

  /**
   * Add an existing ad for deduplication testing
   */
  addExistingAd(entity: MockExistingEntity): void {
    this.options.existingAds.push(entity);
  }

  /**
   * Clear all existing entities (useful for test reset)
   */
  clearExistingEntities(): void {
    this.options.existingCampaigns = [];
    this.options.existingAdGroups = [];
    this.options.existingAds = [];
  }
}
