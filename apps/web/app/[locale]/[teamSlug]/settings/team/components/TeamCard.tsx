"use client";

import { Users, LogOut } from "lucide-react";
import type { Team, TeamRole } from "@/lib/teams/types";
import styles from "./TeamCard.module.css";

/**
 * Role badge component for displaying team roles
 */
function RoleBadge({ role }: { role: TeamRole }) {
  const roleStyles: Record<TeamRole, string> = {
    owner: styles.roleOwner ?? "",
    admin: styles.roleAdmin ?? "",
    editor: styles.roleEditor ?? "",
    viewer: styles.roleViewer ?? "",
  };

  const roleLabels: Record<TeamRole, string> = {
    owner: "Owner",
    admin: "Admin",
    editor: "Editor",
    viewer: "Viewer",
  };

  return (
    <span className={`${styles.roleBadge} ${roleStyles[role]}`}>
      {roleLabels[role]}
    </span>
  );
}

/**
 * Personal team badge component
 */
function PersonalBadge() {
  return <span className={styles.personalBadge}>Personal</span>;
}

export interface TeamCardProps {
  /** Team to display */
  team: Team;
  /** Whether this team is currently selected */
  isSelected: boolean;
  /** Whether this is a personal team (can't leave) */
  isPersonal: boolean;
  /** Callback when team is selected */
  onSelect: (team: Team) => void;
  /** Callback when leave button is clicked */
  onLeave: (team: Team) => void;
}

/**
 * TeamCard Component
 *
 * Displays a single team in the team list with:
 * - Team avatar initial
 * - Team name
 * - Role badge
 * - Member count
 * - Personal team indicator (if applicable)
 * - Leave team button (if not personal)
 */
export function TeamCard({
  team,
  isSelected,
  isPersonal,
  onSelect,
  onLeave,
}: TeamCardProps) {
  const handleClick = () => {
    onSelect(team);
  };

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onSelect
    onLeave(team);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`team-card-${team.id}`}
      data-selected={isSelected}
      aria-label={`Select ${team.name} team`}
      className={`${styles.card} ${isSelected ? styles.selected : ""}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Avatar */}
      <div className={styles.avatar}>
        <span className={styles.avatarInitial}>
          {team.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Team Info */}
      <div className={styles.info}>
        <div className={styles.nameRow}>
          <span className={styles.name}>{team.name}</span>
          <RoleBadge role={team.role} />
          {isPersonal && <PersonalBadge />}
        </div>
        <div className={styles.metaRow}>
          <Users className={styles.icon} aria-hidden="true" />
          <span className={styles.memberCount}>
            {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        {!isPersonal && (
          <button
            type="button"
            aria-label={`Leave ${team.name}`}
            className={styles.leaveButton}
            onClick={handleLeaveClick}
          >
            <LogOut className={styles.leaveIcon} aria-hidden="true" />
            <span className={styles.leaveText}>Leave</span>
          </button>
        )}
      </div>

      {/* Selected Indicator */}
      {isSelected && <div className={styles.selectedIndicator} aria-hidden="true" />}
    </div>
  );
}
