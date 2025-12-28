/**
 * Permission Definitions for Dotoro Web App
 *
 * This file contains all permission definitions, role descriptions,
 * and the permission matrix mapping roles to their allowed actions.
 *
 * The structure is designed to be future-proof for custom roles by
 * using a data-driven permission matrix.
 */

import type {
  Permission,
  TeamRole,
  ResourceType,
  ActionType,
  RoleDescriptionMap,
  PermissionMatrix,
} from "./types";

/**
 * Role hierarchy levels matching backend implementation
 */
export const ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

/**
 * Role descriptions with metadata for display
 */
export const ROLE_DESCRIPTIONS: RoleDescriptionMap = {
  owner: {
    name: "Owner",
    description:
      "Full control over the team including billing, settings, and the ability to delete the team. Only one owner per team.",
    level: 4,
    summary: "Full access to everything",
  },
  admin: {
    name: "Admin",
    description:
      "Can manage team members, invitations, and all campaign resources. Cannot delete the team or manage billing.",
    level: 3,
    summary: "Manage team and resources",
  },
  editor: {
    name: "Editor",
    description:
      "Can create and edit campaigns, templates, data sources, and other resources. Cannot manage team members or settings.",
    level: 2,
    summary: "Create and edit content",
  },
  viewer: {
    name: "Viewer",
    description:
      "Read-only access to all team resources. Cannot create, edit, or delete anything.",
    level: 1,
    summary: "View only",
  },
};

/**
 * Helper to create a permission ID from resource and action
 */
function permissionId(resource: ResourceType, action: ActionType): string {
  return `${resource}:${action}`;
}

/**
 * All permission definitions in the system
 */
