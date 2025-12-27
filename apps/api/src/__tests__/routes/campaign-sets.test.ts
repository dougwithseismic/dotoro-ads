import { describe, it, expect, beforeEach, vi, Mock, afterEach } from "vitest";
import { testClient } from "hono/testing";

const mockCampaignSetId = "660e8400-e29b-41d4-a716-446655440000";
const mockCampaignId = "770e8400-e29b-41d4-a716-446655440001";
const mockCampaignId2 = "770e8400-e29b-41d4-a716-446655440002";
const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
const mockTemplateId = "440e8400-e29b-41d4-a716-446655440000";
const mockUserId = "330e8400-e29b-41d4-a716-446655440000";
const mockAdAccountId = "880e8400-e29b-41d4-a716-446655440000";

// Mock the database module
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      query: {
        campaignSets: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        generatedCampaigns: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        adAccounts: {
          findFirst: vi.fn(),
          findMany: vi.fn(),
        },
        syncRecords: {
          findFirst: vi.fn(),
        },
      },
    },
    campaignSets: {
      id: "id",
      userId: "user_id",
      name: "name",
      status: "status",
      syncStatus: "sync_status",
      createdAt: "created_at",
    },
    generatedCampaigns: {
      id: "id",
      campaignSetId: "campaign_set_id",
      status: "status",
      orderIndex: "order_index",
    },
    adAccounts: {
      id: "id",
      userId: "user_id",
      platform: "platform",
      accountId: "account_id",
      status: "status",
    },
    adGroups: { id: "id", campaignId: "campaign_id" },
    ads: { id: "id", adGroupId: "ad_group_id" },
    keywords: { id: "id", adGroupId: "ad_group_id" },
    syncRecords: { id: "id", generatedCampaignId: "generated_campaign_id" },
    oauthTokens: { id: "id", adAccountId: "ad_account_id" },
  };
});

// Mock RedditOAuthService
vi.mock("../../services/reddit/oauth.js", () => {
  const mockGetValidTokens = vi.fn();
  return {
    getRedditOAuthService: vi.fn(() => ({
      getValidTokens: mockGetValidTokens,
    })),
    RedditOAuthService: vi.fn(() => ({
      getValidTokens: mockGetValidTokens,
    })),
    mockGetValidTokens,
  };
});

// Mock the sync service
vi.mock("@repo/core/campaign-set", async (importOriginal) => {
  const actual = (await importOriginal()) as object;
  return {
    ...actual,
    DefaultCampaignSetSyncService: vi.fn().mockImplementation(() => ({
      syncCampaignSet: vi.fn(),
    })),
  };
});

// Mock the repository
vi.mock("../../repositories/campaign-set-repository.js", () => {
  return {
    DrizzleCampaignSetRepository: vi.fn().mockImplementation(() => ({
      getCampaignSetWithRelations: vi.fn(),
      getCampaignById: vi.fn(),
      updateCampaignSetStatus: vi.fn(),
      updateCampaignSyncStatus: vi.fn(),
      updateCampaignPlatformId: vi.fn(),
      updateAdGroupPlatformId: vi.fn(),
      updateAdPlatformId: vi.fn(),
      updateKeywordPlatformId: vi.fn(),
    })),
  };
});

// Mock the job queue
vi.mock("../../jobs/queue.js", () => {
  const mockSend = vi.fn().mockResolvedValue("job-id-123");
  const mockGetJobById = vi.fn().mockResolvedValue(null);
  const mockBoss = {
    send: mockSend,
    getJobById: mockGetJobById,
    work: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getJobQueue: vi.fn().mockResolvedValue(mockBoss),
    getJobQueueReady: vi.fn().mockResolvedValue(mockBoss),
    stopJobQueue: vi.fn().mockResolvedValue(undefined),
    resetJobQueue: vi.fn(),
    __mockSend: mockSend,
    __mockGetJobById: mockGetJobById,
  };
});

// Mock the sync job handler
vi.mock("../../jobs/handlers/sync-campaign-set.js", () => {
  return {
    SYNC_CAMPAIGN_SET_JOB: "sync-campaign-set",
    createSyncCampaignSetHandler: vi.fn(),
    registerSyncCampaignSetHandler: vi.fn(),
  };
});

// Import after mocking
import { campaignSetsApp } from "../../routes/campaign-sets.js";
import { db } from "../../services/db.js";

