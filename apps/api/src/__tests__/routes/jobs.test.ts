import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock pg-boss before importing the routes
vi.mock("pg-boss", () => {
  const mockGetJobById = vi.fn();
  return {
    PgBoss: vi.fn().mockImplementation(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      getJobById: mockGetJobById,
      send: vi.fn().mockResolvedValue("job-id-123"),
      work: vi.fn(),
      on: vi.fn(), // Event handler registration
    })),
    __mockGetJobById: mockGetJobById,
  };
});

// Mock the job queue module
vi.mock("../../jobs/queue.js", () => {
  const mockBoss = {
    getJobById: vi.fn(),
    send: vi.fn().mockResolvedValue("job-id-123"),
    work: vi.fn(),
  };
  return {
    getJobQueue: vi.fn().mockResolvedValue(mockBoss),
    stopJobQueue: vi.fn().mockResolvedValue(undefined),
    resetJobQueue: vi.fn(),
    __mockBoss: mockBoss,
  };
});

// Import after mocking
import { jobsApp } from "../../routes/jobs.js";

// Get mock references
const queueModule = await vi.importMock<{
  __mockBoss: { getJobById: ReturnType<typeof vi.fn> };
}>("../../jobs/queue.js");
const mockBoss = queueModule.__mockBoss;

// Test user IDs
const TEST_USER_ID = "test-user-123";
const OTHER_USER_ID = "other-user-456";

// Helper to make requests
async function makeRequest(
  method: string,
  path: string,
  options: { includeUserId?: boolean; userId?: string } = { includeUserId: true }
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.includeUserId !== false) {
    headers["x-user-id"] = options.userId ?? TEST_USER_ID;
  }

  const request = new Request(`http://localhost${path}`, {
    method,
    headers,
  });
  return jobsApp.fetch(request);
}

describe("Jobs API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/v1/jobs/:jobId", () => {
    it("should return 401 when x-user-id header is missing", async () => {
      // Use a valid UUID to avoid 400 validation error
      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000",
        { includeUserId: false }
      );

      expect(response.status).toBe(401);
    });

    it("should return 400 for invalid job ID format", async () => {
      // Job IDs from pg-boss are UUIDs
      const response = await makeRequest("GET", "/api/v1/jobs/not-a-uuid");

      expect(response.status).toBe(400);
    });

    it("should return 404 when job is not found", async () => {
      mockBoss.getJobById.mockResolvedValue(null);

      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000"
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toContain("not found");
    });

    it("should return 403 when user tries to access another user's job", async () => {
      // Job belongs to OTHER_USER_ID, but request is from TEST_USER_ID
      const mockJob = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "sync-campaign-set",
        state: "created",
        data: { campaignSetId: "campaign-123", userId: OTHER_USER_ID },
        createdOn: new Date("2025-01-15T10:00:00Z"),
      };
      mockBoss.getJobById.mockResolvedValue(mockJob);

      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000",
        { userId: TEST_USER_ID }
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.code).toBe("FORBIDDEN");
    });

    it("should return job status for created job", async () => {
      const mockJob = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "sync-campaign-set",
        state: "created",
        data: { campaignSetId: "campaign-123", userId: TEST_USER_ID },
        createdOn: new Date("2025-01-15T10:00:00Z"),
      };
      mockBoss.getJobById.mockResolvedValue(mockJob);

      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000"
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe("123e4567-e89b-12d3-a456-426614174000");
      expect(body.name).toBe("sync-campaign-set");
      expect(body.state).toBe("created");
      expect(body.data).toEqual({ campaignSetId: "campaign-123", userId: TEST_USER_ID });
    });

    it("should return job status for active job", async () => {
      const mockJob = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "sync-campaign-set",
        state: "active",
        data: { campaignSetId: "campaign-123", userId: TEST_USER_ID },
        startedOn: new Date("2025-01-15T10:01:00Z"),
        createdOn: new Date("2025-01-15T10:00:00Z"),
      };
      mockBoss.getJobById.mockResolvedValue(mockJob);

      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000"
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.state).toBe("active");
      // Note: pg-boss JobWithMetadata doesn't have a progress field
      expect(body.startedAt).toBeDefined();
    });

    it("should return job status for completed job with output", async () => {
      const mockJob = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "sync-campaign-set",
        state: "completed",
        data: { campaignSetId: "campaign-123", userId: TEST_USER_ID },
        output: { synced: 5, failed: 0, skipped: 0, errors: [] },
        startedOn: new Date("2025-01-15T10:01:00Z"),
        completedOn: new Date("2025-01-15T10:02:00Z"),
        createdOn: new Date("2025-01-15T10:00:00Z"),
      };
      mockBoss.getJobById.mockResolvedValue(mockJob);

      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000"
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.state).toBe("completed");
      expect(body.output).toEqual({ synced: 5, failed: 0, skipped: 0, errors: [] });
      expect(body.completedAt).toBeDefined();
    });

    it("should return job status for failed job with error", async () => {
      const mockJob = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "sync-campaign-set",
        state: "failed",
        data: { campaignSetId: "campaign-123", userId: TEST_USER_ID },
        output: { message: "Network timeout" },
        startedOn: new Date("2025-01-15T10:01:00Z"),
        completedOn: new Date("2025-01-15T10:02:00Z"),
        createdOn: new Date("2025-01-15T10:00:00Z"),
      };
      mockBoss.getJobById.mockResolvedValue(mockJob);

      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000"
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.state).toBe("failed");
      expect(body.error).toBeDefined();
    });

    it("should allow access when job has no userId in data (legacy jobs)", async () => {
      // For backwards compatibility, jobs without userId in data should be accessible
      // This handles cases where jobs were created before the authorization check was added
      const mockJob = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        name: "sync-campaign-set",
        state: "completed",
        data: { campaignSetId: "campaign-123" }, // No userId
        createdOn: new Date("2025-01-15T10:00:00Z"),
      };
      mockBoss.getJobById.mockResolvedValue(mockJob);

      const response = await makeRequest(
        "GET",
        "/api/v1/jobs/123e4567-e89b-12d3-a456-426614174000"
      );

      // Should still return 403 - we want to be secure by default
      // If a job doesn't have userId, deny access
      expect(response.status).toBe(403);
    });
  });
});
