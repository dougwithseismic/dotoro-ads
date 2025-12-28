"use client";

import { Crown, UserCog, Edit3, Eye, Shield } from "lucide-react";
import {
  CurrentRoleBanner,
  PermissionsView,
} from "@/components/permissions";
import {
  ROLE_DESCRIPTIONS,
  PERMISSIONS,
  DANGER_PERMISSIONS,
  type TeamRole,
} from "@/lib/permissions";
import styles from "./PermissionsTab.module.css";

export interface PermissionsTabProps {
  /** The current user's team role */
  currentRole: TeamRole;
  /** Whether the current user is the team owner (for audit panel) */
  isOwner?: boolean;
}

const ROLE_ICONS: Record<TeamRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: UserCog,
  editor: Edit3,
  viewer: Eye,
};

const ROLE_ORDER: TeamRole[] = ["owner", "admin", "editor", "viewer"];

/**
 * PermissionsTab Component
 *
 * Full tab content for the "Roles & Permissions" section in team settings.
 * Shows:
 * - Current role banner
 * - Role hierarchy explanation
 * - Permission matrix/cards
 * - Owner-only audit section
 */
export function PermissionsTab({
  currentRole,
  isOwner = false,
}: PermissionsTabProps) {
  return (
    <div className={styles.container}>
      {/* Current Role Banner */}
      <CurrentRoleBanner role={currentRole} />

      {/* Role Hierarchy Section */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Role Hierarchy</h3>
        <div className={styles.roleHierarchy}>
          {ROLE_ORDER.map((role) => {
            const roleInfo = ROLE_DESCRIPTIONS[role];
            const Icon = ROLE_ICONS[role];
            const isCurrent = role === currentRole;

            return (
              <div
                key={role}
                className={`${styles.roleCard} ${styles[role]}`}
                data-testid={`role-card-${role}`}
                data-current={isCurrent}
              >
                {isCurrent && (
                  <span className={styles.currentIndicator}>You</span>
                )}
                <div className={styles.roleCardHeader}>
                  <div className={styles.roleCardIcon}>
                    <Icon aria-hidden="true" />
                  </div>
                  <span className={styles.roleCardName}>{roleInfo.name}</span>
                  <span className={styles.roleCardLevel}>
                    Level {roleInfo.level}
                  </span>
                </div>
                <p className={styles.roleCardSummary}>{roleInfo.summary}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Permission Matrix/Cards */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Permission Details</h3>
        <PermissionsView currentRole={currentRole} />
      </section>

      {/* Owner-Only Audit Section */}
      {isOwner && (
        <section className={styles.auditSection}>
          <div className={styles.auditHeader}>
            <Shield className={styles.auditIcon} aria-hidden="true" />
            <h4 className={styles.auditTitle}>Permission Audit</h4>
          </div>
          <p className={styles.auditDescription}>
            As the team owner, you have visibility into all permission checks
            available in the system. This information is useful for compliance
            and security audits.
          </p>
          <div className={styles.auditStats}>
            <div className={styles.auditStat}>
              <span className={styles.auditStatValue}>
                {PERMISSIONS.length}
              </span>
              <span className={styles.auditStatLabel}>Total Permissions</span>
            </div>
            <div className={styles.auditStat}>
              <span className={styles.auditStatValue}>
                {DANGER_PERMISSIONS.length}
              </span>
              <span className={styles.auditStatLabel}>
                Dangerous Permissions
              </span>
            </div>
            <div className={styles.auditStat}>
              <span className={styles.auditStatValue}>4</span>
              <span className={styles.auditStatLabel}>Role Levels</span>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
