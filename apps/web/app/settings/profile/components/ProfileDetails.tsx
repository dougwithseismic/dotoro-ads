"use client";

import { format } from "date-fns";
import { Check, AlertCircle } from "lucide-react";

interface ProfileDetailsProps {
  email: string;
  emailVerified: boolean;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

/**
 * Safely formats a date value with fallback for invalid dates
 *
 * @param dateValue - Date object, ISO string, or null/undefined
 * @param formatStr - date-fns format string
 * @param fallback - Value to return if date is invalid
 */
function safeFormatDate(
  dateValue: Date | string | null | undefined,
  formatStr: string,
  fallback: string = "Unknown"
): string {
  if (!dateValue) return fallback;

  try {
    // Handle both Date objects and ISO strings
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);

    // Check for invalid date
    if (isNaN(date.getTime())) return fallback;

    return format(date, formatStr);
  } catch {
    return fallback;
  }
}

/**
 * ProfileDetails Component
 *
 * Displays account details including:
 * - Email with verification status badge
 * - Member since (account creation date) - only shown if available
 * - Last updated timestamp - only shown if available
 */
export function ProfileDetails({
  email,
  emailVerified,
  createdAt,
  updatedAt,
}: ProfileDetailsProps) {
  const memberSinceDate = safeFormatDate(createdAt, "MMMM yyyy");
  const lastUpdatedDate = safeFormatDate(updatedAt, "MMMM d, yyyy");

  // Determine if we have valid dates to display
  const hasCreatedAt = memberSinceDate !== "Unknown";
  const hasUpdatedAt = lastUpdatedDate !== "Unknown";

  return (
    <div
      data-testid="profile-details"
      className="space-y-6 py-6 border-t border-neutral-200 dark:border-neutral-700"
    >
      {/* Email Section */}
      <div data-testid="email-section" className="space-y-1">
        <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400">
          Email
        </label>
        <div className="flex items-center gap-2">
          <span className="text-neutral-900 dark:text-neutral-100">{email}</span>
          {emailVerified ? (
            <span
              data-testid="verified-badge"
              aria-label="Email verified"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
            >
              <Check className="w-3 h-3" />
              Verified
            </span>
          ) : (
            <span
              data-testid="unverified-badge"
              aria-label="Email not verified"
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
            >
              <AlertCircle className="w-3 h-3" />
              Not verified
            </span>
          )}
        </div>
      </div>

      {/* Member Since Section - only shown if date is available */}
      {hasCreatedAt && (
        <div data-testid="member-since-section" className="space-y-1">
          <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Member since
          </label>
          <span className="text-neutral-900 dark:text-neutral-100">
            {memberSinceDate}
          </span>
        </div>
      )}

      {/* Last Updated Section - only shown if date is available */}
      {hasUpdatedAt && (
        <div data-testid="last-updated" className="space-y-1">
          <label className="block text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Last updated
          </label>
          <span className="text-neutral-900 dark:text-neutral-100">
            {lastUpdatedDate}
          </span>
        </div>
      )}
    </div>
  );
}
