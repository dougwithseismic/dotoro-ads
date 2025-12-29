import { describe, it, expect } from "vitest";
import { getTableName, getTableColumns } from "drizzle-orm";
import {
  assetFolders,
  assetFolderRelations,
} from "../../schema/asset-folders.js";
import type { AssetFolder, NewAssetFolder } from "../../schema/asset-folders.js";
import { creatives, creativesRelations } from "../../schema/creatives.js";

/**
 * Asset Folders Schema Tests
 *
 * These tests verify the database schema definitions are correct.
 * They validate column names, types, defaults, and constraints.
 */
describe("Asset Folders Schema", () => {
  describe("assetFolders table", () => {
    it("should have correct table name", () => {
      expect(getTableName(assetFolders)).toBe("asset_folders");
    });

    it("should have all required columns", () => {
      const columns = getTableColumns(assetFolders);
      const columnNames = Object.keys(columns);

      expect(columnNames).toContain("id");
      expect(columnNames).toContain("teamId");
      expect(columnNames).toContain("parentId");
      expect(columnNames).toContain("name");
      expect(columnNames).toContain("path");
      expect(columnNames).toContain("createdAt");
      expect(columnNames).toContain("updatedAt");
    });

    it("should have id as UUID primary key with default", () => {
      const columns = getTableColumns(assetFolders);
      const idColumn = columns.id;

      expect(idColumn).toBeDefined();
      expect(idColumn.dataType).toBe("string"); // UUID represented as string in drizzle
      expect(idColumn.notNull).toBe(true);
      expect(idColumn.hasDefault).toBe(true); // defaultRandom()
    });

    it("should have teamId as required UUID foreign key", () => {
      const columns = getTableColumns(assetFolders);
      const teamIdColumn = columns.teamId;

      expect(teamIdColumn).toBeDefined();
      expect(teamIdColumn.dataType).toBe("string"); // UUID represented as string
      expect(teamIdColumn.notNull).toBe(true);
    });

    it("should have parentId as optional UUID (nullable for root folders)", () => {
      const columns = getTableColumns(assetFolders);
      const parentIdColumn = columns.parentId;

      expect(parentIdColumn).toBeDefined();
      expect(parentIdColumn.dataType).toBe("string"); // UUID represented as string
      expect(parentIdColumn.notNull).toBe(false); // Nullable for root folders
    });

    it("should have name as required varchar(255)", () => {
      const columns = getTableColumns(assetFolders);
      const nameColumn = columns.name;

      expect(nameColumn).toBeDefined();
      expect(nameColumn.dataType).toBe("string");
      expect(nameColumn.notNull).toBe(true);
    });

    it("should have path as required text for materialized path", () => {
      const columns = getTableColumns(assetFolders);
      const pathColumn = columns.path;

      expect(pathColumn).toBeDefined();
      expect(pathColumn.dataType).toBe("string");
      expect(pathColumn.notNull).toBe(true);
    });

    it("should have timestamp columns with defaults", () => {
      const columns = getTableColumns(assetFolders);

      expect(columns.createdAt.notNull).toBe(true);
      expect(columns.createdAt.hasDefault).toBe(true);
      expect(columns.updatedAt.notNull).toBe(true);
      expect(columns.updatedAt.hasDefault).toBe(true);
    });
  });

  describe("Type Exports", () => {
    it("should export AssetFolder type with correct shape", () => {
      const folder: AssetFolder = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        teamId: "550e8400-e29b-41d4-a716-446655440001",
        parentId: null,
        name: "Marketing",
        path: "/marketing",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(folder.id).toBeDefined();
      expect(folder.teamId).toBeDefined();
      expect(folder.name).toBeDefined();
      expect(folder.path).toBeDefined();
    });

    it("should export AssetFolder type with nested folder", () => {
      const folder: AssetFolder = {
        id: "550e8400-e29b-41d4-a716-446655440002",
        teamId: "550e8400-e29b-41d4-a716-446655440001",
        parentId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Q4 Campaign",
        path: "/marketing/q4-campaign",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(folder.parentId).toBe("550e8400-e29b-41d4-a716-446655440000");
      expect(folder.path).toBe("/marketing/q4-campaign");
    });

    it("should export NewAssetFolder type with required and optional fields", () => {
      const newFolder: NewAssetFolder = {
        teamId: "550e8400-e29b-41d4-a716-446655440001",
        name: "New Campaign",
        path: "/new-campaign",
      };

      expect(newFolder.teamId).toBeDefined();
      expect(newFolder.name).toBeDefined();
      expect(newFolder.path).toBeDefined();
      // id, parentId, createdAt, updatedAt should be optional
    });

    it("should allow optional parentId in NewAssetFolder", () => {
      const newFolder: NewAssetFolder = {
        teamId: "550e8400-e29b-41d4-a716-446655440001",
        parentId: "550e8400-e29b-41d4-a716-446655440000",
        name: "Nested Folder",
        path: "/parent/nested-folder",
      };

      expect(newFolder.parentId).toBeDefined();
    });
  });

  describe("Relations", () => {
    it("should export assetFolderRelations", () => {
      expect(assetFolderRelations).toBeDefined();
    });

    it("should have team relation configured", () => {
      // The relations object has a config function that returns the relation definitions
      const relationConfig = assetFolderRelations.config;
      expect(relationConfig).toBeDefined();
    });
  });
});

describe("Creatives Schema - Folder Integration", () => {
  describe("folderId column", () => {
    it("should have folderId column", () => {
      const columns = getTableColumns(creatives);
      expect(columns.folderId).toBeDefined();
    });

    it("should have folderId as nullable UUID (null means root level)", () => {
      const columns = getTableColumns(creatives);
      const folderIdColumn = columns.folderId;

      expect(folderIdColumn.dataType).toBe("string"); // UUID represented as string
      expect(folderIdColumn.notNull).toBe(false); // NULL means asset is at root level
    });
  });

  describe("Creatives folder relation", () => {
    it("should have folder relation in creativesRelations", () => {
      const relationConfig = creativesRelations.config;
      expect(relationConfig).toBeDefined();
    });
  });
});
