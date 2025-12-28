"use client";

import React, { useState, useMemo } from "react";
import {
  Megaphone,
  Layers,
  Database,
  FileText,
  GitBranch,
  Repeat,
  Settings,
  Users,
  Trash2,
  CreditCard,
} from "lucide-react";
import { PermissionCell } from "./PermissionCell";
import { DangerBadge } from "./DangerBadge";
import styles from "./PermissionMatrix.module.css";
import {
  PERMISSIONS,
  PERMISSION_MATRIX,
  ROLE_DESCRIPTIONS,
  DANGER_PERMISSIONS,
  type TeamRole,
  type ResourceType,
  type Permission,
} from "@/lib/permissions";

export interface PermissionMatrixProps {
  /** The current user's role for highlighting */
  currentRole: TeamRole;
  /** Whether to show only dangerous permissions */
  showDangerousOnly?: boolean;
}

const ROLES: TeamRole[] = ["viewer", "editor", "admin", "owner"];

const RESOURCE_ICONS: Record<ResourceType, React.ComponentType<{ className?: string }>> = {
  campaigns: Megaphone,
  campaign_sets: Layers,
  data_sources: Database,
  templates: FileText,
  rules: GitBranch,
  transforms: Repeat,
  team_settings: Settings,
  team_members: Users,
  team: Trash2,
  billing: CreditCard,
};

const RESOURCE_LABELS: Record<ResourceType, string> = {
  campaigns: "Campaigns",
  campaign_sets: "Campaign Sets",
  data_sources: "Data Sources",
  templates: "Templates",
  rules: "Rules",
  transforms: "Transforms",
  team_settings: "Team Settings",
  team_members: "Team Members",
  team: "Team",
  billing: "Billing",
};

// Group permissions by resource
function groupPermissionsByResource(
  permissions: Permission[]
): Map<ResourceType, Permission[]> {
  const grouped = new Map<ResourceType, Permission[]>();

  permissions.forEach((permission) => {
    const existing = grouped.get(permission.resource) || [];
    existing.push(permission);
    grouped.set(permission.resource, existing);
  });

  return grouped;
}

/**
 * PermissionMatrix Component
 *
 * Displays a table showing all permissions for all roles.
 * - Roles as columns, resources/actions as rows
 * - Current user's role column highlighted
 * - Grouped by resource type
 * - Optional filter for dangerous permissions only
 */
export function PermissionMatrix({
  currentRole,
  showDangerousOnly: initialShowDangerousOnly = false,
}: PermissionMatrixProps) {
  const [showDangerousOnly, setShowDangerousOnly] = useState(
    initialShowDangerousOnly
  );

  // Filter and group permissions
  const groupedPermissions = useMemo(() => {
    const filteredPermissions = showDangerousOnly
      ? PERMISSIONS.filter((p) => DANGER_PERMISSIONS.includes(p.id))
      : PERMISSIONS;

    return groupPermissionsByResource(filteredPermissions);
  }, [showDangerousOnly]);

  // Get ordered list of resources that have permissions
  const resourceOrder: ResourceType[] = [
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

  const activeResources = resourceOrder.filter((r) =>
    groupedPermissions.has(r)
  );

  if (activeResources.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          No permissions to display with current filters.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} data-testid="permission-matrix">
      {/* Filter bar */}
      <div className={styles.filterBar}>
        <label className={styles.filterLabel}>
          <input
            type="checkbox"
            className={styles.filterCheckbox}
            checked={showDangerousOnly}
            onChange={(e) => setShowDangerousOnly(e.target.checked)}
            aria-label="Show dangerous permissions only"
          />
          Show dangerous permissions only
        </label>
      </div>

      <table className={styles.table} role="grid">
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.headerCell} scope="col">
              Permission
            </th>
            {ROLES.map((role) => {
              const roleInfo = ROLE_DESCRIPTIONS[role];
              const isCurrentRole = role === currentRole;

              return (
                <th
                  key={role}
                  className={`${styles.headerCell} ${isCurrentRole ? styles.currentRoleHeader : ""}`}
                  scope="col"
                  data-role={role}
                  data-current={isCurrentRole}
                >
                  {roleInfo.name}
                  <span className={styles.roleLevel}>Level {roleInfo.level}</span>
                  {isCurrentRole && (
                    <span className={styles.youIndicator}>You</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {activeResources.map((resource) => {
            const permissions = groupedPermissions.get(resource) || [];
            const ResourceIcon = RESOURCE_ICONS[resource];

            return (
              <React.Fragment key={resource}>
                {/* Resource group header */}
                <tr className={styles.resourceGroupRow}>
                  <td
                    className={styles.resourceGroupCell}
                    colSpan={ROLES.length + 1}
                  >
                    <span className={styles.resourceIcon}>
                      <ResourceIcon aria-hidden="true" />
                      {RESOURCE_LABELS[resource]}
                    </span>
                  </td>
                </tr>

                {/* Permission rows */}
                {permissions.map((permission) => {
                  const isDangerous = DANGER_PERMISSIONS.includes(permission.id);

                  return (
                    <tr
                      key={permission.id}
                      className={styles.permissionRow}
                      data-permission={permission.id}
                    >
                      <td
                        className={`${styles.permissionCell} ${styles.permissionNameCell}`}
                      >
                        <div className={styles.permissionName}>
                          <span className={styles.permissionLabel}>
                            {permission.name}
                          </span>
                          {isDangerous && (
                            <DangerBadge level={permission.dangerLevel} />
                          )}
                        </div>
                      </td>

                      {ROLES.map((role) => {
                        const isAllowed = PERMISSION_MATRIX[role][permission.id] ?? false;
                        const isCurrentRole = role === currentRole;

                        return (
                          <td
                            key={role}
                            className={`${styles.permissionCell} ${styles.roleCell} ${
                              isCurrentRole ? styles.currentRoleCell : ""
                            }`}
                            data-role={role}
                          >
                            <PermissionCell
                              allowed={isAllowed}
                              tooltip={permission.tooltip}
                              dangerous={isDangerous}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
