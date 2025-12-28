"use client";

import { useAuth } from "@/lib/auth";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileDetails } from "./components/ProfileDetails";

/**
 * Loading Skeleton Component
 *
 * Displays skeleton UI while profile data is loading
 */
function ProfileLoadingSkeleton() {
  return (
    <div data-testid="profile-loading" className="animate-pulse space-y-6">
      {/* Skeleton Avatar and Name */}
      <div className="flex items-center gap-4">
        <div
          data-testid="skeleton-avatar"
          className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-700"
        />
        <div className="space-y-2" data-testid="skeleton-name">
          <div className="h-6 w-40 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-4 w-56 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>

      {/* Skeleton Details */}
      <div
        data-testid="skeleton-details"
        className="space-y-4 border-t border-neutral-200 dark:border-neutral-700 pt-6"
      >
        <div className="space-y-2">
          <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-5 w-48 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-5 w-36 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    </div>
  );
}

/**
 * Error State Component
 *
 * Displays error message with retry button when profile fails to load
 */
function ProfileErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-red-500 dark:text-red-400 mb-4">
        Unable to load profile. Please try again.
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
 * Profile Settings Page
 *
 * Displays user profile information including:
 * - Avatar, name, and email (via ProfileHeader)
 * - Email verification status, account dates (via ProfileDetails)
 *
 * Handles loading and error states appropriately.
 */
export default function ProfilePage() {
  const { user, isLoading, refreshSession } = useAuth();

  // Loading state
  if (isLoading) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
          Profile Settings
        </h1>
        <ProfileLoadingSkeleton />
      </main>
    );
  }

  // Error state - no user data available
  if (!user) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
          Profile Settings
        </h1>
        <ProfileErrorState onRetry={refreshSession} />
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100 mb-6">
        Profile Settings
      </h1>

      <ProfileHeader
        name={user.name}
        email={user.email}
        image={user.image}
      />

      <ProfileDetails
        email={user.email}
        emailVerified={user.emailVerified}
        createdAt={user.createdAt}
        updatedAt={user.updatedAt}
      />
    </main>
  );
}
