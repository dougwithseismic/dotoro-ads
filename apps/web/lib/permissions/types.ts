/**
 * Permission Types for Dotoro Web App
 *
 * Defines the type system for the RBAC permission model.
 * These types map to the backend implementation in apps/api/src/middleware/team-auth.ts
 */

/**
 * Team role enum - matches backend TeamRole type
 * Role hierarchy (highest to lowest permission):
 * - owner (4): Full access, can delete team, manage billing
 * - admin (3): Manage members, all CRUD operations
 * - editor (2): Create/edit campaigns, templates, data sources
 * - viewer (1): Read-only access to all resources
 */
export type TeamRole = "owner" | "admin" | "editor" | "viewer";

/**
 * Resource types available in the system
 */
export type ResourceType =
  | "campaigns"
  | "campaign_sets"
  | "data_sources"
  | "templates"
  | "rules"
  | "transforms"
  | "team_settings"
  | "team_members"
  | "team"
  | "billing";

/**
 * Action types that can be performed on resources
 */
export type ActionType =
  | "read"
  | "create"
  | "edit"
  | "delete"
  | "sync"
  | "invite"
  | "edit_role"
  | "remove"
  | "manage";

/**
 * Danger level indicating the risk of a permission
 * - safe: Normal read/write operations
 * - moderate: Operations that may affect multiple resources
 * - dangerous: Critical operations with potentially irreversible effects
 */
export type DangerLevel = "safe" | "moderate" | "dangerous";

/**
 * Permission definition with full metadata
 */
export interface Permission {
  /** Unique identifier in format "resource:action" */
  id: string;
  /** The resource this permission applies to */
  resource: ResourceType;
  /** The action this permission allows */
  action: ActionType;
  /** Human-readable name for display */
  name: string;
  /** Short description of what this permission does */
  description: string;
  /** Detailed tooltip text explaining the permission */
  tooltip: string;
  /** Risk level of this permission */
  dangerLevel: DangerLevel;
  /** Minimum role required to have this permission */
  minimumRole: TeamRole;
}

/**
 * Role description with metadata for display
 */
export interface RoleDescription {
  /** Human-readable role name */
  name: string;
  /** Description of what this role can do */
  description: string;
  /** Role hierarchy level (1-4) */
  level: number;
  /** Short summary for quick reference */
  summary: string;
}

/**
 * Map of roles to their descriptions
 */
export type RoleDescriptionMap = Record<TeamRole, RoleDescription>;

/**
 * Permission lookup by permission ID
 */
export type PermissionLookup = Record<string, boolean>;

/**
 * Permission matrix mapping roles to their permission lookups
 */
export type PermissionMatrix = Record<TeamRole, PermissionLookup>;
