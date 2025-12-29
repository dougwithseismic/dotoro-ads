/**
 * Permission Utilities Tests
 *
 * Comprehensive tests for the centralized team permission checking functions.
 */

import { describe, it, expect } from "vitest";
import {
  isOwner,
  isAdmin,
  isEditor,
  isViewer,
  canManageTeam,
  canEditContent,
  isViewOnly,
  canInviteMembers,
  canRemoveMembers,
  canChangeRoles,
  canDeleteTeam,
  canAccessBilling,
  canAccessAdvancedSettings,
  canTransferOwnership,
  canRevokeInvitations,
  canResendInvitations,
  hasHigherOrEqualRole,
  hasHigherRole,
  getAssignableRoles,
} from "../permissions";
import type { TeamRole } from "../types";

describe("permissions", () => {
  // ============================================================================
  // Core Role Checks
  // ============================================================================

  describe("isOwner", () => {
    it("returns true for owner role", () => {
      expect(isOwner("owner")).toBe(true);
    });

    it("returns false for non-owner roles", () => {
      expect(isOwner("admin")).toBe(false);
      expect(isOwner("editor")).toBe(false);
      expect(isOwner("viewer")).toBe(false);
    });

    it("returns false for undefined or null", () => {
      expect(isOwner(undefined)).toBe(false);
      expect(isOwner(null)).toBe(false);
    });
  });

  describe("isAdmin", () => {
    it("returns true for admin role", () => {
      expect(isAdmin("admin")).toBe(true);
    });

    it("returns false for non-admin roles", () => {
      expect(isAdmin("owner")).toBe(false);
      expect(isAdmin("editor")).toBe(false);
      expect(isAdmin("viewer")).toBe(false);
    });

    it("returns false for undefined or null", () => {
      expect(isAdmin(undefined)).toBe(false);
      expect(isAdmin(null)).toBe(false);
    });
  });

  describe("isEditor", () => {
    it("returns true for editor role", () => {
      expect(isEditor("editor")).toBe(true);
    });

    it("returns false for non-editor roles", () => {
      expect(isEditor("owner")).toBe(false);
      expect(isEditor("admin")).toBe(false);
      expect(isEditor("viewer")).toBe(false);
    });

    it("returns false for undefined or null", () => {
      expect(isEditor(undefined)).toBe(false);
      expect(isEditor(null)).toBe(false);
    });
  });

  describe("isViewer", () => {
    it("returns true for viewer role", () => {
      expect(isViewer("viewer")).toBe(true);
    });

    it("returns false for non-viewer roles", () => {
      expect(isViewer("owner")).toBe(false);
      expect(isViewer("admin")).toBe(false);
      expect(isViewer("editor")).toBe(false);
    });

    it("returns false for undefined or null", () => {
      expect(isViewer(undefined)).toBe(false);
      expect(isViewer(null)).toBe(false);
    });
  });

  // ============================================================================
  // Permission Checks
  // ============================================================================

  describe("canManageTeam", () => {
    it("returns true for owner and admin", () => {
      expect(canManageTeam("owner")).toBe(true);
      expect(canManageTeam("admin")).toBe(true);
    });

    it("returns false for editor and viewer", () => {
      expect(canManageTeam("editor")).toBe(false);
      expect(canManageTeam("viewer")).toBe(false);
    });

    it("returns false for undefined or null", () => {
      expect(canManageTeam(undefined)).toBe(false);
      expect(canManageTeam(null)).toBe(false);
    });
  });

  describe("canEditContent", () => {
    it("returns true for owner, admin, and editor", () => {
      expect(canEditContent("owner")).toBe(true);
      expect(canEditContent("admin")).toBe(true);
      expect(canEditContent("editor")).toBe(true);
    });

    it("returns false for viewer", () => {
      expect(canEditContent("viewer")).toBe(false);
    });

    it("returns false for undefined or null", () => {
      expect(canEditContent(undefined)).toBe(false);
      expect(canEditContent(null)).toBe(false);
    });
  });

  describe("isViewOnly", () => {
    it("returns true only for viewer role", () => {
      expect(isViewOnly("viewer")).toBe(true);
    });

    it("returns false for other roles", () => {
      expect(isViewOnly("owner")).toBe(false);
      expect(isViewOnly("admin")).toBe(false);
      expect(isViewOnly("editor")).toBe(false);
    });

    it("returns false for undefined or null", () => {
      expect(isViewOnly(undefined)).toBe(false);
      expect(isViewOnly(null)).toBe(false);
    });
  });

  // ============================================================================
  // Specific Permission Checks
  // ============================================================================

  describe("canInviteMembers", () => {
    it("returns true for owner and admin", () => {
      expect(canInviteMembers("owner")).toBe(true);
      expect(canInviteMembers("admin")).toBe(true);
    });

    it("returns false for editor and viewer", () => {
      expect(canInviteMembers("editor")).toBe(false);
      expect(canInviteMembers("viewer")).toBe(false);
    });
  });

  describe("canRemoveMembers", () => {
    it("returns true for owner and admin", () => {
      expect(canRemoveMembers("owner")).toBe(true);
      expect(canRemoveMembers("admin")).toBe(true);
    });

    it("returns false for editor and viewer", () => {
      expect(canRemoveMembers("editor")).toBe(false);
      expect(canRemoveMembers("viewer")).toBe(false);
    });
  });

  describe("canChangeRoles", () => {
    it("returns true for owner and admin", () => {
      expect(canChangeRoles("owner")).toBe(true);
      expect(canChangeRoles("admin")).toBe(true);
    });

    it("returns false for editor and viewer", () => {
      expect(canChangeRoles("editor")).toBe(false);
      expect(canChangeRoles("viewer")).toBe(false);
    });
  });

  describe("canDeleteTeam", () => {
    it("returns true only for owner", () => {
      expect(canDeleteTeam("owner")).toBe(true);
    });

    it("returns false for all other roles", () => {
      expect(canDeleteTeam("admin")).toBe(false);
      expect(canDeleteTeam("editor")).toBe(false);
      expect(canDeleteTeam("viewer")).toBe(false);
    });
  });

  describe("canAccessBilling", () => {
    it("returns true only for owner", () => {
      expect(canAccessBilling("owner")).toBe(true);
    });

    it("returns false for all other roles", () => {
      expect(canAccessBilling("admin")).toBe(false);
      expect(canAccessBilling("editor")).toBe(false);
      expect(canAccessBilling("viewer")).toBe(false);
    });
  });

  describe("canAccessAdvancedSettings", () => {
    it("returns true for owner and admin", () => {
      expect(canAccessAdvancedSettings("owner")).toBe(true);
      expect(canAccessAdvancedSettings("admin")).toBe(true);
    });

    it("returns false for editor and viewer", () => {
      expect(canAccessAdvancedSettings("editor")).toBe(false);
      expect(canAccessAdvancedSettings("viewer")).toBe(false);
    });
  });

  describe("canTransferOwnership", () => {
    it("returns true only for owner", () => {
      expect(canTransferOwnership("owner")).toBe(true);
    });

    it("returns false for all other roles", () => {
      expect(canTransferOwnership("admin")).toBe(false);
      expect(canTransferOwnership("editor")).toBe(false);
      expect(canTransferOwnership("viewer")).toBe(false);
    });
  });

  describe("canRevokeInvitations", () => {
    it("returns true for owner and admin", () => {
      expect(canRevokeInvitations("owner")).toBe(true);
      expect(canRevokeInvitations("admin")).toBe(true);
    });

    it("returns false for editor and viewer", () => {
      expect(canRevokeInvitations("editor")).toBe(false);
      expect(canRevokeInvitations("viewer")).toBe(false);
    });
  });

  describe("canResendInvitations", () => {
    it("returns true for owner and admin", () => {
      expect(canResendInvitations("owner")).toBe(true);
      expect(canResendInvitations("admin")).toBe(true);
    });

    it("returns false for editor and viewer", () => {
      expect(canResendInvitations("editor")).toBe(false);
      expect(canResendInvitations("viewer")).toBe(false);
    });
  });

  // ============================================================================
  // Role Comparison Helpers
  // ============================================================================

  describe("hasHigherOrEqualRole", () => {
    it("correctly compares roles in hierarchy", () => {
      // Owner is highest
      expect(hasHigherOrEqualRole("owner", "owner")).toBe(true);
      expect(hasHigherOrEqualRole("owner", "admin")).toBe(true);
      expect(hasHigherOrEqualRole("owner", "editor")).toBe(true);
      expect(hasHigherOrEqualRole("owner", "viewer")).toBe(true);

      // Admin
      expect(hasHigherOrEqualRole("admin", "owner")).toBe(false);
      expect(hasHigherOrEqualRole("admin", "admin")).toBe(true);
      expect(hasHigherOrEqualRole("admin", "editor")).toBe(true);
      expect(hasHigherOrEqualRole("admin", "viewer")).toBe(true);

      // Editor
      expect(hasHigherOrEqualRole("editor", "owner")).toBe(false);
      expect(hasHigherOrEqualRole("editor", "admin")).toBe(false);
      expect(hasHigherOrEqualRole("editor", "editor")).toBe(true);
      expect(hasHigherOrEqualRole("editor", "viewer")).toBe(true);

      // Viewer is lowest
      expect(hasHigherOrEqualRole("viewer", "owner")).toBe(false);
      expect(hasHigherOrEqualRole("viewer", "admin")).toBe(false);
      expect(hasHigherOrEqualRole("viewer", "editor")).toBe(false);
      expect(hasHigherOrEqualRole("viewer", "viewer")).toBe(true);
    });

    it("returns false for undefined or null role", () => {
      expect(hasHigherOrEqualRole(undefined, "viewer")).toBe(false);
      expect(hasHigherOrEqualRole(null, "viewer")).toBe(false);
    });
  });

  describe("hasHigherRole", () => {
    it("correctly compares roles strictly", () => {
      // Owner is strictly higher than all others
      expect(hasHigherRole("owner", "admin")).toBe(true);
      expect(hasHigherRole("owner", "editor")).toBe(true);
      expect(hasHigherRole("owner", "viewer")).toBe(true);
      expect(hasHigherRole("owner", "owner")).toBe(false);

      // Admin
      expect(hasHigherRole("admin", "owner")).toBe(false);
      expect(hasHigherRole("admin", "admin")).toBe(false);
      expect(hasHigherRole("admin", "editor")).toBe(true);
      expect(hasHigherRole("admin", "viewer")).toBe(true);

      // Editor
      expect(hasHigherRole("editor", "viewer")).toBe(true);
      expect(hasHigherRole("editor", "editor")).toBe(false);

      // Viewer has nothing below
      expect(hasHigherRole("viewer", "viewer")).toBe(false);
    });

    it("returns false for undefined or null role", () => {
      expect(hasHigherRole(undefined, "viewer")).toBe(false);
      expect(hasHigherRole(null, "viewer")).toBe(false);
    });
  });

  describe("getAssignableRoles", () => {
    it("returns all non-owner roles for owner", () => {
      const roles = getAssignableRoles("owner");
      expect(roles).toEqual(["admin", "editor", "viewer"]);
      expect(roles).not.toContain("owner");
    });

    it("returns all non-owner roles for admin", () => {
      const roles = getAssignableRoles("admin");
      expect(roles).toEqual(["admin", "editor", "viewer"]);
      expect(roles).not.toContain("owner");
    });

    it("returns empty array for editor and viewer", () => {
      expect(getAssignableRoles("editor")).toEqual([]);
      expect(getAssignableRoles("viewer")).toEqual([]);
    });

    it("returns empty array for undefined or null", () => {
      expect(getAssignableRoles(undefined)).toEqual([]);
      expect(getAssignableRoles(null)).toEqual([]);
    });
  });
});
