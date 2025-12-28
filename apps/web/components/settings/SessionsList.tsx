/**
 * SessionsList Component
 *
 * Displays a list of all user sessions with the ability to revoke individual
 * sessions or all other sessions at once. Handles loading, error, and empty states.
 *
 * Features:
 * - Fetches sessions using Better Auth client
 * - Loading skeleton while fetching
 * - Error state with retry button
 * - Empty state for single session
 * - Sort by last active (current session first)
 * - Revoke individual sessions
 * - Revoke all other sessions bulk action
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listSessions,
  revokeSession,
  revokeOtherSessions,
  useSession,
} from "@/lib/auth-client";
import { SessionCard, type SessionData } from "./SessionCard";
import { ConfirmDialog } from "@/app/settings/components/ConfirmDialog";

/**
 * Session data from Better Auth API
 */
interface BetterAuthSession {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  userId: string;
}

/**
 * Loading skeleton component for session cards
 */
function SessionSkeleton() {
  return (
    <div
      data-testid="session-skeleton"
      className="flex items-start justify-between p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg animate-pulse"
    >
      <div className="flex items-start gap-3">
        <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-40 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-3 w-56 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
      <div className="h-8 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
    </div>
  );
}

/**
 * Loading state component
 */
function SessionsLoading() {
  return (
    <div data-testid="sessions-loading" className="space-y-3">
      <SessionSkeleton />
      <SessionSkeleton />
      <SessionSkeleton />
    </div>
  );
}

/**
 * Error state component
 */
function SessionsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-red-500 dark:text-red-400 mb-4">
        Failed to load sessions. Please try again.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        Retry
      </button>
    </div>
  );
}

/**
 * Empty state component (only current session exists)
 */
function SessionsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-neutral-500 dark:text-neutral-400">
        This is your only active session. You can manage sessions when you're signed in on multiple devices.
      </p>
    </div>
  );
}

/**
 * SessionsList - Main component for displaying and managing sessions
 *
 * @example
 * ```tsx
 * // In Settings page Sessions tab
 * <SessionsList />
 * ```
 */
export function SessionsList() {
  const { data: sessionData } = useSession();
  const currentSessionToken = sessionData?.session?.token;

  const [sessions, setSessions] = useState<BetterAuthSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeAllDialog, setShowRevokeAllDialog] = useState(false);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  /**
   * Fetch sessions from Better Auth
   */
  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setRevokeError(null);

    try {
      const result = await listSessions();

      if (result.error) {
        setError(result.error.message || "Failed to load sessions");
        setSessions([]); // Clear sessions to avoid stale data
        return;
      }

      if (result.data) {
        // Sort sessions: current session first, then by updatedAt (most recent first)
        const sortedSessions = [...result.data].sort((a, b) => {
          // Current session always first
          if (a.token === currentSessionToken) return -1;
          if (b.token === currentSessionToken) return 1;

          // Then sort by updatedAt descending
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });

        setSessions(sortedSessions);
      }
    } catch (err) {
      // Log actual error for debugging purposes
      console.error("Failed to fetch sessions:", err);
      // Show user-friendly error message
      setError("Failed to load sessions");
      setSessions([]); // Clear sessions to avoid stale data
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionToken]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  /**
   * Handle revoking a single session
   */
  const handleRevokeSession = async (token: string) => {
    setIsRevoking(true);
    setRevokeError(null);

    try {
      const result = await revokeSession({ token });

      if (result.error) {
        const errorMessage = result.error.message || "Failed to revoke session";
        console.error("Failed to revoke session:", result.error);
        setRevokeError(errorMessage);
        return;
      }

      // Remove session from list
      setSessions((prev) => prev.filter((s) => s.token !== token));
    } catch (err) {
      // Handle thrown exceptions (network errors, runtime errors, etc.)
      console.error("Failed to revoke session:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke session";
      setRevokeError(errorMessage);
    } finally {
      setIsRevoking(false);
    }
  };

  /**
   * Handle revoking all other sessions
   */
  const handleRevokeAllOtherSessions = async () => {
    setIsRevokingAll(true);
    setRevokeError(null);

    try {
      const result = await revokeOtherSessions();

      if (result.error) {
        const errorMessage = result.error.message || "Failed to revoke sessions";
        console.error("Failed to revoke other sessions:", result.error);
        setRevokeError(errorMessage);
        setShowRevokeAllDialog(false);
        return;
      }

      // Keep only the current session
      setSessions((prev) => prev.filter((s) => s.token === currentSessionToken));
      setShowRevokeAllDialog(false);
    } catch (err) {
      // Handle thrown exceptions (network errors, runtime errors, etc.)
      console.error("Failed to revoke other sessions:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to revoke sessions";
      setRevokeError(errorMessage);
      setShowRevokeAllDialog(false);
    } finally {
      setIsRevokingAll(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <SessionsLoading />;
  }

  // Error state
  if (error) {
    return <SessionsError onRetry={fetchSessions} />;
  }

  // Convert Better Auth sessions to SessionData format
  const sessionCards: SessionData[] = sessions.map((s) => ({
    id: s.id,
    token: s.token,
    ipAddress: s.ipAddress,
    userAgent: s.userAgent,
    createdAt: new Date(s.createdAt),
    updatedAt: new Date(s.updatedAt),
  }));

  const otherSessionsCount = sessions.filter(
    (s) => s.token !== currentSessionToken
  ).length;

  const hasOtherSessions = otherSessionsCount > 0;

  return (
    <div className="space-y-6">
      {/* Header with count and bulk action */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {sessions.length} active session{sessions.length === 1 ? "" : "s"}
        </p>

        {hasOtherSessions && (
          <button
            type="button"
            onClick={() => setShowRevokeAllDialog(true)}
            disabled={isRevoking || isRevokingAll}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Revoke all other sessions
          </button>
        )}
      </div>

      {/* Revocation error message */}
      {revokeError && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-600 dark:text-red-400">
            {revokeError}
          </p>
          <button
            type="button"
            onClick={() => setRevokeError(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            aria-label="Dismiss error"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Sessions list or empty state */}
      {sessions.length === 1 ? (
        <>
          {/* Show the current session card */}
          <div className="space-y-3">
            <SessionCard
              session={sessionCards[0]}
              isCurrent={true}
              onRevoke={handleRevokeSession}
              isRevoking={isRevoking}
            />
          </div>
          <SessionsEmpty />
        </>
      ) : (
        <div className="space-y-3">
          {sessionCards.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              isCurrent={session.token === currentSessionToken}
              onRevoke={handleRevokeSession}
              isRevoking={isRevoking}
            />
          ))}
        </div>
      )}

      {/* Revoke All Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRevokeAllDialog}
        onClose={() => setShowRevokeAllDialog(false)}
        onConfirm={handleRevokeAllOtherSessions}
        title="Revoke All Other Sessions"
        message={`Are you sure you want to revoke ${otherSessionsCount} other session${otherSessionsCount === 1 ? "" : "s"}? All other devices will be signed out immediately.`}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isRevokingAll}
      />
    </div>
  );
}
