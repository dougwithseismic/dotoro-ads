/**
 * Integration Tests: Campaign Set Sync Flow
 *
 * Tests the complete flow from the /sync endpoint through the job queue
 * to the sync service. These tests verify:
 *
 * 1. Endpoint validation and job queuing
 * 2. Job handler execution with mocked dependencies
 * 3. Status updates throughout the sync process
 * 4. Error handling and recovery
 * 5. Event emission for SSE streaming
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { SyncCampaignSetJob } from "../../jobs/types.js";
import { jobEvents, type SyncProgressEvent } from "../../jobs/events.js";

// ============================================================================
// Mock Setup - All mocks hoisted
// ============================================================================

const mockCampaignSetId = "660e8400-e29b-41d4-a716-446655440000";
const mockUserId = "330e8400-e29b-41d4-a716-446655440000";
const mockAdAccountId = "880e8400-e29b-41d4-a716-446655440000";

// Use vi.hoisted to create all mocks at module level
const {
  mockCircuitBreaker,
  mockGetCircuitBreaker,
  mockSyncCampaignSet,
  mockGetValidTokens,
  mockRepository,
  mockAdAccountLookup,
} = vi.hoisted(() => {
  const mockCircuitBreaker = {
    canExecute: vi.fn().mockReturnValue(true),
    recordSuccess: vi.fn(),
    recordFailure: vi.fn(),
    getState: vi.fn().mockReturnValue("closed"),
    getName: vi.fn().mockReturnValue("reddit"),
  };

  const mockSyncCampaignSet = vi.fn();
  const mockGetValidTokens = vi.fn();
  const mockAdAccountLookup = vi.fn();

  const mockRepository = {
    getCampaignSetWithRelations: vi.fn(),
    getCampaignById: vi.fn(),
    updateCampaignSetStatus: vi.fn().mockResolvedValue(undefined),
    updateCampaignSyncStatus: vi.fn().mockResolvedValue(undefined),
    updateCampaignPlatformId: vi.fn().mockResolvedValue(undefined),
    updateAdGroupPlatformId: vi.fn().mockResolvedValue(undefined),
    updateAdPlatformId: vi.fn().mockResolvedValue(undefined),
    updateKeywordPlatformId: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockCircuitBreaker,
    mockGetCircuitBreaker: vi.fn().mockReturnValue(mockCircuitBreaker),
    mockSyncCampaignSet,
    mockGetValidTokens,
    mockRepository,
    mockAdAccountLookup,
  };
});

// Apply all mocks
vi.mock("@repo/core/campaign-set", () => ({
  DefaultCampaignSetSyncService: vi.fn().mockImplementation(() => ({
    syncCampaignSet: mockSyncCampaignSet,
  })),
  RedditAdsAdapter: vi.fn().mockImplementation(() => ({})),
  getCircuitBreaker: mockGetCircuitBreaker,
}));

vi.mock("../../services/reddit/oauth.js", () => ({
  getRedditOAuthService: () => ({
    getValidTokens: mockGetValidTokens,
  }),
}));

vi.mock("../../repositories/campaign-set-repository.js", () => ({
  DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => mockRepository),
}));

vi.mock("@repo/reddit-ads", () => ({
  RedditApiClient: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockAdAccountLookup,
        }),
      }),
    }),
  },
  adAccounts: {},
}));

// Import after mocking
import {
  createSyncCampaignSetHandler,
  createSyncCampaignSetHandlerWithEvents,
} from "../../jobs/handlers/sync-campaign-set.js";

// ============================================================================
// Test Data Factories
// ============================================================================

function createMockCampaignSet(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: mockCampaignSetId,
    userId: mockUserId,
    name: "Test Campaign Set",
    description: null,
    dataSourceId: "ds-1",
    templateId: null,
    config: {
      dataSourceId: "ds-1",
      availableColumns: ["product", "price"],
      selectedPlatforms: ["reddit"],
      selectedAdTypes: { reddit: ["link"] },
      campaignConfig: { namePattern: "{product}-campaign" },
      hierarchyConfig: { adGroups: [] },
      generatedAt: now.toISOString(),
      rowCount: 10,
      campaignCount: 5,
      adAccountId: mockAdAccountId,
      fundingInstrumentId: "funding-123",
    },
    status: "pending",
    syncStatus: "pending",
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
    campaigns: [],
    ...overrides,
  };
}

function createMockCampaign(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return {
    id: "campaign-1",
    campaignSetId: mockCampaignSetId,
    name: "Test Campaign",
    platform: "reddit",
    orderIndex: 0,
    status: "pending",
    syncStatus: "pending",
    adGroups: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createSyncJobData(overrides: Partial<SyncCampaignSetJob> = {}): SyncCampaignSetJob {
  return {
    campaignSetId: mockCampaignSetId,
    userId: mockUserId,
    adAccountId: mockAdAccountId,
    fundingInstrumentId: "funding-123",
    platform: "reddit",
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Campaign Set Sync Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobEvents.removeAllListeners();
    mockCircuitBreaker.canExecute.mockReturnValue(true);
    mockCircuitBreaker.getState.mockReturnValue("closed");
  });

  afterEach(() => {
    jobEvents.removeAllListeners();
  });

  describe("Happy Path - Successful Sync", () => {
    it("should complete full sync flow successfully", async () => {
      // Arrange
      const campaignSet = createMockCampaignSet({
        campaigns: [createMockCampaign()],
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockRepository.getCampaignSetWithRelations.mockResolvedValue(campaignSet);
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 1,
        failed: 0,
        skipped: 0,
        errors: [],
        campaigns: [
          {
            campaignId: "campaign-1",
            success: true,
            platformCampaignId: "reddit_campaign_123",
          },
        ],
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.synced).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it("should emit correct events throughout sync process", async () => {
      // Arrange
      const events: SyncProgressEvent[] = [];
      const jobId = "test-job-123";

      jobEvents.on(`sync:${jobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 3,
        failed: 0,
        skipped: 1,
        errors: [],
      });

      // Act
      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(createSyncJobData(), jobId);

      // Assert
      expect(events.length).toBeGreaterThanOrEqual(2); // At least progress and completed

      const progressEvent = events.find((e) => e.type === "progress");
      expect(progressEvent).toBeDefined();
      expect(progressEvent?.campaignSetId).toBe(mockCampaignSetId);

      const completedEvent = events.find((e) => e.type === "completed");
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data.synced).toBe(3);
      expect(completedEvent?.data.total).toBe(4); // 3 + 0 + 1
    });

    it("should emit done event when sync completes", async () => {
      // Arrange
      const jobId = "test-job-456";
      const doneReceived = vi.fn();
      jobEvents.on(`sync:${jobId}:done`, doneReceived);

      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      // Act
      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(createSyncJobData(), jobId);

      // Assert
      expect(doneReceived).toHaveBeenCalledTimes(1);
    });
  });

  describe("Partial Failure Scenarios", () => {
    it("should handle partial sync failure (some campaigns fail)", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: false,
        setId: mockCampaignSetId,
        synced: 3,
        failed: 2,
        skipped: 0,
        errors: [
          { campaignId: "campaign-1", code: "API_ERROR", message: "Rate limit" },
          { campaignId: "campaign-2", code: "VALIDATION_ERROR", message: "Invalid targeting" },
        ],
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.synced).toBe(3);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      // Circuit breaker should record success because some campaigns succeeded
      expect(mockCircuitBreaker.recordSuccess).toHaveBeenCalled();
    });

    it("should record circuit breaker failure when all campaigns fail", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: false,
        setId: mockCampaignSetId,
        synced: 0,
        failed: 5,
        skipped: 0,
        errors: [
          { campaignId: "campaign-1", code: "API_ERROR", message: "Error" },
        ],
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      await handler(createSyncJobData());

      // Assert
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
      expect(mockCircuitBreaker.recordSuccess).not.toHaveBeenCalled();
    });

    it("should emit error event with details on partial failure", async () => {
      // Arrange
      const events: SyncProgressEvent[] = [];
      const jobId = "partial-fail-job";

      jobEvents.on(`sync:${jobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: false,
        setId: mockCampaignSetId,
        synced: 2,
        failed: 3,
        skipped: 0,
        errors: [
          { campaignId: "campaign-1", code: "API_ERROR", message: "Rate limit" },
        ],
      });

      // Act
      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(createSyncJobData(), jobId);

      // Assert
      const completedEvent = events.find((e) => e.type === "completed");
      expect(completedEvent).toBeDefined();
      expect(completedEvent?.data.failed).toBe(3);
    });
  });

  describe("Authentication and Authorization Errors", () => {
    it("should throw error when ad account is not found", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([]);

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow(
        "Invalid or unauthorized ad account"
      );
    });

    it("should throw error when OAuth tokens are expired/missing", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue(null);

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow("OAuth");
    });

    it("should emit error event on authentication failure", async () => {
      // Arrange
      const events: SyncProgressEvent[] = [];
      const jobId = "auth-fail-job";

      jobEvents.on(`sync:${jobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue(null);

      // Act
      const handler = createSyncCampaignSetHandlerWithEvents();
      await expect(handler(createSyncJobData(), jobId)).rejects.toThrow();

      // Assert
      const errorEvent = events.find((e) => e.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent?.data.error).toContain("OAuth");
    });
  });

  describe("Circuit Breaker Integration", () => {
    it("should reject sync when circuit breaker is open", async () => {
      // Arrange
      mockCircuitBreaker.canExecute.mockReturnValue(false);
      mockCircuitBreaker.getState.mockReturnValue("open");

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow(
        "Circuit breaker open"
      );
    });

    it("should record failure when sync service throws", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockRejectedValue(new Error("Network timeout"));

      // Act
      const handler = createSyncCampaignSetHandler();
      await expect(handler(createSyncJobData())).rejects.toThrow("Network timeout");

      // Assert
      expect(mockCircuitBreaker.recordFailure).toHaveBeenCalled();
    });
  });

  describe("Platform Support", () => {
    it("should reject unsupported platforms", async () => {
      // Arrange
      const unsupportedJob = createSyncJobData({ platform: "facebook" });

      // Act & Assert
      const handler = createSyncCampaignSetHandler();
      await expect(handler(unsupportedJob)).rejects.toThrow("Unsupported platform");
    });

    it("should accept reddit platform", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      const redditJob = createSyncJobData({ platform: "reddit" });

      // Act
      const handler = createSyncCampaignSetHandler();
      const result = await handler(redditJob);

      // Assert
      expect(result.synced).toBe(1);
    });
  });

  describe("Event Timestamp Validation", () => {
    it("should include valid ISO timestamps in all events", async () => {
      // Arrange
      const events: SyncProgressEvent[] = [];
      const jobId = "timestamp-test-job";

      jobEvents.on(`sync:${jobId}`, (event: SyncProgressEvent) => {
        events.push(event);
      });

      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockResolvedValue({
        success: true,
        setId: mockCampaignSetId,
        synced: 1,
        failed: 0,
        skipped: 0,
        errors: [],
      });

      // Act
      const handler = createSyncCampaignSetHandlerWithEvents();
      await handler(createSyncJobData(), jobId);

      // Assert
      expect(events.length).toBeGreaterThan(0);
      for (const event of events) {
        expect(event.timestamp).toBeDefined();
        // Verify it's a valid ISO date string
        const parsed = new Date(event.timestamp);
        expect(parsed.toISOString()).toBe(event.timestamp);
      }
    });
  });

  describe("Error Recovery Scenarios", () => {
    it("should continue processing after individual campaign failure", async () => {
      // Arrange
      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      // Simulate sync service returning partial success
      mockSyncCampaignSet.mockResolvedValue({
        success: false,
        setId: mockCampaignSetId,
        synced: 8,
        failed: 2,
        skipped: 0,
        errors: [
          { campaignId: "campaign-3", code: "API_ERROR", message: "Timeout" },
          { campaignId: "campaign-7", code: "VALIDATION_ERROR", message: "Invalid" },
        ],
      });

      // Act
      const handler = createSyncCampaignSetHandler();
      const result = await handler(createSyncJobData());

      // Assert
      expect(result.synced).toBe(8);
      expect(result.failed).toBe(2);
      // Should not throw - partial success is acceptable
    });

    it("should emit done event even on complete failure", async () => {
      // Arrange
      const jobId = "complete-fail-job";
      const doneReceived = vi.fn();
      jobEvents.on(`sync:${jobId}:done`, doneReceived);

      mockAdAccountLookup.mockResolvedValue([
        { id: mockAdAccountId, userId: mockUserId },
      ]);
      mockGetValidTokens.mockResolvedValue({
        accessToken: "valid-token",
        refreshToken: "refresh-token",
        expiresAt: new Date(Date.now() + 3600000),
      });
      mockSyncCampaignSet.mockRejectedValue(new Error("Complete failure"));

      // Act
      const handler = createSyncCampaignSetHandlerWithEvents();
      await expect(handler(createSyncJobData(), jobId)).rejects.toThrow();

      // Assert - done event should still be emitted for cleanup
      expect(doneReceived).toHaveBeenCalledTimes(1);
    });
  });
});
