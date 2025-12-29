import { describe, it, expect, vi, beforeEach } from "vitest";
import { testClient } from "hono/testing";

// ============================================================================
// Mock Data
// ============================================================================

const mockTeamId = "550e8400-e29b-41d4-a716-446655440000";
const mockTeamId2 = "550e8400-e29b-41d4-a716-446655440099";
const mockUserId = "550e8400-e29b-41d4-a716-446655440001";
const mockFolderId = "550e8400-e29b-41d4-a716-446655440002";
const mockParentFolderId = "550e8400-e29b-41d4-a716-446655440003";
const mockChildFolderId = "550e8400-e29b-41d4-a716-446655440004";

const mockRootFolder = {
  id: mockFolderId,
  teamId: mockTeamId,
  parentId: null,
  name: "Marketing",
  path: "/marketing",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  updatedAt: new Date("2024-01-01T00:00:00Z"),
};

const mockChildFolder = {
  id: mockChildFolderId,
  teamId: mockTeamId,
  parentId: mockFolderId,
  name: "Q4 Campaigns",
  path: "/marketing/q4-campaigns",
  createdAt: new Date("2024-01-02T00:00:00Z"),
  updatedAt: new Date("2024-01-02T00:00:00Z"),
};

// ============================================================================
// Mocks
// ============================================================================

// Mock the database module
vi.mock("../../services/db.js", () => {
  return {
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
    },
    assetFolders: {
      id: "id",
      teamId: "team_id",
      parentId: "parent_id",
      name: "name",
      path: "path",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    creatives: {
      id: "id",
      teamId: "team_id",
      folderId: "folder_id",
    },
    teamMemberships: {
      id: "id",
      teamId: "team_id",
      userId: "user_id",
    },
  };
});

// Mock auth middleware
vi.mock("../../middleware/auth.js", () => ({
  requireAuth: () => async (c: any, next: any) => {
    c.set("user", { id: mockUserId, email: "test@example.com" });
    c.set("session", { id: "session-123" });
    await next();
  },
  getAuthUser: (c: any) => c.get("user"),
}));

// Mock the folder service
vi.mock("../../services/asset-folders.js", () => ({
  createFolder: vi.fn(),
  getFolder: vi.fn(),
  getFolderTree: vi.fn(),
  updateFolder: vi.fn(),
  deleteFolder: vi.fn(),
  moveFolder: vi.fn(),
  getFolderAncestors: vi.fn(),
}));

// Import after mocking
import { assetsApp } from "../../routes/assets.js";
import { db, teamMemberships } from "../../services/db.js";
import * as folderService from "../../services/asset-folders.js";

// ============================================================================
// Helper Functions
// ============================================================================

function setupTeamMembershipMock(exists: boolean = true) {
  const chainable = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(exists ? [{ id: "membership-1" }] : []),
  };
  (db.select as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
  return chainable;
}

function createTestClient() {
  return testClient(assetsApp);
}

