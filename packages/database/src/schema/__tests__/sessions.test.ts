import { describe, it, expect } from "vitest";
import {
  sessions,
  sessionsRelations,
} from "../sessions.js";
import type { Session, NewSession } from "../sessions.js";
import { getTableName, getTableColumns } from "drizzle-orm";

describe("Sessions Schema", () => {
  describe("Table Structure", () => {
    it("should have correct table name", () => {
      expect(getTableName(sessions)).toBe("sessions");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(sessions);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("userId");
      expect(columnNames).toContain("token");
      expect(columnNames).toContain("expiresAt");
      expect(columnNames).toContain("userAgent");
      expect(columnNames).toContain("ipAddress");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("lastActiveAt");
    });

    it("should have id as UUID primary key with default", () => {
      const columns = getTableColumns(sessions);
      const idColumn = columns.id;

      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string");
      expect(idColumn.notNull).toBe(true);
      expect(idColumn.hasDefault).toBe(true);
    });

    it("should have userId as required UUID", () => {
      const columns = getTableColumns(sessions);
      const userIdColumn = columns.userId;

      expect(userIdColumn).toBeDefined();
      expect(userIdColumn.dataType).toBe("string");
      expect(userIdColumn.notNull).toBe(true);
    });

    it("should have token as required unique varchar(64)", () => {
      const columns = getTableColumns(sessions);
      const tokenColumn = columns.token;

      expect(tokenColumn).toBeDefined();
      expect(tokenColumn.dataType).toBe("string");
      expect(tokenColumn.notNull).toBe(true);
      expect(tokenColumn.isUnique).toBe(true);
    });

    it("should have expiresAt as required timestamp", () => {
      const columns = getTableColumns(sessions);
      const expiresAtColumn = columns.expiresAt;

      expect(expiresAtColumn).toBeDefined();
      expect(expiresAtColumn.notNull).toBe(true);
    });

    it("should have userAgent as optional text", () => {
      const columns = getTableColumns(sessions);
      const userAgentColumn = columns.userAgent;

      expect(userAgentColumn).toBeDefined();
      expect(userAgentColumn.notNull).toBe(false);
    });

    it("should have ipAddress as optional varchar(45) for IPv6 compatibility", () => {
      const columns = getTableColumns(sessions);
      const ipAddressColumn = columns.ipAddress;

      expect(ipAddressColumn).toBeDefined();
      expect(ipAddressColumn.dataType).toBe("string");
      expect(ipAddressColumn.notNull).toBe(false);
    });

    it("should have createdAt as required timestamp with default", () => {
      const columns = getTableColumns(sessions);
      const createdAtColumn = columns.createdAt;

      expect(createdAtColumn).toBeDefined();
      expect(createdAtColumn.notNull).toBe(true);
      expect(createdAtColumn.hasDefault).toBe(true);
    });

    it("should have lastActiveAt as required timestamp with default", () => {
      const columns = getTableColumns(sessions);
      const lastActiveAtColumn = columns.lastActiveAt;

      expect(lastActiveAtColumn).toBeDefined();
      expect(lastActiveAtColumn.notNull).toBe(true);
      expect(lastActiveAtColumn.hasDefault).toBe(true);
    });
  });

  describe("Type Exports", () => {
    it("should export Session type with correct shape", () => {
      const session: Session = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        userId: "660e8400-e29b-41d4-a716-446655440000",
        token: "a".repeat(64),
        expiresAt: new Date(),
        userAgent: "Mozilla/5.0",
        ipAddress: "192.168.1.1",
        createdAt: new Date(),
        lastActiveAt: new Date(),
      };

      expect(session.id).toBeDefined();
      expect(session.token).toBeDefined();
    });

    it("should export NewSession type with required fields", () => {
      const newSession: NewSession = {
        userId: "660e8400-e29b-41d4-a716-446655440000",
        token: "a".repeat(64),
        expiresAt: new Date(),
      };

      expect(newSession.userId).toBeDefined();
      expect(newSession.token).toBeDefined();
      expect(newSession.expiresAt).toBeDefined();
    });
  });

  describe("Relations", () => {
    it("should export sessionsRelations", () => {
      expect(sessionsRelations).toBeDefined();
    });
  });
});
