"use client";

import { useState, useMemo } from "react";
import {
  Check,
  X,
  AlertTriangle,
  ChevronDown,
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
import { DangerBadge } from "./DangerBadge";
import styles from "./PermissionCards.module.css";
import {
  PERMISSIONS,
  PERMISSION_MATRIX,
  ROLE_DESCRIPTIONS,
  DANGER_PERMISSIONS,
  type TeamRole,
  type ResourceType,
  type Permission,
} from "@/lib/permissions";

export interface PermissionCardsProps {
  /** The current user's role for highlighting */
  currentRole: TeamRole;
  /** Whether to show only dangerous permissions */
  showDangerousOnly?: boolean;
}

const ROLES: TeamRole[] = ["owner", "admin", "editor", "viewer"];

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

interface ResourceSectionProps {
  resource: ResourceType;
  permissions: Permission[];
  role: TeamRole;
  isExpanded: boolean;
  onToggle: () => void;
}

function ResourceSection({
  resource,
  permissions,
  role,
  isExpanded,
  onToggle,
}: ResourceSectionProps) {
  const ResourceIcon = RESOURCE_ICONS[resource];

  return (
    <div className={styles.resourceGroup}>
      <button
        className={`${styles.resourceHeader} ${isExpanded ? styles.expanded : ""}`}
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={`permissions-${role}-${resource}`}
      >
        <span className={styles.resourceName}>
          <ResourceIcon aria-hidden="true" />
          {RESOURCE_LABELS[resource]}
        </span>
        <ChevronDown className={styles.expandIcon} aria-hidden="true" />
      </button>

      {isExpanded && (
        <div
          id={`permissions-${role}-${resource}`}
          className={styles.permissionList}
        >
          {permissions.map((permission) => {
            const isAllowed = PERMISSION_MATRIX[role][permission.id];
            const isDangerous = DANGER_PERMISSIONS.includes(permission.id);

            return (
              <div key={permission.id} className={styles.permissionItem}>
                <span className={styles.permissionLabel}>
                  {permission.name}
                  {isDangerous && (
                    <DangerBadge level={permission.dangerLevel} showLabel={false} />
                  )}
                </span>

                <div className={styles.permissionStatus}>
                  {isAllowed ? (
                    <span
                      className={`${styles.allowedStatus} ${isDangerous ? styles.dangerousStatus : ""}`}
                    >
                      {isDangerous ? (
                        <AlertTriangle aria-hidden="true" />
                      ) : (
                        <Check aria-hidden="true" />
                      )}
                      Allowed
                    </span>
                  ) : (
                    <span className={styles.deniedStatus}>
                      <X aria-hidden="true" />
                      Denied
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * PermissionCards Component
 *
 * Mobile-friendly card-based layout showing permissions per role.
 * Current user's role is shown first and highlighted.
 * Resources are collapsible for easier navigation.
 */
export function PermissionCards({
  currentRole,
  showDangerousOnly: initialShowDangerousOnly = false,
}: PermissionCardsProps) {
  const [showDangerousOnly, setShowDangerousOnly] = useState(
    initialShowDangerousOnly
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  );

  // Filter and group permissions
  const groupedPermissions = useMemo(() => {
    const filteredPermissions = showDangerousOnly
      ? PERMISSIONS.filter((p) => DANGER_PERMISSIONS.includes(p.id))
      : PERMISSIONS;

    return groupPermissionsByResource(filteredPermissions);
  }, [showDangerousOnly]);

  // Get ordered list of resources
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

  // Order roles with current role first
  const orderedRoles = [
    currentRole,
    ...ROLES.filter((r) => r !== currentRole),
  ];

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className={styles.container} data-testid="permission-cards">
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

      {orderedRoles.map((role) => {
        const roleInfo = ROLE_DESCRIPTIONS[role];
        const isCurrentRole = role === currentRole;

        return (
          <div
            key={role}
            className={`${styles.card} ${isCurrentRole ? styles.currentRoleCard : ""}`}
            data-role={role}
            data-current={isCurrentRole}
          >
            <div className={styles.cardHeader}>
              <div>
                <span className={styles.roleName}>{roleInfo.name}</span>
                <span className={styles.roleLevel}>Level {roleInfo.level}</span>
              </div>
              {isCurrentRole && (
                <span className={styles.currentBadge}>Your Role</span>
              )}
            </div>

            <div className={styles.cardBody}>
              {activeResources.map((resource) => {
                const permissions = groupedPermissions.get(resource) || [];
                const sectionKey = `${role}-${resource}`;

                return (
                  <ResourceSection
                    key={sectionKey}
                    resource={resource}
                    permissions={permissions}
                    role={role}
                    isExpanded={expandedSections.has(sectionKey)}
                    onToggle={() => toggleSection(sectionKey)}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
