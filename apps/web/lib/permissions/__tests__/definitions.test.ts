import { describe, it, expect } from "vitest";
import {
  PERMISSION_MATRIX,
  ROLE_DESCRIPTIONS,
  DANGER_PERMISSIONS,
  PERMISSIONS,
  canPerform,
  getPermission,
  getRoleLevel,
  type ResourceType,
  type ActionType,
  type TeamRole,
} from "../index";

describe("Permission Types", () => {
  describe("ResourceType", () => {
    it("includes all expected resource types", () => {
      const resourceTypes: ResourceType[] = [
        "campaigns",
        "campaign_sets",
        "data_sources",
        "templates",
        "rules",
        "transforms",
        "team_settings",
        "team_members",
        "team",
        "billing",
      ];

      resourceTypes.forEach((resource) => {
        expect(typeof resource).toBe("string");
      });
    });
  });

  describe("ActionType", () => {
    it("includes all expected action types", () => {
      const actionTypes: ActionType[] = [
        "read",
        "create",
        "edit",
        "delete",
        "sync",
        "invite",
        "edit_role",
        "remove",
        "manage",
      ];

      actionTypes.forEach((action) => {
        expect(typeof action).toBe("string");
      });
    });
  });
});

describe("PERMISSIONS constant", () => {
  it("contains permissions for all resources", () => {
    const resources = [
      "campaigns",
      "campaign_sets",
      "data_sources",
      "templates",
      "rules",
      "transforms",
      "team_settings",
      "team_members",
      "team",
      "billing",
    ];

    resources.forEach((resource) => {
      const resourcePermissions = PERMISSIONS.filter(
        (p) => p.resource === resource
      );
      expect(resourcePermissions.length).toBeGreaterThan(0);
    });
  });

  it("each permission has required properties", () => {
    PERMISSIONS.forEach((permission) => {
      expect(permission).toHaveProperty("id");
      expect(permission).toHaveProperty("resource");
      expect(permission).toHaveProperty("action");
      expect(permission).toHaveProperty("name");
      expect(permission).toHaveProperty("description");
      expect(permission).toHaveProperty("tooltip");
      expect(permission).toHaveProperty("dangerLevel");
      expect(permission).toHaveProperty("minimumRole");
    });
  });

  it("permission IDs follow the resource:action format", () => {
    PERMISSIONS.forEach((permission) => {
      expect(permission.id).toMatch(/^[a-z_]+:[a-z_]+$/);
      expect(permission.id).toBe(`${permission.resource}:${permission.action}`);
    });
  });

  it("danger levels are valid", () => {
    const validDangerLevels = ["safe", "moderate", "dangerous"];

    PERMISSIONS.forEach((permission) => {
      expect(validDangerLevels).toContain(permission.dangerLevel);
    });
  });

  it("minimum roles are valid TeamRole values", () => {
    const validRoles: TeamRole[] = ["owner", "admin", "editor", "viewer"];

    PERMISSIONS.forEach((permission) => {
      expect(validRoles).toContain(permission.minimumRole);
    });
  });
});

describe("ROLE_DESCRIPTIONS", () => {
  it("contains descriptions for all four roles", () => {
    const roles: TeamRole[] = ["owner", "admin", "editor", "viewer"];

    roles.forEach((role) => {
      expect(ROLE_DESCRIPTIONS[role]).toBeDefined();
      expect(ROLE_DESCRIPTIONS[role].name).toBeTruthy();
      expect(ROLE_DESCRIPTIONS[role].description).toBeTruthy();
      expect(ROLE_DESCRIPTIONS[role].level).toBeDefined();
    });
  });

  it("owner has the highest level", () => {
    expect(ROLE_DESCRIPTIONS.owner.level).toBeGreaterThan(
      ROLE_DESCRIPTIONS.admin.level
    );
  });

  it("admin has higher level than editor", () => {
    expect(ROLE_DESCRIPTIONS.admin.level).toBeGreaterThan(
      ROLE_DESCRIPTIONS.editor.level
    );
  });

  it("editor has higher level than viewer", () => {
    expect(ROLE_DESCRIPTIONS.editor.level).toBeGreaterThan(
      ROLE_DESCRIPTIONS.viewer.level
    );
  });

  it("viewer has the lowest level (1)", () => {
    expect(ROLE_DESCRIPTIONS.viewer.level).toBe(1);
  });
});

describe("DANGER_PERMISSIONS", () => {
  it("contains dangerous permission IDs", () => {
    expect(DANGER_PERMISSIONS.length).toBeGreaterThan(0);
  });

  it("includes team deletion", () => {
    expect(DANGER_PERMISSIONS).toContain("team:delete");
  });

  it("includes billing management", () => {
    expect(DANGER_PERMISSIONS).toContain("billing:manage");
  });

  it("includes member removal", () => {
    expect(DANGER_PERMISSIONS).toContain("team_members:remove");
  });

  it("all IDs in DANGER_PERMISSIONS exist in PERMISSIONS", () => {
    const allPermissionIds = PERMISSIONS.map((p) => p.id);

    DANGER_PERMISSIONS.forEach((dangerousId) => {
      expect(allPermissionIds).toContain(dangerousId);
    });
  });

  it("permissions marked as dangerous have corresponding entries", () => {
    const dangerousPermissions = PERMISSIONS.filter(
      (p) => p.dangerLevel === "dangerous"
    );

    dangerousPermissions.forEach((permission) => {
      expect(DANGER_PERMISSIONS).toContain(permission.id);
    });
  });
});

