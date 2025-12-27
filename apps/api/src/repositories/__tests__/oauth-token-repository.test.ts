/**
 * OAuth Token Repository Tests
 *
 * Tests for the repository implementation that handles CRUD operations
 * for user OAuth tokens with encryption.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock UUIDs for testing
const mockUserId = "user-123-abc";
const mockProvider = "google";
const mockTokenId = "token-456-def";

// Use vi.hoisted to hoist the mock functions so they're available in vi.mock
const {
  mockFindFirst,
  mockUpdate,
  mockSet,
  mockWhere,
  mockInsert,
  mockValues,
  mockOnConflictDoUpdate,
  mockDelete,
  mockDeleteWhere,
  mockDeleteReturning,
  mockEncrypt,
  mockDecrypt,
} = vi.hoisted(() => {
  const mockFindFirst = vi.fn();
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockInsert = vi.fn();
  const mockValues = vi.fn();
  const mockOnConflictDoUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockDeleteWhere = vi.fn();
  const mockDeleteReturning = vi.fn();
  const mockEncrypt = vi.fn();
  const mockDecrypt = vi.fn();

  // Setup chaining
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockWhere });
  mockWhere.mockResolvedValue({ rowCount: 1 });
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
  mockOnConflictDoUpdate.mockResolvedValue(undefined);

  // Delete chain: delete() -> where() -> returning() -> result array
  mockDelete.mockReturnValue({ where: mockDeleteWhere });
  mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
  mockDeleteReturning.mockResolvedValue([{ id: "deleted-id" }]);

  // Default encryption mocks
  mockEncrypt.mockImplementation((value: string) => `encrypted:${value}`);
  mockDecrypt.mockImplementation((value: string) =>
    value.startsWith("encrypted:") ? value.replace("encrypted:", "") : value
  );

  return {
    mockFindFirst,
    mockUpdate,
    mockSet,
    mockWhere,
    mockInsert,
    mockValues,
    mockOnConflictDoUpdate,
    mockDelete,
    mockDeleteWhere,
    mockDeleteReturning,
    mockEncrypt,
    mockDecrypt,
  };
});

// Mock the database module
vi.mock("../../services/db.js", () => {
  return {
    db: {
      update: mockUpdate,
      insert: mockInsert,
      delete: mockDelete,
      query: {
        userOAuthTokens: {
          findFirst: mockFindFirst,
        },
      },
    },
    userOAuthTokens: {
      id: "id",
      userId: "user_id",
      provider: "provider",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      expiresAt: "expires_at",
      scopes: "scopes",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  };
});

// Mock the encryption module
vi.mock("../../lib/encryption.js", () => {
  return {
    encrypt: mockEncrypt,
    decrypt: mockDecrypt,
  };
});

// Import after mocking
import {
  upsertTokens,
  getTokens,
  hasTokens,
  deleteTokens,
} from "../oauth-token-repository.js";

// Mock stored token data
const mockStoredToken = {
  id: mockTokenId,
  userId: mockUserId,
  provider: mockProvider,
  accessToken: "encrypted:access-token-123",
  refreshToken: "encrypted:refresh-token-456",
  expiresAt: new Date("2024-12-31T23:59:59Z"),
  scopes: "read write",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

describe("OAuth Token Repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock chains
    mockUpdate.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue({ rowCount: 1 });
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
    mockOnConflictDoUpdate.mockResolvedValue(undefined);

    // Reset delete chain
    mockDelete.mockReturnValue({ where: mockDeleteWhere });
    mockDeleteWhere.mockReturnValue({ returning: mockDeleteReturning });
    mockDeleteReturning.mockResolvedValue([{ id: "deleted-id" }]);

    // Reset encryption mocks
    mockEncrypt.mockImplementation((value: string) => `encrypted:${value}`);
    mockDecrypt.mockImplementation((value: string) =>
      value.startsWith("encrypted:") ? value.replace("encrypted:", "") : value
    );
  });

  // ============================================================================
  // upsertTokens Tests
  // ============================================================================

  describe("upsertTokens", () => {
    it("should insert new token record with encrypted tokens", async () => {
      // Arrange
      const credentials = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
        expiresAt: new Date("2024-12-31T23:59:59Z"),
        scopes: "read write",
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockInsert).toHaveBeenCalled();
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          provider: mockProvider,
          accessToken: "encrypted:access-token-123",
          refreshToken: "encrypted:refresh-token-456",
          expiresAt: credentials.expiresAt,
          scopes: credentials.scopes,
        })
      );
    });

    it("should update existing token record when userId+provider already exists", async () => {
      // Arrange
      const credentials = {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        expiresAt: new Date("2025-01-01T00:00:00Z"),
        scopes: "read write admin",
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert - onConflictDoUpdate should be called for upsert behavior
      expect(mockOnConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          set: expect.objectContaining({
            accessToken: "encrypted:new-access-token",
            refreshToken: "encrypted:new-refresh-token",
          }),
        })
      );
    });

    it("should encrypt accessToken before storage", async () => {
      // Arrange
      const credentials = {
        accessToken: "my-secret-access-token",
        refreshToken: null,
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockEncrypt).toHaveBeenCalledWith("my-secret-access-token");
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "encrypted:my-secret-access-token",
        })
      );
    });

    it("should encrypt refreshToken before storage when provided", async () => {
      // Arrange
      const credentials = {
        accessToken: "access-token",
        refreshToken: "my-secret-refresh-token",
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockEncrypt).toHaveBeenCalledWith("my-secret-refresh-token");
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: "encrypted:my-secret-refresh-token",
        })
      );
    });

    it("should handle null refreshToken without calling encrypt", async () => {
      // Arrange
      const credentials = {
        accessToken: "access-token",
        refreshToken: null,
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert - encrypt should only be called once for accessToken
      expect(mockEncrypt).toHaveBeenCalledTimes(1);
      expect(mockEncrypt).toHaveBeenCalledWith("access-token");
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          refreshToken: null,
        })
      );
    });

    it("should handle null expiresAt and scopes", async () => {
      // Arrange
      const credentials = {
        accessToken: "access-token",
        refreshToken: "refresh-token",
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: null,
          scopes: null,
        })
      );
    });
  });

  // ============================================================================
  // getTokens Tests
  // ============================================================================

  describe("getTokens", () => {
    it("should return null for non-existent user", async () => {
      // Arrange - Drizzle's findFirst returns undefined when no record is found
      mockFindFirst.mockResolvedValue(undefined);

      // Act
      const result = await getTokens("non-existent-user", mockProvider);

      // Assert
      expect(result).toBeNull();
      expect(mockFindFirst).toHaveBeenCalled();
    });

    // Note: Testing with invalid provider strings is no longer needed here because
    // TypeScript's OAuthProvider type prevents invalid providers at compile-time.
    // The "non-existent provider" case is now a type error, not a runtime check.

    it("should return decrypted credentials for existing user", async () => {
      // Arrange
      mockFindFirst.mockResolvedValue(mockStoredToken);

      // Act
      const result = await getTokens(mockUserId, mockProvider);

      // Assert
      expect(result).not.toBeNull();
      expect(result!.accessToken).toBe("access-token-123");
      expect(result!.refreshToken).toBe("refresh-token-456");
      expect(result!.expiresAt).toEqual(mockStoredToken.expiresAt);
      expect(result!.scopes).toBe("read write");
    });

    it("should call decrypt for accessToken when retrieving", async () => {
      // Arrange
      mockFindFirst.mockResolvedValue(mockStoredToken);

      // Act
      await getTokens(mockUserId, mockProvider);

      // Assert
      expect(mockDecrypt).toHaveBeenCalledWith("encrypted:access-token-123");
    });

    it("should call decrypt for refreshToken when retrieving", async () => {
      // Arrange
      mockFindFirst.mockResolvedValue(mockStoredToken);

      // Act
      await getTokens(mockUserId, mockProvider);

      // Assert
      expect(mockDecrypt).toHaveBeenCalledWith("encrypted:refresh-token-456");
    });

    it("should handle null refreshToken without calling decrypt", async () => {
      // Arrange
      const tokenWithNullRefresh = {
        ...mockStoredToken,
        refreshToken: null,
      };
      mockFindFirst.mockResolvedValue(tokenWithNullRefresh);

      // Act
      const result = await getTokens(mockUserId, mockProvider);

      // Assert - decrypt should only be called once for accessToken
      expect(mockDecrypt).toHaveBeenCalledTimes(1);
      expect(mockDecrypt).toHaveBeenCalledWith("encrypted:access-token-123");
      expect(result!.refreshToken).toBeNull();
    });

    it("should handle null expiresAt and scopes", async () => {
      // Arrange
      const tokenWithNulls = {
        ...mockStoredToken,
        expiresAt: null,
        scopes: null,
      };
      mockFindFirst.mockResolvedValue(tokenWithNulls);

      // Act
      const result = await getTokens(mockUserId, mockProvider);

      // Assert
      expect(result!.expiresAt).toBeNull();
      expect(result!.scopes).toBeNull();
    });
  });

  // ============================================================================
  // hasTokens Tests
  // ============================================================================

  describe("hasTokens", () => {
    it("should return false for non-existent user", async () => {
      // Arrange - Drizzle's findFirst returns undefined when no record is found
      mockFindFirst.mockResolvedValue(undefined);

      // Act
      const result = await hasTokens("non-existent-user", mockProvider);

      // Assert
      expect(result).toBe(false);
    });

    // Note: Testing with invalid provider strings is no longer needed here because
    // TypeScript's OAuthProvider type prevents invalid providers at compile-time.
    // The "non-existent provider" case is now a type error, not a runtime check.

    it("should return true for existing user with tokens", async () => {
      // Arrange
      mockFindFirst.mockResolvedValue(mockStoredToken);

      // Act
      const result = await hasTokens(mockUserId, mockProvider);

      // Assert
      expect(result).toBe(true);
    });

    it("should not decrypt tokens when just checking existence", async () => {
      // Arrange
      mockFindFirst.mockResolvedValue(mockStoredToken);

      // Act
      await hasTokens(mockUserId, mockProvider);

      // Assert - decrypt should not be called for hasTokens
      expect(mockDecrypt).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // deleteTokens Tests
  // ============================================================================

  describe("deleteTokens", () => {
    it("should remove token record and return true", async () => {
      // Arrange - returning array with one deleted record
      mockDeleteReturning.mockResolvedValue([{ id: mockTokenId }]);

      // Act
      const result = await deleteTokens(mockUserId, mockProvider);

      // Assert
      expect(result).toBe(true);
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should return false if no record to delete", async () => {
      // Arrange - returning empty array (no records deleted)
      mockDeleteReturning.mockResolvedValue([]);

      // Act
      const result = await deleteTokens(mockUserId, mockProvider);

      // Assert
      expect(result).toBe(false);
    });

    it("should delete by userId and provider combination", async () => {
      // Arrange
      mockDeleteReturning.mockResolvedValue([{ id: mockTokenId }]);

      // Act
      await deleteTokens(mockUserId, mockProvider);

      // Assert
      expect(mockDelete).toHaveBeenCalled();
      expect(mockDeleteWhere).toHaveBeenCalled();
      expect(mockDeleteReturning).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe("Edge cases and error handling", () => {
    it("should handle empty string accessToken", async () => {
      // Arrange
      const credentials = {
        accessToken: "",
        refreshToken: null,
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockEncrypt).toHaveBeenCalledWith("");
    });

    it("should handle special characters in tokens", async () => {
      // Arrange
      const credentials = {
        accessToken: "token!@#$%^&*()_+-=[]{}|;':\",./<>?",
        refreshToken: "refresh!@#$%^&*()",
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockEncrypt).toHaveBeenCalledWith(credentials.accessToken);
      expect(mockEncrypt).toHaveBeenCalledWith(credentials.refreshToken);
    });

    it("should handle very long tokens", async () => {
      // Arrange
      const longToken = "a".repeat(10000);
      const credentials = {
        accessToken: longToken,
        refreshToken: null,
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockEncrypt).toHaveBeenCalledWith(longToken);
    });

    it("should handle same provider for different users", async () => {
      // Arrange
      // Note: This test was updated from "different providers for same user" because
      // OAuthProvider is now a strict union type. When more providers are added to
      // OAUTH_PROVIDERS (e.g., "microsoft"), this test pattern can be extended.
      const user1Id = "user-123";
      const user2Id = "user-456";
      const credentials1 = {
        accessToken: "user1-google-token",
        refreshToken: null,
        expiresAt: null,
        scopes: null,
      };
      const credentials2 = {
        accessToken: "user2-google-token",
        refreshToken: null,
        expiresAt: null,
        scopes: null,
      };

      // Act
      await upsertTokens(user1Id, "google", credentials1);
      await upsertTokens(user2Id, "google", credentials2);

      // Assert
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user1Id,
          provider: "google",
        })
      );
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user2Id,
          provider: "google",
        })
      );
    });

    it("should handle Date object for expiresAt correctly", async () => {
      // Arrange
      const futureDate = new Date("2025-06-15T12:00:00Z");
      const credentials = {
        accessToken: "token",
        refreshToken: null,
        expiresAt: futureDate,
        scopes: null,
      };

      // Act
      await upsertTokens(mockUserId, mockProvider, credentials);

      // Assert
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt: futureDate,
        })
      );
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe("Error handling with logging", () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    describe("getTokens error handling", () => {
      it("should log and throw descriptive error when decryption fails", async () => {
        // Arrange
        mockFindFirst.mockResolvedValue(mockStoredToken);
        const decryptionError = new Error("Invalid key or corrupted data");
        mockDecrypt.mockImplementation(() => {
          throw decryptionError;
        });

        // Act & Assert
        await expect(getTokens(mockUserId, mockProvider)).rejects.toThrow(
          `Failed to decrypt stored OAuth tokens for ${mockProvider}. The stored credentials may be corrupted.`
        );

        // Verify logging - error message contains CRITICAL, userId, and provider
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringMatching(
            /\[getTokens\] CRITICAL.*user-123-abc.*google/
          ),
          expect.any(String)
        );
      });

      it("should include cause in decryption error", async () => {
        // Arrange
        mockFindFirst.mockResolvedValue(mockStoredToken);
        const decryptionError = new Error("Invalid key");
        mockDecrypt.mockImplementation(() => {
          throw decryptionError;
        });

        // Act & Assert
        try {
          await getTokens(mockUserId, mockProvider);
          expect.fail("Should have thrown");
        } catch (error) {
          expect((error as Error).cause).toBe(decryptionError);
        }
      });

      it("should log and throw when database query fails in getTokens", async () => {
        // Arrange
        const dbError = new Error("Connection refused");
        mockFindFirst.mockRejectedValue(dbError);

        // Act & Assert
        await expect(getTokens(mockUserId, mockProvider)).rejects.toThrow(
          `Failed to retrieve OAuth tokens for ${mockProvider}`
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[getTokens] Database query failed"),
          expect.any(String)
        );
      });
    });

    describe("upsertTokens error handling", () => {
      it("should log and throw when encryption fails", async () => {
        // Arrange
        const credentials = {
          accessToken: "access-token",
          refreshToken: null,
          expiresAt: null,
          scopes: null,
        };
        const encryptionError = new Error("Encryption key not configured");
        mockEncrypt.mockImplementation(() => {
          throw encryptionError;
        });

        // Act & Assert
        await expect(
          upsertTokens(mockUserId, mockProvider, credentials)
        ).rejects.toThrow(`Failed to encrypt OAuth tokens for ${mockProvider}`);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[upsertTokens] Encryption failed"),
          expect.any(Error)
        );
      });

      it("should include cause in encryption error", async () => {
        // Arrange
        const credentials = {
          accessToken: "access-token",
          refreshToken: null,
          expiresAt: null,
          scopes: null,
        };
        const encryptionError = new Error("Key not found");
        mockEncrypt.mockImplementation(() => {
          throw encryptionError;
        });

        // Act & Assert
        try {
          await upsertTokens(mockUserId, mockProvider, credentials);
          expect.fail("Should have thrown");
        } catch (error) {
          expect((error as Error).cause).toBe(encryptionError);
        }
      });

      it("should log and throw when database insert fails", async () => {
        // Arrange
        const credentials = {
          accessToken: "access-token",
          refreshToken: null,
          expiresAt: null,
          scopes: null,
        };
        const dbError = new Error("Unique constraint violation");
        mockOnConflictDoUpdate.mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          upsertTokens(mockUserId, mockProvider, credentials)
        ).rejects.toThrow(`Failed to store OAuth tokens for ${mockProvider}`);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[upsertTokens] Database operation failed"),
          expect.any(Error)
        );
      });
    });

    describe("deleteTokens error handling", () => {
      it("should log and throw when database delete fails", async () => {
        // Arrange
        const dbError = new Error("Foreign key constraint");
        mockDeleteReturning.mockRejectedValue(dbError);

        // Act & Assert
        await expect(deleteTokens(mockUserId, mockProvider)).rejects.toThrow(
          `Failed to delete OAuth tokens for ${mockProvider}`
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[deleteTokens] Database operation failed"),
          expect.any(Error)
        );
      });

      it("should include cause in database delete error", async () => {
        // Arrange
        const dbError = new Error("Connection lost");
        mockDeleteReturning.mockRejectedValue(dbError);

        // Act & Assert
        try {
          await deleteTokens(mockUserId, mockProvider);
          expect.fail("Should have thrown");
        } catch (error) {
          expect((error as Error).cause).toBe(dbError);
        }
      });
    });

    describe("hasTokens error handling", () => {
      it("should log and throw when database query fails", async () => {
        // Arrange
        const dbError = new Error("Query timeout");
        mockFindFirst.mockRejectedValue(dbError);

        // Act & Assert
        await expect(hasTokens(mockUserId, mockProvider)).rejects.toThrow(
          `Failed to check OAuth token existence for ${mockProvider}`
        );

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          expect.stringContaining("[hasTokens] Database query failed"),
          expect.any(Error)
        );
      });

      it("should include cause in hasTokens database error", async () => {
        // Arrange
        const dbError = new Error("Network error");
        mockFindFirst.mockRejectedValue(dbError);

        // Act & Assert
        try {
          await hasTokens(mockUserId, mockProvider);
          expect.fail("Should have thrown");
        } catch (error) {
          expect((error as Error).cause).toBe(dbError);
        }
      });
    });
  });
});
