import { describe, it, expect } from "vitest";
import {
  magicLinkTokens,
  magicLinkTokensRelations,
} from "../magic-link-tokens.js";
import type { MagicLinkToken, NewMagicLinkToken } from "../magic-link-tokens.js";
import { getTableName, getTableColumns } from "drizzle-orm";

describe("Magic Link Tokens Schema", () => {
  describe("Table Structure", () => {
    it("should have correct table name", () => {
      expect(getTableName(magicLinkTokens)).toBe("magic_link_tokens");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(magicLinkTokens);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("token");
      expect(columnNames).toContain("expiresAt");
      expect(columnNames).toContain("usedAt");
      expect(columnNames).toContain("createdAt");
    });

    it("should have id as UUID primary key with default", () => {
      const columns = getTableColumns(magicLinkTokens);
      const idColumn = columns.id;

      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string");
      expect(idColumn.notNull).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have userId as optional UUID (nullable for pre-registration)", () => {
      const columns = getTableColumns(magicLinkTokens);
      const userIdColumn = columns.userId;

      expect(userIdColumn).toBeDefined();
      expect(userIdColumn.dataType).toBe("string");
      expect(userIdColumn.notNull).toBe(false); // nullable for pre-registration
    });

    it("should have email as required varchar(255)", () => {
      const columns = getTableColumns(magicLinkTokens);
      const emailColumn = columns.email;

      expect(emailColumn).toBeDefined();
      expect(emailColumn.dataType).toBe("string");
      expect(emailColumn.notNull).toBe(true);
    });

    it("should have token as required unique varchar(64)", () => {
      const columns = getTableColumns(magicLinkTokens);
      const tokenColumn = columns.token;

      expect(tokenColumn).toBeDefined();
      expect(tokenColumn.dataType).toBe("string");
      expect(tokenColumn.notNull).toBe(true);
      expect(tokenColumn.isUnique).toBe(true);
    });

    it("should have expiresAt as required timestamp", () => {
      const columns = getTableColumns(magicLinkTokens);
      const expiresAtColumn = columns.expiresAt;

      expect(expiresAtColumn).toBeDefined();
      expect(expiresAtColumn.notNull).toBe(true);
    });

    it("should have usedAt as optional timestamp", () => {
      const columns = getTableColumns(magicLinkTokens);
      const usedAtColumn = columns.usedAt;

      expect(usedAtColumn).toBeDefined();
      expect(usedAtColumn.notNull).toBe(false);
    });

    it("should have createdAt as required timestamp with default", () => {
      const columns = getTableColumns(magicLinkTokens);
      const createdAtColumn = columns.createdAt;

      expect(createdAtColumn).toBeDefined();
      expect(createdAtColumn.notNull).toBe(true);
      expect(createdAtColumn.hasDefault).toBe(true);
    });
  });

  describe("Type Exports", () => {
    it("should export MagicLinkToken type with correct shape", () => {
      const token: MagicLinkToken = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: "660e8400-e29b-41d4-a716-446655440000",
        email: "test@example.com",
        token: "a".repeat(64),
        expiresAt: new Date(),
        usedAt: null,
        createdAt: new Date(),
      };

      expect(token.id).toBeDefined();
      expect(token.token).toBeDefined();
    });

    it("should export NewMagicLinkToken type with required fields", () => {
      const newToken: NewMagicLinkToken = {
        email: "test@example.com",
        token: "a".repeat(64),
        expiresAt: new Date(),
      };

      expect(newToken.email).toBeDefined();
      expect(newToken.token).toBeDefined();
      expect(newToken.expiresAt).toBeDefined();
    });
  });

  describe("Relations", () => {
    it("should export magicLinkTokensRelations", () => {
      expect(magicLinkTokensRelations).toBeDefined();
    });
  });
});
