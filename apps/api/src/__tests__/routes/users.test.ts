import { describe, it, expect, vi, beforeEach } from "vitest";
import { testClient } from "hono/testing";

const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
const mockTeamId1 = "team-1111-1111-1111-111111111111";
const mockTeamId2 = "team-2222-2222-2222-222222222222";
const mockTeamId3 = "team-3333-3333-3333-333333333333";
const mockMemberUserId = "member-1111-1111-1111-111111111111";

// Mock the database module
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
    },
    user: { id: "id", name: "name", email: "email" },
    teams: { id: "id", name: "name", slug: "slug" },
    teamMemberships: {
      id: "id",
      teamId: "team_id",
      userId: "user_id",
      role: "role",
      acceptedAt: "accepted_at"
    },
  };
});

// Mock auth service
vi.mock("../../middleware/auth.js", () => ({
  validateSession: vi.fn(),
}));

// Import after mocking
import { usersApp } from "../../routes/users.js";
import { db } from "../../services/db.js";
import { validateSession } from "../../middleware/auth.js";

// Helper to mock authenticated user
function mockAuthenticatedUser(
  userId: string = mockUserId,
  email: string = "test@example.com",
  name: string = "Test User"
) {
  const mockValidateSession = validateSession as ReturnType<typeof vi.fn>;
  mockValidateSession.mockResolvedValue({
    session: {
      id: "session-123",
      userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    user: {
      id: userId,
      email,
      name,
      emailVerified: true,
      image: null,
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
      updatedAt: new Date("2025-01-01T00:00:00.000Z"),
    },
  });
}

// Reset mocks to return chainable db query pattern
function setupDbMock() {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    then: vi.fn(),
  };

  (db.update as ReturnType<typeof vi.fn>).mockReturnValue(chainable);

  return chainable;
}

