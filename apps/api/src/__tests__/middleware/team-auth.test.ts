import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { testClient } from "hono/testing";

const mockTeamId = "550e8400-e29b-41d4-a716-446655440000";
const mockUserId = "550e8400-e29b-41d4-a716-446655440001";
const mockSessionToken = "a".repeat(64);

// Mock the auth service
vi.mock("../../services/auth-service.js", () => ({
  validateSession: vi.fn(),
}));

// Mock the database
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
    },
    teams: { id: "id", name: "name" },
    teamMemberships: { id: "id", teamId: "teamId", userId: "userId", role: "role" },
  };
});

// Import after mocking
import {
  requireTeamAuth,
  requireTeamRole,
  getTeamContext,
  type TeamRole,
} from "../../middleware/team-auth.js";
import * as authService from "../../services/auth-service.js";
import { db } from "../../services/db.js";

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

// Helper to mock no authentication
function mockNoAuth() {
  const mockValidateSession = authService.validateSession as ReturnType<typeof vi.fn>;
  mockValidateSession.mockResolvedValue(null);
}

// Reset mocks to return chainable db query pattern
function setupDbMock() {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };

  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chainable);

  return chainable;
}

describe("Team Auth Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requireTeamAuth", () => {
    it("should reject requests without authentication", async () => {
      mockNoAuth();

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/team-resource", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client["team-resource"].$get({});

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("should reject requests without X-Team-Id header or teamId query param", async () => {
      mockAuthenticatedUser();

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/team-resource", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client["team-resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
          },
        }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Team ID required");
    });

    it("should reject requests with invalid team UUID", async () => {
      mockAuthenticatedUser();

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/team-resource", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client["team-resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
            "x-team-id": "not-a-uuid",
          },
        }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid team ID");
    });

    it("should reject requests when user is not a team member", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/team-resource", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client["team-resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
            "x-team-id": mockTeamId,
          },
        }
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Not a member of this team");
    });

    it("should allow access when user is a team member (via header)", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([
        {
          id: mockTeamId,
          name: "Test Team",
          slug: "test-team",
          role: "editor",
        },
      ]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/team-resource", (c) => {
        const { team, role } = getTeamContext(c);
        return c.json({ teamId: team.id, role });
      });

      const client = testClient(app);
      const res = await client["team-resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
            "x-team-id": mockTeamId,
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamId).toBe(mockTeamId);
      expect(json.role).toBe("editor");
    });

    it("should allow access when user is a team member (via query param)", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([
        {
          id: mockTeamId,
          name: "Test Team",
          slug: "test-team",
          role: "admin",
        },
      ]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/team-resource", (c) => {
        const { team, role } = getTeamContext(c);
        return c.json({ teamId: team.id, role });
      });

      const client = testClient(app);
      // Note: Hono test client handles query params differently
      const res = await app.request(`/team-resource?teamId=${mockTeamId}`, {
        headers: {
          cookie: "session=" + mockSessionToken,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamId).toBe(mockTeamId);
      expect(json.role).toBe("admin");
    });

    it("should prefer X-Team-Id header over query param", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([
        {
          id: mockTeamId,
          name: "Test Team",
          slug: "test-team",
          role: "owner",
        },
      ]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/team-resource", (c) => {
        const { team } = getTeamContext(c);
        return c.json({ teamId: team.id });
      });

      const differentTeamId = "660e8400-e29b-41d4-a716-446655440099";
      const res = await app.request(`/team-resource?teamId=${differentTeamId}`, {
        headers: {
          cookie: "session=" + mockSessionToken,
          "x-team-id": mockTeamId,
        },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamId).toBe(mockTeamId);
    });
  });

  describe("requireTeamRole", () => {
    it("should allow access when user has the required role", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([
        {
          id: mockTeamId,
          name: "Test Team",
          slug: "test-team",
          role: "admin",
        },
      ]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.use("*", requireTeamRole("admin"));
      app.get("/admin-resource", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client["admin-resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
            "x-team-id": mockTeamId,
          },
        }
      );

      expect(res.status).toBe(200);
    });

    it("should allow access when user has higher role than required", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([
        {
          id: mockTeamId,
          name: "Test Team",
          slug: "test-team",
          role: "owner",
        },
      ]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.use("*", requireTeamRole("editor"));
      app.get("/editor-resource", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client["editor-resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
            "x-team-id": mockTeamId,
          },
        }
      );

      expect(res.status).toBe(200);
    });

    it("should reject access when user has lower role than required", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([
        {
          id: mockTeamId,
          name: "Test Team",
          slug: "test-team",
          role: "viewer",
        },
      ]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.use("*", requireTeamRole("editor"));
      app.get("/editor-resource", (c) => c.json({ ok: true }));

      const client = testClient(app);
      const res = await client["editor-resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
            "x-team-id": mockTeamId,
          },
        }
      );

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain("Insufficient permissions");
    });

    it("should enforce role hierarchy: owner > admin > editor > viewer", async () => {
      // Test role hierarchy
      const roleTests: Array<{ userRole: TeamRole; requiredRole: TeamRole; shouldPass: boolean }> =
        [
          // Owner can access everything
          { userRole: "owner", requiredRole: "owner", shouldPass: true },
          { userRole: "owner", requiredRole: "admin", shouldPass: true },
          { userRole: "owner", requiredRole: "editor", shouldPass: true },
          { userRole: "owner", requiredRole: "viewer", shouldPass: true },
          // Admin can access admin and below
          { userRole: "admin", requiredRole: "owner", shouldPass: false },
          { userRole: "admin", requiredRole: "admin", shouldPass: true },
          { userRole: "admin", requiredRole: "editor", shouldPass: true },
          { userRole: "admin", requiredRole: "viewer", shouldPass: true },
          // Editor can access editor and below
          { userRole: "editor", requiredRole: "owner", shouldPass: false },
          { userRole: "editor", requiredRole: "admin", shouldPass: false },
          { userRole: "editor", requiredRole: "editor", shouldPass: true },
          { userRole: "editor", requiredRole: "viewer", shouldPass: true },
          // Viewer can only access viewer
          { userRole: "viewer", requiredRole: "owner", shouldPass: false },
          { userRole: "viewer", requiredRole: "admin", shouldPass: false },
          { userRole: "viewer", requiredRole: "editor", shouldPass: false },
          { userRole: "viewer", requiredRole: "viewer", shouldPass: true },
        ];

      for (const test of roleTests) {
        vi.clearAllMocks();
        mockAuthenticatedUser();
        const chainable = setupDbMock();
        chainable.limit.mockResolvedValue([
          {
            id: mockTeamId,
            name: "Test Team",
            slug: "test-team",
            role: test.userRole,
          },
        ]);

        const app = new Hono();
        app.use("*", requireTeamAuth());
        app.use("*", requireTeamRole(test.requiredRole));
        app.get("/resource", (c) => c.json({ ok: true }));

        const client = testClient(app);
        const res = await client["resource"].$get(
          {},
          {
            headers: {
              cookie: "session=" + mockSessionToken,
              "x-team-id": mockTeamId,
            },
          }
        );

        const expectedStatus = test.shouldPass ? 200 : 403;
        expect(
          res.status,
          `User with role '${test.userRole}' accessing resource requiring '${test.requiredRole}' should return ${expectedStatus}`
        ).toBe(expectedStatus);
      }
    });
  });

  describe("getTeamContext helper", () => {
    it("should throw error when called without team auth middleware", async () => {
      const app = new Hono();
      app.get("/resource", (c) => {
        try {
          getTeamContext(c);
          return c.json({ ok: true });
        } catch (error) {
          return c.json({ error: (error as Error).message }, 500);
        }
      });

      const client = testClient(app);
      const res = await client["resource"].$get({});

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toContain("Team context not found");
    });

    it("should return team context when middleware is applied", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([
        {
          id: mockTeamId,
          name: "Test Team",
          slug: "test-team",
          role: "editor",
        },
      ]);

      const app = new Hono();
      app.use("*", requireTeamAuth());
      app.get("/resource", (c) => {
        const ctx = getTeamContext(c);
        return c.json({
          teamId: ctx.team.id,
          teamName: ctx.team.name,
          role: ctx.role,
        });
      });

      const client = testClient(app);
      const res = await client["resource"].$get(
        {},
        {
          headers: {
            cookie: "session=" + mockSessionToken,
            "x-team-id": mockTeamId,
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamId).toBe(mockTeamId);
      expect(json.teamName).toBe("Test Team");
      expect(json.role).toBe("editor");
    });
  });
});