describe("PERMISSION_MATRIX", () => {
  it("contains all four roles", () => {
    expect(PERMISSION_MATRIX).toHaveProperty("owner");
    expect(PERMISSION_MATRIX).toHaveProperty("admin");
    expect(PERMISSION_MATRIX).toHaveProperty("editor");
    expect(PERMISSION_MATRIX).toHaveProperty("viewer");
  });

  it("owner has all permissions", () => {
    PERMISSIONS.forEach((permission) => {
      expect(PERMISSION_MATRIX.owner[permission.id]).toBe(true);
    });
  });

  it("viewer has read-only permissions", () => {
    // Viewer should be able to read
    expect(PERMISSION_MATRIX.viewer["campaigns:read"]).toBe(true);
    expect(PERMISSION_MATRIX.viewer["data_sources:read"]).toBe(true);

    // Viewer should NOT be able to create/edit/delete
    expect(PERMISSION_MATRIX.viewer["campaigns:create"]).toBe(false);
    expect(PERMISSION_MATRIX.viewer["campaigns:edit"]).toBe(false);
    expect(PERMISSION_MATRIX.viewer["campaigns:delete"]).toBe(false);
  });

  it("editor can create and edit but not delete team or manage billing", () => {
    expect(PERMISSION_MATRIX.editor["campaigns:create"]).toBe(true);
    expect(PERMISSION_MATRIX.editor["campaigns:edit"]).toBe(true);
    expect(PERMISSION_MATRIX.editor["team:delete"]).toBe(false);
    expect(PERMISSION_MATRIX.editor["billing:manage"]).toBe(false);
  });

  it("admin can manage members but not delete team", () => {
    expect(PERMISSION_MATRIX.admin["team_members:invite"]).toBe(true);
    expect(PERMISSION_MATRIX.admin["team_members:edit_role"]).toBe(true);
    expect(PERMISSION_MATRIX.admin["team_members:remove"]).toBe(true);
    expect(PERMISSION_MATRIX.admin["team:delete"]).toBe(false);
  });

  it("only owner can delete team", () => {
    expect(PERMISSION_MATRIX.owner["team:delete"]).toBe(true);
    expect(PERMISSION_MATRIX.admin["team:delete"]).toBe(false);
    expect(PERMISSION_MATRIX.editor["team:delete"]).toBe(false);
    expect(PERMISSION_MATRIX.viewer["team:delete"]).toBe(false);
  });

  it("only owner can manage billing", () => {
    expect(PERMISSION_MATRIX.owner["billing:manage"]).toBe(true);
    expect(PERMISSION_MATRIX.admin["billing:manage"]).toBe(false);
    expect(PERMISSION_MATRIX.editor["billing:manage"]).toBe(false);
    expect(PERMISSION_MATRIX.viewer["billing:manage"]).toBe(false);
  });
});

describe("canPerform helper", () => {
  it("returns true for owner with any permission", () => {
    expect(canPerform("owner", "campaigns", "create")).toBe(true);
    expect(canPerform("owner", "team", "delete")).toBe(true);
    expect(canPerform("owner", "billing", "manage")).toBe(true);
  });

  it("returns true for viewer with read permissions", () => {
    expect(canPerform("viewer", "campaigns", "read")).toBe(true);
    expect(canPerform("viewer", "data_sources", "read")).toBe(true);
    expect(canPerform("viewer", "templates", "read")).toBe(true);
  });

  it("returns false for viewer with write permissions", () => {
    expect(canPerform("viewer", "campaigns", "create")).toBe(false);
    expect(canPerform("viewer", "campaigns", "edit")).toBe(false);
    expect(canPerform("viewer", "campaigns", "delete")).toBe(false);
  });

  it("returns true for editor with create/edit permissions", () => {
    expect(canPerform("editor", "campaigns", "create")).toBe(true);
    expect(canPerform("editor", "campaigns", "edit")).toBe(true);
    expect(canPerform("editor", "data_sources", "create")).toBe(true);
  });

  it("returns false for editor with admin-only permissions", () => {
    expect(canPerform("editor", "team_members", "invite")).toBe(false);
    expect(canPerform("editor", "team_members", "remove")).toBe(false);
    expect(canPerform("editor", "team_settings", "edit")).toBe(false);
  });

  it("returns true for admin with member management permissions", () => {
    expect(canPerform("admin", "team_members", "invite")).toBe(true);
    expect(canPerform("admin", "team_members", "edit_role")).toBe(true);
    expect(canPerform("admin", "team_members", "remove")).toBe(true);
  });

  it("returns false for admin with owner-only permissions", () => {
    expect(canPerform("admin", "team", "delete")).toBe(false);
    expect(canPerform("admin", "billing", "manage")).toBe(false);
  });
});

describe("getPermission helper", () => {
  it("returns permission object for valid ID", () => {
    const permission = getPermission("campaigns:read");

    expect(permission).toBeDefined();
    expect(permission?.id).toBe("campaigns:read");
    expect(permission?.resource).toBe("campaigns");
    expect(permission?.action).toBe("read");
  });

  it("returns undefined for invalid ID", () => {
    const permission = getPermission("invalid:permission");

    expect(permission).toBeUndefined();
  });

  it("returns correct properties for a dangerous permission", () => {
    const permission = getPermission("team:delete");

    expect(permission).toBeDefined();
    expect(permission?.dangerLevel).toBe("dangerous");
    expect(permission?.minimumRole).toBe("owner");
  });
});

describe("getRoleLevel helper", () => {
  it("returns 4 for owner", () => {
    expect(getRoleLevel("owner")).toBe(4);
  });

  it("returns 3 for admin", () => {
    expect(getRoleLevel("admin")).toBe(3);
  });

  it("returns 2 for editor", () => {
    expect(getRoleLevel("editor")).toBe(2);
  });

  it("returns 1 for viewer", () => {
    expect(getRoleLevel("viewer")).toBe(1);
  });
});