export const PERMISSIONS: Permission[] = [
  // ==========================================================================
  // Campaigns
  // ==========================================================================
  {
    id: permissionId("campaigns", "read"),
    resource: "campaigns",
    action: "read",
    name: "View Campaigns",
    description: "View campaign details and performance",
    tooltip:
      "Allows viewing all campaigns, their configurations, and performance metrics. This is the basic permission for any team member.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("campaigns", "create"),
    resource: "campaigns",
    action: "create",
    name: "Create Campaigns",
    description: "Create new advertising campaigns",
    tooltip:
      "Allows creating new campaigns from scratch or using templates. Created campaigns will be associated with the team.",
    dangerLevel: "safe",
    minimumRole: "editor",
  },
  {
    id: permissionId("campaigns", "edit"),
    resource: "campaigns",
    action: "edit",
    name: "Edit Campaigns",
    description: "Modify existing campaign configurations",
    tooltip:
      "Allows editing campaign settings including budgets, targeting, and creative content. Changes may affect live campaigns.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },
  {
    id: permissionId("campaigns", "delete"),
    resource: "campaigns",
    action: "delete",
    name: "Delete Campaigns",
    description: "Permanently remove campaigns",
    tooltip:
      "Allows permanently deleting campaigns. This action cannot be undone. Historical data may be lost.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },

  // ==========================================================================
  // Campaign Sets
  // ==========================================================================
  {
    id: permissionId("campaign_sets", "read"),
    resource: "campaign_sets",
    action: "read",
    name: "View Campaign Sets",
    description: "View campaign set details and structure",
    tooltip:
      "Allows viewing campaign sets, their hierarchy, and associated campaigns. Useful for understanding campaign organization.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("campaign_sets", "create"),
    resource: "campaign_sets",
    action: "create",
    name: "Create Campaign Sets",
    description: "Create new campaign sets",
    tooltip:
      "Allows creating new campaign sets to organize related campaigns. Campaign sets can contain multiple campaigns and ad groups.",
    dangerLevel: "safe",
    minimumRole: "editor",
  },
  {
    id: permissionId("campaign_sets", "edit"),
    resource: "campaign_sets",
    action: "edit",
    name: "Edit Campaign Sets",
    description: "Modify campaign set configurations",
    tooltip:
      "Allows editing campaign set settings and organization. Changes may propagate to child campaigns.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },
  {
    id: permissionId("campaign_sets", "delete"),
    resource: "campaign_sets",
    action: "delete",
    name: "Delete Campaign Sets",
    description: "Permanently remove campaign sets",
    tooltip:
      "Allows deleting campaign sets. Associated campaigns may become orphaned or also be deleted depending on settings.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },

  // ==========================================================================
  // Data Sources
  // ==========================================================================
  {
    id: permissionId("data_sources", "read"),
    resource: "data_sources",
    action: "read",
    name: "View Data Sources",
    description: "View data source configurations and data",
    tooltip:
      "Allows viewing data sources, their configurations, and preview data. Includes access to sync history.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("data_sources", "create"),
    resource: "data_sources",
    action: "create",
    name: "Create Data Sources",
    description: "Connect new data sources",
    tooltip:
      "Allows creating connections to Google Sheets, APIs, or CSV uploads. Data sources provide dynamic content for campaigns.",
    dangerLevel: "safe",
    minimumRole: "editor",
  },
  {
    id: permissionId("data_sources", "edit"),
    resource: "data_sources",
    action: "edit",
    name: "Edit Data Sources",
    description: "Modify data source configurations",
    tooltip:
      "Allows editing data source settings including connection parameters and column mappings. May affect campaign generation.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },
  {
    id: permissionId("data_sources", "delete"),
    resource: "data_sources",
    action: "delete",
    name: "Delete Data Sources",
    description: "Remove data source connections",
    tooltip:
      "Allows deleting data source connections. Campaigns using this data source may stop working correctly.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },
  {
    id: permissionId("data_sources", "sync"),
    resource: "data_sources",
    action: "sync",
    name: "Sync Data Sources",
    description: "Trigger data synchronization",
    tooltip:
      "Allows manually triggering data sync from external sources. Automatic syncs happen on schedule regardless of this permission.",
    dangerLevel: "safe",
    minimumRole: "editor",
  },

  // ==========================================================================
  // Templates
  // ==========================================================================
  {
    id: permissionId("templates", "read"),
    resource: "templates",
    action: "read",
    name: "View Templates",
    description: "View campaign and ad templates",
    tooltip:
      "Allows viewing all templates available to the team. Templates define reusable campaign structures.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("templates", "create"),
    resource: "templates",
    action: "create",
    name: "Create Templates",
    description: "Create new templates",
    tooltip:
      "Allows creating new templates for campaigns and ads. Templates can include variables for dynamic content.",
    dangerLevel: "safe",
    minimumRole: "editor",
  },
  {
    id: permissionId("templates", "edit"),
    resource: "templates",
    action: "edit",
    name: "Edit Templates",
    description: "Modify existing templates",
    tooltip:
      "Allows editing template configurations. Changes affect future campaigns using this template but not existing ones.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },
  {
    id: permissionId("templates", "delete"),
    resource: "templates",
    action: "delete",
    name: "Delete Templates",
    description: "Remove templates",
    tooltip:
      "Allows deleting templates. Existing campaigns using this template are not affected, but no new campaigns can use it.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },

  // ==========================================================================
  // Rules
  // ==========================================================================
  {
    id: permissionId("rules", "read"),
    resource: "rules",
    action: "read",
    name: "View Rules",
    description: "View automation rules",
    tooltip:
      "Allows viewing automation rules that control campaign behavior based on conditions.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("rules", "create"),
    resource: "rules",
    action: "create",
    name: "Create Rules",
    description: "Create new automation rules",
    tooltip:
      "Allows creating rules that automatically adjust campaigns based on triggers and conditions.",
    dangerLevel: "safe",
    minimumRole: "editor",
  },
  {
    id: permissionId("rules", "edit"),
    resource: "rules",
    action: "edit",
    name: "Edit Rules",
    description: "Modify automation rules",
    tooltip:
      "Allows editing rule configurations. Changes take effect immediately and may affect running campaigns.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },
  {
    id: permissionId("rules", "delete"),
    resource: "rules",
    action: "delete",
    name: "Delete Rules",
    description: "Remove automation rules",
    tooltip:
      "Allows deleting automation rules. Campaigns will no longer be automatically adjusted by this rule.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },

  // ==========================================================================
  // Transforms
  // ==========================================================================
  {
    id: permissionId("transforms", "read"),
    resource: "transforms",
    action: "read",
    name: "View Transforms",
    description: "View data transforms",
    tooltip:
      "Allows viewing data transform configurations that process and aggregate data from sources.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("transforms", "create"),
    resource: "transforms",
    action: "create",
    name: "Create Transforms",
    description: "Create new data transforms",
    tooltip:
      "Allows creating transforms to process, aggregate, and modify data from sources before use in campaigns.",
    dangerLevel: "safe",
    minimumRole: "editor",
  },
  {
    id: permissionId("transforms", "edit"),
    resource: "transforms",
    action: "edit",
    name: "Edit Transforms",
    description: "Modify data transforms",
    tooltip:
      "Allows editing transform configurations. Changes affect how data is processed for campaigns.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },
  {
    id: permissionId("transforms", "delete"),
    resource: "transforms",
    action: "delete",
    name: "Delete Transforms",
    description: "Remove data transforms",
    tooltip:
      "Allows deleting transforms. Campaigns depending on this transform may not generate correctly.",
    dangerLevel: "moderate",
    minimumRole: "editor",
  },

  // ==========================================================================
  // Team Settings
  // ==========================================================================
  {
    id: permissionId("team_settings", "read"),
    resource: "team_settings",
    action: "read",
    name: "View Team Settings",
    description: "View team configuration",
    tooltip:
      "Allows viewing team settings including name, description, and configuration. Does not include billing information.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("team_settings", "edit"),
    resource: "team_settings",
    action: "edit",
    name: "Edit Team Settings",
    description: "Modify team configuration",
    tooltip:
      "Allows editing team name, description, and other settings. Does not include billing or member management.",
    dangerLevel: "moderate",
    minimumRole: "admin",
  },

  // ==========================================================================
  // Team Members
  // ==========================================================================
  {
    id: permissionId("team_members", "read"),
    resource: "team_members",
    action: "read",
    name: "View Team Members",
    description: "View team member list",
    tooltip:
      "Allows viewing all team members and their roles. Basic information visible to all team members.",
    dangerLevel: "safe",
    minimumRole: "viewer",
  },
  {
    id: permissionId("team_members", "invite"),
    resource: "team_members",
    action: "invite",
    name: "Invite Members",
    description: "Send team invitations",
    tooltip:
      "Allows sending invitations to new team members. Invitees will receive an email to join the team.",
    dangerLevel: "moderate",
    minimumRole: "admin",
  },
  {
    id: permissionId("team_members", "edit_role"),
    resource: "team_members",
    action: "edit_role",
    name: "Change Member Roles",
    description: "Modify team member roles",
    tooltip:
      "Allows changing the role of team members. Cannot change owner role or promote to owner.",
    dangerLevel: "moderate",
    minimumRole: "admin",
  },
  {
    id: permissionId("team_members", "remove"),
    resource: "team_members",
    action: "remove",
    name: "Remove Members",
    description: "Remove members from the team",
    tooltip:
      "Allows removing team members. Removed members lose all access to team resources immediately. This action is reversible by re-inviting.",
    dangerLevel: "dangerous",
    minimumRole: "admin",
  },

  // ==========================================================================
  // Team (Dangerous Operations)
  // ==========================================================================
  {
    id: permissionId("team", "delete"),
    resource: "team",
    action: "delete",
    name: "Delete Team",
    description: "Permanently delete the team",
    tooltip:
      "Allows permanently deleting the entire team, including all campaigns, data sources, and member associations. THIS ACTION CANNOT BE UNDONE.",
    dangerLevel: "dangerous",
    minimumRole: "owner",
  },

  // ==========================================================================
  // Billing
  // ==========================================================================
  {
    id: permissionId("billing", "read"),
    resource: "billing",
    action: "read",
    name: "View Billing",
    description: "View billing information",
    tooltip:
      "Allows viewing billing history, current plan, and usage statistics. Does not include payment method details.",
    dangerLevel: "safe",
    minimumRole: "admin",
  },
  {
    id: permissionId("billing", "manage"),
    resource: "billing",
    action: "manage",
    name: "Manage Billing",
    description: "Manage payment methods and subscription",
    tooltip:
      "Allows managing payment methods, upgrading/downgrading plans, and accessing full billing details. Handle with care.",
    dangerLevel: "dangerous",
    minimumRole: "owner",
  },
];

/**
 * List of permission IDs that are considered dangerous
 * These are highlighted in the UI with warning indicators
 */
export const DANGER_PERMISSIONS: string[] = PERMISSIONS.filter(
  (p) => p.dangerLevel === "dangerous"
).map((p) => p.id);

/**
 * Build the permission matrix from permission definitions
 */
function buildPermissionMatrix(): PermissionMatrix {
  const matrix: PermissionMatrix = {
    owner: {},
    admin: {},
    editor: {},
    viewer: {},
  };

  const roles: TeamRole[] = ["owner", "admin", "editor", "viewer"];

  // For each permission, determine which roles have access
  PERMISSIONS.forEach((permission) => {
    const minimumLevel = ROLE_HIERARCHY[permission.minimumRole];

    roles.forEach((role) => {
      const roleLevel = ROLE_HIERARCHY[role];
      matrix[role][permission.id] = roleLevel >= minimumLevel;
    });
  });

  return matrix;
}

/**
 * Permission matrix mapping roles to their allowed permissions
 * Generated from PERMISSIONS based on minimumRole requirements
 */
export const PERMISSION_MATRIX: PermissionMatrix = buildPermissionMatrix();
