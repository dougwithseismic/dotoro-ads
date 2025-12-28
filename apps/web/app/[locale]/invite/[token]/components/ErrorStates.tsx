/**
 * ErrorStates Components
 *
 * Various error state displays for the invitation page.
 * Includes invalid token, expired, already member, and declined states.
 */
"use client";

import Link from "next/link";
import styles from "./ErrorStates.module.css";

/**
 * Error icon component
 */
function ErrorIcon() {
  return (
    <div className={`${styles.iconContainer} ${styles.errorIcon}`} data-testid="error-icon" aria-hidden="true">
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    </div>
  );
}

/**
 * Expired/clock icon component
 */
function ExpiredIcon() {
  return (
    <div className={`${styles.iconContainer} ${styles.warningIcon}`} data-testid="expired-icon" aria-hidden="true">
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    </div>
  );
}

/**
 * Info icon component
 */
function InfoIcon() {
  return (
    <div className={`${styles.iconContainer} ${styles.infoIcon}`} data-testid="info-icon" aria-hidden="true">
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    </div>
  );
}

/**
 * Check icon component for declined state
 */
function CheckIcon() {
  return (
    <div className={`${styles.iconContainer} ${styles.neutralIcon}`} data-testid="check-icon" aria-hidden="true">
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

/**
 * Invalid Token Error State
 *
 * Shown when the invitation token is not found or has been revoked.
 */
export function InvalidTokenError() {
  return (
    <div className={styles.container} data-testid="invalid-token-error">
      <ErrorIcon />

      <h1 className={styles.heading}>Invitation Not Found</h1>

      <p className={styles.message}>
        This invitation link is invalid or has been revoked.
      </p>

      <p className={styles.suggestion}>
        Please contact the team admin for a new invitation.
      </p>

      <div className={styles.actions}>
        <Link href="/" className={styles.primaryButton}>
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}

/**
 * Expired Invitation Error State
 *
 * Shown when the invitation has expired.
 */
export function ExpiredInvitationError() {
  return (
    <div className={styles.container} data-testid="expired-error">
      <ExpiredIcon />

      <h1 className={styles.heading}>Invitation Expired</h1>

      <p className={styles.message}>
        This invitation has expired. Please request a new invitation from the team admin.
      </p>

      <div className={styles.actions}>
        <Link href="/" className={styles.primaryButton}>
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}

/**
 * Already Member Error State
 *
 * Shown when the user is already a member of the team.
 */
interface AlreadyMemberErrorProps {
  /** The name of the team */
  teamName: string;
  /** The slug of the team for navigation */
  teamSlug: string;
}

export function AlreadyMemberError({ teamName, teamSlug }: AlreadyMemberErrorProps) {
  const teamUrl = `/dashboard?team=${teamSlug}`;

  return (
    <div className={styles.container} data-testid="already-member-error">
      <InfoIcon />

      <h1 className={styles.heading}>Already a Member</h1>

      <p className={styles.message}>
        You&apos;re already a member of {teamName}.
      </p>

      <div className={styles.actions}>
        <Link href={teamUrl} className={styles.primaryButton}>
          Go to Team
        </Link>
      </div>
    </div>
  );
}

/**
 * Declined View
 *
 * Shown after the user has declined an invitation.
 */
export function DeclinedView() {
  return (
    <div className={styles.container} data-testid="declined-view">
      <CheckIcon />

      <h1 className={styles.heading}>Invitation Declined</h1>

      <p className={styles.message}>
        You&apos;ve declined this invitation. If you change your mind, please request a new invitation from the team admin.
      </p>

      <div className={styles.actions}>
        <Link href="/" className={styles.secondaryButton}>
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}
