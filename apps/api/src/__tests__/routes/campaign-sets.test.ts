import { describe, it, expect, beforeEach, vi, Mock, afterEach } from "vitest";
import { testClient } from "hono/testing";
import type { Context } from "hono";

const mockCampaignSetId = "660e8400-e29b-41d4-a716-446655440000";
const mockCampaignId = "770e8400-e29b-41d4-a716-446655440001";
const mockCampaignId2 = "770e8400-e29b-41d4-a716-446655440002";
const mockDataSourceId = "550e8400-e29b-41d4-a716-446655440000";
const mockTemplateId = "440e8400-e29b-41d4-a716-446655440000";
const mockUserId = "330e8400-e29b-41d4-a716-446655440000";
const mockAdAccountId = "880e8400-e29b-41d4-a716-446655440000";
const mockTeamId = "990e8400-e29b-41d4-a716-446655440000";

// Mock team data for team auth context
const mockTeam = {
  id: mockTeamId,
  name: "Test Team",
  slug: "test-team",
};

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
    dataSources: {
      id: "id",
      userId: "user_id",
      name: "name",
      type: "type",
    },
    adGroups: { id: "id", campaignId: "campaign_id" },
    ads: { id: "id", adGroupId: "ad_group_id" },
    keywords: { id: "id", adGroupId: "ad_group_id" },
    syncRecords: { id: "id", generatedCampaignId: "generated_campaign_id" },
    oauthTokens: { id: "id", adAccountId: "ad_account_id" },
  };
});

