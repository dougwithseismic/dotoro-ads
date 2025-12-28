/**
 * useAccountDeletion Hooks
 *
 * Provides hooks for account deletion functionality including:
 * - Fetching deletion preview (what happens to teams)
 * - Executing account deletion with confirmation
 * - Handling auth state cleanup after deletion
 */

import { useState, useCallback } from "react";
import {
  fetchDeletionPreview as fetchDeletionPreviewApi,
  deleteAccount as deleteAccountApi,
  type DeletionPreview,
} from "@/lib/api/users";
import { useAuth } from "@/lib/auth";

// ============================================================================
// Deletion Preview Hook
// ============================================================================

interface UseDeletionPreviewReturn {
  /** Fetched deletion preview data, or null if not yet fetched */
  data: DeletionPreview | null;
  /** Whether the preview is currently being fetched */
  isLoading: boolean;
  /** Error message from the last failed fetch attempt, or null */
  error: string | null;
  /** Fetch the deletion preview from the API */
  fetchPreview: () => Promise<void>;
}

/**
 * Hook for fetching account deletion preview.
 *
 * Returns information about what will happen to each team when
 * the user's account is deleted. Does NOT auto-fetch on mount -
 * call fetchPreview() when needed (e.g., when modal opens).
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, fetchPreview } = useDeletionPreview();
 *
 * useEffect(() => {
 *   if (isModalOpen) {
 *     fetchPreview();
 *   }
 * }, [isModalOpen]);
 *
 * if (isLoading) return <Spinner />;
 * if (error) return <Error message={error} />;
 * if (data) return <TeamsList teams={data.teamsToDelete} />;
 * ```
 */
export function useDeletionPreview(): UseDeletionPreviewReturn {
  const [data, setData] = useState<DeletionPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const preview = await fetchDeletionPreviewApi();
      setData(preview);
      setIsLoading(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch deletion preview";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, []);

  return {
    data,
    isLoading,
    error,
    fetchPreview,
  };
}

// ============================================================================
// Delete Account Hook
// ============================================================================

interface UseDeleteAccountReturn {
  /** Execute account deletion with email confirmation */
  deleteAccount: (confirmEmail: string) => Promise<void>;
  /** Whether the deletion is currently in progress */
  isLoading: boolean;
  /** Error message from the last failed deletion attempt, or null */
  error: string | null;
  /** Reset error and loading states */
  reset: () => void;
}

/**
 * Hook for deleting the current user's account.
 *
 * On successful deletion:
 * - Calls logout to clear auth state
 * - Redirects to login page (handled by logout)
 *
 * @example
 * ```tsx
 * const { deleteAccount, isLoading, error, reset } = useDeleteAccount();
 *
 * const handleDelete = async () => {
 *   await deleteAccount(userEmail);
 *   // After success, user is logged out and redirected
 * };
 * ```
 */
export function useDeleteAccount(): UseDeleteAccountReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { logout } = useAuth();

  const deleteAccount = useCallback(
    async (confirmEmail: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        await deleteAccountApi(confirmEmail);
        setIsLoading(false);
        // Account deleted successfully - log out and redirect
        await logout();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete account";
        setError(errorMessage);
        setIsLoading(false);
      }
    },
    [logout]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  return {
    deleteAccount,
    isLoading,
    error,
    reset,
  };
}
