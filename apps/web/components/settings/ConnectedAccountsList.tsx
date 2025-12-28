/**
 * ConnectedAccountsList Component
 *
 * Displays a list of all connected authentication methods (OAuth providers, magic link)
 * with the ability to link new providers and unlink existing ones.
 *
 * Features:
 * - Fetches accounts using Better Auth client
 * - Loading skeleton while fetching
 * - Error state with retry button
 * - Connect buttons for unlinked providers
 * - Unlink with safety check for last auth method
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { listAccounts, linkSocial, unlinkAccount } from "@/lib/auth-client";
import { ConnectedAccountCard, type ConnectedAccount } from "./ConnectedAccountCard";

/**
 * Account data from Better Auth API
 */
interface BetterAuthAccount {
  id: string;
  providerId: string;
  accountId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Date | null;
  refreshTokenExpiresAt: Date | null;
  scope: string | null;
  password: string | null;
}

/**
 * Available OAuth providers that can be linked
 */
const AVAILABLE_PROVIDERS = [
  { id: "google", name: "Google" },
  { id: "github", name: "GitHub" },
] as const;

type OAuthProvider = (typeof AVAILABLE_PROVIDERS)[number]["id"];

/**
 * Loading skeleton component for account cards
 */
function AccountSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-3 w-36 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
      <div className="h-8 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
    </div>
  );
}

/**
 * Loading state component
 */
function AccountsLoading() {
  return (
    <div data-testid="accounts-loading" className="space-y-3">
      <AccountSkeleton />
      <AccountSkeleton />
    </div>
  );
}

/**
 * Error state component
 */
function AccountsError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-red-500 dark:text-red-400 mb-4">
        Failed to load connected accounts. Please try again.
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
 * Empty state component
 */
function AccountsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-neutral-500 dark:text-neutral-400">
        No accounts connected. Link an account below to enable additional sign-in methods.
      </p>
    </div>
  );
}

/**
 * Google brand icon (small version for connect button)
 */
function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/**
 * GitHub brand icon (small version for connect button)
 */
function GitHubIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Connect button component for adding new OAuth providers
 */
function ConnectProviderButton({
  provider,
  name,
  onConnect,
  isConnecting,
  disabled,
}: {
  provider: OAuthProvider;
  name: string;
  onConnect: (provider: OAuthProvider) => void;
  isConnecting: boolean;
  disabled: boolean;
}) {
  const handleClick = () => {
    onConnect(provider);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isConnecting}
      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isConnecting ? (
        <span
          data-testid={`connect-loading-${provider}`}
          className="w-4 h-4 border-2 border-neutral-400/30 border-t-neutral-600 dark:border-neutral-500/30 dark:border-t-neutral-300 rounded-full animate-spin"
        />
      ) : (
        <>
          {provider === "google" && <GoogleIcon />}
          {provider === "github" && <GitHubIcon />}
        </>
      )}
      Connect {name}
    </button>
  );
}

/**
 * ConnectedAccountsList - Main component for displaying and managing connected accounts
 *
 * @example
 * ```tsx
 * // In Settings page Security tab
 * <ConnectedAccountsList />
 * ```
 */
export function ConnectedAccountsList() {
  const [accounts, setAccounts] = useState<BetterAuthAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<OAuthProvider | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  /**
   * Fetch accounts from Better Auth
   */
  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setUnlinkError(null);
    setConnectError(null);

    try {
      const result = await listAccounts();

      if (result.error) {
        setError(result.error.message || "Failed to load connected accounts");
        setAccounts([]);
        return;
      }

      if (result.data) {
        // Sort by createdAt ascending (oldest first)
        const sortedAccounts = [...result.data].sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        setAccounts(sortedAccounts);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
      setError("Failed to load connected accounts");
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  /**
   * Handle connecting a new OAuth provider
   */
  const handleConnectProvider = async (provider: OAuthProvider) => {
    setConnectingProvider(provider);
    setConnectError(null);

    try {
      const result = await linkSocial({
        provider,
        callbackURL: "/settings?tab=security",
      });

      if (result.error) {
        setConnectError(result.error.message || `Failed to connect ${provider}`);
        setConnectingProvider(null);
      }
      // On success, Better Auth will redirect to OAuth provider
    } catch (err) {
      console.error(`Failed to connect ${provider}:`, err);
      setConnectError(err instanceof Error ? err.message : "An unexpected error occurred");
      setConnectingProvider(null);
    }
  };

  /**
   * Handle unlinking an account
   */
  const handleUnlinkAccount = async (providerId: string) => {
    setIsUnlinking(true);
    setUnlinkError(null);

    try {
      const result = await unlinkAccount({ providerId });

      if (result.error) {
        const errorMessage = result.error.message || "Failed to disconnect account";
        console.error("Failed to unlink account:", result.error);
        setUnlinkError(errorMessage);
        throw new Error(errorMessage); // Throw to keep dialog open
      }

      // Remove account from list
      setAccounts((prev) => prev.filter((a) => a.providerId !== providerId));
    } catch (err) {
      // Always update error state - don't check previous unlinkError value
      // React state updates are async, so checking !unlinkError would use stale state
      if (err instanceof Error) {
        setUnlinkError(err.message);
      }
      throw err; // Re-throw to keep dialog open in ConnectedAccountCard
    } finally {
      setIsUnlinking(false);
    }
  };

  // Loading state
  if (isLoading) {
    return <AccountsLoading />;
  }

  // Error state
  if (error) {
    return <AccountsError onRetry={fetchAccounts} />;
  }

  // Get linked provider IDs
  const linkedProviderIds = new Set(accounts.map((a) => a.providerId));

  // Providers that can be connected
  const unlinkedProviders = AVAILABLE_PROVIDERS.filter(
    (p) => !linkedProviderIds.has(p.id)
  );

  // Can only unlink if there's more than one account
  const canUnlink = accounts.length > 1;

  // Convert Better Auth accounts to ConnectedAccount format
  const connectedAccounts: ConnectedAccount[] = accounts.map((a) => ({
    id: a.id,
    providerId: a.providerId,
    accountId: a.accountId,
    createdAt: new Date(a.createdAt),
  }));

  return (
    <div className="space-y-6">
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {accounts.length} connected account{accounts.length === 1 ? "" : "s"}
        </p>
      </div>

      {/* Error messages */}
      {unlinkError && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{unlinkError}</p>
          <button
            type="button"
            onClick={() => setUnlinkError(null)}
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

      {connectError && (
        <div
          role="alert"
          className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <p className="text-sm text-red-600 dark:text-red-400">{connectError}</p>
          <button
            type="button"
            onClick={() => setConnectError(null)}
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

      {/* Connected accounts list or empty state */}
      {accounts.length === 0 ? (
        <AccountsEmpty />
      ) : (
        <div className="space-y-3">
          {connectedAccounts.map((account) => (
            <ConnectedAccountCard
              key={account.id}
              account={account}
              canUnlink={canUnlink}
              onUnlink={handleUnlinkAccount}
              isUnlinking={isUnlinking}
            />
          ))}
        </div>
      )}

      {/* Connect new provider section */}
      {unlinkedProviders.length > 0 && (
        <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
            Connect another account
          </p>
          <div className="flex flex-wrap gap-3">
            {unlinkedProviders.map((provider) => (
              <ConnectProviderButton
                key={provider.id}
                provider={provider.id}
                name={provider.name}
                onConnect={handleConnectProvider}
                isConnecting={connectingProvider === provider.id}
                disabled={connectingProvider !== null}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
