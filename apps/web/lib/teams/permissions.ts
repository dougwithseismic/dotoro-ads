/**
 * Team Permissions Module
 *
 * Centralized permission checking utilities for team roles.
 * Use these functions instead of inline role checks to ensure
 * consistency and make permission logic easy to update.
 *
 * Role Hierarchy (highest to lowest):
 * - owner: Full control, can delete team, manage billing, transfer ownership
 * - admin: Can manage team settings, members, and invitations
 * - editor: Can create and edit content
 * - viewer: Read-only access
 *
 * @example
 * ```typescript
 * import { canManageTeam, isOwner } from '@/lib/teams/permissions';
 *
 * // Instead of:
 * if (team.role === 'owner' || team.role === 'admin') { ... }
 *
 * // Use:
 * if (canManageTeam(team.role)) { ... }
 * ```
 */

import type { TeamRole } from "./types";

// ============================================================================
// Core Role Checks
// ============================================================================

/**
 * Check if the role is owner
 *
 * Owners have full control over the team including:
 * - All admin permissions
 * - Delete team
 * - Manage billing
 * - Transfer ownership
 */
export function isOwner(role: TeamRole | undefined | null): boolean {
  return role === "owner";
}

/**
 * Check if the role is admin
 *
 * Admins can manage team settings and members but cannot:
 * - Delete team
 * - Manage billing
 * - Transfer ownership
 */
export function isAdmin(role: TeamRole | undefined | null): boolean {
  return role === "admin";
}

/**
 * Check if the role is editor
 *
 * Editors can create and modify content but cannot:
 * - Manage team settings
 * - Manage members
 * - Invite new members
 */
export function isEditor(role: TeamRole | undefined | null): boolean {
  return role === "editor";
}

/**
 * Check if the role is viewer
 *
 * Viewers have read-only access to team resources.
 */
export function isViewer(role: TeamRole | undefined | null): boolean {
  return role === "viewer";
}

// ============================================================================
// Permission Checks
// ============================================================================

/**
 * Check if the role can manage the team (owner or admin)
 *
 * Management permissions include:
 * - Edit team settings (name, description, avatar)
 * - Invite new members
 * - Remove members
 * - Change member roles (except owner)
 * - Revoke invitations
 * - Access advanced settings
 */
export function canManageTeam(role: TeamRole | undefined | null): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Check if the role can edit content (not viewer)
 *
 * Editing permissions include:
 * - Create campaigns
 * - Edit data sources
 * - Modify templates
 * - Update rules
 */
export function canEditContent(role: TeamRole | undefined | null): boolean {
  return role !== "viewer" && role !== undefined && role !== null;
}

/**
 * Check if the role has view-only access
 */
export function isViewOnly(role: TeamRole | undefined | null): boolean {
  return role === "viewer";
}

// ============================================================================
// Specific Permission Checks
// ============================================================================

/**
 * Check if the role can invite new members
 * Only owners and admins can send invitations.
 */
export function canInviteMembers(role: TeamRole | undefined | null): boolean {
  return canManageTeam(role);
}

/**
 * Check if the role can remove members
 * Only owners and admins can remove team members.
 */
export function canRemoveMembers(role: TeamRole | undefined | null): boolean {
  return canManageTeam(role);
}

/**
 * Check if the role can change other members' roles
 * Only owners and admins can change roles.
 * Note: Owners cannot be demoted, and self-demotion may have restrictions.
 */
export function canChangeRoles(role: TeamRole | undefined | null): boolean {
  return canManageTeam(role);
}

/**
 * Check if the role can delete the team
 * Only the owner can delete a team.
 */
export function canDeleteTeam(role: TeamRole | undefined | null): boolean {
  return isOwner(role);
}

/**
 * Check if the role can access billing settings
 * Only the owner can view and manage billing.
 */
export function canAccessBilling(role: TeamRole | undefined | null): boolean {
  return isOwner(role);
}

/**
 * Check if the role can access advanced settings
 * Only owners and admins can access advanced team configuration.
 */
export function canAccessAdvancedSettings(
  role: TeamRole | undefined | null
): boolean {
  return canManageTeam(role);
}

/**
 * Check if the role can transfer ownership
 * Only the current owner can transfer ownership to another member.
 */
export function canTransferOwnership(
  role: TeamRole | undefined | null
): boolean {
  return isOwner(role);
}

/**
 * Check if the role can revoke invitations
 * Only owners and admins can revoke pending invitations.
 */
export function canRevokeInvitations(
  role: TeamRole | undefined | null
): boolean {
  return canManageTeam(role);
}

/**
 * Check if the role can resend invitations
 * Only owners and admins can resend invitation emails.
 */
export function canResendInvitations(
  role: TeamRole | undefined | null
): boolean {
  return canManageTeam(role);
}

// ============================================================================
// Role Comparison Helpers
// ============================================================================

/**
 * Role hierarchy for comparison (higher number = more permissions)
 */
const ROLE_HIERARCHY: Record<TeamRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

/**
 * Check if role A has higher or equal permissions than role B
 *
 * @example
 * ```typescript
 * hasHigherOrEqualRole('admin', 'editor'); // true
 * hasHigherOrEqualRole('editor', 'admin'); // false
 * hasHigherOrEqualRole('admin', 'admin'); // true
 * ```
 */
export function hasHigherOrEqualRole(
  roleA: TeamRole | undefined | null,
  roleB: TeamRole
): boolean {
  if (!roleA) return false;
  return ROLE_HIERARCHY[roleA] >= ROLE_HIERARCHY[roleB];
}

/**
 * Check if role A has strictly higher permissions than role B
 */
export function hasHigherRole(
  roleA: TeamRole | undefined | null,
  roleB: TeamRole
): boolean {
  if (!roleA) return false;
  return ROLE_HIERARCHY[roleA] > ROLE_HIERARCHY[roleB];
}

/**
 * Get roles that a given role can assign to others
 *
 * @example
 * ```typescript
 * getAssignableRoles('admin'); // ['admin', 'editor', 'viewer']
 * getAssignableRoles('owner'); // ['admin', 'editor', 'viewer']
 * getAssignableRoles('editor'); // []
 * ```
 */
export function getAssignableRoles(
  role: TeamRole | undefined | null
): TeamRole[] {
  if (isOwner(role)) {
    return ["admin", "editor", "viewer"];
  }
  if (isAdmin(role)) {
    return ["admin", "editor", "viewer"];
  }
  return [];
}
