import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { OAuthTokens } from "@repo/reddit-ads";

// Set environment variables before any imports
process.env.REDDIT_CLIENT_ID = "test_client_id";
process.env.REDDIT_CLIENT_SECRET = "test_client_secret";
process.env.REDDIT_REDIRECT_URI = "http://localhost:3001/callback";

// Mock user and session data
const mockUserId = "user-123";
const mockUser = {
  id: mockUserId,
  email: "test@example.com",
  name: "Test User",
};
const mockSession = {
  id: "session-123",
  userId: mockUserId,
};

// Mock validateSession
const mockValidateSession = vi.fn();
vi.mock("../../middleware/auth.js", () => ({
  validateSession: () => mockValidateSession(),
}));

// Mock the Reddit OAuth library
vi.mock("@repo/reddit-ads", () => ({
  RedditOAuth: vi.fn().mockImplementation(() => ({
    getAuthorizationUrl: vi.fn().mockReturnValue({
      url: "https://www.reddit.com/api/v1/authorize?test=1",
      state: "mock-state-uuid",
      codeVerifier: "mock-code-verifier",
    }),
    exchangeCodeForTokens: vi.fn().mockResolvedValue({
      accessToken: "mock_access_token",
      refreshToken: "mock_refresh_token",
      tokenType: "bearer",
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000),
      scope: ["adsread", "history"],
    }),
    revokeToken: vi.fn().mockResolvedValue(undefined),
    isTokenExpired: vi.fn().mockReturnValue(false),
  })),
}));

// Mock the database module
vi.mock("../../services/db.js", () => {
  const mockTransaction = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "new-ad-account-uuid" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
  };

  // Track limit call count to differentiate between team membership query and ad account query
  let limitCallCount = 0;

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      limitCallCount++;
      // First limit call is for team membership check, return editor role by default
      if (limitCallCount === 1) {
        return Promise.resolve([{ role: "editor" }]);
      }
      // Subsequent calls are for ad accounts
      return Promise.resolve([]);
    }),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "new-ad-account-uuid" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn((callback) => callback(mockTransaction)),
    _mockTransaction: mockTransaction,
    _resetLimitCount: () => {
      limitCallCount = 0;
    },
    _setMembershipResult: (result: { role: string }[] | []) => {
      // Store the membership result to be returned on first limit call
      mockDb.limit.mockImplementation(() => {
        limitCallCount++;
        if (limitCallCount === 1) {
          return Promise.resolve(result);
        }
        return Promise.resolve([]);
      });
    },
  };

  return {
    db: mockDb,
    adAccounts: {
      id: "id",
      platform: "platform",
      accountId: "account_id",
      status: "status",
      teamId: "team_id",
    },
    oauthTokens: {
      id: "id",
      adAccountId: "ad_account_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      expiresAt: "expires_at",
      scopes: "scopes",
    },
    teams: {
      id: "id",
      name: "name",
    },
    teamMemberships: {
      id: "id",
      teamId: "team_id",
      userId: "user_id",
      role: "role",
    },
  };
});

// Mock encryption
vi.mock("../../lib/encryption.js", () => ({
  encrypt: vi.fn((value: string) => `encrypted_${value}`),
  decrypt: vi.fn((value: string) => value.replace("encrypted_", "")),
}));

import { redditApp } from "../../routes/reddit.js";
import { resetOAuthServiceForTesting } from "../../services/reddit/oauth.js";
import { db } from "../../services/db.js";

