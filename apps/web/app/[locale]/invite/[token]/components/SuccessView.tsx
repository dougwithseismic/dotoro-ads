/**
 * SuccessView Component
 *
 * Displays a success message after successfully accepting a team invitation.
 * Shows a welcome message, role assignment, and CTA to go to the team dashboard.
 */
"use client";

import Link from "next/link";
import styles from "./SuccessView.module.css";

interface SuccessViewProps {
  /** The team name the user just joined */
  teamName: string;
  /** The team slug for navigation */
  teamSlug: string;
  /** The role assigned to the user */
  role: "owner" | "admin" | "editor" | "viewer";
}

/**
 * Formats the role name for display
 */
function formatRoleName(role: string): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Success checkmark icon with animation
 */
function SuccessIcon() {
  return (
    <div className={styles.iconContainer} data-testid="success-icon" aria-hidden="true">
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    </div>
  );
}

/**
 * SuccessView displays a celebratory message after joining a team
 *
 * @example
 * ```tsx
 * <SuccessView
 *   teamName="Acme Corp"
 *   teamSlug="acme-corp"
 *   role="editor"
 * />
 * ```
 */
export function SuccessView({ teamName, teamSlug, role }: SuccessViewProps) {
  const dashboardUrl = `/dashboard?team=${teamSlug}`;

  return (
    <div className={styles.container} data-testid="success-container">
      <SuccessIcon />

      <h1 className={styles.heading}>
        Welcome to {teamName}!
      </h1>

      <p className={styles.message}>
        You&apos;ve successfully joined as{" "}
        <span className={styles.role}>{formatRoleName(role)}</span>
      </p>

      <div className={styles.actions}>
        <Link href={dashboardUrl} className={styles.primaryButton}>
          Go to Team Dashboard
        </Link>
      </div>
    </div>
  );
}

export default SuccessView;