describe("Users API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /api/users/me", () => {
    it("should return 401 when not authenticated", async () => {
      const mockValidateSession = validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue(null);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch({
        json: { name: "New Name" },
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("should return 400 for empty name", async () => {
      mockAuthenticatedUser();

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: "" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for name exceeding 50 characters", async () => {
      mockAuthenticatedUser();

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: "a".repeat(51) },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for whitespace-only name", async () => {
      mockAuthenticatedUser();

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: "   " },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 200 and updated user on successful update", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      const updatedUser = {
        id: mockUserId,
        name: "Updated Name",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-12-28T12:00:00.000Z"),
      };

      chainable.returning.mockResolvedValue([updatedUser]);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: "Updated Name" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(mockUserId);
      expect(json.name).toBe("Updated Name");
      expect(json.email).toBe("test@example.com");
      expect(json.emailVerified).toBe(true);
    });

    it("should trim whitespace from name before saving", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      const updatedUser = {
        id: mockUserId,
        name: "Trimmed Name",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-12-28T12:00:00.000Z"),
      };

      chainable.returning.mockResolvedValue([updatedUser]);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: "  Trimmed Name  " },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      // The name should be trimmed
      expect(json.name).toBe("Trimmed Name");
    });

    it("should accept exactly 50 character name", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      const longName = "a".repeat(50);
      const updatedUser = {
        id: mockUserId,
        name: longName,
        email: "test@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-12-28T12:00:00.000Z"),
      };

      chainable.returning.mockResolvedValue([updatedUser]);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: longName },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(200);
    });

    it("should return 500 when database update fails", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      // Simulate database returning empty array (no rows updated)
      chainable.returning.mockResolvedValue([]);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: "New Name" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(500);
      const json = await res.json();
      expect(json.error).toBe("Failed to update user");
    });

    it("should return datetime strings in ISO format", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      const updatedUser = {
        id: mockUserId,
        name: "Test User",
        email: "test@example.com",
        emailVerified: true,
        image: null,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        updatedAt: new Date("2025-12-28T12:00:00.000Z"),
      };

      chainable.returning.mockResolvedValue([updatedUser]);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$patch(
        {
          json: { name: "Test User" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.createdAt).toBe("2025-01-01T00:00:00.000Z");
      expect(json.updatedAt).toBe("2025-12-28T12:00:00.000Z");
    });
  });

  // ==========================================================================
  // GET /api/users/me/deletion-preview
  // ==========================================================================

  describe("GET /api/users/me/deletion-preview", () => {
    /**
     * Setup helper for deletion preview tests
     * Mocks the complex database queries for team categorization
     */
    function setupDeletionPreviewMock(options: {
      userTeams: Array<{
        teamId: string;
        teamName: string;
        teamSlug: string;
        userRole: "owner" | "admin" | "editor" | "viewer";
        members: Array<{
          userId: string;
          email: string;
          role: "owner" | "admin" | "editor" | "viewer";
          acceptedAt: Date;
        }>;
      }>;
    }) {
      // For deletion preview, we need to mock:
      // 1. Query to get all teams where user is a member
      // 2. For each team, query to get all members with their roles and acceptedAt

      const selectChainable = {
        from: vi.fn().mockReturnThis(),
        innerJoin: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        then: vi.fn(),
      };

      // Build the flattened result that would come from the query
      const teamMembershipResults = options.userTeams.map(team => ({
        teamId: team.teamId,
        teamName: team.teamName,
        teamSlug: team.teamSlug,
        userRole: team.userRole,
        memberCount: team.members.length,
      }));

      // For the main teams query
      selectChainable.where.mockResolvedValue(teamMembershipResults);

      // For member queries per team
      const memberQueryResults = new Map<string, unknown[]>();
      for (const team of options.userTeams) {
        memberQueryResults.set(team.teamId, team.members.map(m => ({
          userId: m.userId,
          email: m.email,
          role: m.role,
          acceptedAt: m.acceptedAt,
        })));
      }

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        return selectChainable;
      });

      return { selectChainable, memberQueryResults };
    }

    it("should return 401 when not authenticated", async () => {
      const mockValidateSession = validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue(null);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"]["deletion-preview"].$get();

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("should categorize solo teams as teamsToDelete", async () => {
      mockAuthenticatedUser();

      // First call: get user's team memberships with team info and member counts
      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        // Mock a team where user is the only member
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          // Teams where user is a member with role info - chain ends at where
          selectChainable.where.mockResolvedValue([
            {
              teamId: mockTeamId1,
              teamName: "My Solo Team",
              teamSlug: "my-solo-team",
              role: "owner",
            },
          ]);
        } else {
          // Member counts per team - chain ends at groupBy
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId1, memberCount: 1 },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"]["deletion-preview"].$get(
        {},
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamsToDelete).toHaveLength(1);
      expect(json.teamsToDelete[0]).toEqual({
        id: mockTeamId1,
        name: "My Solo Team",
        slug: "my-solo-team",
        memberCount: 1,
      });
      expect(json.teamsToTransfer).toHaveLength(0);
      expect(json.teamsToLeave).toHaveLength(0);
    });

    it("should categorize owned teams with other members as teamsToTransfer", async () => {
      mockAuthenticatedUser();

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          // Teams where user is a member
          selectChainable.where.mockResolvedValue([
            {
              teamId: mockTeamId2,
              teamName: "Shared Team",
              teamSlug: "shared-team",
              role: "owner",
            },
          ]);
        } else if (callCount === 2) {
          // Member counts
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId2, memberCount: 3 },
          ]);
        } else {
          // Get potential new owners for team
          selectChainable.orderBy.mockResolvedValue([
            {
              userId: mockMemberUserId,
              email: "admin@example.com",
              role: "admin",
              acceptedAt: new Date("2025-01-15T00:00:00.000Z"),
            },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"]["deletion-preview"].$get(
        {},
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamsToDelete).toHaveLength(0);
      expect(json.teamsToTransfer).toHaveLength(1);
      expect(json.teamsToTransfer[0]).toEqual({
        id: mockTeamId2,
        name: "Shared Team",
        slug: "shared-team",
        memberCount: 3,
        newOwner: {
          id: mockMemberUserId,
          email: "admin@example.com",
          currentRole: "admin",
        },
      });
    });

    it("should select new owner by role priority: admin > editor > viewer", async () => {
      mockAuthenticatedUser();

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          selectChainable.where.mockResolvedValue([
            {
              teamId: mockTeamId2,
              teamName: "Team Without Admins",
              teamSlug: "team-no-admins",
              role: "owner",
            },
          ]);
        } else if (callCount === 2) {
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId2, memberCount: 3 },
          ]);
        } else {
          // No admins, only editors and viewers - editor should be selected
          selectChainable.orderBy.mockResolvedValue([
            {
              userId: "editor-user-id",
              email: "editor@example.com",
              role: "editor",
              acceptedAt: new Date("2025-01-10T00:00:00.000Z"),
            },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"]["deletion-preview"].$get(
        {},
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamsToTransfer[0].newOwner.currentRole).toBe("editor");
    });

    it("should select new owner by seniority (earliest acceptedAt) within same role", async () => {
      mockAuthenticatedUser();

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          selectChainable.where.mockResolvedValue([
            {
              teamId: mockTeamId2,
              teamName: "Team With Multiple Admins",
              teamSlug: "team-multi-admins",
              role: "owner",
            },
          ]);
        } else if (callCount === 2) {
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId2, memberCount: 4 },
          ]);
        } else {
          // Multiple admins - senior one (earliest acceptedAt) should be first
          selectChainable.orderBy.mockResolvedValue([
            {
              userId: "senior-admin-id",
              email: "senior-admin@example.com",
              role: "admin",
              acceptedAt: new Date("2025-01-01T00:00:00.000Z"), // Earliest
            },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"]["deletion-preview"].$get(
        {},
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamsToTransfer[0].newOwner.email).toBe("senior-admin@example.com");
    });

    it("should categorize non-owner memberships as teamsToLeave", async () => {
      mockAuthenticatedUser();

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          selectChainable.where.mockResolvedValue([
            {
              teamId: mockTeamId3,
              teamName: "Client Project",
              teamSlug: "client-project",
              role: "editor", // User is not owner
            },
          ]);
        } else {
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId3, memberCount: 5 },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"]["deletion-preview"].$get(
        {},
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamsToDelete).toHaveLength(0);
      expect(json.teamsToTransfer).toHaveLength(0);
      expect(json.teamsToLeave).toHaveLength(1);
      expect(json.teamsToLeave[0]).toEqual({
        id: mockTeamId3,
        name: "Client Project",
        slug: "client-project",
      });
    });

    it("should handle user with multiple teams in different categories", async () => {
      mockAuthenticatedUser();

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          // Multiple teams
          selectChainable.where.mockResolvedValue([
            { teamId: mockTeamId1, teamName: "Solo Team", teamSlug: "solo", role: "owner" },
            { teamId: mockTeamId2, teamName: "Shared Team", teamSlug: "shared", role: "owner" },
            { teamId: mockTeamId3, teamName: "Client Team", teamSlug: "client", role: "editor" },
          ]);
        } else if (callCount === 2) {
          // Member counts
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId1, memberCount: 1 },
            { teamId: mockTeamId2, memberCount: 3 },
            { teamId: mockTeamId3, memberCount: 5 },
          ]);
        } else {
          // New owner for shared team
          selectChainable.orderBy.mockResolvedValue([
            {
              userId: mockMemberUserId,
              email: "newowner@example.com",
              role: "admin",
              acceptedAt: new Date("2025-01-15T00:00:00.000Z"),
            },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"]["deletion-preview"].$get(
        {},
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.teamsToDelete).toHaveLength(1);
      expect(json.teamsToTransfer).toHaveLength(1);
      expect(json.teamsToLeave).toHaveLength(1);
    });
  });

  // ==========================================================================
  // DELETE /api/users/me
  // ==========================================================================

  describe("DELETE /api/users/me", () => {
    function setupDeleteMock() {
      const deleteChainable = {
        where: vi.fn().mockResolvedValue([]),
      };
      const updateChainable = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([]),
      };

      (db.delete as ReturnType<typeof vi.fn>).mockReturnValue(deleteChainable);
      (db.update as ReturnType<typeof vi.fn>).mockReturnValue(updateChainable);

      // Mock transaction to execute the callback
      (db.transaction as ReturnType<typeof vi.fn>).mockImplementation(
        async (callback: (tx: typeof db) => Promise<unknown>) => {
          return callback(db);
        }
      );

      return { deleteChainable, updateChainable };
    }

    it("should return 401 when not authenticated", async () => {
      const mockValidateSession = validateSession as ReturnType<typeof vi.fn>;
      mockValidateSession.mockResolvedValue(null);

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete({
        json: { confirmEmail: "test@example.com" },
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Authentication required");
    });

    it("should return 400 when confirmEmail does not match user email", async () => {
      mockAuthenticatedUser(mockUserId, "user@example.com");

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "wrong@example.com" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Email confirmation does not match");
    });

    it("should return 400 when confirmEmail is not a valid email", async () => {
      mockAuthenticatedUser();

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "not-an-email" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(400);
    });

    it("should return 204 on successful deletion with matching email", async () => {
      mockAuthenticatedUser(mockUserId, "test@example.com");
      setupDeleteMock();

      // Single solo team scenario
      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          selectChainable.where.mockResolvedValue([
            { teamId: mockTeamId1, teamName: "My Team", teamSlug: "my-team", role: "owner" },
          ]);
        } else {
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId1, memberCount: 1 },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "test@example.com" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(204);
    });

    it("should handle case-insensitive email confirmation", async () => {
      mockAuthenticatedUser(mockUserId, "Test@Example.com");
      setupDeleteMock();

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "test@example.com" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(204);
    });

    it("should delete solo teams during account deletion", async () => {
      mockAuthenticatedUser(mockUserId, "test@example.com");
      const { deleteChainable } = setupDeleteMock();

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          selectChainable.where.mockResolvedValue([
            { teamId: mockTeamId1, teamName: "Solo Team", teamSlug: "solo", role: "owner" },
          ]);
        } else {
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId1, memberCount: 1 },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "test@example.com" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(204);
      // Verify delete was called (for team and user)
      expect(db.delete).toHaveBeenCalled();
    });

    it("should transfer ownership for shared teams before deletion", async () => {
      mockAuthenticatedUser(mockUserId, "test@example.com");
      const { updateChainable } = setupDeleteMock();

      let callCount = 0;
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        callCount++;
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        if (callCount === 1) {
          selectChainable.where.mockResolvedValue([
            { teamId: mockTeamId2, teamName: "Shared Team", teamSlug: "shared", role: "owner" },
          ]);
        } else if (callCount === 2) {
          selectChainable.groupBy.mockResolvedValue([
            { teamId: mockTeamId2, memberCount: 3 },
          ]);
        } else {
          selectChainable.orderBy.mockResolvedValue([
            {
              userId: mockMemberUserId,
              email: "newowner@example.com",
              role: "admin",
              acceptedAt: new Date("2025-01-15T00:00:00.000Z"),
            },
          ]);
        }
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "test@example.com" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(204);
      // Verify update was called (for ownership transfer)
      expect(db.update).toHaveBeenCalled();
    });

    it("should use transaction for all deletion operations", async () => {
      mockAuthenticatedUser(mockUserId, "test@example.com");
      setupDeleteMock();

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        return selectChainable;
      });

      const client = testClient(usersApp);
      await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "test@example.com" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      // Verify transaction was used
      expect(db.transaction).toHaveBeenCalled();
    });

    it("should rollback on transaction failure", async () => {
      mockAuthenticatedUser(mockUserId, "test@example.com");

      // Mock transaction to throw an error
      (db.transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database error")
      );

      (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
        const selectChainable = {
          from: vi.fn().mockReturnThis(),
          innerJoin: vi.fn().mockReturnThis(),
          leftJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
          orderBy: vi.fn().mockReturnThis(),
          groupBy: vi.fn().mockReturnThis(),
        };
        return selectChainable;
      });

      const client = testClient(usersApp);
      const res = await client["api"]["users"]["me"].$delete(
        {
          json: { confirmEmail: "test@example.com" },
        },
        { headers: { cookie: "session=" + "a".repeat(64) } }
      );

      expect(res.status).toBe(500);
    });
  });
});
