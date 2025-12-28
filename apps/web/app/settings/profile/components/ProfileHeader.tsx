"use client";

import Image from "next/image";

interface ProfileHeaderProps {
  name?: string | null;
  email: string;
  image?: string | null;
}

/**
 * Gets initials from a name or email
 * - For names with multiple words: first letter of first and last word
 * - For single word names: first letter only
 * - For empty/null names: first letter of email (local part only)
 */
function getInitials(name: string | null | undefined, email: string): string {
  // If name is provided and not empty, use name-based initials
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];

    if (parts.length === 0 || !firstPart) {
      return "?";
    }

    if (parts.length === 1) {
      return firstPart.charAt(0).toUpperCase();
    }

    if (!lastPart) {
      return firstPart.charAt(0).toUpperCase();
    }

    return (firstPart.charAt(0) + lastPart.charAt(0)).toUpperCase();
  }

  // Fall back to email - use first letter of local part (before @)
  const localPart = email.split("@")[0];
  if (localPart && localPart.length > 0) {
    return localPart.charAt(0).toUpperCase();
  }

  return "?";
}

/**
 * ProfileHeader Component
 *
 * Displays the user's avatar (or initials), name, and email.
 * Used at the top of the profile settings page.
 */
export function ProfileHeader({ name, email, image }: ProfileHeaderProps) {
  const displayName = name?.trim() || email;
  const initials = getInitials(name, email);
  const showEmailSeparately = name?.trim() && name.trim() !== email;

  return (
    <div data-testid="profile-header" className="flex items-center gap-4">
      {/* Avatar */}
      <div className="relative">
        {image ? (
          <Image
            src={image}
            alt={`${displayName}'s avatar`}
            width={64}
            height={64}
            className="rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700"
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center ring-2 ring-neutral-200 dark:ring-neutral-700"
            aria-label={`${displayName}'s avatar (initials)`}
          >
            <span className="text-xl font-semibold text-blue-700 dark:text-blue-300">
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Name and Email */}
      <div className="flex flex-col">
        <h2
          data-testid="profile-display-name"
          className="text-xl font-semibold text-neutral-900 dark:text-neutral-100"
        >
          {displayName}
        </h2>
        {showEmailSeparately && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {email}
          </span>
        )}
      </div>
    </div>
  );
}
