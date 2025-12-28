/**
 * Invitation Page Error Boundary
 *
 * Catches and displays errors that occur during page rendering.
 */
"use client";

import { useEffect } from "react";
import Link from "next/link";
import styles from "./InvitationPage.module.css";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function InvitationError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Invitation page error:", error);
  }, [error]);

  return (
    <main className={styles.container}>
      <div className={styles.errorContainer}>
        <h1>Something went wrong</h1>
        <p>
          We encountered an error while loading this invitation.
          Please try again or contact support if the problem persists.
        </p>
        <div className={styles.errorActions}>
          <button
            onClick={reset}
            className={styles.retryButton}
          >
            Try Again
          </button>
          <Link
            href="/"
            className={styles.homeLink}
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