// Get mock reference for job queue
const queueModule = await vi.importMock<{
  __mockSend: ReturnType<typeof vi.fn>;
  __mockGetJobById: ReturnType<typeof vi.fn>;
}>("../../jobs/queue.js");
const mockJobQueueSend = queueModule.__mockSend;
const mockGetJobById = queueModule.__mockGetJobById;

// Helper to make direct requests to the app
async function makeRequest(
  method: string,
  path: string,
  body?: unknown,
  options: { includeUserId?: boolean } = { includeUserId: true }
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  // Include user ID header by default (required for authorization)
  if (options.includeUserId !== false) {
    headers["x-user-id"] = mockUserId;
  }

  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return campaignSetsApp.fetch(request);
}

// Sample campaign set config (matches database schema)
const sampleConfig = {
  dataSourceId: mockDataSourceId,
  availableColumns: ["product", "price", "description"],
  selectedPlatforms: ["google"],
  selectedAdTypes: { google: ["search"] },
  campaignConfig: { namePattern: "{product}-campaign" },
  hierarchyConfig: {
    adGroups: [
      {
        namePattern: "{product}-adgroup",
        ads: [
          {
            headline: "{product}",
            description: "Buy {product} now!",
          },
        ],
      },
    ],
  },
  generatedAt: new Date().toISOString(),
  rowCount: 10,
  campaignCount: 5,
};

