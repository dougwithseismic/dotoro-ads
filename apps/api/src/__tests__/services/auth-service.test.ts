import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateSecureToken,
  hashToken,
  createMagicLink,
  verifyMagicLink,
  createSession,
  validateSession,
  revokeSession,
  revokeAllUserSessions,
  getOrCreateUser,
  MAGIC_LINK_EXPIRY_MS,
  SESSION_EXPIRY_MS,
} from "../../services/auth-service.js";

// Mock the database
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn((callback: (tx: unknown) => unknown) => callback({
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      })),
    },
    users: { id: "id", email: "email" },
    magicLinkTokens: { id: "id", token: "token", email: "email" },
    sessions: { id: "id", token: "token", userId: "user_id" },
  };
});

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateSecureToken", () => {
    it("should generate a 64-character hex string", () => {
      const token = generateSecureToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[a-f0-9]+$/);
    });

    it("should generate unique tokens", () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe("hashToken", () => {
    it("should produce consistent hash for same input", () => {
      const token = "a".repeat(64);
      const hash1 = hashToken(token);
      const hash2 = hashToken(token);
      expect(hash1).toBe(hash2);
    });

    it("should produce 64-character hex string (SHA-256)", () => {
      const token = generateSecureToken();
      const hash = hashToken(token);
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[a-f0-9]+$/);
    });

    it("should produce different hashes for different tokens", () => {
      const token1 = "a".repeat(64);
      const token2 = "b".repeat(64);
      const hash1 = hashToken(token1);
      const hash2 = hashToken(token2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Constants", () => {
    it("should have MAGIC_LINK_EXPIRY_MS as 15 minutes", () => {
      expect(MAGIC_LINK_EXPIRY_MS).toBe(15 * 60 * 1000);
    });

    it("should have SESSION_EXPIRY_MS as 7 days", () => {
      expect(SESSION_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });

  describe("getOrCreateUser", () => {
    it("should return existing user if found", async () => {
      const { db, users } = await import("../../services/db.js");
      const mockUser = {
        id: "user-id",
        email: "test@example.com",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const result = await getOrCreateUser("test@example.com");

      expect(result.user).toEqual(mockUser);
      expect(result.isNewUser).toBe(false);
    });

    it("should create new user if not found", async () => {
      const { db, users } = await import("../../services/db.js");
      const mockNewUser = {
        id: "new-user-id",
        email: "new@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      // First select returns empty (no user found)
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      // Insert returns the new user
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockNewUser]),
        }),
      });
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const result = await getOrCreateUser("new@example.com");

      expect(result.user).toEqual(mockNewUser);
      expect(result.isNewUser).toBe(true);
    });
  });

  describe("createMagicLink", () => {
    it("should return a magic link URL with token", async () => {
      const { db, users, magicLinkTokens } = await import("../../services/db.js");
      const mockUser = {
        id: "user-id",
        email: "test@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      // Mock getOrCreateUser to return existing user
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      // Mock token insert
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "token-id" }]),
        }),
      });
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const result = await createMagicLink("test@example.com", "https://app.test.com");

      expect(result.success).toBe(true);
      expect(result.magicLinkUrl).toContain("https://app.test.com/verify?token=");
      expect(result.magicLinkUrl).toMatch(/token=[a-f0-9]{64}/);
      expect(result.expiresAt).toBeDefined();
      expect(result.isNewUser).toBe(false);
    });

    it("should set expiration 15 minutes in the future", async () => {
      const { db } = await import("../../services/db.js");
      const mockUser = {
        id: "user-id",
        email: "test@example.com",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockUser]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "token-id" }]),
        }),
      });
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const before = Date.now();
      const result = await createMagicLink("test@example.com", "https://app.test.com");
      const after = Date.now();

      const expiresAt = result.expiresAt!.getTime();
      const expectedMin = before + MAGIC_LINK_EXPIRY_MS;
      const expectedMax = after + MAGIC_LINK_EXPIRY_MS;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });
  });

  describe("verifyMagicLink", () => {
    it("should return error for invalid token", async () => {
      const { db } = await import("../../services/db.js");

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const result = await verifyMagicLink("a".repeat(64));

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired token");
    });

    it("should return error for expired token", async () => {
      const { db } = await import("../../services/db.js");

      const mockToken = {
        id: "token-id",
        userId: "user-id",
        email: "test@example.com",
        token: "hashed-token",
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
        usedAt: null,
        createdAt: new Date(),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockToken]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const result = await verifyMagicLink("a".repeat(64));

      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid or expired token");
    });

    it("should return error for already used token", async () => {
      const { db } = await import("../../services/db.js");

      const mockToken = {
        id: "token-id",
        userId: "user-id",
        email: "test@example.com",
        token: "hashed-token",
        expiresAt: new Date(Date.now() + 60000), // expires in 1 minute
        usedAt: new Date(), // already used
        createdAt: new Date(),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockToken]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const result = await verifyMagicLink("a".repeat(64));

      expect(result.success).toBe(false);
      expect(result.error).toBe("Token has already been used");
    });
  });

  describe("createSession", () => {
    it("should create session and return token", async () => {
      const { db } = await import("../../services/db.js");

      const mockSession = {
        id: "session-id",
        userId: "user-id",
        token: "hashed-token",
        expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
        userAgent: "Test Agent",
        ipAddress: "127.0.0.1",
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockSession]),
        }),
      });
      (db.insert as ReturnType<typeof vi.fn>).mockImplementation(mockInsert);

      const result = await createSession("user-id", {
        userAgent: "Test Agent",
        ipAddress: "127.0.0.1",
      });

      expect(result.sessionToken).toHaveLength(64);
      expect(result.session).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe("validateSession", () => {
    it("should return null for invalid session token", async () => {
      const { db } = await import("../../services/db.js");

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      const result = await validateSession("invalid-token");

      expect(result).toBeNull();
    });

    it("should return null for expired session", async () => {
      const { db } = await import("../../services/db.js");

      const mockSession = {
        id: "session-id",
        userId: "user-id",
        token: "hashed-token",
        expiresAt: new Date(Date.now() - 1000), // expired
        userAgent: null,
        ipAddress: null,
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockSession]),
          }),
        }),
      });
      (db.select as ReturnType<typeof vi.fn>).mockImplementation(mockSelect);

      // Mock delete for cleanup
      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      (db.delete as ReturnType<typeof vi.fn>).mockImplementation(mockDelete);

      const result = await validateSession("a".repeat(64));

      expect(result).toBeNull();
    });
  });

  describe("revokeSession", () => {
    it("should delete session by id", async () => {
      const { db } = await import("../../services/db.js");

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      });
      (db.delete as ReturnType<typeof vi.fn>).mockImplementation(mockDelete);

      await revokeSession("session-id");

      expect(db.delete).toHaveBeenCalled();
    });
  });

  describe("revokeAllUserSessions", () => {
    it("should delete all sessions for user", async () => {
      const { db } = await import("../../services/db.js");

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 3 }),
      });
      (db.delete as ReturnType<typeof vi.fn>).mockImplementation(mockDelete);

      await revokeAllUserSessions("user-id");

      expect(db.delete).toHaveBeenCalled();
    });
  });
});
