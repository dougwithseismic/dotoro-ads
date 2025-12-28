import { describe, it, expect, vi, beforeEach } from "vitest";
import { testClient } from "hono/testing";

const mockTeamId = "550e8400-e29b-41d4-a716-446655440000";
const mockUserId = "550e8400-e29b-41d4-a716-446655440001";
const mockUserId2 = "550e8400-e29b-41d4-a716-446655440002";
const mockInvitationId = "550e8400-e29b-41d4-a716-446655440003";
const mockToken = "a".repeat(64);

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
    teamInvitations: {
      id: "id",
      teamId: "teamId",
      email: "email",
      role: "role",
      token: "token",
      invitedBy: "invitedBy",
      expiresAt: "expiresAt",
    },
    user: { id: "id", email: "email" },
  };
});

// Mock auth service
vi.mock("../../middleware/auth.js", () => ({
  validateSession: vi.fn(),
}));

// Mock email service
vi.mock("@repo/email", () => ({
  sendTeamInvitationEmail: vi.fn(),
}));

// Import after mocking
import { invitationsApp } from "../../routes/invitations.js";
import { db } from "../../services/db.js";
import { validateSession } from "../../middleware/auth.js";
import { sendTeamInvitationEmail } from "@repo/email";

// Helper to mock authenticated user
function mockAuthenticatedUser(userId: string = mockUserId, email: string = "test@example.com") {
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
      emailVerified: true,
    },
  });
}

// Helper to mock no authentication
function mockNoAuth() {
  const mockValidateSession = validateSession as ReturnType<typeof vi.fn>;
  mockValidateSession.mockResolvedValue(null);
}

// Helper to mock successful email sending
function mockEmailSuccess() {
  const mockSendEmail = sendTeamInvitationEmail as ReturnType<typeof vi.fn>;
  mockSendEmail.mockResolvedValue({ success: true, messageId: "msg_123" });
}

