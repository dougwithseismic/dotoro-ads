import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";

/**
 * Connected account info from the API response
 */
export interface ConnectedAccountInfo {
  id: string;
  accountId: string;
  accountName: string;
}

/**
 * API response type for connect accounts endpoint
 */
export interface ConnectAccountsResponse {
  success: boolean;
  connectedCount: number;
  skippedCount?: number;
  connectedAccounts: ConnectedAccountInfo[];
}

/**
 * Hook state interface
 */
interface UseConnectAccountsState {
  isConnecting: boolean;
  error: string | null;
  connectedAccounts: ConnectedAccountInfo[];
}

/**
 * Hook return type
 */
interface UseConnectAccountsReturn extends UseConnectAccountsState {
  connect: (teamId: string, accountIds: string[]) => Promise<ConnectAccountsResponse | null>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Hook to connect selected Reddit ad accounts to a team.
 *
 * This hook handles the API call to connect selected accounts after
 * the user picks which accounts to link from the OAuth pending tokens.
 *
 * @example
 * ```tsx
 * const { connect, isConnecting, error, connectedAccounts } = useConnectAccounts();
 *
 * const handleConfirm = async (selectedIds: string[]) => {
 *   const result = await connect(teamId, selectedIds);
 *   if (result) {
 *     console.log(`Connected ${result.connectedCount} accounts`);
 *   }
 * };
 * ```
 */
export function useConnectAccounts(): UseConnectAccountsReturn {
  const [state, setState] = useState<UseConnectAccountsState>({
    isConnecting: false,
    error: null,
    connectedAccounts: [],
  });

  const connect = useCallback(
    async (
      teamId: string,
      accountIds: string[]
    ): Promise<ConnectAccountsResponse | null> => {
      if (accountIds.length === 0) {
        setState((prev) => ({
          ...prev,
          error: "Please select at least one account to connect",
        }));
        return null;
      }

      setState((prev) => ({
        ...prev,
        isConnecting: true,
        error: null,
      }));

      try {
        const response = await api.post<ConnectAccountsResponse>(
          "/api/v1/reddit/connect-accounts",
          {
            teamId,
            accountIds,
          }
        );

        setState({
          isConnecting: false,
          error: null,
          connectedAccounts: response.connectedAccounts,
        });

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to connect accounts";
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const reset = useCallback(() => {
    setState({
      isConnecting: false,
      error: null,
      connectedAccounts: [],
    });
  }, []);

  return {
    ...state,
    connect,
    clearError,
    reset,
  };
}
