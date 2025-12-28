/**
 * SessionCard Component
 *
 * Displays information about a single user session including:
 * - Device type icon (desktop, mobile, tablet)
 * - Browser and OS information
 * - Masked IP address for privacy
 * - Current session indicator
 * - Created timestamp
 * - Revoke button with confirmation
 */

"use client";

import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { parseUserAgent, maskIpAddress, type DeviceType } from "@/lib/user-agent";
import { ConfirmDialog } from "@/app/settings/components/ConfirmDialog";

/**
 * Session data structure matching Better Auth session
 */
export interface SessionData {
  id: string;
  token: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Props for SessionCard component
 */
export interface SessionCardProps {
  /** Session data to display */
  session: SessionData;
  /** Whether this is the current active session */
  isCurrent: boolean;
  /** Callback when session is revoked - receives session token */
  onRevoke: (token: string) => Promise<void>;
  /** Whether a revoke operation is in progress for any session */
  isRevoking?: boolean;
}

/**
 * Device icon component based on device type
 */
function DeviceIcon({ deviceType }: { deviceType: DeviceType }) {
  switch (deviceType) {
    case "mobile":
      return (
        <Smartphone
          data-testid="device-icon-mobile"
          className="w-5 h-5 text-neutral-500 dark:text-neutral-400"
        />
      );
    case "tablet":
      return (
        <Tablet
          data-testid="device-icon-tablet"
          className="w-5 h-5 text-neutral-500 dark:text-neutral-400"
        />
      );
    default:
      return (
        <Monitor
          data-testid="device-icon-desktop"
          className="w-5 h-5 text-neutral-500 dark:text-neutral-400"
        />
      );
  }
}

/**
 * Format a date as a relative or absolute time string
 */
function formatSessionDate(date: Date): string {
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
 * SessionCard - Displays individual session information with revoke capability
 *
 * Features:
 * - Device type detection and icon display
 * - Browser and OS parsing from user agent
 * - Privacy-respecting IP address masking
 * - Current session badge
 * - Confirmation dialog for session revocation
 *
 * @example
 * ```tsx
 * <SessionCard
 *   session={session}
 *   isCurrent={session.token === currentSessionToken}
 *   onRevoke={handleRevokeSession}
 * />
 * ```
 */
export function SessionCard({
  session,
  isCurrent,
  onRevoke,
  isRevoking = false,
}: SessionCardProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isRevokingThis, setIsRevokingThis] = useState(false);

  const userAgentInfo = parseUserAgent(session.userAgent);
  const maskedIp = maskIpAddress(session.ipAddress);

  const handleRevokeClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmRevoke = async () => {
    setIsRevokingThis(true);
    try {
      await onRevoke(session.token);
      // Only close dialog on successful revocation
      setShowConfirmDialog(false);
    } catch (error) {
      // Error is handled by parent component (SessionsList sets revokeError)
      // Dialog stays open so user can retry or cancel
      // We just catch here to prevent unhandled rejection
      // The finally block will reset the loading state
    } finally {
      setIsRevokingThis(false);
    }
  };

  const handleCancelRevoke = () => {
    setShowConfirmDialog(false);
  };

  return (
    <>
      <div
        data-testid="session-card"
        className="flex items-start justify-between p-4 bg-neutral-50 dark:bg-zinc-800/50 rounded-lg"
      >
        <div className="flex items-start gap-3">
          {/* Device Icon */}
          <div className="mt-0.5">
            <DeviceIcon deviceType={userAgentInfo.deviceType} />
          </div>

          {/* Session Details */}
          <div className="space-y-1">
            {/* Browser and OS */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                {userAgentInfo.displayString}
              </span>
              {isCurrent && (
                <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded">
                  Current session
                </span>
              )}
            </div>

            {/* IP Address and Timestamp */}
            <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span>IP: {maskedIp}</span>
              <span className="text-neutral-300 dark:text-neutral-600">|</span>
              <span>Created: {formatSessionDate(session.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Revoke Button - Only show for non-current sessions */}
        {!isCurrent && (
          <button
            type="button"
            onClick={handleRevokeClick}
            disabled={isRevoking}
            className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRevokingThis ? (
              <span className="flex items-center gap-2">
                <span
                  data-testid="revoke-loading"
                  className="w-3 h-3 border-2 border-red-600/30 border-t-red-600 dark:border-red-400/30 dark:border-t-red-400 rounded-full animate-spin"
                />
                Revoking...
              </span>
            ) : (
              "Revoke"
            )}
          </button>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={handleCancelRevoke}
        onConfirm={handleConfirmRevoke}
        title="Revoke Session"
        message="Are you sure you want to revoke this session? The device will be signed out immediately."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isRevokingThis}
      />
    </>
  );
}
