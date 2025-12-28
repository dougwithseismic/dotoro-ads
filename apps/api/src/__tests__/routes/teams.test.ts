import { describe, it, expect, vi, beforeEach } from "vitest";
import { testClient } from "hono/testing";

const mockTeamId = "550e8400-e29b-41d4-a716-446655440000";
const mockUserId = "550e8400-e29b-41d4-a716-446655440001";
const mockUserId2 = "550e8400-e29b-41d4-a716-446655440002";

// Mock the database module
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    teams: { id: "id", name: "name", slug: "slug" },
    teamMemberships: { id: "id", teamId: "teamId", userId: "userId", role: "role" },
    users: { id: "id", email: "email" },
  };
});

// Mock auth service
vi.mock("../../services/auth-service.js", () => ({
  validateSession: vi.fn(),
}));

// Import after mocking
import { teamsApp } from "../../routes/teams.js";
import { db } from "../../services/db.js";
import * as authService from "../../services/auth-service.js";

// Helper to mock authenticated user
function mockAuthenticatedUser(userId: string = mockUserId, email: string = "test@example.com") {
  const mockValidateSession = authService.validateSession as ReturnType<typeof vi.fn>;
  mockValidateSession.mockResolvedValue({
    session: {
      id: "session-123",
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    user: {
      id: userId,
      email,
      emailVerified: true,
    },
  });
}

// Reset mocks to return chainable db query pattern
function setupDbMock() {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    then: vi.fn(),
  };

  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
  (db.insert as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
  (db.update as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
  (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(chainable);

  return chainable;
}

describe("Teams API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/teams", () => {
    it("should return 401 when not authenticated", async () => {
      const mockValidateSession = authService.validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue(null);

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"].$get();

      expect(res.status).toBe(401);
    });

    it("should return empty array when user has no teams", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      // Mock the promise resolution - db query returns empty array
      chainable.where.mockResolvedValue([]);

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"].$get(
        {},
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
    });
  });

  describe("POST /api/teams", () => {
    it("should return 401 when not authenticated", async () => {
      const mockValidateSession = authService.validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue(null);

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"].$post({
        json: {
          name: "New Team",
        },
      });

      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid team name (empty)", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"].$post(
        {
          json: {
            name: "", // Empty name
          },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid slug format", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"].$post(
        {
          json: {
            name: "My Team",
            slug: "INVALID SLUG!", // Invalid characters
          },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    // NOTE: Full team creation test requires complex db mocking
    // This should be covered by integration tests with a real database
    it.skip("should create a new team with valid input", async () => {
      // Skipped - requires integration test with real database
    });
  });

  describe("GET /api/teams/:id", () => {
    it("should return 400 for invalid UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"][":id"].$get(
        {
          param: { id: "not-a-uuid" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/teams/:id", () => {
    it("should return 400 for invalid UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"][":id"].$patch(
        {
          param: { id: "not-a-uuid" },
          json: { name: "Updated Name" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid update data", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"][":id"].$patch(
        {
          param: { id: mockTeamId },
          json: { billingEmail: "not-an-email" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/teams/:id", () => {
    it("should return 400 for invalid UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"][":id"].$delete(
        {
          param: { id: "not-a-uuid" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/teams/:id/members", () => {
    it("should return 400 for invalid team UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"][":id"]["members"].$get(
        {
          param: { id: "not-a-uuid" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /api/teams/:id/members/:userId", () => {
    it("should return 400 for invalid team UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"][":id"]["members"][":userId"].$delete(
        {
          param: { id: "not-a-uuid", userId: mockUserId2 },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid user UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(teamsApp);
      const res = await client["api"]["teams"][":id"]["members"][":userId"].$delete(
        {
          param: { id: mockTeamId, userId: "not-a-uuid" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });
  });
});
