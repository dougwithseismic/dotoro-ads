import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { OAuthTokens } from "@repo/reddit-ads";

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
    refreshAccessToken: vi.fn().mockResolvedValue({
      accessToken: "refreshed_access_token",
      refreshToken: "refreshed_refresh_token",
      tokenType: "bearer",
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000),
      scope: ["adsread", "history"],
    }),
    revokeToken: vi.fn().mockResolvedValue(undefined),
    isTokenExpired: vi.fn().mockReturnValue(false),
  })),
}));

// Mock the database module - must be hoisted
vi.mock("../../services/db.js", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
  };
  return {
    db: mockDb,
    adAccounts: {
      id: "id",
      platform: "platform",
      accountId: "account_id",
      status: "status",
    },
    oauthTokens: {
      id: "id",
      adAccountId: "ad_account_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      expiresAt: "expires_at",
      scopes: "scopes",
    },
  };
});

// Mock encryption module
vi.mock("../../lib/encryption.js", () => ({
  encrypt: vi.fn((value: string) => ({
    encrypted: `encrypted_${value}`,
    iv: "mock_iv",
    authTag: "mock_auth_tag",
  })),
  decrypt: vi.fn((data: { encrypted: string }) => {
    const match = data.encrypted.match(/^encrypted_(.+)$/);
    return match ? match[1] : data.encrypted;
  }),
}));

// Import after mocking
import {
  RedditOAuthService,
  resetOAuthServiceForTesting,
} from "../../services/reddit/oauth.js";
import { db } from "../../services/db.js";

// Get the mock db for test assertions
const mockDb = db as unknown as {
  select: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  values: ReturnType<typeof vi.fn>;
  onConflictDoUpdate: ReturnType<typeof vi.fn>;
  returning: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe("RedditOAuthService Database Storage", () => {
  let service: RedditOAuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    resetOAuthServiceForTesting();

    // Reset mock chain methods
    mockDb.select.mockReturnThis();
    mockDb.from.mockReturnThis();
    mockDb.where.mockReturnThis();
    mockDb.insert.mockReturnThis();
    mockDb.values.mockReturnThis();
    mockDb.onConflictDoUpdate.mockReturnThis();
    mockDb.update.mockReturnThis();
    mockDb.set.mockReturnThis();
    mockDb.delete.mockReturnThis();

    service = new RedditOAuthService({
      clientId: "test_client_id",
      clientSecret: "test_client_secret",
      redirectUri: "http://localhost:3001/callback",
      scopes: ["adsread", "history"],
    });
  });

  afterEach(() => {
    resetOAuthServiceForTesting();
  });

  describe("storeTokens", () => {
    it("should store tokens in database with encryption", async () => {
      const adAccountId = "ad-account-uuid";
      const tokens: OAuthTokens = {
        accessToken: "test_access_token",
        refreshToken: "test_refresh_token",
        tokenType: "bearer",
        expiresIn: 3600,
        expiresAt: new Date(Date.now() + 3600000),
        scope: ["adsread", "history"],
      };

      await service.storeTokens(adAccountId, tokens);

      // Verify insert was called
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalledWith(
        expect.objectContaining({
          adAccountId,
          scopes: "adsread,history",
        })
      );
    });
  });

  describe("getValidTokens", () => {
    it("should return null when no tokens exist", async () => {
      // Mock empty result
      mockDb.limit.mockResolvedValueOnce([]);

      const tokens = await service.getValidTokens("non-existent-id");

      expect(tokens).toBeNull();
    });

    it("should return decrypted tokens when they exist and are valid", async () => {
      const futureDate = new Date(Date.now() + 3600000);

      // Mock account lookup
      mockDb.limit.mockResolvedValueOnce([
        {
          id: "token-uuid",
          adAccountId: "ad-account-uuid",
          accessToken: JSON.stringify({
            encrypted: "encrypted_test_access",
            iv: "iv",
            authTag: "tag",
          }),
          refreshToken: JSON.stringify({
            encrypted: "encrypted_test_refresh",
            iv: "iv",
            authTag: "tag",
          }),
          expiresAt: futureDate,
          scopes: "adsread,history",
        },
      ]);

      const tokens = await service.getValidTokens("ad-account-uuid");

      expect(tokens).not.toBeNull();
      expect(tokens?.accessToken).toBe("test_access");
      expect(tokens?.refreshToken).toBe("test_refresh");
      expect(tokens?.scope).toEqual(["adsread", "history"]);
    });
  });

  describe("hasValidTokens", () => {
    it("should return false when no tokens exist", async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const hasTokens = await service.hasValidTokens("non-existent-id");

      expect(hasTokens).toBe(false);
    });

    it("should return true when valid tokens exist", async () => {
      const futureDate = new Date(Date.now() + 3600000);

      mockDb.limit.mockResolvedValueOnce([
        {
          id: "token-uuid",
          adAccountId: "ad-account-uuid",
          expiresAt: futureDate,
        },
      ]);

      const hasTokens = await service.hasValidTokens("ad-account-uuid");

      expect(hasTokens).toBe(true);
    });

    it("should return false when tokens are expired", async () => {
      const pastDate = new Date(Date.now() - 3600000);

      mockDb.limit.mockResolvedValueOnce([
        {
          id: "token-uuid",
          adAccountId: "ad-account-uuid",
          expiresAt: pastDate,
        },
      ]);

      const hasTokens = await service.hasValidTokens("ad-account-uuid");

      expect(hasTokens).toBe(false);
    });
  });

  describe("revokeTokens", () => {
    it("should delete tokens from database", async () => {
      // Mock existing token
      mockDb.limit.mockResolvedValueOnce([
        {
          id: "token-uuid",
          adAccountId: "ad-account-uuid",
          accessToken: JSON.stringify({
            encrypted: "encrypted_test_access",
            iv: "iv",
            authTag: "tag",
          }),
          refreshToken: JSON.stringify({
            encrypted: "encrypted_test_refresh",
            iv: "iv",
            authTag: "tag",
          }),
        },
      ]);

      await service.revokeTokens("ad-account-uuid");

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should not throw when no tokens exist", async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      await expect(service.revokeTokens("non-existent-id")).resolves.not.toThrow();
    });
  });

  describe("initializeOAuth", () => {
    it("should create OAuth session and return authorization URL", () => {
      const result = service.initializeOAuth("ad-account-uuid");

      expect(result.authorizationUrl).toContain("reddit.com");
      expect(result.state).toBeDefined();
      expect(typeof result.state).toBe("string");
    });
  });
});
