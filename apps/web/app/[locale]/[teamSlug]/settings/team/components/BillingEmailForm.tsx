/**
 * BillingEmailForm Component
 *
 * Form for managing the team's billing email address.
 * Only team owners can edit this field.
 */

"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface BillingEmailFormProps {
  /** Current billing email (null if not set) */
  currentEmail: string | null;
  /** Callback when email is saved */
  onSave: (email: string) => Promise<void>;
  /** Whether the current user is the team owner */
  isOwner: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Validates email format
 */
function isValidEmail(email: string): boolean {
  if (email === "") return true; // Allow empty to clear billing email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * BillingEmailForm - Edit billing email for the team
 *
 * Features:
 * - Email validation
 * - Owner-only editing
 * - Loading state during save
 * - Success/error feedback
 *
 * @example
 * ```tsx
 * <BillingEmailForm
 *   currentEmail="billing@example.com"
 *   onSave={async (email) => await updateTeam({ billingEmail: email })}
 *   isOwner={true}
 * />
 * ```
 */
export function BillingEmailForm({
  currentEmail,
  onSave,
  isOwner,
  className = "",
}: BillingEmailFormProps) {
  const [email, setEmail] = useState(currentEmail || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset form when currentEmail changes
  useEffect(() => {
    setEmail(currentEmail || "");
  }, [currentEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate email
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSaving(true);

    try {
      await onSave(email);
      setSuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        `Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      data-testid="billing-email-form"
      onSubmit={handleSubmit}
      className={`space-y-3 ${className}`}
    >
      <div>
        <label
          htmlFor="billing-email"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1"
        >
          Billing email
        </label>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">
          Invoices and receipts will be sent to this address.
        </p>
        <input
          id="billing-email"
          type="text"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          disabled={!isOwner || isSaving}
          placeholder="billing@company.com"
          className="w-full max-w-md px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby={error ? "billing-email-error" : undefined}
        />
      </div>

      {/* Validation error */}
      {error && (
        <p
          id="billing-email-error"
          className="text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Success message */}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
          <Check className="w-4 h-4" />
          Saved
        </p>
      )}

      {/* Owner-only message */}
      {!isOwner && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 italic">
          Only the team owner can edit the billing email.
        </p>
      )}

      {/* Save button (owner only) */}
      {isOwner && (
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSaving ? (
            <>
              <span
                data-testid="save-loading"
                className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
              />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </button>
      )}
    </form>
  );
}