// Mock campaign set data factory
function createMockCampaignSet(overrides: Partial<any> = {}) {
  return {
    id: mockCampaignSetId,
    userId: mockUserId,
    name: "Test Campaign Set",
    description: null,
    dataSourceId: mockDataSourceId,
    templateId: null,
    config: {
      ...sampleConfig,
      selectedPlatforms: ["reddit"],
      adAccountId: mockAdAccountId,
    },
    status: "draft",
    syncStatus: "pending",
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// Mock campaign data factory
function createMockCampaign(overrides: Partial<any> = {}) {
  return {
    id: mockCampaignId,
    campaignSetId: mockCampaignSetId,
    templateId: mockTemplateId,
    dataRowId: "row-1",
    campaignData: {
      name: "Test Campaign",
      platform: "reddit",
    },
    status: "pending",
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Campaign Sets API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // Authorization Tests
  // ============================================================================

  describe("Authorization - x-user-id header", () => {
    it("should return 401 for missing x-user-id header on list", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets",
        undefined,
        { includeUserId: false }
      );

      expect(response.status).toBe(401);
    });

    it("should return 401 for missing x-user-id header on create", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/campaign-sets",
        { name: "Test", config: sampleConfig },
        { includeUserId: false }
      );

      expect(response.status).toBe(401);
    });

    it("should return 401 for missing x-user-id header on get", async () => {
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}`,
        undefined,
        { includeUserId: false }
      );

      expect(response.status).toBe(401);
    });

    it("should return 401 for missing x-user-id header on delete", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/campaign-sets/${mockCampaignSetId}`,
        undefined,
        { includeUserId: false }
      );

      expect(response.status).toBe(401);
    });
  });

  // ============================================================================
  // Validation Tests (no database dependency)
  // ============================================================================

  describe("POST /api/v1/campaign-sets - validation", () => {
    it("should return 400 for missing name", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        config: sampleConfig,
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for empty name", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "",
        config: sampleConfig,
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for name exceeding max length", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "A".repeat(256),
        config: sampleConfig,
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing config", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Test Campaign Set",
      });

      expect(response.status).toBe(400);
    });

    it("should accept any platform string in config (database uses string[])", async () => {
      // The database schema uses string[] for selectedPlatforms,
      // so any string is valid. Platform validation happens at business logic level.
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Test Campaign Set",
        config: {
          ...sampleConfig,
          selectedPlatforms: ["any_platform"],
        },
      });

      // Should pass validation but fail at db layer (mocked)
      expect([500]).toContain(response.status);
    });

    it("should return 400 for invalid status", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Test Campaign Set",
        config: sampleConfig,
        status: "invalid_status",
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid syncStatus", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Test Campaign Set",
        config: sampleConfig,
        syncStatus: "invalid_sync_status",
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid dataSourceId format", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Test Campaign Set",
        config: sampleConfig,
        dataSourceId: "not-a-uuid",
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid templateId format", async () => {
      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Test Campaign Set",
        config: sampleConfig,
        templateId: "not-a-uuid",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/v1/campaign-sets/:setId - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "PUT",
        "/api/v1/campaign-sets/not-a-uuid",
        { name: "Updated Name" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for empty name in update", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/${mockCampaignSetId}`,
        { name: "" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid status in update", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/${mockCampaignSetId}`,
        { status: "not_a_valid_status" }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/campaign-sets/:setId - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets/not-a-uuid"
      );

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/campaign-sets/:setId - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "DELETE",
        "/api/v1/campaign-sets/not-a-uuid"
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/campaign-sets - query validation", () => {
    it("should accept valid status filter", async () => {
      // This will hit the database, but we're testing query parsing
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets?status=draft"
      );

      // Status 500 is expected because db is mocked, but it means validation passed
      expect([200, 500]).toContain(response.status);
    });

    it("should accept valid syncStatus filter", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets?syncStatus=pending"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should accept valid pagination parameters", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets?page=1&limit=20"
      );

      expect([200, 500]).toContain(response.status);
    });

    it("should return 400 for invalid page parameter", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets?page=0"
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for limit exceeding max", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets?limit=101"
      );

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // Generate Action Validation Tests
  // ============================================================================

  describe("POST /api/v1/campaign-sets/:setId/generate - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/campaign-sets/not-a-uuid/generate",
        {}
      );

      expect(response.status).toBe(400);
    });

    it("should accept valid regenerate flag", async () => {
      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        { regenerate: true }
      );

      // 404 or 500 expected because db is mocked, but validation passed
      expect([404, 500]).toContain(response.status);
    });

    it("should accept empty body (regenerate defaults to false)", async () => {
      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        {}
      );

      expect([404, 500]).toContain(response.status);
    });
  });

  // ============================================================================
  // Sync/Pause/Resume Action Validation Tests
  // ============================================================================

  describe("POST /api/v1/campaign-sets/:setId/sync - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/campaign-sets/not-a-uuid/sync",
        {}
      );

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/campaign-sets/:setId/pause - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/campaign-sets/not-a-uuid/pause",
        {}
      );

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/v1/campaign-sets/:setId/resume - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/campaign-sets/not-a-uuid/resume",
        {}
      );

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // Campaigns Within Set Validation Tests
  // ============================================================================

  describe("GET /api/v1/campaign-sets/:setId/campaigns - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets/not-a-uuid/campaigns"
      );

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/campaign-sets/:setId/campaigns/:campaignId - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/not-a-uuid/campaigns/${mockCampaignId}`
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid campaignId format", async () => {
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/campaigns/not-a-uuid`
      );

      expect(response.status).toBe(400);
    });
  });

  describe("PUT /api/v1/campaign-sets/:setId/campaigns/:campaignId - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/not-a-uuid/campaigns/${mockCampaignId}`,
        { name: "Updated" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid campaignId format", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/${mockCampaignSetId}/campaigns/not-a-uuid`,
        { name: "Updated" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid status in update", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/${mockCampaignSetId}/campaigns/${mockCampaignId}`,
        { status: "invalid_status" }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid budget type", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/${mockCampaignSetId}/campaigns/${mockCampaignId}`,
        {
          budget: {
            type: "invalid",
            amount: 100,
            currency: "USD",
          },
        }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for negative budget amount", async () => {
      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/${mockCampaignSetId}/campaigns/${mockCampaignId}`,
        {
          budget: {
            type: "daily",
            amount: -100,
            currency: "USD",
          },
        }
      );

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/v1/campaign-sets/:setId/campaigns/:campaignId - validation", () => {
    it("should return 400 for invalid setId format", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/campaign-sets/not-a-uuid/campaigns/${mockCampaignId}`
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid campaignId format", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/campaign-sets/${mockCampaignSetId}/campaigns/not-a-uuid`
      );

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // Sync Endpoint Tests (Phase 4 - Async Job Queue)
  // ============================================================================

  describe("POST /api/v1/campaign-sets/:setId/sync - async job queue", () => {
    let mockDbSelect: Mock;
    let mockDbFrom: Mock;
    let mockDbWhere: Mock;
    let mockDbLimit: Mock;

    beforeEach(() => {
      // Setup chainable mock for db.select().from().where().limit()
      mockDbLimit = vi.fn().mockResolvedValue([]);
      mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      // Reset job queue mock
      mockJobQueueSend.mockResolvedValue("job-id-123");
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Mock database to return empty array (no campaign set found)
      mockDbLimit.mockResolvedValue([]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain("not found");
    });

    it("should return 202 and queue job on valid sync request", async () => {
      // Mock campaign set exists
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
          fundingInstrumentId: "funding-123",
        },
      });

      // First call returns campaign set, second call returns ad account
      mockDbLimit.mockResolvedValueOnce([mockSet]);
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, userId: mockUserId, platform: "reddit" }]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body.jobId).toBe("job-id-123");
      expect(body.status).toBe("queued");
      expect(body.message).toContain("queued");
    });

    it("should return error for unsupported platform", async () => {
      // Mock campaign set exists with unsupported platform (facebook)
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["facebook"],
          adAccountId: mockAdAccountId,
        },
      });
      mockDbLimit.mockResolvedValue([mockSet]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      // Should return 400 for unsupported platform
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("platform");
    });

    it("should return 400 when fundingInstrumentId is missing", async () => {
      // Mock campaign set exists with Reddit but NO fundingInstrumentId
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
          // fundingInstrumentId is intentionally missing
        },
      });

      // First call returns campaign set, second call returns ad account
      mockDbLimit.mockResolvedValueOnce([mockSet]);
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, userId: mockUserId, platform: "reddit" }]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Funding instrument");
    });

    it("should return 400 when ad account doesn't belong to user", async () => {
      // Mock campaign set exists
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
          fundingInstrumentId: "funding-123",
        },
      });

      // First call returns campaign set, second call returns empty (ad account not found for user)
      mockDbLimit.mockResolvedValueOnce([mockSet]);
      mockDbLimit.mockResolvedValueOnce([]); // No ad account found for this user

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Invalid or unauthorized ad account");
    });

    it("should return 400 when adAccountId is missing", async () => {
      // Mock campaign set exists with Reddit but NO adAccountId
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          // adAccountId is intentionally missing
          fundingInstrumentId: "funding-123",
        },
      });

      mockDbLimit.mockResolvedValueOnce([mockSet]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Ad account ID");
    });

    it("should return 500 when job queue fails", async () => {
      // Mock campaign set exists
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
          fundingInstrumentId: "funding-123",
        },
      });

      // First call returns campaign set, second call returns ad account
      mockDbLimit.mockResolvedValueOnce([mockSet]);
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, userId: mockUserId, platform: "reddit" }]);

      // Mock job queue to return null (failed to queue)
      mockJobQueueSend.mockResolvedValue(null);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it("should use singleton key to prevent duplicate sync jobs for same campaign set", async () => {
      // Mock campaign set exists
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
          fundingInstrumentId: "funding-123",
        },
      });

      // First call returns campaign set, second call returns ad account
      mockDbLimit.mockResolvedValueOnce([mockSet]);
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, userId: mockUserId, platform: "reddit" }]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(202);

      // Verify the job was queued with a singleton key
      expect(mockJobQueueSend).toHaveBeenCalledWith(
        "sync-campaign-set",
        expect.objectContaining({
          campaignSetId: mockCampaignSetId,
          userId: mockUserId,
        }),
        expect.objectContaining({
          singletonKey: `sync-campaign-set-${mockCampaignSetId}`,
        })
      );
    });
  });

  // ============================================================================
  // SSE Sync Stream Endpoint Tests
  // ============================================================================

  describe("GET /api/v1/campaign-sets/:setId/sync-stream - SSE endpoint", () => {
    let mockDbSelect: Mock;
    let mockDbFrom: Mock;
    let mockDbWhere: Mock;
    let mockDbLimit: Mock;

    beforeEach(() => {
      // Setup chainable mock for db.select().from().where().limit()
      mockDbLimit = vi.fn().mockResolvedValue([]);
      mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      // Reset job queue mock
      mockGetJobById.mockReset();
      mockGetJobById.mockResolvedValue(null);
    });

    it("should return 401 without auth header", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`,
        undefined,
        { includeUserId: false }
      );

      expect(response.status).toBe(401);
    });

    it("should return 400 without jobId query parameter", async () => {
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream`
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid jobId format", async () => {
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=not-a-uuid`
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid setId format", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/not-a-uuid/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent campaign set", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([]);

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(404);
    });

    it("should return SSE content-type header for valid request", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists and belongs to campaign set
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      // For streaming responses, we check content-type header
      // The status should be 200 for SSE
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/event-stream");
    });

    it("should include cache-control and connection headers", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists and belongs to campaign set
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-cache");
      expect(response.headers.get("connection")).toBe("keep-alive");
    });

    it("should return 404 when job does not exist", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job does not exist
      mockGetJobById.mockResolvedValue(null);

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain("not found");
    });

    it("should return 403 when job belongs to different campaign set", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const differentCampaignSetId = "880e8400-e29b-41d4-a716-446655440999";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists but belongs to a different campaign set
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: differentCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("denied");
    });

    it("should return 403 when job belongs to different user", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const differentUserId = "550e8400-e29b-41d4-a716-446655440999";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists but belongs to a different user
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: differentUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toContain("denied");
    });

    it("should send initial connected event with job state", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists, is active, and belongs to this campaign set
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(200);

      // Read the first event from the stream
      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        // Should contain a connected event with the job state
        expect(text).toContain("event: connected");
        expect(text).toContain(mockJobId);
        reader.cancel();
      }
    });

    it("should immediately complete stream when job is already completed", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists and is already completed
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "completed",
        output: { synced: 5, failed: 0, total: 5 },
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(200);

      // Read the stream content
      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        // Should contain a completed event
        expect(text).toContain("event: completed");
        reader.cancel();
      }
    });

    it("should immediately send error when job is already failed", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists and is already failed
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "failed",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(200);

      // Read the stream content
      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        // Should contain an error event
        expect(text).toContain("event: error");
        reader.cancel();
      }
    });
  });

  // ============================================================================
  // Database-dependent tests (skipped - require integration testing)
  // ============================================================================

  describe.skip("POST /api/v1/campaign-sets (requires database)", () => {
    it("should create a new campaign set with valid data", async () => {
      // Integration test required
    });

    it("should return the created campaign set with id and timestamps", async () => {
      // Integration test required
    });

    it("should set default status to draft", async () => {
      // Integration test required
    });

    it("should set default syncStatus to pending", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/campaign-sets (requires database)", () => {
    it("should return a paginated list of campaign sets", async () => {
      // Integration test required
    });

    it("should filter by status", async () => {
      // Integration test required
    });

    it("should filter by syncStatus", async () => {
      // Integration test required
    });

    it("should return summary with counts", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/campaign-sets/:setId (requires database)", () => {
    it("should return a campaign set by id with campaigns", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("PUT /api/v1/campaign-sets/:setId (requires database)", () => {
    it("should update an existing campaign set", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("DELETE /api/v1/campaign-sets/:setId (requires database)", () => {
    it("should delete a campaign set and cascade to campaigns", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/campaign-sets/:setId/generate (requires database)", () => {
    it("should generate campaigns from set config", async () => {
      // Integration test required
    });

    it("should regenerate if regenerate flag is true", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/campaign-sets/:setId/sync (requires database)", () => {
    it("should sync all campaigns in set to platforms", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/campaign-sets/:setId/pause (requires database)", () => {
    it("should pause all campaigns in set", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("POST /api/v1/campaign-sets/:setId/resume (requires database)", () => {
    it("should resume all campaigns in set", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/campaign-sets/:setId/campaigns (requires database)", () => {
    it("should list all campaigns in a set", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign set", async () => {
      // Integration test required
    });
  });

  describe.skip("GET /api/v1/campaign-sets/:setId/campaigns/:campaignId (requires database)", () => {
    it("should return a single campaign with full hierarchy", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign", async () => {
      // Integration test required
    });
  });

  describe.skip("PUT /api/v1/campaign-sets/:setId/campaigns/:campaignId (requires database)", () => {
    it("should update a campaign within a set", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign", async () => {
      // Integration test required
    });
  });

  describe.skip("DELETE /api/v1/campaign-sets/:setId/campaigns/:campaignId (requires database)", () => {
    it("should delete a campaign from the set", async () => {
      // Integration test required
    });

    it("should return 404 for non-existent campaign", async () => {
      // Integration test required
    });
  });
});
