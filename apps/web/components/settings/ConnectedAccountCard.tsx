/**
 * ConnectedAccountCard Component
 *
 * Displays information about a single connected authentication method including:
 * - Provider icon and name (Google, GitHub, Email/Magic Link)
 * - Connected timestamp
 * - Disconnect button with confirmation (respects minimum account check)
 */

"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/app/settings/components/ConfirmDialog";

/**
 * Connected account data structure matching Better Auth account
 */
export interface ConnectedAccount {
  id: string;
  providerId: string;
  accountId: string;
  createdAt: Date;
}

/**
 * Props for ConnectedAccountCard component
 */
export interface ConnectedAccountCardProps {
  /** Account data to display */
  account: ConnectedAccount;
  /** Whether this account can be unlinked (false if it's the only auth method) */
  canUnlink: boolean;
  /** Callback when account is unlinked - receives providerId */
  onUnlink: (providerId: string) => Promise<void>;
  /** Whether an unlink operation is in progress for any account */
  isUnlinking?: boolean;
}

/**
 * Get display name for a provider
 */
function getProviderDisplayName(providerId: string): string {
  const providerNames: Record<string, string> = {
    google: "Google",
    github: "GitHub",
    credential: "Email",
  };
  return providerNames[providerId] || "Unknown Provider";
}

/**
 * Format a date as a relative or absolute time string
 */
function formatAccountDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  }
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Google brand icon
 */
function GoogleIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
 * GitHub brand icon
 */
function GitHubIcon() {
  return (
    <svg
      className="w-5 h-5 text-neutral-900 dark:text-neutral-100"
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
 * Email/Magic Link icon
 */
function EmailIcon() {
  return (
    <svg
      className="w-5 h-5 text-neutral-500 dark:text-neutral-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * Default/unknown provider icon
 */
function DefaultIcon() {
  return (
    <svg
      className="w-5 h-5 text-neutral-500 dark:text-neutral-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
      />
    </svg>
  );
}

/**
 * Provider icon component based on provider ID
 */
function ProviderIcon({ providerId }: { providerId: string }) {
  const testId = `provider-icon-${providerId === "credential" ? "email" : providerId}`;

  return (
    <div data-testid={testId}>
      {providerId === "google" && <GoogleIcon />}
      {providerId === "github" && <GitHubIcon />}
      {providerId === "credential" && <EmailIcon />}
      {!["google", "github", "credential"].includes(providerId) && <DefaultIcon />}
    </div>
  );
}

/**
 * ConnectedAccountCard - Displays individual connected account with unlink capability
 *
 * Features:
 * - Provider-specific icons (Google, GitHub, Email)
 * - Connected timestamp with relative formatting
 * - Disconnect button with confirmation dialog
 * - Safety check to prevent unlinking last auth method
 *
 * @example
 * ```tsx
 * <ConnectedAccountCard
 *   account={account}
 *   canUnlink={accounts.length > 1}
 *   onUnlink={handleUnlink}
 * />
 * ```
 */
export function ConnectedAccountCard({
  account,
  canUnlink,
  onUnlink,
  isUnlinking = false,
}: ConnectedAccountCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isUnlinkingThis, setIsUnlinkingThis] = useState(false);

  const providerName = getProviderDisplayName(account.providerId);

  const handleDisconnectClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmUnlink = async () => {
    setIsUnlinkingThis(true);
    try {
      await onUnlink(account.providerId);
      setShowConfirmDialog(false);
    } catch (error) {
      // Error is handled by parent component (sets error state and displays message)
      // Dialog stays open so user can retry or cancel
      // Log error for debugging purposes
      console.error("Failed to unlink account:", error);
    } finally {
      setIsUnlinkingThis(false);
    }
  };

  const handleCancelUnlink = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div
        data-testid="connected-account-card"
        className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg"
      >
        <div className="flex items-center gap-3">
          {/* Provider Icon */}
          <ProviderIcon providerId={account.providerId} />

          {/* Account Details */}
          <div>
            {/* Provider Name */}
            <div className="font-medium text-neutral-900 dark:text-neutral-100">
              {providerName}
            </div>

            {/* Connected Date */}
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              Connected: {formatAccountDate(account.createdAt)}
            </div>
          </div>
        </div>

        {/* Disconnect Button or Warning */}
        {canUnlink ? (
          <button
            type="button"
            onClick={handleDisconnectClick}
            disabled={isUnlinking}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUnlinkingThis ? (
              <span className="flex items-center gap-2">
                <span
                  data-testid="unlink-loading"
                  className="w-3 h-3 border-2 border-red-600/30 border-t-red-600 dark:border-red-400/30 dark:border-t-red-400 rounded-full animate-spin"
                />
                Disconnecting...
              </span>
            ) : (
              "Disconnect"
            )}
          </button>
        ) : (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 italic">
            Only sign-in method
          </span>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelUnlink}
        onConfirm={handleConfirmUnlink}
        title={`Disconnect ${providerName}`}
        message={`Are you sure you want to disconnect ${providerName} from your account? You will no longer be able to sign in with this method.`}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isUnlinkingThis}
      />
    </>
  );
}
