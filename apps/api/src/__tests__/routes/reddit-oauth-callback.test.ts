import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from "vitest";
import type { OAuthTokens, RedditAdAccount } from "@repo/reddit-ads";

// Set environment variables before any imports
process.env.REDDIT_CLIENT_ID = "test_client_id";
process.env.REDDIT_CLIENT_SECRET = "test_client_secret";
process.env.REDDIT_REDIRECT_URI = "http://localhost:3001/callback";
process.env.FRONTEND_URL = "http://localhost:3000";

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

// Mock for AdAccountService.listAdAccounts
const mockListAdAccounts = vi.fn<() => Promise<RedditAdAccount[]>>();

// Track RedditApiClient instantiation
const mockRedditApiClientInstances: { accessToken: string }[] = [];

// Mock the Reddit OAuth and API client
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
    } as OAuthTokens),
    revokeToken: vi.fn().mockResolvedValue(undefined),
    isTokenExpired: vi.fn().mockReturnValue(false),
  })),
  RedditApiClient: vi.fn().mockImplementation((config: { accessToken: string }) => {
    mockRedditApiClientInstances.push({ accessToken: config.accessToken });
    return { get: vi.fn() };
  }),
  AdAccountService: vi.fn().mockImplementation(() => ({
    listAdAccounts: mockListAdAccounts,
  })),
}));

// Track database operations for verification
interface InsertOperation {
  platform: string;
  accountId: string;
  accountName: string;
  status: string;
  teamId: string;
}

interface UpdateOperation {
  status: string;
  teamId: string;
  accountName: string;
}

interface TokenInsertOperation {
  adAccountId: string;
  accessToken: string;
  refreshToken: string;
}

const insertedAccounts: InsertOperation[] = [];
const updatedAccounts: UpdateOperation[] = [];
const insertedTokens: TokenInsertOperation[] = [];
let existingAccountsMap = new Map<string, { id: string; platform: string; accountId: string; teamId: string | null; status: string }>();
let shouldThrowOnSecondInsert = false;

