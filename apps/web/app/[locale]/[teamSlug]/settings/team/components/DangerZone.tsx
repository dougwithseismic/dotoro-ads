/**
 * DangerZone Component
 *
 * Danger zone section for team settings containing destructive actions
 * like team deletion. Owner-only access with confirmation dialog.
 */

"use client";

import { useState, useId } from "react";
import { useRouter, useParams } from "next/navigation";
import { Trash2, AlertTriangle } from "lucide-react";
import { SettingsSection } from "../../components/SettingsSection";

interface DangerZoneProps {
  /** The team's ID */
  teamId: string;
  /** The team's name (for confirmation) */
  teamName: string;
  /** Whether the current user is the team owner */
  isOwner: boolean;
  /** Callback to delete the team */
  onDelete: (teamId: string) => Promise<void>;
  /** Additional CSS classes */
  className?: string;
}

/**
 * DangerZone - Team deletion and other destructive actions
 *
 * Features:
 * - Owner-only visibility
 * - Delete team with confirmation dialog
 * - Requires typing team name to confirm
 * - Loading state during deletion
 * - Error handling with clear messaging
 * - Redirects to dashboard after deletion
 *
 * @example
 * ```tsx
 * <DangerZone
 *   teamId="team-1"
 *   teamName="My Team"
 *   isOwner={true}
 *   onDelete={async (id) => await deleteTeam(id)}
 * />
 * ```
 */
export function DangerZone({
  teamId,
  teamName,
  isOwner,
  onDelete,
  className = "",
}: DangerZoneProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleId = useId();
  const isConfirmed = confirmText === teamName;

  // Don't render if not owner
  if (!isOwner) {
    return null;
  }

  const handleOpenDialog = () => {
    setShowDialog(true);
    setConfirmText("");
    setError(null);
  };

  const handleCloseDialog = () => {
    if (isDeleting) return;
    setShowDialog(false);
    setConfirmText("");
    setError(null);
  };

  const handleDelete = async () => {
    if (!isConfirmed || isDeleting) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(teamId);
      // Redirect to dashboard after successful deletion
      router.push(`/${locale}/dashboard`);
    } catch (err) {
      setError(
        `Failed to delete team: ${err instanceof Error ? err.message : "Unknown error"}`
      );
      setIsDeleting(false);
    }
  };

  return (
    <div data-testid="danger-zone" className={className}>
      <SettingsSection
        title="Danger Zone"
        description="Irreversible actions that will permanently affect your team."
        variant="danger"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Delete this team
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/70">
              Once deleted, all team data, campaigns, and settings will be permanently removed.
            </p>
          </div>

          <button
            onClick={handleOpenDialog}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            Delete Team
          </button>
        </div>
      </SettingsSection>

      {/* Confirmation Dialog */}
      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={handleCloseDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Warning Icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3
                id={titleId}
                className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
              >
                Delete Team
              </h3>
            </div>

            {/* Warning Message */}
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
              This action cannot be undone. This will permanently delete the{" "}
              <strong className="text-neutral-900 dark:text-neutral-100">
                {teamName}
              </strong>{" "}
              team and all associated data including:
            </p>

            <ul className="text-sm text-neutral-600 dark:text-neutral-400 list-disc list-inside mb-4 space-y-1">
              <li>All team members and their access</li>
              <li>All campaign sets and campaigns</li>
              <li>All data sources and configurations</li>
              <li>All pending invitations</li>
            </ul>

            {/* Confirmation Input */}
            <div className="mb-4">
              <label
                htmlFor="confirm-team-name"
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
              >
                Type <strong>{teamName}</strong> to confirm
              </label>
              <input
                id="confirm-team-name"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                disabled={isDeleting}
                placeholder={teamName}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:opacity-50"
              />
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mb-4" role="alert">
                {error}
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseDialog}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                data-testid="confirm-delete-button"
                onClick={handleDelete}
                disabled={!isConfirmed || isDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <>
                    <span
                      data-testid="delete-loading"
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Team
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
