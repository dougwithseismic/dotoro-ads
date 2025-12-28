"use client";

import { useEffect } from "react";

interface SettingsErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Settings Error Boundary
 *
 * Catches runtime errors in the settings pages and displays a user-friendly
 * error message with a retry option. This prevents the entire app from
 * crashing when settings components encounter errors.
 *
 * Common scenarios:
 * - Date formatting failures
 * - Network errors during session fetch
 * - Invalid data from API responses
 */
export default function SettingsError({ error, reset }: SettingsErrorProps) {
  useEffect(() => {
    // Log error for debugging/monitoring
    console.error("Settings error:", error);
  }, [error]);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div
        data-testid="settings-error"
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <div className="w-16 h-16 mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
          Something went wrong
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
          We encountered an error loading your settings. This might be a
          temporary issue. Please try again.
        </p>

        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
        >
          Try again
        </button>

        {/* Show error digest in development for debugging */}
        {process.env.NODE_ENV === "development" && error.digest && (
          <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-500">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </main>
  );
}
