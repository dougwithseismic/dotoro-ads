/**
 * SSE Event Streaming Integration Tests
 *
 * Tests for Server-Sent Events (SSE) streaming functionality.
 * Verifies that events are correctly formatted, ordered, and contain
 * the expected data throughout the sync lifecycle.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { jobEvents, type SyncProgressEvent } from "../../jobs/events.js";

// ============================================================================
// Mock Setup - All mocks hoisted
// ============================================================================

const mockCampaignSetId = "660e8400-e29b-41d4-a716-446655440000";
const mockUserId = "330e8400-e29b-41d4-a716-446655440000";
const mockAdAccountId = "880e8400-e29b-41d4-a716-446655440000";

// Use vi.hoisted to create all mocks at module level
const { mockDbLimit, mockGetJobById } = vi.hoisted(() => {
  const mockDbLimit = vi.fn();
  const mockGetJobById = vi.fn();
  return { mockDbLimit, mockGetJobById };
});

// Mock the database
vi.mock("../../services/db.js", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockDbLimit,
        }),
      }),
    }),
  },
  campaignSets: { id: "id", userId: "user_id" },
  adAccounts: {},
}));

// Mock the job queue
vi.mock("../../jobs/queue.js", () => {
  const mockBoss = {
    send: vi.fn().mockResolvedValue("job-id-123"),
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
  };
});

// Mock the sync handler
vi.mock("../../jobs/handlers/sync-campaign-set.js", () => ({
  SYNC_CAMPAIGN_SET_JOB: "sync-campaign-set",
  createSyncCampaignSetHandler: vi.fn(),
  registerSyncCampaignSetHandler: vi.fn(),
}));

// Import after mocking
import { campaignSetsApp } from "../../routes/campaign-sets.js";

// Helper to make requests
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

// Helper to create mock campaign set
function createMockCampaignSet() {
  return {
    id: mockCampaignSetId,
    userId: mockUserId,
    name: "Test Campaign Set",
    config: {
      selectedPlatforms: ["reddit"],
      adAccountId: mockAdAccountId,
    },
    status: "draft",
    syncStatus: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("SSE Event Streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobEvents.removeAllListeners();
  });

  afterEach(() => {
    jobEvents.removeAllListeners();
  });

  describe("SSE Response Headers", () => {
    it("should return correct SSE content-type header", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
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
      expect(response.headers.get("content-type")).toContain("text/event-stream");
    });

    it("should return cache-control: no-cache header", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.headers.get("cache-control")).toBe("no-cache");
    });

    it("should return connection: keep-alive header", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.headers.get("connection")).toBe("keep-alive");
    });
  });

  describe("SSE Event Format", () => {
    it("should send connected event with job state on stream start", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
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

      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        // Verify SSE format: "event: <type>\ndata: <json>\n\n"
        expect(text).toContain("event: connected");
        expect(text).toContain("data:");
        expect(text).toContain(mockJobId);
        reader.cancel();
      }
    });

    it("should format event data as valid JSON", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        // Extract data portion and verify it's valid JSON
        const dataMatch = text.match(/data: (.+)\n/);
        if (dataMatch) {
          expect(() => JSON.parse(dataMatch[1])).not.toThrow();
        }
        reader.cancel();
      }
    });

    it("should send completed event for already completed jobs", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
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

      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        expect(text).toContain("event: completed");
        reader.cancel();
      }
    });

    it("should send error event for failed jobs", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "failed",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        expect(text).toContain("event: error");
        reader.cancel();
      }
    });
  });

  describe("SSE Authorization", () => {
    it("should return 401 without user ID header", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`,
        undefined,
        { includeUserId: false }
      );

      expect(response.status).toBe(401);
    });

    it("should return 403 when job belongs to different user", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const differentUserId = "550e8400-e29b-41d4-a716-446655440999";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
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

    it("should return 403 when job belongs to different campaign set", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      const differentCampaignSetId = "880e8400-e29b-41d4-a716-446655440999";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
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
    });
  });

  describe("SSE Validation", () => {
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

    it("should return 404 for non-existent job", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
      mockGetJobById.mockResolvedValue(null);

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain("not found");
    });
  });

  describe("Event Content Verification", () => {
    it("should include job ID and state in connected event", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "active",
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        const dataMatch = text.match(/data: (.+)\n/);
        if (dataMatch) {
          const data = JSON.parse(dataMatch[1]);
          expect(data.jobId).toBe(mockJobId);
          expect(data.state).toBe("active");
        }
        reader.cancel();
      }
    });

    it("should include sync results in completed event", async () => {
      const mockJobId = "990e8400-e29b-41d4-a716-446655440000";
      mockDbLimit.mockResolvedValue([createMockCampaignSet()]);
      mockGetJobById.mockResolvedValue({
        id: mockJobId,
        data: { campaignSetId: mockCampaignSetId, userId: mockUserId },
        state: "completed",
        output: { synced: 8, failed: 2, total: 10 },
      });

      const response = await makeRequest(
        "GET",
        `/api/v1/campaign-sets/${mockCampaignSetId}/sync-stream?jobId=${mockJobId}`
      );

      const reader = response.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        const text = new TextDecoder().decode(value);

        // Should contain completed event with results
        expect(text).toContain("event: completed");

        const dataMatch = text.match(/data: (.+)\n/);
        if (dataMatch) {
          const data = JSON.parse(dataMatch[1]);
          expect(data.synced).toBe(8);
          expect(data.failed).toBe(2);
          expect(data.total).toBe(10);
        }
        reader.cancel();
      }
    });
  });
});
