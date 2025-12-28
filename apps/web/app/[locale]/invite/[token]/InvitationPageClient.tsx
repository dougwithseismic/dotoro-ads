/**
 * Invitation Page Client Component
 *
 * Handles the client-side logic for team invitation acceptance flow.
 * Uses modular components for different states.
 */
"use client";

import { useState, useCallback } from "react";
import { useInvitation } from "@/lib/hooks/useInvitation";
import { InvitationCard } from "./components/InvitationCard";
import { InvitationActions } from "./components/InvitationActions";
import { SuccessView } from "./components/SuccessView";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import {
  InvalidTokenError,
  ExpiredInvitationError,
  AlreadyMemberError,
  DeclinedView,
} from "./components/ErrorStates";
import styles from "./InvitationPage.module.css";

interface InvitationPageClientProps {
  /** The invitation token from the URL */
  token: string;
}

type PageState = "viewing" | "success" | "declined";

interface SuccessData {
  teamId: string;
  teamSlug: string;
}

/**
 * InvitationPageClient handles all invitation page states
 */
export function InvitationPageClient({ token }: InvitationPageClientProps) {
  const { invitation, isLoading, error, errorType } = useInvitation(token);
  const [pageState, setPageState] = useState<PageState>("viewing");
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const handleSuccess = useCallback((data: SuccessData) => {
    setSuccessData(data);
    setPageState("success");
  }, []);

  const handleDeclined = useCallback(() => {
    setPageState("declined");
  }, []);

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // Error states
  if (error || errorType) {
    switch (errorType) {
      case "expired":
        return (
          <main className={styles.container}>
            <ExpiredInvitationError />
          </main>
        );
      case "already_accepted":
        // If we had team info, we'd use AlreadyMemberError
        // but since the invitation is gone, we show not found
        return (
          <main className={styles.container}>
            <InvalidTokenError />
          </main>
        );
      case "network":
        return (
          <main className={styles.container}>
            <div className={styles.errorContainer}>
              <h1>Connection Error</h1>
              <p>Unable to connect to the server. Please check your network and try again.</p>
            </div>
          </main>
        );
      default:
        return (
          <main className={styles.container}>
            <InvalidTokenError />
          </main>
        );
    }
  }

  // Success state
  if (pageState === "success" && successData && invitation) {
    return (
      <main className={styles.container}>
        <SuccessView
          teamName={invitation.teamName}
          teamSlug={successData.teamSlug}
          role={invitation.role}
        />
      </main>
    );
  }

  // Declined state
  if (pageState === "declined") {
    return (
      <main className={styles.container}>
        <DeclinedView />
      </main>
    );
  }

  // Valid invitation - show card and actions
  if (!invitation) {
    return (
      <main className={styles.container}>
        <InvalidTokenError />
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <InvitationCard invitation={invitation} />
      <InvitationActions
        invitation={invitation}
        token={token}
        onSuccess={handleSuccess}
        onDeclined={handleDeclined}
      />
    </main>
  );
}

export default InvitationPageClient;