function getDefaultHeaders() {
  return {
    cookie: "session=" + "a".repeat(64),
    "x-team-id": mockTeamId,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe("Asset Folders API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // POST /api/v1/assets/folders - Create Folder
  // ==========================================================================

  describe("POST /api/v1/assets/folders", () => {
    it("should return 400 when x-team-id header is missing", async () => {
      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$post(
        {
          json: { name: "New Folder" },
        },
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
            // No x-team-id header
          },
        }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("x-team-id");
    });

    it("should return 403 when user has no team access", async () => {
      setupTeamMembershipMock(false);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$post(
        {
          json: { name: "New Folder" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(403);
    });

    it("should return 400 for empty folder name", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$post(
        {
          json: { name: "" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return 400 for folder name with invalid characters", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$post(
        {
          json: { name: "!@#$%^" }, // Invalid: doesn't start with alphanumeric
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });

    it("should create a root folder successfully", async () => {
      setupTeamMembershipMock(true);
      (folderService.createFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockRootFolder
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$post(
        {
          json: { name: "Marketing" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe("Marketing");
      expect(json.path).toBe("/marketing");
      expect(json.parentId).toBeNull();
    });

    it("should create a child folder successfully", async () => {
      setupTeamMembershipMock(true);
      (folderService.createFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockChildFolder
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$post(
        {
          json: {
            name: "Q4 Campaigns",
            parentId: mockFolderId,
          },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.name).toBe("Q4 Campaigns");
      expect(json.parentId).toBe(mockFolderId);

      expect(folderService.createFolder).toHaveBeenCalledWith({
        teamId: mockTeamId,
        name: "Q4 Campaigns",
        parentId: mockFolderId,
      });
    });

    it("should return 400 for invalid parent UUID", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$post(
        {
          json: {
            name: "Child Folder",
            parentId: "not-a-uuid",
          },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /api/v1/assets/folders - List Folders
  // ==========================================================================

  describe("GET /api/v1/assets/folders", () => {
    it("should return 400 when x-team-id header is missing", async () => {
      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$get(
        {},
        {
          headers: {
            cookie: "session=" + "a".repeat(64),
          },
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return empty list when no folders exist", async () => {
      setupTeamMembershipMock(true);
      (folderService.getFolderTree as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$get(
        {},
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.folders).toEqual([]);
      expect(json.total).toBe(0);
    });

    it("should return folders with asset counts when requested", async () => {
      setupTeamMembershipMock(true);
      (folderService.getFolderTree as ReturnType<typeof vi.fn>).mockResolvedValue([
        { ...mockRootFolder, assetCount: 5, childCount: 2 },
        { ...mockChildFolder, assetCount: 10, childCount: 0 },
      ]);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$get(
        {
          query: { includeAssetCounts: "true" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.folders.length).toBe(2);
      expect(json.folders[0].assetCount).toBe(5);
      expect(json.folders[0].childCount).toBe(2);

      expect(folderService.getFolderTree).toHaveBeenCalledWith(mockTeamId, {
        parentId: undefined,
        includeAssetCounts: true,
      });
    });

    it("should filter by parentId when provided", async () => {
      setupTeamMembershipMock(true);
      (folderService.getFolderTree as ReturnType<typeof vi.fn>).mockResolvedValue([
        mockChildFolder,
      ]);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"].$get(
        {
          query: { parentId: mockFolderId },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      expect(folderService.getFolderTree).toHaveBeenCalledWith(mockTeamId, {
        parentId: mockFolderId,
        includeAssetCounts: false,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/assets/folders/:id - Get Folder
  // ==========================================================================

  describe("GET /api/v1/assets/folders/:id", () => {
    it("should return 400 for invalid folder UUID", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"].$get(
        {
          param: { id: "not-a-uuid" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });

    it("should return folder details", async () => {
      setupTeamMembershipMock(true);
      (folderService.getFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockRootFolder
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"].$get(
        {
          param: { id: mockFolderId },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBe(mockFolderId);
      expect(json.name).toBe("Marketing");
    });
  });

  // ==========================================================================
  // PUT /api/v1/assets/folders/:id - Update Folder
  // ==========================================================================

  describe("PUT /api/v1/assets/folders/:id", () => {
    it("should return 400 for invalid folder UUID", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"].$put(
        {
          param: { id: "not-a-uuid" },
          json: { name: "Updated Name" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });

    it("should update folder name", async () => {
      setupTeamMembershipMock(true);
      const updatedFolder = {
        ...mockRootFolder,
        name: "Updated Marketing",
        path: "/updated-marketing",
      };
      (folderService.updateFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        updatedFolder
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"].$put(
        {
          param: { id: mockFolderId },
          json: { name: "Updated Marketing" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.name).toBe("Updated Marketing");
      expect(json.path).toBe("/updated-marketing");

      expect(folderService.updateFolder).toHaveBeenCalledWith(
        mockFolderId,
        mockTeamId,
        { name: "Updated Marketing" }
      );
    });
  });

  // ==========================================================================
  // DELETE /api/v1/assets/folders/:id - Delete Folder
  // ==========================================================================

  describe("DELETE /api/v1/assets/folders/:id", () => {
    it("should return 400 for invalid folder UUID", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"].$delete(
        {
          param: { id: "not-a-uuid" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });

    it("should delete empty folder without recursive flag", async () => {
      setupTeamMembershipMock(true);
      (folderService.deleteFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"].$delete(
        {
          param: { id: mockFolderId },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(204);
      expect(folderService.deleteFolder).toHaveBeenCalledWith(
        mockFolderId,
        mockTeamId,
        false
      );
    });

    it("should delete folder recursively when flag is set", async () => {
      setupTeamMembershipMock(true);
      (folderService.deleteFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"].$delete(
        {
          param: { id: mockFolderId },
          query: { recursive: "true" },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(204);
      expect(folderService.deleteFolder).toHaveBeenCalledWith(
        mockFolderId,
        mockTeamId,
        true
      );
    });
  });

  // ==========================================================================
  // POST /api/v1/assets/folders/:id/move - Move Folder
  // ==========================================================================

  describe("POST /api/v1/assets/folders/:id/move", () => {
    it("should return 400 for invalid folder UUID", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"]["move"].$post(
        {
          param: { id: "not-a-uuid" },
          json: { parentId: null },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });

    it("should move folder to root", async () => {
      setupTeamMembershipMock(true);
      const movedFolder = {
        ...mockChildFolder,
        parentId: null,
        path: "/q4-campaigns",
      };
      (folderService.moveFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        movedFolder
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"]["move"].$post(
        {
          param: { id: mockChildFolderId },
          json: { parentId: null },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.parentId).toBeNull();
      expect(json.path).toBe("/q4-campaigns");

      expect(folderService.moveFolder).toHaveBeenCalledWith(
        mockChildFolderId,
        mockTeamId,
        null
      );
    });

    it("should move folder to new parent", async () => {
      setupTeamMembershipMock(true);
      const movedFolder = {
        ...mockChildFolder,
        parentId: mockParentFolderId,
        path: "/new-parent/q4-campaigns",
      };
      (folderService.moveFolder as ReturnType<typeof vi.fn>).mockResolvedValue(
        movedFolder
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"]["move"].$post(
        {
          param: { id: mockChildFolderId },
          json: { parentId: mockParentFolderId },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.parentId).toBe(mockParentFolderId);

      expect(folderService.moveFolder).toHaveBeenCalledWith(
        mockChildFolderId,
        mockTeamId,
        mockParentFolderId
      );
    });

    it("should return 400 for invalid parent UUID", async () => {
      setupTeamMembershipMock(true);

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"]["move"].$post(
        {
          param: { id: mockChildFolderId },
          json: { parentId: "not-a-uuid" as any },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(400);
    });
  });

  // ==========================================================================
  // GET /api/v1/assets/folders/:id/ancestors - Get Ancestors
  // ==========================================================================

  describe("GET /api/v1/assets/folders/:id/ancestors", () => {
    it("should return empty ancestors for root folder", async () => {
      setupTeamMembershipMock(true);
      (folderService.getFolderAncestors as ReturnType<typeof vi.fn>).mockResolvedValue(
        []
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"]["ancestors"].$get(
        {
          param: { id: mockFolderId },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ancestors).toEqual([]);
    });

    it("should return ancestors for nested folder", async () => {
      setupTeamMembershipMock(true);
      const ancestors = [
        { id: mockFolderId, name: "Marketing", path: "/marketing" },
      ];
      (folderService.getFolderAncestors as ReturnType<typeof vi.fn>).mockResolvedValue(
        ancestors
      );

      const client = createTestClient();
      const res = await client["api"]["v1"]["assets"]["folders"][":id"]["ancestors"].$get(
        {
          param: { id: mockChildFolderId },
        },
        {
          headers: getDefaultHeaders(),
        }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ancestors.length).toBe(1);
      expect(json.ancestors[0].name).toBe("Marketing");
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

import {
  generatePathSlug,
  buildFolderPath,
  isValidFolderPath,
} from "../../schemas/assets.js";
import { ApiException, ErrorCode } from "../../lib/errors.js";

describe("Asset Folder Schemas", () => {

  describe("generatePathSlug", () => {
    it("should convert name to lowercase slug", () => {
      expect(generatePathSlug("Marketing")).toBe("marketing");
      expect(generatePathSlug("Q4 Campaigns")).toBe("q4-campaigns");
      expect(generatePathSlug("Test_Folder")).toBe("test-folder");
    });

    it("should remove special characters", () => {
      expect(generatePathSlug("My Folder!")).toBe("my-folder");
      expect(generatePathSlug("Test@123")).toBe("test-123");
    });

    it("should trim leading/trailing hyphens", () => {
      expect(generatePathSlug("-test-")).toBe("test");
      expect(generatePathSlug("  test  ")).toBe("test");
    });

    it("should limit length to 100 characters", () => {
      const longName = "a".repeat(200);
      expect(generatePathSlug(longName).length).toBeLessThanOrEqual(100);
    });
  });

  describe("buildFolderPath", () => {
    it("should build root-level path", () => {
      expect(buildFolderPath(null, "Marketing")).toBe("/marketing");
      expect(buildFolderPath("/", "Marketing")).toBe("/marketing");
    });

    it("should build nested path", () => {
      expect(buildFolderPath("/marketing", "Q4 Campaigns")).toBe("/marketing/q4-campaigns");
      expect(buildFolderPath("/a/b", "c")).toBe("/a/b/c");
    });
  });

  describe("isValidFolderPath", () => {
    it("should validate correct paths", () => {
      expect(isValidFolderPath("/marketing")).toBe(true);
      expect(isValidFolderPath("/marketing/q4")).toBe(true);
      expect(isValidFolderPath("/a/b/c/d")).toBe(true);
      expect(isValidFolderPath("/test-123")).toBe(true);
    });

    it("should reject invalid paths", () => {
      expect(isValidFolderPath("marketing")).toBe(false); // No leading slash
      expect(isValidFolderPath("/")).toBe(false); // Just root
      expect(isValidFolderPath("/Marketing")).toBe(false); // Uppercase
      expect(isValidFolderPath("/test_folder")).toBe(false); // Underscore
      expect(isValidFolderPath("/a//b")).toBe(false); // Double slash
    });
  });
});

// ============================================================================
// Service Validation Tests (via routes that exercise service)
// ============================================================================

describe("Asset Folder Service Validations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupTeamMembershipMock(true);
  });

  it("should reject parent from different team", async () => {
    (folderService.createFolder as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiException(400, ErrorCode.VALIDATION_ERROR, "Parent folder must belong to the same team")
    );

    const client = createTestClient();
    const res = await client["api"]["v1"]["assets"]["folders"].$post(
      {
        json: {
          name: "Test Folder",
          parentId: mockParentFolderId,
        },
      },
      {
        headers: getDefaultHeaders(),
      }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("same team");
  });

  it("should reject circular reference on move", async () => {
    (folderService.moveFolder as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiException(400, ErrorCode.VALIDATION_ERROR, "Cannot move a folder into one of its descendants")
    );

    const client = createTestClient();
    const res = await client["api"]["v1"]["assets"]["folders"][":id"]["move"].$post(
      {
        param: { id: mockFolderId },
        json: { parentId: mockChildFolderId },
      },
      {
        headers: getDefaultHeaders(),
      }
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("descendants");
  });

  it("should reject duplicate folder name in same parent", async () => {
    (folderService.createFolder as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiException(409, ErrorCode.CONFLICT, "A folder with this name already exists in the parent folder")
    );

    const client = createTestClient();
    const res = await client["api"]["v1"]["assets"]["folders"].$post(
      {
        json: { name: "Marketing" },
      },
      {
        headers: getDefaultHeaders(),
      }
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("already exists");
  });

  it("should reject non-recursive delete of non-empty folder", async () => {
    (folderService.deleteFolder as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiException(409, ErrorCode.CONFLICT, "Folder is not empty. Use recursive=true to delete with contents.")
    );

    const client = createTestClient();
    const res = await client["api"]["v1"]["assets"]["folders"][":id"].$delete(
      {
        param: { id: mockFolderId },
        query: { recursive: "false" },
      },
      {
        headers: getDefaultHeaders(),
      }
    );

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain("not empty");
  });

  it("should return 404 for non-existent folder", async () => {
    (folderService.getFolder as ReturnType<typeof vi.fn>).mockRejectedValue(
      new ApiException(404, ErrorCode.NOT_FOUND, "Folder not found")
    );

    const client = createTestClient();
    const res = await client["api"]["v1"]["assets"]["folders"][":id"].$get(
      {
        param: { id: mockFolderId },
      },
      {
        headers: getDefaultHeaders(),
      }
    );

    expect(res.status).toBe(404);
  });
});
