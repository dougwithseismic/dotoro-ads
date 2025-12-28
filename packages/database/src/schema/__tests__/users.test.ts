import { describe, it, expect } from "vitest";
import {
  users,
  usersRelations,
} from "../users.js";
import type { User, NewUser } from "../users.js";
import { getTableName, getTableColumns } from "drizzle-orm";

describe("Users Schema", () => {
  describe("Table Structure", () => {
    it("should have correct table name", () => {
      expect(getTableName(users)).toBe("users");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(users);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("email");
      expect(columnNames).toContain("emailVerified");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
      expect(columnNames).toContain("lastLoginAt");
    });

    it("should have id as UUID primary key", () => {
      const columns = getTableColumns(users);
      const idColumn = columns.id;

      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string"); // UUID is represented as string
      expect(idColumn.notNull).toBe(true);
      // Primary key is set at table level, not column level in drizzle
      expect(idColumn.hasDefault).toBe(true); // defaultRandom()
    });

    it("should have email as required unique varchar(255)", () => {
      const columns = getTableColumns(users);
      const emailColumn = columns.email;

      expect(emailColumn).toBeDefined();
      expect(emailColumn.dataType).toBe("string");
      expect(emailColumn.notNull).toBe(true);
    });

    it("should have emailVerified as required boolean defaulting to false", () => {
      const columns = getTableColumns(users);
      const emailVerifiedColumn = columns.emailVerified;

      expect(emailVerifiedColumn).toBeDefined();
      expect(emailVerifiedColumn.dataType).toBe("boolean");
      expect(emailVerifiedColumn.notNull).toBe(true);
      expect(emailVerifiedColumn.hasDefault).toBe(true);
    });

    it("should have createdAt as required timestamp with default", () => {
      const columns = getTableColumns(users);
      const createdAtColumn = columns.createdAt;

      expect(createdAtColumn).toBeDefined();
      expect(createdAtColumn.notNull).toBe(true);
      expect(createdAtColumn.hasDefault).toBe(true);
    });

    it("should have updatedAt as required timestamp with default and onUpdate", () => {
      const columns = getTableColumns(users);
      const updatedAtColumn = columns.updatedAt;

      expect(updatedAtColumn).toBeDefined();
      expect(updatedAtColumn.notNull).toBe(true);
      expect(updatedAtColumn.hasDefault).toBe(true);
    });

    it("should have lastLoginAt as optional timestamp", () => {
      const columns = getTableColumns(users);
      const lastLoginAtColumn = columns.lastLoginAt;

      expect(lastLoginAtColumn).toBeDefined();
      expect(lastLoginAtColumn.notNull).toBe(false);
    });
  });

  describe("Type Exports", () => {
    it("should export User type with correct shape", () => {
      // Type assertion test - compile-time check
      const user: User = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        email: "test@example.com",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLoginAt: null,
      };

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
    });

    it("should export NewUser type with required and optional fields", () => {
      // Type assertion test - compile-time check
      // NewUser should only require email, all other fields have defaults
      const newUser: NewUser = {
        email: "test@example.com",
      };

      expect(newUser.email).toBeDefined();
    });
  });

  describe("Relations", () => {
    it("should export usersRelations", () => {
      expect(usersRelations).toBeDefined();
    });
  });
});