// Helper to mock failed email sending
function mockEmailFailure(error: string = "SMTP connection failed") {
  const mockSendEmail = sendTeamInvitationEmail as ReturnType<typeof vi.fn>;
  mockSendEmail.mockResolvedValue({ success: false, error });
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

describe("Invitations API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // POST /api/teams/:id/invitations - Send invitation
  // ============================================================================
  describe("POST /api/teams/:id/invitations", () => {
    it("should return 401 when not authenticated", async () => {
      mockNoAuth();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post({
        param: { id: mockTeamId },
        json: {
          email: "invitee@example.com",
          role: "editor",
        },
      });

      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid team UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post(
        {
          param: { id: "not-a-uuid" },
          json: {
            email: "invitee@example.com",
            role: "editor",
          },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid email", async () => {
      mockAuthenticatedUser();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post(
        {
          param: { id: mockTeamId },
          json: {
            email: "not-an-email",
            role: "editor",
          },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid role (owner not allowed)", async () => {
      mockAuthenticatedUser();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post(
        {
          param: { id: mockTeamId },
          json: {
            email: "invitee@example.com",
            role: "owner" as "admin", // Cast to bypass TS error - testing runtime validation
          },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should accept valid invitation request schema", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      // Return empty for user team membership check
      chainable.limit.mockResolvedValue([]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post(
        {
          param: { id: mockTeamId },
          json: {
            email: "invitee@example.com",
            role: "editor",
            message: "Please join our team!",
          },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      // It should fail with 404 (team not found for user) because our mock returns empty
      // This validates the request was parsed correctly
      expect(res.status).toBe(404);
    });

    it("should return emailSent: true when email sends successfully", async () => {
      mockAuthenticatedUser();
      mockEmailSuccess();
      const chainable = setupDbMock();

      // Mock team membership with admin role
      chainable.limit.mockResolvedValueOnce([
        { id: mockTeamId, name: "Test Team", slug: "test-team", role: "admin" },
      ]);

      // Mock no existing member
      chainable.limit.mockResolvedValueOnce([]);

      // Mock no existing invitation
      chainable.limit.mockResolvedValueOnce([]);

      // Mock invitation creation
      const mockInvitation = {
        id: mockInvitationId,
        email: "invitee@example.com",
        role: "editor",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      chainable.returning.mockResolvedValueOnce([mockInvitation]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post(
        {
          param: { id: mockTeamId },
          json: {
            email: "invitee@example.com",
            role: "editor",
          },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.emailSent).toBe(true);
      expect(body.emailError).toBeUndefined();
      expect(body.inviteLink).toBeUndefined();
    });

    it("should return emailSent: false with error and inviteLink when email fails", async () => {
      mockAuthenticatedUser();
      mockEmailFailure("SMTP connection failed");
      const chainable = setupDbMock();

      // Mock team membership with admin role
      chainable.limit.mockResolvedValueOnce([
        { id: mockTeamId, name: "Test Team", slug: "test-team", role: "admin" },
      ]);

      // Mock no existing member
      chainable.limit.mockResolvedValueOnce([]);

      // Mock no existing invitation
      chainable.limit.mockResolvedValueOnce([]);

      // Mock invitation creation
      const mockInvitation = {
        id: mockInvitationId,
        email: "invitee@example.com",
        role: "editor",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      chainable.returning.mockResolvedValueOnce([mockInvitation]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post(
        {
          param: { id: mockTeamId },
          json: {
            email: "invitee@example.com",
            role: "editor",
          },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.emailSent).toBe(false);
      expect(body.emailError).toBe("SMTP connection failed");
      expect(body.inviteLink).toContain("/invite/");
    });

    it("should still create invitation when email fails (graceful degradation)", async () => {
      mockAuthenticatedUser();
      mockEmailFailure("Resend API rate limit exceeded");
      const chainable = setupDbMock();

      // Mock team membership with owner role
      chainable.limit.mockResolvedValueOnce([
        { id: mockTeamId, name: "Test Team", slug: "test-team", role: "owner" },
      ]);

      // Mock no existing member
      chainable.limit.mockResolvedValueOnce([]);

      // Mock no existing invitation
      chainable.limit.mockResolvedValueOnce([]);

      // Mock invitation creation
      const mockInvitation = {
        id: mockInvitationId,
        email: "invitee@example.com",
        role: "viewer",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };
      chainable.returning.mockResolvedValueOnce([mockInvitation]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$post(
        {
          param: { id: mockTeamId },
          json: {
            email: "invitee@example.com",
            role: "viewer",
          },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      // Should return 201 (invitation created) even though email failed
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.id).toBe(mockInvitationId);
      expect(body.email).toBe("invitee@example.com");
      expect(body.role).toBe("viewer");
      expect(body.emailSent).toBe(false);
      expect(body.emailError).toBe("Resend API rate limit exceeded");
      // Admin can use this link to share manually
      expect(body.inviteLink).toBeDefined();
      expect(body.inviteLink).toMatch(/\/invite\/[a-f0-9]+/);
    });
  });

  // ============================================================================
  // GET /api/teams/:id/invitations - List pending invitations
  // ============================================================================
  describe("GET /api/teams/:id/invitations", () => {
    it("should return 401 when not authenticated", async () => {
      mockNoAuth();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$get({
        param: { id: mockTeamId },
      });

      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid team UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"].$get(
        {
          param: { id: "not-a-uuid" },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // DELETE /api/teams/:id/invitations/:invitationId - Revoke invitation
  // ============================================================================
  describe("DELETE /api/teams/:id/invitations/:invitationId", () => {
    it("should return 401 when not authenticated", async () => {
      mockNoAuth();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"][":invitationId"].$delete({
        param: { id: mockTeamId, invitationId: mockInvitationId },
      });

      expect(res.status).toBe(401);
    });

    it("should return 400 for invalid team UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"][":invitationId"].$delete(
        {
          param: { id: "not-a-uuid", invitationId: mockInvitationId },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for invalid invitation UUID", async () => {
      mockAuthenticatedUser();

      const client = testClient(invitationsApp);
      const res = await client["api"]["teams"][":id"]["invitations"][":invitationId"].$delete(
        {
          param: { id: mockTeamId, invitationId: "not-a-uuid" },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      expect(res.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/invitations/:token - Get invitation details (public)
  // ============================================================================
  describe("GET /api/invitations/:token", () => {
    it("should return 404 for invalid/empty token", async () => {
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["invitations"][":token"].$get({
        param: { token: "short" },
      });

      // Token not found in database
      expect(res.status).toBe(404);
    });

    it("should accept valid token format", async () => {
      const chainable = setupDbMock();

      // Mock invitation not found
      chainable.limit.mockResolvedValue([]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["invitations"][":token"].$get({
        param: { token: mockToken },
      });

      // Should return 404 because invitation not found
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // POST /api/invitations/:token/accept - Accept invitation
  // ============================================================================
  describe("POST /api/invitations/:token/accept", () => {
    it("should return 401 when not authenticated", async () => {
      mockNoAuth();

      const client = testClient(invitationsApp);
      const res = await client["api"]["invitations"][":token"]["accept"].$post({
        param: { token: mockToken },
      });

      expect(res.status).toBe(401);
    });

    it("should return 404 for invalid/short token", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["invitations"][":token"]["accept"].$post(
        {
          param: { token: "short" },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      // Token not found in database
      expect(res.status).toBe(404);
    });

    it("should accept valid token and check invitation", async () => {
      mockAuthenticatedUser();
      const chainable = setupDbMock();

      // Mock invitation not found
      chainable.limit.mockResolvedValue([]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["invitations"][":token"]["accept"].$post(
        {
          param: { token: mockToken },
        },
        {
          headers: {
            cookie: "session=" + mockToken,
          },
        }
      );

      // Should return 404 because invitation not found
      expect(res.status).toBe(404);
    });
  });

  // ============================================================================
  // POST /api/invitations/:token/decline - Decline invitation
  // ============================================================================
  describe("POST /api/invitations/:token/decline", () => {
    it("should return 404 for invalid/short token", async () => {
      const chainable = setupDbMock();
      chainable.limit.mockResolvedValue([]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["invitations"][":token"]["decline"].$post({
        param: { token: "short" },
      });

      // Token not found in database
      expect(res.status).toBe(404);
    });

    it("should accept valid token and check invitation", async () => {
      const chainable = setupDbMock();

      // Mock invitation not found
      chainable.limit.mockResolvedValue([]);

      const client = testClient(invitationsApp);
      const res = await client["api"]["invitations"][":token"]["decline"].$post({
        param: { token: mockToken },
      });

      // Should return 404 because invitation not found
      expect(res.status).toBe(404);
    });
  });
});
