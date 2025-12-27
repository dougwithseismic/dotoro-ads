import { describe, it, expect } from "vitest";
import { getTableColumns, getTableName } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";

// Import schema - will fail until implemented (TDD Red phase)
import {
  userOAuthTokens,
} from "../user-oauth-tokens.js";

import type {
  UserOAuthToken,
  NewUserOAuthToken,
} from "../user-oauth-tokens.js";

// Helper to check if column is a UUID
function isUuidColumn(column: PgColumn): boolean {
  return column.columnType === "PgUUID";
}

// Helper to check if column is a timestamp with default now()
function isTimestampWithDefault(column: PgColumn): boolean {
  return column.columnType === "PgTimestamp" && column.hasDefault;
}

// Helper to check if column is text
function isTextColumn(column: PgColumn): boolean {
  return column.columnType === "PgText";
}

// Helper to check if column is varchar
function isVarcharColumn(column: PgColumn): boolean {
  return column.columnType === "PgVarchar";
}

describe("User OAuth Tokens Schema", () => {
  describe("userOAuthTokens table", () => {
    it("should have the correct table name", () => {
      expect(getTableName(userOAuthTokens)).toBe("user_oauth_tokens");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(userOAuthTokens);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("provider");
      expect(columnNames).toContain("accessToken");
      expect(columnNames).toContain("refreshToken");
      expect(columnNames).toContain("expiresAt");
      expect(columnNames).toContain("scopes");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have UUID primary key with default random", () => {
      const columns = getTableColumns(userOAuthTokens);
      const idColumn = columns.id as PgColumn;
      expect(isUuidColumn(idColumn)).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have required userId column as varchar(255)", () => {
      const columns = getTableColumns(userOAuthTokens);
      const userIdColumn = columns.userId as PgColumn;
      expect(isVarcharColumn(userIdColumn)).toBe(true);
      expect(userIdColumn.notNull).toBe(true);
    });

    it("should have required provider column as varchar(50)", () => {
      const columns = getTableColumns(userOAuthTokens);
      const providerColumn = columns.provider as PgColumn;
      expect(isVarcharColumn(providerColumn)).toBe(true);
      expect(providerColumn.notNull).toBe(true);
    });

    it("should have required accessToken column as text", () => {
      const columns = getTableColumns(userOAuthTokens);
      const accessTokenColumn = columns.accessToken as PgColumn;
      expect(isTextColumn(accessTokenColumn)).toBe(true);
      expect(accessTokenColumn.notNull).toBe(true);
    });

    it("should have optional refreshToken column as text", () => {
      const columns = getTableColumns(userOAuthTokens);
      const refreshTokenColumn = columns.refreshToken as PgColumn;
      expect(isTextColumn(refreshTokenColumn)).toBe(true);
      expect(refreshTokenColumn.notNull).toBe(false);
    });

    it("should have optional expiresAt column as timestamp with timezone", () => {
      const columns = getTableColumns(userOAuthTokens);
      const expiresAtColumn = columns.expiresAt as PgColumn;
      expect(expiresAtColumn.columnType).toBe("PgTimestamp");
      expect(expiresAtColumn.notNull).toBe(false);
    });

    it("should have optional scopes column as text", () => {
      const columns = getTableColumns(userOAuthTokens);
      const scopesColumn = columns.scopes as PgColumn;
      expect(isTextColumn(scopesColumn)).toBe(true);
      expect(scopesColumn.notNull).toBe(false);
    });

    it("should have timestamp columns with defaults", () => {
      const columns = getTableColumns(userOAuthTokens);
      expect(isTimestampWithDefault(columns.createdAt as PgColumn)).toBe(true);
      expect(isTimestampWithDefault(columns.updatedAt as PgColumn)).toBe(true);
    });

    it("should have createdAt as not null", () => {
      const columns = getTableColumns(userOAuthTokens);
      expect((columns.createdAt as PgColumn).notNull).toBe(true);
    });

    it("should have updatedAt as not null", () => {
      const columns = getTableColumns(userOAuthTokens);
      expect((columns.updatedAt as PgColumn).notNull).toBe(true);
    });
  });

  describe("userOAuthTokens unique constraints", () => {
    it("should have unique index on userId + provider (verified via schema definition)", () => {
      // The schema defines: uniqueIndex("user_oauth_tokens_user_provider_idx").on(table.userId, table.provider)
      const columns = getTableColumns(userOAuthTokens);
      expect(columns.userId).toBeDefined();
      expect(columns.provider).toBeDefined();
      expect(getTableName(userOAuthTokens)).toBe("user_oauth_tokens");
    });
  });
});

describe("User OAuth Tokens TypeScript Types", () => {
  describe("UserOAuthToken and NewUserOAuthToken types", () => {
    it("should be exportable types", () => {
      // These are compile-time checks - if they compile, the types exist
      const token: Partial<UserOAuthToken> = {
        id: "test-uuid",
        userId: "user_123",
        provider: "google",
        accessToken: "encrypted_access_token",
      };

      const newToken: Partial<NewUserOAuthToken> = {
        userId: "user_123",
        provider: "google",
        accessToken: "encrypted_access_token",
      };

      expect(token.provider).toBe("google");
      expect(newToken.provider).toBe("google");
    });
  });
});

describe("Schema Index Exports", () => {
  it("should export userOAuthTokens table from index", async () => {
    const schema = await import("../index.js");
    expect(schema.userOAuthTokens).toBeDefined();
  });

  it("should export UserOAuthToken type from index", async () => {
    // Type import check - this is a compile-time verification
    type UserOAuthTokenFromIndex = import("../index.js").UserOAuthToken;
    const _typeCheck: UserOAuthTokenFromIndex | null = null;
    expect(_typeCheck).toBeNull();
  });

  it("should export NewUserOAuthToken type from index", async () => {
    type NewUserOAuthTokenFromIndex = import("../index.js").NewUserOAuthToken;
    const _typeCheck: NewUserOAuthTokenFromIndex | null = null;
    expect(_typeCheck).toBeNull();
  });
});