// Mock the team auth middleware
// This bypasses actual session validation and injects team context directly
vi.mock("../../middleware/team-auth.js", () => ({
  requireTeamAuth: vi.fn(() => async (c: Context, next: () => Promise<void>) => {
    // Check for X-Team-Id header to simulate auth check
    const teamIdHeader = c.req.header("x-team-id");
    if (!teamIdHeader) {
      return c.json({ error: "Team ID required", code: "VALIDATION_ERROR" }, 400);
    }
    // Set team context for the request
    c.set("teamContext", {
      team: mockTeam,
      role: "owner",
    });
    await next();
  }),
  getTeamContext: vi.fn((c: Context) => c.get("teamContext")),
  requireTeamRole: vi.fn(() => async (c: Context, next: () => Promise<void>) => {
    await next();
  }),
  hasTeamRole: vi.fn(() => true),
}));

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
  options: { includeTeamId?: boolean } = { includeTeamId: true }
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (body) {
    headers["Content-Type"] = "application/json";
  }
  // Include team ID header by default (required for team authorization)
  if (options.includeTeamId !== false) {
    headers["x-team-id"] = mockTeamId;
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
    userId: mockUserId, // Legacy field, may be null in newer records
    teamId: mockTeamId, // Team ownership
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
  // Authorization Tests - Team Auth
  // ============================================================================

  describe("Authorization - x-team-id header (Team Auth)", () => {
    it("should return 400 for missing x-team-id header on list", async () => {
      const response = await makeRequest(
        "GET",
        "/api/v1/campaign-sets",
        undefined,
        { includeTeamId: false }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing x-team-id header on create", async () => {
      const response = await makeRequest(
        "POST",
        "/api/v1/campaign-sets",
        { name: "Test", config: sampleConfig },
        { includeTeamId: false }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing x-team-id header on get", async () => {
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}`,
        undefined,
        { includeTeamId: false }
      );

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing x-team-id header on delete", async () => {
      const response = await makeRequest(
        "DELETE",
        `/api/v1/campaign-sets/${mockCampaignSetId}`,
        undefined,
        { includeTeamId: false }
      );

      expect(response.status).toBe(400);
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

    it("should return 404 for non-existent campaign set", async () => {
      // Mock database to return empty array (no campaign set found)
      const mockDbLimit = vi.fn().mockResolvedValue([]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        {}
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain("not found");
    });

    it("should return 400 when campaign set has no config", async () => {
      // Mock campaign set with null config
      const mockSet = createMockCampaignSet({ config: null });
      const mockDbLimit = vi.fn().mockResolvedValue([mockSet]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        {}
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("configuration");
    });

    it("should return 400 when campaign set has no data source", async () => {
      // Mock campaign set without dataSourceId
      const mockSet = createMockCampaignSet({
        config: { ...sampleConfig, dataSourceId: "" },
      });
      const mockDbLimit = vi.fn().mockResolvedValue([mockSet]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        {}
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("data source");
    });

    it("should return 400 when campaign set has no platforms selected", async () => {
      // Mock campaign set without platforms
      const mockSet = createMockCampaignSet({
        config: { ...sampleConfig, selectedPlatforms: [] },
      });
      const mockDbLimit = vi.fn().mockResolvedValue([mockSet]);
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        {}
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("platforms");
    });

    it("should return 400 when data source does not belong to user", async () => {
      // Mock campaign set exists and has valid config
      const mockSet = createMockCampaignSet({
        config: { ...sampleConfig, dataSourceId: mockDataSourceId },
      });

      // First query returns campaign set, second returns no data source (doesn't belong to user)
      let callCount = 0;
      const mockDbLimit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([mockSet]);
        }
        // Data source check - return empty (not found for this user)
        return Promise.resolve([]);
      });
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        {}
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain("Data source not found");
    });

    it("should return 400 when data source belongs to different team", async () => {
      // Mock campaign set exists and has valid config
      const mockSet = createMockCampaignSet({
        config: { ...sampleConfig, dataSourceId: mockDataSourceId },
      });
      // Data source exists but belongs to a different team
      const differentTeamDataSource = {
        id: mockDataSourceId,
        teamId: "different-team-id", // Different from mockTeamId
        name: "Other Team's Data",
        type: "csv",
      };

      // First query returns campaign set, second returns data source with different teamId
      let callCount = 0;
      const mockDbLimit = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve([mockSet]);
        }
        // Data source exists but belongs to different team
        return Promise.resolve([differentTeamDataSource]);
      });
      const mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/generate`,
        {}
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      // Returns 404-style message for security (avoid leaking resource existence across teams)
      expect(body.error).toContain("Data source not found");
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
    let mockDbUpdate: Mock;
    let mockDbUpdateSet: Mock;
    let mockDbUpdateWhere: Mock;
    let mockDbUpdateReturning: Mock;

    beforeEach(() => {
      // Setup chainable mock for db.select().from().where().limit()
      mockDbLimit = vi.fn().mockResolvedValue([]);
      mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      // Setup chainable mock for db.update().set().where().returning()
      mockDbUpdateReturning = vi.fn().mockResolvedValue([]);
      mockDbUpdateWhere = vi.fn().mockReturnValue({ returning: mockDbUpdateReturning });
      mockDbUpdateSet = vi.fn().mockReturnValue({ where: mockDbUpdateWhere });
      mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbUpdateSet });
      (db.update as Mock) = mockDbUpdate;

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
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, teamId: mockTeamId, platform: "reddit" }]);

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

    it("should accept sync request without fundingInstrumentId (optional in v3 API)", async () => {
      // Mock campaign set exists with Reddit but NO fundingInstrumentId
      // fundingInstrumentId is optional in Reddit v3 API
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
          // fundingInstrumentId is intentionally missing - should still work in v3
        },
      });

      // First call returns campaign set, second call returns ad account
      mockDbLimit.mockResolvedValueOnce([mockSet]);
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, teamId: mockTeamId, platform: "reddit" }]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      // Should succeed - fundingInstrumentId is optional in v3 API
      expect(response.status).toBe(202);
      const body = await response.json();
      expect(body.jobId).toBe("job-id-123");
    });

    it("should return 400 when ad account doesn't belong to team", async () => {
      // Mock campaign set exists
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
          fundingInstrumentId: "funding-123",
        },
      });

      // First call returns campaign set, second call returns empty (ad account not found for team)
      mockDbLimit.mockResolvedValueOnce([mockSet]);
      mockDbLimit.mockResolvedValueOnce([]); // No ad account found for this team

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
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, teamId: mockTeamId, platform: "reddit" }]);

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
      mockDbLimit.mockResolvedValueOnce([{ id: mockAdAccountId, teamId: mockTeamId, platform: "reddit" }]);

      const response = await makeRequest(
        "POST",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync`
      );

      expect(response.status).toBe(202);

      // Verify the job was queued with a singleton key and team ID
      expect(mockJobQueueSend).toHaveBeenCalledWith(
        "sync-campaign-set",
        expect.objectContaining({
          campaignSetId: mockCampaignSetId,
          teamId: mockTeamId,
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

    it("should return 400 without auth header", async () => {
      const mockJobId = "aa0e8400-e29b-41d4-a716-446655440000";
      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`,
        undefined,
        { includeTeamId: false }
      );

      expect(response.status).toBe(400);
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

      // Mock job exists and belongs to campaign set and team
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, teamId: mockTeamId },
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

      // Mock job exists and belongs to campaign set and team
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, teamId: mockTeamId },
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
        data: { campaignSetId: differentCampaignSetId, teamId: mockTeamId },
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

    it("should return 403 when job belongs to different team", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const differentTeamId = "550e8400-e29b-41d4-a716-446655440999";
      const mockSet = createMockCampaignSet();
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock job exists but belongs to a different team
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, teamId: differentTeamId },
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

      // Mock job exists, is active, and belongs to this campaign set and team
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, teamId: mockTeamId },
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
        data: { campaignSetId: mockCampaignSetId, teamId: mockTeamId },
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
        data: { campaignSetId: mockCampaignSetId, teamId: mockTeamId },
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
  // adAccountId Persistence Tests
  // ============================================================================

  describe("adAccountId persistence in config", () => {
    let mockDbSelect: Mock;
    let mockDbFrom: Mock;
    let mockDbWhere: Mock;
    let mockDbLimit: Mock;
    let mockDbInsert: Mock;
    let mockDbValues: Mock;
    let mockDbReturning: Mock;
    let mockDbUpdate: Mock;
    let mockDbUpdateSet: Mock;
    let mockDbUpdateWhere: Mock;
    let mockDbUpdateReturning: Mock;

    beforeEach(() => {
      // Setup chainable mock for db.select().from().where().limit()
      mockDbLimit = vi.fn().mockResolvedValue([]);
      mockDbWhere = vi.fn().mockReturnValue({ limit: mockDbLimit });
      mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
      mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
      (db.select as Mock) = mockDbSelect;

      // Setup chainable mock for db.insert().values().returning()
      mockDbReturning = vi.fn().mockResolvedValue([]);
      mockDbValues = vi.fn().mockReturnValue({ returning: mockDbReturning });
      mockDbInsert = vi.fn().mockReturnValue({ values: mockDbValues });
      (db.insert as Mock) = mockDbInsert;

      // Setup chainable mock for db.update().set().where().returning()
      mockDbUpdateReturning = vi.fn().mockResolvedValue([]);
      mockDbUpdateWhere = vi.fn().mockReturnValue({ returning: mockDbUpdateReturning });
      mockDbUpdateSet = vi.fn().mockReturnValue({ where: mockDbUpdateWhere });
      mockDbUpdate = vi.fn().mockReturnValue({ set: mockDbUpdateSet });
      (db.update as Mock) = mockDbUpdate;
    });

    it("should accept adAccountId in config when creating campaign set with Reddit platform", async () => {
      // Create config with adAccountId for Reddit platform
      const configWithAdAccountId = {
        ...sampleConfig,
        selectedPlatforms: ["reddit"],
        adAccountId: mockAdAccountId,
      };

      // Mock successful insert returning the created campaign set
      const createdSet = createMockCampaignSet({
        config: configWithAdAccountId,
      });
      mockDbReturning.mockResolvedValue([createdSet]);

      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Test Campaign Set with Ad Account",
        config: configWithAdAccountId,
      });

      // Should succeed with 201 Created
      expect(response.status).toBe(201);

      // Verify response body contains the adAccountId
      const body = await response.json();
      expect(body.config).toBeDefined();
      expect(body.config.adAccountId).toBe(mockAdAccountId);

      // Verify the insert was called with config containing adAccountId
      expect(mockDbInsert).toHaveBeenCalled();
      expect(mockDbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            adAccountId: mockAdAccountId,
          }),
        })
      );
    });

    it("should return adAccountId in config when getting campaign set", async () => {
      // Mock campaign set with adAccountId in config
      const mockSet = createMockCampaignSet({
        config: {
          ...sampleConfig,
          selectedPlatforms: ["reddit"],
          adAccountId: mockAdAccountId,
        },
      });
      mockDbLimit.mockResolvedValue([mockSet]);

      // Mock db.query for campaigns (with full orderBy chain)
      const mockOrderBy = vi.fn().mockResolvedValue([]);
      const mockCampaignsWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockCampaignsFrom = vi.fn().mockReturnValue({ where: mockCampaignsWhere });
      mockDbFrom.mockReturnValue({ where: mockDbWhere, orderBy: mockOrderBy });
      mockDbWhere.mockReturnValue({ limit: mockDbLimit, orderBy: mockOrderBy });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}`
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      // Verify adAccountId is preserved in the response
      expect(body.config).toBeDefined();
      expect(body.config.adAccountId).toBe(mockAdAccountId);
    });

    it("should preserve adAccountId when updating campaign set config", async () => {
      // Mock existing campaign set with adAccountId
      const existingConfig = {
        ...sampleConfig,
        selectedPlatforms: ["reddit"],
        adAccountId: mockAdAccountId,
      };
      const existingSet = createMockCampaignSet({ config: existingConfig });
      mockDbLimit.mockResolvedValue([existingSet]);

      // Mock successful update returning the updated campaign set
      const updatedSet = {
        ...existingSet,
        name: "Updated Name",
        config: existingConfig, // adAccountId should still be there
      };
      mockDbUpdateReturning.mockResolvedValue([updatedSet]);

      const response = await makeRequest(
        "PUT",
        `/api/v1/campaign-sets/${mockCampaignSetId}`,
        {
          name: "Updated Name",
          config: existingConfig, // Include adAccountId in update
        }
      );

      // Should succeed with 200 OK
      expect(response.status).toBe(200);

      // Verify response body preserves adAccountId
      const body = await response.json();
      expect(body.config).toBeDefined();
      expect(body.config.adAccountId).toBe(mockAdAccountId);

      // Verify update was called with config preserving adAccountId
      expect(mockDbUpdate).toHaveBeenCalled();
      expect(mockDbUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            adAccountId: mockAdAccountId,
          }),
        })
      );
    });

    it("should not require adAccountId for non-Reddit platforms", async () => {
      // Config without adAccountId for Google platform
      const googleConfig = {
        ...sampleConfig,
        selectedPlatforms: ["google"],
        // No adAccountId - should be fine for Google
      };

      // Mock successful insert
      const createdSet = createMockCampaignSet({
        config: googleConfig,
      });
      mockDbReturning.mockResolvedValue([createdSet]);

      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Google Campaign Set",
        config: googleConfig,
      });

      // Should succeed with 201 Created without adAccountId for Google
      expect(response.status).toBe(201);

      // Verify response body
      const body = await response.json();
      expect(body.config).toBeDefined();
      expect(body.config.adAccountId).toBeUndefined();
    });

    it("should accept fundingInstrumentId alongside adAccountId", async () => {
      // Config with both adAccountId and fundingInstrumentId for Reddit
      const redditConfig = {
        ...sampleConfig,
        selectedPlatforms: ["reddit"],
        adAccountId: mockAdAccountId,
        fundingInstrumentId: "funding-instrument-123",
      };

      // Mock successful insert
      const createdSet = createMockCampaignSet({
        config: redditConfig,
      });
      mockDbReturning.mockResolvedValue([createdSet]);

      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Reddit Campaign Set with Funding",
        config: redditConfig,
      });

      // Should succeed with 201 Created
      expect(response.status).toBe(201);

      // Verify response body contains both fields
      const body = await response.json();
      expect(body.config).toBeDefined();
      expect(body.config.adAccountId).toBe(mockAdAccountId);
      expect(body.config.fundingInstrumentId).toBe("funding-instrument-123");

      // Verify both fields are preserved in the insert call
      expect(mockDbValues).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            adAccountId: mockAdAccountId,
            fundingInstrumentId: "funding-instrument-123",
          }),
        })
      );
    });

    it("should handle empty adAccountId string appropriately", async () => {
      // Config with empty string adAccountId - should be rejected as invalid
      const configWithEmptyAdAccountId = {
        ...sampleConfig,
        selectedPlatforms: ["reddit"],
        adAccountId: "",
      };

      // Mock successful insert (in case validation passes)
      const createdSet = createMockCampaignSet({
        config: configWithEmptyAdAccountId,
      });
      mockDbReturning.mockResolvedValue([createdSet]);

      const response = await makeRequest("POST", "/api/v1/campaign-sets", {
        name: "Campaign Set with Empty Ad Account",
        config: configWithEmptyAdAccountId,
      });

      // Empty string should be accepted at creation time (validation happens at sync time)
      // This is because adAccountId may be set later before syncing
      expect(response.status).toBe(201);

      // Verify the empty string is preserved (not stripped)
      const body = await response.json();
      expect(body.config).toBeDefined();
      expect(body.config.adAccountId).toBe("");
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
