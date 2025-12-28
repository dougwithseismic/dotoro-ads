/**
 * InvitationActions Component
 *
 * Handles authentication state and accept/decline actions for team invitations.
 * Shows OAuth buttons when not authenticated, and accept/decline buttons when authenticated.
 */
"use client";

import { useState, useCallback } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { api } from "@/lib/api-client";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import type { InvitationDetails } from "@/lib/hooks/useInvitation";
import styles from "./InvitationActions.module.css";

interface InvitationActionsProps {
  /** The invitation details */
  invitation: InvitationDetails;
  /** The invitation token from the URL */
  token: string;
  /** Callback when invitation is successfully accepted */
  onSuccess: (result: { teamId: string; teamSlug: string }) => void;
  /** Callback when invitation is declined */
  onDeclined: () => void;
}

interface AcceptResponse {
  success: true;
  teamId: string;
  teamSlug: string;
}

/**
 * Loading skeleton for actions section
 */
function ActionsLoading() {
  return (
    <div className={styles.loading} data-testid="actions-loading">
      <div className={styles.loadingSkeleton} />
      <div className={styles.loadingSkeleton} />
    </div>
  );
}

/**
 * Confirmation dialog for declining invitation
 */
function DeclineDialog({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="decline-dialog-title">
      <div className={styles.dialogContent}>
        <h3 id="decline-dialog-title" className={styles.dialogTitle}>Are you sure?</h3>
        <p className={styles.dialogMessage}>
          If you decline this invitation, you will need to request a new one to join the team.
        </p>
        <div className={styles.dialogActions}>
          <button
            type="button"
            onClick={onCancel}
            className={styles.cancelButton}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={styles.confirmDeclineButton}
            disabled={isLoading}
          >
            {isLoading ? "Declining..." : "Yes, Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * InvitationActions handles authentication state and provides accept/decline buttons
 */
export function InvitationActions({
  invitation,
  token,
  onSuccess,
  onDeclined,
}: InvitationActionsProps) {
  const { data: session, isPending } = useSession();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const user = session?.user;
  const isAuthenticated = !!user;

  // Check if the logged-in user's email matches the invitation recipient
  const hasEmailMismatch = isAuthenticated &&
    user?.email?.toLowerCase() !== invitation.inviteeEmail?.toLowerCase();

  const handleAccept = useCallback(async () => {
    setIsAccepting(true);
    setError(null);

    try {
      const result = await api.post<AcceptResponse>(`/api/invitations/${token}/accept`);
      onSuccess({
        teamId: result.teamId,
        teamSlug: result.teamSlug,
      });
    } catch (err) {
      const errorObj = err as { message?: string; status?: number; data?: { message?: string } };
      const errorMessage = errorObj.data?.message || errorObj.message || "Failed to accept invitation";

      if (errorObj.status === 400 && errorMessage.toLowerCase().includes("already")) {
        setError("You are already a member of this team");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsAccepting(false);
    }
  }, [token, onSuccess]);

  const handleDecline = useCallback(async () => {
    setIsDeclining(true);
    setError(null);

    try {
      await api.post(`/api/invitations/${token}/decline`);
      onDeclined();
    } catch (err) {
      const errorObj = err as { message?: string };
      setError(errorObj.message || "Failed to decline invitation");
    } finally {
      setIsDeclining(false);
      setShowDeclineDialog(false);
    }
  }, [token, onDeclined]);

  const handleSwitchAccount = useCallback(async () => {
    setIsSwitchingAccount(true);
    setError(null);

    try {
      await signOut();
      // The page will remain on the same URL, user can then sign in with different account
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to switch account";
      setError(errorMessage);
      setIsSwitchingAccount(false);
    }
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
  }, []);

  // Loading state while session is being determined
  if (isPending) {
    return <ActionsLoading />;
  }

  // Not authenticated - show sign in options
  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <p className={styles.signInMessage}>
          Sign in to accept this invitation
        </p>
        <div data-testid="oauth-buttons">
          <OAuthButtons callbackURL={`/invite/${token}`} />
        </div>
      </div>
    );
  }

  // Authenticated - show actions
  const isLoading = isAccepting || isDeclining || isSwitchingAccount;

  return (
    <div className={styles.container}>
      {/* User info */}
      <p className={styles.userInfo}>
        Logged in as <span className={styles.userEmail}>{user.email}</span>
      </p>

      {/* Email mismatch warning */}
      {hasEmailMismatch && (
        <div className={styles.warningBox} data-testid="email-mismatch-warning">
          <p className={styles.warningText}>
            This invitation was sent to a different email address. You are currently logged in as{" "}
            <strong>{user.email}</strong>.
          </p>
          <button
            type="button"
            onClick={handleSwitchAccount}
            className={styles.switchAccountButton}
            disabled={isSwitchingAccount}
          >
            {isSwitchingAccount ? "Switching..." : "Switch Account"}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className={styles.errorBox} data-testid="error-message">
          <p className={styles.errorText}>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className={styles.retryButton}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Action buttons */}
      {!error && (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={handleAccept}
            disabled={isLoading}
            className={styles.acceptButton}
          >
            {isAccepting ? "Accepting..." : hasEmailMismatch ? "Accept Anyway" : "Accept Invitation"}
          </button>
          <button
            type="button"
            onClick={() => setShowDeclineDialog(true)}
            disabled={isLoading}
            className={styles.declineButton}
          >
            Decline
          </button>
        </div>
      )}

      {/* Decline confirmation dialog */}
      {showDeclineDialog && (
        <DeclineDialog
          onConfirm={handleDecline}
          onCancel={() => setShowDeclineDialog(false)}
          isLoading={isDeclining}
        />
      )}
    </div>
  );
}

export default InvitationActions;
