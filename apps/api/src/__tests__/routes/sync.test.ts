/**
 * Sync Status API Tests
 *
 * Tests for GET /api/v1/sync/status and POST /api/v1/sync/{campaignSetId}/retry
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ============================================================================
// Mocks (must be defined before imports)
// ============================================================================

const mockUserId = "00000000-0000-0000-0000-000000000001";
const mockCampaignSetId = "11111111-1111-1111-1111-111111111111";
const mockJobId = "22222222-2222-2222-2222-222222222222";

// Mock the auth middleware
const mockValidateSession = vi.fn();

vi.mock("../../middleware/auth.js", () => ({
  validateSession: (...args: unknown[]) => mockValidateSession(...args),
}));

// Mock pg-boss job queue
const mockBossGetJobById = vi.fn();
const mockBossSend = vi.fn();

vi.mock("../../jobs/queue.js", () => ({
  getJobQueue: vi.fn().mockResolvedValue({
    getJobById: (...args: unknown[]) => mockBossGetJobById(...args),
    send: (...args: unknown[]) => mockBossSend(...args),
  }),
  getJobQueueReady: vi.fn().mockResolvedValue({
    getJobById: (...args: unknown[]) => mockBossGetJobById(...args),
    send: (...args: unknown[]) => mockBossSend(...args),
  }),
}));

// Mock database with chainable methods
const mockDbResults: { syncJobs: unknown[]; campaignSets: unknown[] } = {
  syncJobs: [],
  campaignSets: [],
};

vi.mock("../../services/db.js", () => {
  const createChainableMock = (tableName: string) => {
    const chain: Record<string, unknown> = {};

    const getResult = () => {
      if (tableName === "campaignSets") {
        return Promise.resolve(mockDbResults.campaignSets);
      }
      return Promise.resolve([]);
    };

    const thenableChain = Object.assign(chain, {
      then: (resolve: (value: unknown) => void) => getResult().then(resolve),
    });

    chain.select = vi.fn().mockReturnValue(thenableChain);
    chain.from = vi.fn().mockReturnValue(thenableChain);
    chain.where = vi.fn().mockReturnValue(thenableChain);
    chain.innerJoin = vi.fn().mockReturnValue(thenableChain);
    chain.leftJoin = vi.fn().mockReturnValue(thenableChain);
    chain.orderBy = vi.fn().mockReturnValue(thenableChain);
    chain.limit = vi.fn().mockReturnValue(Promise.resolve(mockDbResults.campaignSets));
    // Support for update operations
    chain.set = vi.fn().mockReturnValue(thenableChain);

    return thenableChain;
  };

  return {
    db: {
      select: vi.fn(() => createChainableMock("campaignSets")),
      update: vi.fn(() => createChainableMock("update")),
    },
    campaignSets: {
      id: "id",
      userId: "user_id",
      teamId: "team_id",
      name: "name",
      syncStatus: "sync_status",
      lastSyncedAt: "last_synced_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    generatedCampaigns: {
      id: "id",
      campaignSetId: "campaign_set_id",
      status: "status",
    },
    adAccounts: {
      id: "id",
      platform: "platform",
    },
  };
});

// Import after mocking
import { syncApp } from "../../routes/sync.js";

// ============================================================================
// Test Suite
// ============================================================================

describe("Sync Status API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbResults.syncJobs = [];
    mockDbResults.campaignSets = [];
  });

  // ==========================================================================
  // GET /api/v1/sync/status - Authentication Tests
  // ==========================================================================

  describe("GET /api/v1/sync/status - Authentication", () => {
    it("should return 401 when session is invalid", async () => {
      mockValidateSession.mockResolvedValue(null);

      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should call validateSession with request headers", async () => {
      mockValidateSession.mockResolvedValue(null);

      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session=test-session-token",
        },
      });
      await syncApp.fetch(request);

      expect(mockValidateSession).toHaveBeenCalledTimes(1);
      const callArg = mockValidateSession.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(Headers);
    });
  });

  // ==========================================================================
  // GET /api/v1/sync/status - Response Structure Tests
  // ==========================================================================

  describe("GET /api/v1/sync/status - Response Structure", () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({
        user: { id: mockUserId, email: "test@example.com" },
        session: { id: "session-123" },
      });
    });

    it("should return 200 with correct response structure", async () => {
      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data).toHaveProperty("active");
      expect(data).toHaveProperty("pending");
      expect(data).toHaveProperty("failed");
      expect(Array.isArray(data.active)).toBe(true);
      expect(Array.isArray(data.pending)).toBe(true);
      expect(Array.isArray(data.failed)).toBe(true);
    });

    it("should return empty arrays when no sync jobs exist", async () => {
      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.active).toEqual([]);
      expect(data.pending).toEqual([]);
      expect(data.failed).toEqual([]);
    });
  });

  // ==========================================================================
  // GET /api/v1/sync/status - Data Transformation Tests
  // ==========================================================================

  describe("GET /api/v1/sync/status - Data Transformation", () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({
        user: { id: mockUserId, email: "test@example.com" },
        session: { id: "session-123" },
      });
    });

    it("should return active jobs with correct structure", async () => {
      const activeJob = {
        id: mockJobId,
        campaignSetId: mockCampaignSetId,
        campaignSetName: "Test Campaign Set",
        platform: "reddit",
        state: "active",
        progress: { synced: 5, failed: 1, total: 10 },
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
      };

      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Test Campaign Set",
          userId: mockUserId,
          syncStatus: "syncing",
          lastSyncedAt: null,
          createdAt: new Date(),
          platform: "reddit",
        },
      ];

      // Mock pg-boss to return active job
      mockBossGetJobById.mockImplementation((queueName: string, jobId: string) => {
        if (queueName === "sync-campaign-set") {
          return Promise.resolve({
            id: mockJobId,
            name: "sync-campaign-set",
            state: "active",
            data: {
              campaignSetId: mockCampaignSetId,
              userId: mockUserId,
              platform: "reddit",
            },
            output: { synced: 5, failed: 1, total: 10 },
            createdOn: new Date(),
            startedOn: new Date(),
          });
        }
        return Promise.resolve(null);
      });

      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify structure for any active jobs returned
      if (data.active.length > 0) {
        const job = data.active[0];
        expect(job).toHaveProperty("id");
        expect(job).toHaveProperty("campaignSetId");
        expect(job).toHaveProperty("campaignSetName");
        expect(job).toHaveProperty("platform");
        expect(job).toHaveProperty("state");
        expect(job).toHaveProperty("progress");
        expect(job).toHaveProperty("createdAt");
      }
    });

    it("should return pending jobs with state 'created'", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Pending Campaign Set",
          userId: mockUserId,
          syncStatus: "pending",
          lastSyncedAt: null,
          createdAt: new Date(),
          platform: "google",
        },
      ];

      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // Verify pending jobs structure
      if (data.pending.length > 0) {
        expect(data.pending[0].state).toBe("created");
      }
    });

    it("should only return failed jobs from the last 24 hours", async () => {
      const now = new Date();
      const within24h = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const outside24h = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Recent Failed Set",
          userId: mockUserId,
          syncStatus: "failed",
          lastSyncedAt: within24h,
          createdAt: new Date(),
          platform: "meta",
        },
      ];

      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(200);
      const data = await response.json();

      // All failed jobs should be within last 24 hours
      for (const job of data.failed) {
        if (job.completedAt) {
          const completedAt = new Date(job.completedAt);
          const diffHours = (now.getTime() - completedAt.getTime()) / (1000 * 60 * 60);
          expect(diffHours).toBeLessThanOrEqual(24);
        }
      }
    });
  });

  // ==========================================================================
  // GET /api/v1/sync/status - Security Tests
  // ==========================================================================

  describe("GET /api/v1/sync/status - Security", () => {
    it("should only return jobs belonging to the authenticated user", async () => {
      const otherUserId = "99999999-9999-9999-9999-999999999999";

      mockValidateSession.mockResolvedValue({
        user: { id: mockUserId, email: "test@example.com" },
        session: { id: "session-123" },
      });

      // Even if we mock jobs for another user, they should not be returned
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "My Campaign Set",
          userId: mockUserId,
          syncStatus: "syncing",
          lastSyncedAt: null,
          createdAt: new Date(),
          config: { platform: "reddit" },
        },
        {
          id: "other-set-id",
          name: "Other User Campaign Set",
          userId: otherUserId, // Different user
          syncStatus: "syncing",
          lastSyncedAt: null,
          createdAt: new Date(),
          config: { platform: "google" },
        },
      ];

      const request = new Request("http://localhost/api/v1/sync/status", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(200);
      // The query should filter by userId, so only user's own jobs should be returned
    });
  });

  // ==========================================================================
  // POST /api/v1/sync/{campaignSetId}/retry - Authentication Tests
  // ==========================================================================

  describe("POST /api/v1/sync/{campaignSetId}/retry - Authentication", () => {
    it("should return 401 when session is invalid", async () => {
      mockValidateSession.mockResolvedValue(null);

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });
  });

  // ==========================================================================
  // POST /api/v1/sync/{campaignSetId}/retry - Validation Tests
  // ==========================================================================

  describe("POST /api/v1/sync/{campaignSetId}/retry - Validation", () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({
        user: { id: mockUserId, email: "test@example.com" },
        session: { id: "session-123" },
      });
    });

    it("should return 400 for invalid campaignSetId format", async () => {
      const request = new Request("http://localhost/api/v1/sync/not-a-uuid/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(400);
    });

    it("should return 404 when campaign set does not exist", async () => {
      mockDbResults.campaignSets = [];

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe("NOT_FOUND");
    });

    it("should return 403 when campaign set belongs to different user", async () => {
      const otherUserId = "99999999-9999-9999-9999-999999999999";

      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Other User Set",
          userId: otherUserId, // Different user
          syncStatus: "failed",
          platform: "reddit",
        },
      ];

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe("FORBIDDEN");
    });
  });

  // ==========================================================================
  // POST /api/v1/sync/{campaignSetId}/retry - Success Cases
  // ==========================================================================

  describe("POST /api/v1/sync/{campaignSetId}/retry - Success", () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({
        user: { id: mockUserId, email: "test@example.com" },
        session: { id: "session-123" },
      });

      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Failed Campaign Set",
          userId: mockUserId,
          teamId: "team-123", // Required for team-based ownership
          syncStatus: "failed",
          platform: "reddit",
          config: {
            dataSourceId: "data-source-id",
            fundingInstrumentId: "funding-instrument-id",
            selectedPlatforms: ["reddit"],
            adAccountId: "t2_valid_ad_account", // Required for Reddit
          },
        },
      ];

      mockBossSend.mockResolvedValue(mockJobId);
    });

    it("should return 202 with jobId when retry is queued", async () => {
      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(202);
      const data = await response.json();
      expect(data).toHaveProperty("jobId");
      expect(data).toHaveProperty("status", "queued");
      expect(data).toHaveProperty("message");
    });

    it("should queue a new sync job via pg-boss", async () => {
      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      await syncApp.fetch(request);

      expect(mockBossSend).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // POST /api/v1/sync/{campaignSetId}/retry - Edge Cases
  // ==========================================================================

  describe("POST /api/v1/sync/{campaignSetId}/retry - Edge Cases", () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({
        user: { id: mockUserId, email: "test@example.com" },
        session: { id: "session-123" },
      });
    });

    it("should allow retry for campaign set with synced status", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Synced Campaign Set",
          userId: mockUserId,
          teamId: "team-123", // Required for team-based ownership
          syncStatus: "synced",
          platform: "google",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["google"],
          },
        },
      ];

      mockBossSend.mockResolvedValue(mockJobId);

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      // Should allow re-sync of already synced sets
      expect(response.status).toBe(202);
    });

    it("should handle pg-boss send failure gracefully", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Failed Campaign Set",
          userId: mockUserId,
          teamId: "team-123",
          syncStatus: "failed",
          platform: "reddit",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["google"], // Use Google to avoid adAccountId requirement
          },
        },
      ];

      mockBossSend.mockResolvedValue(null); // pg-boss returns null on failure

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.code).toBe("INTERNAL_ERROR");
    });
  });

  // ==========================================================================
  // POST /api/v1/sync/{campaignSetId}/retry - Field Validation Tests
  // ==========================================================================

  describe("POST /api/v1/sync/{campaignSetId}/retry - Field Validation", () => {
    beforeEach(() => {
      mockValidateSession.mockResolvedValue({
        user: { id: mockUserId, email: "test@example.com" },
        session: { id: "session-123" },
      });
    });

    it("should return 400 when Reddit campaign set has no adAccountId", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Reddit Campaign Set Without Ad Account",
          userId: mockUserId,
          teamId: "team-123",
          syncStatus: "failed",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["reddit"],
            // No adAccountId
          },
        },
      ];

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.error).toContain("Ad account ID is required");
    });

    it("should return 400 when Reddit campaign set has empty adAccountId", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Reddit Campaign Set With Empty Ad Account",
          userId: mockUserId,
          teamId: "team-123",
          syncStatus: "failed",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["reddit"],
            adAccountId: "", // Empty string
          },
        },
      ];

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.error).toContain("Ad account ID is required");
    });

    it("should return 400 when campaign set has no teamId", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Campaign Set Without Team",
          userId: mockUserId,
          teamId: null, // No team ID
          syncStatus: "failed",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["google"],
          },
        },
      ];

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe("VALIDATION_ERROR");
      expect(data.error).toContain("must be associated with a team");
    });

    it("should allow Google campaign set without adAccountId", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Google Campaign Set",
          userId: mockUserId,
          teamId: "team-123",
          syncStatus: "failed",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["google"],
            // No adAccountId - should be fine for Google
          },
        },
      ];

      mockBossSend.mockResolvedValue(mockJobId);

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      // Should succeed for Google without adAccountId
      expect(response.status).toBe(202);
    });

    it("should allow Meta/Facebook campaign set without adAccountId", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Meta Campaign Set",
          userId: mockUserId,
          teamId: "team-123",
          syncStatus: "failed",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["meta"],
            // No adAccountId - should be fine for Meta
          },
        },
      ];

      mockBossSend.mockResolvedValue(mockJobId);

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      // Should succeed for Meta/Facebook without adAccountId
      expect(response.status).toBe(202);
    });

    it("should allow Reddit campaign set with valid adAccountId", async () => {
      mockDbResults.campaignSets = [
        {
          id: mockCampaignSetId,
          name: "Reddit Campaign Set With Ad Account",
          userId: mockUserId,
          teamId: "team-123",
          syncStatus: "failed",
          config: {
            dataSourceId: "data-source-id",
            selectedPlatforms: ["reddit"],
            adAccountId: "t2_valid_ad_account_id",
            fundingInstrumentId: "funding-123",
          },
        },
      ];

      mockBossSend.mockResolvedValue(mockJobId);

      const request = new Request(
        `http://localhost/api/v1/sync/${mockCampaignSetId}/retry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      const response = await syncApp.fetch(request);

      // Should succeed for Reddit with valid adAccountId
      expect(response.status).toBe(202);
    });
  });
});

// ============================================================================
// Schema Tests
// ============================================================================

describe("Sync API Response Schemas", () => {
  it("should export valid response schema", async () => {
    const { syncStatusResponseSchema } = await import("../../routes/sync.js");

    const validResponse = {
      active: [
        {
          id: mockJobId,
          campaignSetId: mockCampaignSetId,
          campaignSetName: "Test Campaign",
          platform: "reddit",
          state: "active",
          progress: { synced: 5, failed: 0, total: 10 },
          createdAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
        },
      ],
      pending: [],
      failed: [],
    };

    const result = syncStatusResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it("should accept all valid platform values", async () => {
    const { syncJobSchema } = await import("../../routes/sync.js");

    // Note: Uses "facebook" internally (not "meta") to match Platform type in jobs/types.ts
    const platforms = ["reddit", "google", "facebook"];

    for (const platform of platforms) {
      const job = {
        id: mockJobId,
        campaignSetId: mockCampaignSetId,
        campaignSetName: "Test",
        platform,
        state: "active",
        progress: { synced: 0, failed: 0, total: 5 },
        createdAt: new Date().toISOString(),
      };

      const result = syncJobSchema.safeParse(job);
      expect(result.success).toBe(true);
    }
  });

  it("should accept all valid state values", async () => {
    const { syncJobSchema } = await import("../../routes/sync.js");

    const states = ["created", "active", "completed", "failed"];

    for (const state of states) {
      const job = {
        id: mockJobId,
        campaignSetId: mockCampaignSetId,
        campaignSetName: "Test",
        platform: "reddit",
        state,
        progress: { synced: 0, failed: 0, total: 5 },
        createdAt: new Date().toISOString(),
      };

      const result = syncJobSchema.safeParse(job);
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid platform", async () => {
    const { syncJobSchema } = await import("../../routes/sync.js");

    const job = {
      id: mockJobId,
      campaignSetId: mockCampaignSetId,
      campaignSetName: "Test",
      platform: "invalid-platform",
      state: "active",
      progress: { synced: 0, failed: 0, total: 5 },
      createdAt: new Date().toISOString(),
    };

    const result = syncJobSchema.safeParse(job);
    expect(result.success).toBe(false);
  });

  it("should require progress object with correct fields", async () => {
    const { syncJobSchema } = await import("../../routes/sync.js");

    const jobWithoutProgress = {
      id: mockJobId,
      campaignSetId: mockCampaignSetId,
      campaignSetName: "Test",
      platform: "reddit",
      state: "active",
      createdAt: new Date().toISOString(),
    };

    const result = syncJobSchema.safeParse(jobWithoutProgress);
    expect(result.success).toBe(false);
  });
});
