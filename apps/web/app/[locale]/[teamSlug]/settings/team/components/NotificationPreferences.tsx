/**
 * NotificationPreferences Component
 *
 * Toggle switches for notification settings including email digest
 * and Slack webhook integration.
 */

"use client";

import { useState, useId } from "react";
import { Mail, MessageSquare, Check } from "lucide-react";

// Validate Slack webhook URL format
function isValidSlackWebhook(url: string): boolean {
  if (url === "") return true; // Allow empty to clear
  return url.startsWith("https://hooks.slack.com/services/");
}

interface NotificationPreferencesProps {
  /** Whether email digest is enabled */
  emailDigest: boolean;
  /** Current Slack webhook URL */
  slackWebhook: string;
  /** Callback when email digest is toggled */
  onEmailDigestChange: (enabled: boolean) => Promise<void>;
  /** Callback when Slack webhook is saved */
  onSlackWebhookChange: (url: string) => Promise<void>;
  /** Whether the current user can edit (admin/owner) */
  canEdit: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * NotificationPreferences - Notification settings toggles
 *
 * Features:
 * - Email digest toggle with description
 * - Slack webhook URL input with validation
 * - Loading states for each setting
 * - Error handling with clear messaging
 * - Admin/owner only editability
 *
 * @example
 * ```tsx
 * <NotificationPreferences
 *   emailDigest={settings.notifications?.emailDigest ?? false}
 *   slackWebhook={settings.notifications?.slackWebhook ?? ""}
 *   onEmailDigestChange={async (enabled) => await updateNotification({ emailDigest: enabled })}
 *   onSlackWebhookChange={async (url) => await updateNotification({ slackWebhook: url })}
 *   canEdit={isAdminOrOwner}
 * />
 * ```
 */
export function NotificationPreferences({
  emailDigest,
  slackWebhook,
  onEmailDigestChange,
  onSlackWebhookChange,
  canEdit,
  className = "",
}: NotificationPreferencesProps) {
  const [localEmailDigest, setLocalEmailDigest] = useState(emailDigest);
  const [localSlackWebhook, setLocalSlackWebhook] = useState(slackWebhook);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingSlack, setIsSavingSlack] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [slackError, setSlackError] = useState<string | null>(null);
  const [slackSuccess, setSlackSuccess] = useState(false);

  const emailDigestId = useId();
  const slackWebhookId = useId();

  const handleEmailDigestToggle = async () => {
    const newValue = !localEmailDigest;
    setLocalEmailDigest(newValue);
    setEmailError(null);
    setIsSavingEmail(true);

    try {
      await onEmailDigestChange(newValue);
    } catch (err) {
      // Revert on error
      setLocalEmailDigest(!newValue);
      setEmailError(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSlackWebhookSave = async () => {
    setSlackError(null);
    setSlackSuccess(false);

    // Validate URL format
    if (!isValidSlackWebhook(localSlackWebhook)) {
      setSlackError("Invalid Slack webhook URL. Must start with https://hooks.slack.com/services/");
      return;
    }

    setIsSavingSlack(true);

    try {
      await onSlackWebhookChange(localSlackWebhook);
      setSlackSuccess(true);
      setTimeout(() => setSlackSuccess(false), 3000);
    } catch (err) {
      setSlackError(`Save failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsSavingSlack(false);
    }
  };

  return (
    <div
      data-testid="notification-preferences"
      className={`space-y-6 ${className}`}
    >
      {/* Email Digest Toggle */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <label
              htmlFor={emailDigestId}
              className="text-sm font-medium text-neutral-900 dark:text-neutral-100 cursor-pointer"
            >
              Email digest
            </label>

            <div className="flex items-center gap-2">
              {isSavingEmail && (
                <span
                  data-testid="email-digest-saving"
                  className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"
                />
              )}

              <button
                id={emailDigestId}
                role="checkbox"
                aria-checked={localEmailDigest}
                aria-label="Email digest"
                disabled={!canEdit || isSavingEmail}
                onClick={handleEmailDigestToggle}
                className={`
                  relative w-11 h-6 rounded-full transition-colors
                  ${localEmailDigest ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-600"}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform
                    ${localEmailDigest ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
            </div>
          </div>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Receive a weekly summary of team activity and updates via email.
          </p>

          {emailError && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">
              {emailError}
            </p>
          )}
        </div>
      </div>

      {/* Slack Webhook */}
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <label
            htmlFor={slackWebhookId}
            className="block text-sm font-medium text-neutral-900 dark:text-neutral-100"
          >
            Slack webhook URL
          </label>

          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Get real-time notifications in your Slack channel when important events occur.
          </p>

          <div className="flex gap-2">
            <input
              id={slackWebhookId}
              type="url"
              value={localSlackWebhook}
              onChange={(e) => {
                setLocalSlackWebhook(e.target.value);
                setSlackError(null);
              }}
              disabled={!canEdit || isSavingSlack}
              placeholder="https://hooks.slack.com/services/..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {canEdit && (
              <button
                type="button"
                onClick={handleSlackWebhookSave}
                disabled={isSavingSlack}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSlack ? (
                  <>
                    <span
                      data-testid="slack-saving"
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    />
                    Saving...
                  </>
                ) : slackSuccess ? (
                  <>
                    <Check className="w-4 h-4" />
                    Saved
                  </>
                ) : (
                  "Save webhook"
                )}
              </button>
            )}
          </div>

          {slackError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {slackError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
