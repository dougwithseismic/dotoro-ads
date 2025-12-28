"use client";

import { Crown, UserCog, Edit3, Eye } from "lucide-react";
import styles from "./CurrentRoleBanner.module.css";
import { ROLE_DESCRIPTIONS, type TeamRole } from "@/lib/permissions";

export interface CurrentRoleBannerProps {
  /** The current user's team role */
  role: TeamRole;
}

const ROLE_ICONS: Record<TeamRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  admin: UserCog,
  editor: Edit3,
  viewer: Eye,
};

/**
 * CurrentRoleBanner Component
 *
 * Displays a prominent banner showing the current user's role
 * with an icon, name, level indicator, and brief description.
 */
export function CurrentRoleBanner({ role }: CurrentRoleBannerProps) {
  const roleInfo = ROLE_DESCRIPTIONS[role];
  const Icon = ROLE_ICONS[role];

  return (
    <div
      className={`${styles.banner} ${styles[role]}`}
      data-testid="current-role-banner"
      data-role={role}
      role="region"
      aria-label={`Your current role: ${roleInfo.name}`}
    >
      <div className={styles.iconContainer}>
        <Icon className={styles.icon} aria-hidden="true" />
      </div>

      <div className={styles.content}>
        <div className={styles.label}>Your Role</div>
        <div className={styles.roleRow}>
          <span className={styles.roleName}>{roleInfo.name}</span>
          <span className={styles.roleLevel}>Level {roleInfo.level}</span>
        </div>
        <div className={styles.description}>{roleInfo.summary}</div>
      </div>
    </div>
  );
}
