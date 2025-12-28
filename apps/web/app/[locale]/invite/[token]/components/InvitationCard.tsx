/**
 * InvitationCard Component
 *
 * Displays team invitation details including team name, inviter,
 * role badge, and expiry information.
 */
"use client";

import type { InvitationDetails } from "@/lib/hooks/useInvitation";
import styles from "./InvitationCard.module.css";

interface InvitationCardProps {
  /** The invitation details to display */
  invitation: InvitationDetails;
}

/**
 * Formats the role name for display
 */
function formatRoleName(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Gets the initials from a team name
 */
function getTeamInitials(teamName: string): string {
  const words = teamName.split(" ").filter(Boolean);
  if (words.length === 0) return "?";
  const firstWord = words[0];
  if (!firstWord) return "?";
  if (words.length === 1) return firstWord.charAt(0).toUpperCase();
  const secondWord = words[1];
  if (!secondWord) return firstWord.charAt(0).toUpperCase();
  return (firstWord.charAt(0) + secondWord.charAt(0)).toUpperCase();
}

/**
 * Formats the expiry time in a human-readable way
 */
function formatExpiry(expiresAt: string): string {
  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  // Already expired
  if (diffMs < 0) {
    return "Expired";
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `Expires in ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  }

  if (diffHours < 24) {
    return `Expires in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  }

  if (diffDays === 1) {
    return "Expires tomorrow";
  }

  if (diffDays < 7) {
    return `Expires in ${diffDays} days`;
  }

  // Show the actual date for longer periods
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year:
      expiryDate.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  };

  return `Expires ${expiryDate.toLocaleDateString("en-US", options)}`;
}

/**
 * Gets the CSS class for the role badge based on role
 */
function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin":
      return styles.roleBadgeAdmin ?? "";
    case "editor":
      return styles.roleBadgeEditor ?? "";
    case "viewer":
      return styles.roleBadgeViewer ?? "";
    default:
      return styles.roleBadge ?? "";
  }
}

/**
 * InvitationCard displays the details of a team invitation
 *
 * @example
 * ```tsx
 * <InvitationCard
 *   invitation={{
 *     teamName: "Acme Corp",
 *     teamSlug: "acme-corp",
 *     inviterEmail: "admin@acme.com",
 *     role: "editor",
 *     expiresAt: "2025-01-05T00:00:00Z"
 *   }}
 * />
 * ```
 */
export function InvitationCard({ invitation }: InvitationCardProps) {
  const { teamName, inviterEmail, role, expiresAt } = invitation;

  return (
    <article className={styles.card} data-testid="invitation-card">
      <div className={styles.header}>
        <div className={styles.avatar} data-testid="team-avatar" aria-hidden="true">
          {getTeamInitials(teamName)}
        </div>
        <div className={styles.headerContent}>
          <h1 className={styles.teamName}>{teamName}</h1>
          <p className={styles.inviteMessage}>
            You&apos;ve been invited by{" "}
            <span className={styles.inviterEmail}>{inviterEmail}</span>
          </p>
        </div>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Your role</span>
          <span
            className={`${styles.roleBadge} ${getRoleBadgeClass(role)}`}
            data-testid="role-badge"
            role="status"
            aria-label={`Role: ${formatRoleName(role)}`}
          >
            {formatRoleName(role)}
          </span>
        </div>

        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Invitation</span>
          <span
            className={styles.expiryInfo}
            data-testid="expiry-info"
          >
            {formatExpiry(expiresAt)}
          </span>
        </div>
      </div>
    </article>
  );
}

export default InvitationCard;
