import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";

/**
 * Type for a Reddit ad account in the available accounts response
 */
export interface RedditAvailableAccount {
  id: string;
  name: string;
  type: "MANAGED" | "SELF_SERVE";
  currency: string;
  alreadyConnected: boolean;
}

/**
 * Type for a Reddit business with its accounts
 */
export interface RedditBusiness {
  id: string;
  name: string;
  accounts: RedditAvailableAccount[];
}

/**
 * API response type for available accounts endpoint
 */
export interface AvailableAccountsResponse {
  businesses: RedditBusiness[];
}

/**
 * Hook state interface
 */
interface UseAvailableAccountsState {
  businesses: RedditBusiness[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook return type
 */
interface UseAvailableAccountsReturn extends UseAvailableAccountsState {
  fetchAvailableAccounts: (teamId: string) => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook to fetch available Reddit ad accounts after OAuth completion.
 *
 * This hook fetches accounts from the pending OAuth session and returns
 * them grouped by business. Accounts are marked with `alreadyConnected`
 * if they're already linked to the team.
 *
 * @example
 * ```tsx
 * const { businesses, isLoading, error, fetchAvailableAccounts } = useAvailableAccounts();
 *
 * // Fetch accounts for a team
 * useEffect(() => {
 *   if (teamId) {
 *     fetchAvailableAccounts(teamId);
 *   }
 * }, [teamId, fetchAvailableAccounts]);
 * ```
 */
export function useAvailableAccounts(): UseAvailableAccountsReturn {
  const [state, setState] = useState<UseAvailableAccountsState>({
    businesses: [],
    isLoading: false,
    error: null,
  });
  const [lastTeamId, setLastTeamId] = useState<string | null>(null);

  const fetchAvailableAccounts = useCallback(async (teamId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    setLastTeamId(teamId);

    try {
      const response = await api.get<AvailableAccountsResponse>(
        `/api/v1/reddit/available-accounts?teamId=${teamId}`
      );

      setState({
        businesses: response.businesses,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch available accounts";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const refetch = useCallback(async () => {
    if (lastTeamId) {
      await fetchAvailableAccounts(lastTeamId);
    }
  }, [lastTeamId, fetchAvailableAccounts]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    fetchAvailableAccounts,
    refetch,
    clearError,
  };
}