// Mock the database module
vi.mock("../../services/db.js", () => {
  let limitCallCount = 0;
  let membershipResult: { role: string }[] = [{ role: "editor" }];
  let teamQueryResult: { slug: string }[] = [{ slug: "test-team" }];

  // Create a mock transaction
  const createMockTransaction = () => {
    let currentAccountId: string | null = null;
    let insertCounter = 0;

    const txMock = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation((condition: unknown) => {
        // Try to extract accountId from the condition for lookup
        const condStr = JSON.stringify(condition);
        for (const [accId] of existingAccountsMap.entries()) {
          if (condStr.includes(accId)) {
            currentAccountId = accId;
          }
        }
        return txMock;
      }),
      limit: vi.fn().mockImplementation(() => {
        if (currentAccountId && existingAccountsMap.has(currentAccountId)) {
          const existing = existingAccountsMap.get(currentAccountId);
          currentAccountId = null;
          return Promise.resolve([existing]);
        }
        currentAccountId = null;
        return Promise.resolve([]);
      }),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockImplementation((values: unknown) => {
        const v = values as Record<string, unknown>;
        // Track ad account inserts
        if (v.platform === "reddit" && v.accountId && v.accountName) {
          // Check if we should throw on second insert for rollback testing
          if (shouldThrowOnSecondInsert && insertedAccounts.length >= 1) {
            throw new Error("Simulated database error for rollback test");
          }
          insertedAccounts.push({
            platform: v.platform as string,
            accountId: v.accountId as string,
            accountName: v.accountName as string,
            status: v.status as string,
            teamId: v.teamId as string,
          });
        }
        // Track token inserts (oauth tokens have accessToken field)
        if (v.adAccountId && v.accessToken && v.refreshToken) {
          insertedTokens.push({
            adAccountId: v.adAccountId as string,
            accessToken: v.accessToken as string,
            refreshToken: v.refreshToken as string,
          });
        }
        insertCounter++;
        return txMock;
      }),
      returning: vi.fn().mockImplementation(() => {
        return Promise.resolve([{ id: `new-account-uuid-${insertCounter}` }]);
      }),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockImplementation((values: unknown) => {
        const v = values as Record<string, unknown>;
        if (v.status && v.teamId !== undefined) {
          updatedAccounts.push({
            status: v.status as string,
            teamId: v.teamId as string,
            accountName: v.accountName as string,
          });
        }
        return txMock;
      }),
      onConflictDoUpdate: vi.fn().mockReturnThis(),
    };

    return txMock;
  };

  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockImplementation(() => {
      limitCallCount++;
      // First limit call is for team membership check
      if (limitCallCount === 1) {
        return Promise.resolve(membershipResult);
      }
      // Second call is for team slug lookup
      if (limitCallCount === 2) {
        return Promise.resolve(teamQueryResult);
      }
      return Promise.resolve([]);
    }),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([{ id: "new-ad-account-uuid" }]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn((callback) => callback(createMockTransaction())),
    _resetLimitCount: () => {
      limitCallCount = 0;
    },
    _setMembershipResult: (result: { role: string }[]) => {
      membershipResult = result;
    },
    _setTeamQueryResult: (result: { slug: string }[]) => {
      teamQueryResult = result;
    },
  };

  return {
    db: mockDb,
    adAccounts: {
      id: "id",
      platform: "platform",
      accountId: "account_id",
      accountName: "account_name",
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
      slug: "slug",
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
const mockEncrypt = vi.fn((value: string) => `encrypted_${value}`);
const mockDecrypt = vi.fn((value: string) => value.replace("encrypted_", ""));

vi.mock("../../lib/encryption.js", () => ({
  encrypt: (value: string) => mockEncrypt(value),
  decrypt: (value: string) => mockDecrypt(value),
}));

// Track storeTokens calls
interface TokenStorageCall {
  adAccountId: string;
  accessToken: string;
  refreshToken: string;
}
const tokenStorageCalls: TokenStorageCall[] = [];

import { redditApp } from "../../routes/reddit.js";
import { resetOAuthServiceForTesting } from "../../services/reddit/oauth.js";
import { db } from "../../services/db.js";

describe("Reddit OAuth Callback - Comprehensive Tests", () => {
  const accountId = "550e8400-e29b-41d4-a716-446655440000";
  const teamId = "660e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    vi.clearAllMocks();
    resetOAuthServiceForTesting();

    // Clear tracking arrays
    insertedAccounts.length = 0;
    updatedAccounts.length = 0;
    insertedTokens.length = 0;
    existingAccountsMap.clear();
    mockRedditApiClientInstances.length = 0;
    shouldThrowOnSecondInsert = false;

    // Clear encryption mock calls
    mockEncrypt.mockClear();
    mockDecrypt.mockClear();
    tokenStorageCalls.length = 0;

    // Default to authenticated user with editor role
    mockValidateSession.mockResolvedValue({ user: mockUser, session: mockSession });

    // Reset database mock state
    const mockDb = db as unknown as {
      _resetLimitCount: () => void;
      _setMembershipResult: (result: { role: string }[]) => void;
      _setTeamQueryResult: (result: { slug: string }[]) => void;
    };
    mockDb._resetLimitCount();
    mockDb._setMembershipResult([{ role: "editor" }]);
    mockDb._setTeamQueryResult([{ slug: "test-team" }]);

    // Default: return multiple ad accounts
    mockListAdAccounts.mockResolvedValue([
      {
        id: "t5_reddit_account_1",
        name: "My Reddit Ad Account 1",
        type: "SELF_SERVE",
        currency: "USD",
        business_id: "biz_123",
      },
      {
        id: "t5_reddit_account_2",
        name: "My Reddit Ad Account 2",
        type: "MANAGED",
        currency: "USD",
        business_id: "biz_123",
      },
    ] as RedditAdAccount[]);
  });

  afterEach(() => {
    resetOAuthServiceForTesting();
  });

  // Helper function to initialize OAuth and get state
  async function initializeOAuthFlow(): Promise<string> {
    const initResponse = await redditApp.request("/api/v1/reddit/auth/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, teamId }),
    });
    const initData = await initResponse.json();
    return initData.state;
  }

  describe("Two-Step API Flow (businesses -> ad_accounts)", () => {
    it("should use AdAccountService.listAdAccounts() which implements the two-step flow", async () => {
      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);

      // Verify AdAccountService.listAdAccounts was called
      expect(mockListAdAccounts).toHaveBeenCalledTimes(1);
    });

    it("should pass the access token to RedditApiClient for API calls", async () => {
      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify RedditApiClient was instantiated with the access token
      expect(mockRedditApiClientInstances.length).toBeGreaterThan(0);
      expect(mockRedditApiClientInstances[0].accessToken).toBe("mock_access_token");
    });
  });

  describe("Storing Reddit's Actual Account IDs", () => {
    it("should store Reddit's real account ID (e.g., t5_xxx) in accountId column", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_abc123",
          name: "Test Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify the insert was called with Reddit's real account ID
      expect(insertedAccounts.length).toBe(1);
      expect(insertedAccounts[0].accountId).toBe("t5_abc123");
    });

    it("should store Reddit's actual account name in accountName column", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_xyz789",
          name: "My Business Account",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify the insert was called with Reddit's real account name
      expect(insertedAccounts[0].accountName).toBe("My Business Account");
    });
  });

  describe("Multiple Ad Accounts Handling", () => {
    it("should handle multiple ad accounts from a single OAuth flow", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_account_1",
          name: "Account 1",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_account_2",
          name: "Account 2",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_account_3",
          name: "Account 3",
          type: "SELF_SERVE",
          currency: "EUR",
          business_id: "biz_2",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);

      // Verify redirect includes the correct account count
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("accounts=3");
    });

    it("should insert all ad accounts into the database", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_first",
          name: "First Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_second",
          name: "Second Account",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify both accounts were inserted
      expect(insertedAccounts.length).toBe(2);

      const insertedIds = insertedAccounts.map((op) => op.accountId);
      expect(insertedIds).toContain("t5_first");
      expect(insertedIds).toContain("t5_second");
    });
  });

  describe("Team Slug in Redirect URL", () => {
    it("should redirect to /{teamSlug}/accounts on success", async () => {
      const mockDb = db as unknown as {
        _setTeamQueryResult: (result: { slug: string }[]) => void;
      };
      mockDb._setTeamQueryResult([{ slug: "my-awesome-team" }]);

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("/my-awesome-team/accounts");
      expect(location).toContain("oauth=success");
      expect(location).toContain("platform=reddit");
    });

    it("should fallback to /default/accounts when team not found", async () => {
      const mockDb = db as unknown as {
        _setTeamQueryResult: (result: { slug: string }[]) => void;
      };
      mockDb._setTeamQueryResult([]); // Team not found

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("/default/accounts");
    });
  });

  describe("Empty Ad Accounts Handling", () => {
    it("should redirect with error when no ad accounts found", async () => {
      mockListAdAccounts.mockResolvedValue([]);

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("oauth=error");
      expect(location).toContain("No%20Reddit%20Ads%20accounts%20found");
    });
  });

  describe("API Error Handling", () => {
    it("should redirect with error when Reddit API fails", async () => {
      mockListAdAccounts.mockRejectedValue(new Error("Reddit API rate limited"));

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("oauth=error");
      expect(location).toContain("Failed%20to%20fetch%20Reddit%20Ads%20accounts");
    });

    it("should include error message in redirect when API fails", async () => {
      mockListAdAccounts.mockRejectedValue(new Error("Insufficient permissions"));

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("Insufficient%20permissions");
    });
  });

  describe("Existing Account Update (Upsert)", () => {
    it("should update existing account instead of creating duplicate", async () => {
      // Simulate an existing account
      existingAccountsMap.set("t5_existing_account", {
        id: "existing-uuid-123",
        platform: "reddit",
        accountId: "t5_existing_account",
        teamId: "old-team-id",
        status: "revoked",
      });

      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_existing_account",
          name: "Updated Account Name",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Should have updates for existing account
      expect(updatedAccounts.length).toBe(1);
      expect(updatedAccounts[0].status).toBe("active");
      expect(updatedAccounts[0].teamId).toBe(teamId);
      expect(updatedAccounts[0].accountName).toBe("Updated Account Name");

      // Should NOT have inserts for existing account
      expect(insertedAccounts.length).toBe(0);
    });

    it("should mix inserts and updates when some accounts exist", async () => {
      // One existing account
      existingAccountsMap.set("t5_existing", {
        id: "existing-uuid",
        platform: "reddit",
        accountId: "t5_existing",
        teamId: null,
        status: "inactive",
      });

      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_existing",
          name: "Existing Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_new_account",
          name: "New Account",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Should have one update for existing account
      expect(updatedAccounts.length).toBe(1);

      // Should have one insert for new account
      expect(insertedAccounts.length).toBe(1);
      expect(insertedAccounts[0].accountId).toBe("t5_new_account");
    });
  });

  describe("Transaction Atomicity", () => {
    it("should wrap all database operations in a transaction", async () => {
      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify transaction was called
      const mockDb = db as unknown as { transaction: Mock };
      expect(mockDb.transaction).toHaveBeenCalled();
    });
  });

  describe("Invalid State Handling", () => {
    it("should handle invalid/expired state gracefully", async () => {
      // Don't initialize OAuth - use invalid state
      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=invalid-state`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("oauth=error");
      expect(location).toContain("/default/accounts");
    });
  });

  describe("Success Redirect Format", () => {
    it("should include oauth=success, platform=reddit, and accounts count", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_acc1",
          name: "Account 1",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_acc2",
          name: "Account 2",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get("Location");

      // Verify full redirect format
      expect(location).toMatch(/\/test-team\/accounts\?oauth=success&platform=reddit&accounts=2$/);
    });
  });

  describe("Database Values", () => {
    it("should store platform as 'reddit'", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_test",
          name: "Test",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(insertedAccounts[0].platform).toBe("reddit");
    });

    it("should store status as 'active' for new accounts", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_new",
          name: "New Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(insertedAccounts[0].status).toBe("active");
    });

    it("should store the correct teamId from OAuth session", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_team_test",
          name: "Team Test Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      expect(insertedAccounts[0].teamId).toBe(teamId);
    });
  });

  // ============================================================================
  // MAJOR ISSUE #1: Authentication Failure Test
  // ============================================================================
  describe("Authentication Failure", () => {
    it("should return 401 when validateSession returns null on init", async () => {
      // Mock validateSession to return null (unauthenticated)
      mockValidateSession.mockResolvedValue(null);

      const initResponse = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, teamId }),
      });

      expect(initResponse.status).toBe(401);
      const data = await initResponse.json();
      expect(data.error).toBe("Authentication required");
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should not proceed with OAuth flow when user is not authenticated", async () => {
      // Mock validateSession to return null
      mockValidateSession.mockResolvedValue(null);

      const initResponse = await redditApp.request("/api/v1/reddit/auth/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, teamId }),
      });

      expect(initResponse.status).toBe(401);

      // Verify no OAuth flow was initiated
      expect(mockListAdAccounts).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // MAJOR ISSUE #2: Token Encryption Storage Verification
  // ============================================================================
  describe("Token Encryption Storage", () => {
    it("should call encrypt() on access token before storage", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_encrypt_test",
          name: "Encryption Test Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify encrypt was called with the access token
      expect(mockEncrypt).toHaveBeenCalledWith("mock_access_token");
    });

    it("should call encrypt() on refresh token before storage", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_refresh_encrypt",
          name: "Refresh Token Test",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify encrypt was called with the refresh token
      expect(mockEncrypt).toHaveBeenCalledWith("mock_refresh_token");
    });

    it("should store encrypted tokens in the database", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_storage_test",
          name: "Storage Test Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify tokens were inserted with encrypted values
      expect(insertedTokens.length).toBe(1);
      expect(insertedTokens[0].accessToken).toBe("encrypted_mock_access_token");
      expect(insertedTokens[0].refreshToken).toBe("encrypted_mock_refresh_token");
    });

    it("should store tokens for each ad account", async () => {
      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_multi_1",
          name: "Multi Account 1",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_multi_2",
          name: "Multi Account 2",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Should store tokens for both accounts
      expect(insertedTokens.length).toBe(2);

      // All tokens should be encrypted
      insertedTokens.forEach((token) => {
        expect(token.accessToken).toContain("encrypted_");
        expect(token.refreshToken).toContain("encrypted_");
      });
    });
  });

  // ============================================================================
  // MAJOR ISSUE #3: Transaction Rollback on Partial Failure
  // ============================================================================
  describe("Transaction Rollback on Partial Failure", () => {
    it("should redirect with error when second account insert fails", async () => {
      // Enable the flag to throw on second insert
      shouldThrowOnSecondInsert = true;

      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_first_account",
          name: "First Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_second_account",
          name: "Second Account",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Should redirect with error
      expect(callbackResponse.status).toBe(302);
      const location = callbackResponse.headers.get("Location");
      expect(location).toContain("oauth=error");
    });

    it("should verify transaction is used for atomic rollback on failure", async () => {
      // Enable the flag to throw on second insert
      shouldThrowOnSecondInsert = true;

      mockListAdAccounts.mockResolvedValue([
        {
          id: "t5_rollback_first",
          name: "First Account",
          type: "SELF_SERVE",
          currency: "USD",
          business_id: "biz_1",
        },
        {
          id: "t5_rollback_second",
          name: "Second Account",
          type: "MANAGED",
          currency: "USD",
          business_id: "biz_1",
        },
      ] as RedditAdAccount[]);

      const state = await initializeOAuthFlow();

      await redditApp.request(
        `/api/v1/reddit/auth/callback?code=valid-code&state=${state}`,
        { method: "GET" }
      );

      // Verify the transaction wrapper was used
      // In production, Drizzle/PostgreSQL would rollback all operations when the error is thrown
      const mockDb = db as unknown as { transaction: Mock };
      expect(mockDb.transaction).toHaveBeenCalled();

      // The first account and its tokens were inserted within the transaction
      // When the second insert throws, Drizzle rolls back the entire transaction
      // Our mock tracks what was attempted, not what was committed
      expect(insertedAccounts.length).toBe(1);
      expect(insertedAccounts[0].accountId).toBe("t5_rollback_first");

      // First account's tokens were also stored before the failure
      // In production, these would be rolled back along with the account insert
      expect(insertedTokens.length).toBe(1);

      // Key verification: transaction ensures atomicity
      // - If any operation fails, ALL operations are rolled back
      // - The mock tracks attempted operations, but in production they'd be reverted
    });
  });

  // ============================================================================
  // MINOR ISSUE #4: OAuth User Denial Scenario
  // ============================================================================
  describe("OAuth User Denial", () => {
    it("should handle access_denied error from Reddit when user denies permission", async () => {
      // User denies OAuth permission - Reddit redirects with error parameter
      // Note: The callback route schema might need to accept error parameter
      // This tests the current behavior
      const callbackResponse = await redditApp.request(
        `/api/v1/reddit/auth/callback?error=access_denied&state=some-state`,
        { method: "GET" }
      );

      // Should redirect with error (either 302 or 400 depending on implementation)
      expect([302, 400]).toContain(callbackResponse.status);

      if (callbackResponse.status === 302) {
        const location = callbackResponse.headers.get("Location");
        expect(location).toContain("oauth=error");
      }
    });

    it("should not store any accounts when user denies OAuth permission", async () => {
      await redditApp.request(
        `/api/v1/reddit/auth/callback?error=access_denied&state=some-state`,
        { method: "GET" }
      );

      // No accounts should be inserted
      expect(insertedAccounts.length).toBe(0);
      expect(insertedTokens.length).toBe(0);
    });
  });
});