describe("Reddit OAuth Routes - Team Linking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetOAuthServiceForTesting();
    // Default to authenticated user with editor role
    mockValidateSession.mockResolvedValue({ user: mockUser, session: mockSession });
    // Reset limit call counter
    (db as unknown as { _resetLimitCount: () => void })._resetLimitCount();
    // Set default membership to editor
    (db as unknown as { _setMembershipResult: (result: { role: string }[]) => void })._setMembershipResult([{ role: "editor" }]);
  });

  afterEach(() => {
    resetOAuthServiceForTesting();
  });

  describe("POST /api/v1/reddit/auth/init - Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      mockValidateSession.mockResolvedValue(null);

      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Authentication required");
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 403 when user is not a member of the team", async () => {
      // Set up empty membership result (not a member)
      (db as unknown as { _setMembershipResult: (result: { role: string }[]) => void })._setMembershipResult([]);

      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Not a member of this team");
      expect(data.code).toBe("FORBIDDEN");
    });

    it("should return 403 when user has viewer role (insufficient permissions)", async () => {
      // Set up viewer role (insufficient)
      (db as unknown as { _setMembershipResult: (result: { role: string }[]) => void })._setMembershipResult([{ role: "viewer" }]);

      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Insufficient permissions. Editor role or higher required.");
      expect(data.code).toBe("FORBIDDEN");
    });

    it("should allow user with editor role", async () => {
      (db as unknown as { _setMembershipResult: (result: { role: string }[]) => void })._setMembershipResult([{ role: "editor" }]);

      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authorizationUrl).toBeDefined();
      expect(data.state).toBeDefined();
    });

    it("should allow user with admin role", async () => {
      (db as unknown as { _setMembershipResult: (result: { role: string }[]) => void })._setMembershipResult([{ role: "admin" }]);

      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authorizationUrl).toBeDefined();
    });

    it("should allow user with owner role", async () => {
      (db as unknown as { _setMembershipResult: (result: { role: string }[]) => void })._setMembershipResult([{ role: "owner" }]);

      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authorizationUrl).toBeDefined();
    });
  });

  describe("POST /api/v1/reddit/auth/init - Validation", () => {
    it("should require teamId in request body", async () => {
      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          // Missing teamId
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should validate teamId is a valid UUID", async () => {
      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "not-a-valid-uuid",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return authorization URL and state when teamId is provided", async () => {
      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.authorizationUrl).toBeDefined();
      expect(data.authorizationUrl).toContain("reddit.com");
      expect(data.state).toBeDefined();
    });

    it("should accept optional redirectUri alongside teamId", async () => {
      const response = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: "550e8400-e29b-41d4-a716-446655440000",
          teamId: "660e8400-e29b-41d4-a716-446655440001",
          redirectUri: "https://example.com/callback",
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.authorizationUrl).toBeDefined();
    });
  });

  describe("GET /api/v1/reddit/auth/callback", () => {
    it("should redirect with pending_selection status (new account selection flow)", async () => {
      const accountId = "550e8400-e29b-41d4-a716-446655440000";
      const teamId = "660e8400-e29b-41d4-a716-446655440001";

      // First initialize OAuth to get a valid state
      const initResponse = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, teamId }),
      });

      const initData = await initResponse.json();
      const state = initData.state;

      // Now call the callback with the state
      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Should redirect (302)
      expect(callbackResponse.status).toBe(302);

      // The redirect should be to pending_selection URL (new flow - user selects accounts via modal)
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("oauth=pending_selection");
      expect(location).toContain("platform=reddit");
    });

    it("should store pending tokens instead of creating ad accounts directly (new flow)", async () => {
      const accountId = "550e8400-e29b-41d4-a716-446655440000";
      const teamId = "660e8400-e29b-41d4-a716-446655440001";

      // Initialize OAuth
      const initResponse = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, teamId }),
      });

      const initData = await initResponse.json();

      // Call callback
      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${initData.state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);

      // With the new pending_selection flow, tokens are stored temporarily
      // and NO database transaction should occur in the callback
      // The transaction only happens when user selects accounts via connect-accounts endpoint
      const mockDb = db as unknown as {
        transaction: ReturnType<typeof vi.fn>;
      };

      // Transaction should NOT be called in callback (tokens stored in memory)
      expect(mockDb.transaction).not.toHaveBeenCalled();
    });
  });
});
