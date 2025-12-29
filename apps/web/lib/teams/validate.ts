/**
 * Team Validation Utilities
 *
 * Server-side validation for team access and membership.
 */

import type { Team } from "./types";

/**
 * Result of team validation
 */
export interface TeamValidationResult {
  /** Whether the team is valid and accessible */
  isValid: boolean;
  /** The team if valid */
  team: Team | null;
  /** Error type if invalid */
  error?: "not_found" | "unauthorized" | "error";
  /** Error message if invalid */
  message?: string;
}

/**
 * Validate that a team exists and the user has access.
 * This is used server-side in layouts to validate team access.
 *
 * Note: In a real implementation, this would make an API call.
 * For now, we validate based on the teams in the user's session.
 *
 * @param teamSlug - The team slug from the URL
 * @param userTeams - The teams the user belongs to
 * @returns Validation result with team or error
 */
export function validateTeamAccess(
  teamSlug: string,
  userTeams: Team[]
): TeamValidationResult {
  // Find team by slug
  const team = userTeams.find((t) => t.slug === teamSlug);

  if (!team) {
    return {
      isValid: false,
      team: null,
      error: "not_found",
      message: `Team "${teamSlug}" not found`,
    };
  }

  // Team exists and user is a member
  return {
    isValid: true,
    team,
  };
}

/**
 * Check if a slug looks like a valid team slug format.
 * Team slugs should be lowercase, alphanumeric with hyphens.
 *
 * @param slug - The slug to validate
 * @returns True if the slug format is valid
 */
export function isValidTeamSlugFormat(slug: string): boolean {
  if (!slug || typeof slug !== "string") {
    return false;
  }

  // Must be 2-50 characters, lowercase alphanumeric with hyphens
  const slugPattern = /^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$|^[a-z0-9]{1,2}$/;
  return slugPattern.test(slug);
}
