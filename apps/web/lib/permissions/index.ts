/**
 * Permissions Module for Dotoro Web App
 *
 * Provides permission types, definitions, and helper functions
 * for working with the RBAC system.
 *
 * @example
 * ```ts
 * import { canPerform, getPermission, PERMISSION_MATRIX } from "@/lib/permissions";
 *
 * // Check if a user can perform an action
 * if (canPerform("editor", "campaigns", "create")) {
 *   // Show create button
 * }
 *
 * // Get permission details for display
 * const perm = getPermission("team:delete");
 * console.log(perm?.tooltip); // Full description
 * ```
 */

// Re-export all types
export type {
  TeamRole,
  ResourceType,
  ActionType,
  DangerLevel,
  Permission,
  RoleDescription,
  RoleDescriptionMap,
  PermissionLookup,
  PermissionMatrix,
} from "./types";

// Re-export all definitions
export {
  ROLE_HIERARCHY,
  ROLE_DESCRIPTIONS,
  PERMISSIONS,
  DANGER_PERMISSIONS,
  PERMISSION_MATRIX,
} from "./definitions";

import type { TeamRole, ResourceType, ActionType, Permission } from "./types";
import { ROLE_HIERARCHY, PERMISSIONS, PERMISSION_MATRIX } from "./definitions";

/**
 * Check if a role can perform a specific action on a resource
 *
 * @param role - The user's team role
 * @param resource - The resource type to check
 * @param action - The action to check
 * @returns true if the role has permission
 *
 * @example
 * ```ts
 * if (canPerform("editor", "campaigns", "create")) {
 *   // User can create campaigns
 * }
 * ```
 */
export function canPerform(
  role: TeamRole,
  resource: ResourceType,
  action: ActionType
): boolean {
  const permissionId = `${resource}:${action}`;
  return PERMISSION_MATRIX[role]?.[permissionId] ?? false;
}

/**
 * Get full permission details by ID
 *
 * @param permissionId - The permission ID in "resource:action" format
 * @returns The permission object or undefined if not found
 *
 * @example
 * ```ts
 * const permission = getPermission("team:delete");
 * if (permission?.dangerLevel === "dangerous") {
 *   // Show warning
 * }
 * ```
 */
export function getPermission(permissionId: string): Permission | undefined {
  return PERMISSIONS.find((p) => p.id === permissionId);
}

/**
 * Get the hierarchy level for a role
 *
 * @param role - The team role
 * @returns The role level (1-4)
 *
 * @example
 * ```ts
 * const level = getRoleLevel("admin"); // 3
 * ```
 */
export function getRoleLevel(role: TeamRole): number {
  return ROLE_HIERARCHY[role];
}

/**
 * Check if one role has equal or higher privileges than another
 *
 * @param userRole - The role to check
 * @param requiredRole - The minimum required role
 * @returns true if userRole has sufficient privileges
 *
 * @example
 * ```ts
 * if (hasMinimumRole("admin", "editor")) {
 *   // Admin has at least editor permissions
 * }
 * ```
 */
export function hasMinimumRole(
  userRole: TeamRole,
  requiredRole: TeamRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Get all permissions for a specific resource
 *
 * @param resource - The resource type
 * @returns Array of permissions for that resource
 *
 * @example
 * ```ts
 * const campaignPerms = getPermissionsForResource("campaigns");
 * // Returns: [read, create, edit, delete] permissions
 * ```
 */
export function getPermissionsForResource(
  resource: ResourceType
): Permission[] {
  return PERMISSIONS.filter((p) => p.resource === resource);
}

/**
 * Get all dangerous permissions
 *
 * @returns Array of permissions with dangerLevel "dangerous"
 *
 * @example
 * ```ts
 * const dangerous = getDangerousPermissions();
 * // Highlight these in the UI
 * ```
 */
export function getDangerousPermissions(): Permission[] {
  return PERMISSIONS.filter((p) => p.dangerLevel === "dangerous");
}

/**
 * Check if a permission is dangerous
 *
 * @param permissionId - The permission ID
 * @returns true if the permission is dangerous
 *
 * @example
 * ```ts
 * if (isPermissionDangerous("team:delete")) {
 *   // Show warning indicator
 * }
 * ```
 */
export function isPermissionDangerous(permissionId: string): boolean {
  const permission = getPermission(permissionId);
  return permission?.dangerLevel === "dangerous";
}
