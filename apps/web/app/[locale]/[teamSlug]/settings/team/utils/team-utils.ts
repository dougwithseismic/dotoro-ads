import type { Team } from "@/lib/teams/types";
import { isOwner } from "@/lib/teams/permissions";

/**
 * Determines if a team is a personal team.
 *
 * A team is considered personal if any of the following conditions are met:
 * 1. Team name is exactly "Personal" (case insensitive)
 * 2. Team slug is exactly "personal"
 * 3. Team has exactly 1 member and the user is the owner
 *
 * Personal teams cannot be left or deleted.
 *
 * @param team - The team to check
 * @returns true if the team is a personal team
 */
export function isPersonalTeam(team: Team): boolean {
  // Check if name is exactly "Personal" (case insensitive)
  if (team.name.toLowerCase() === "personal") {
    return true;
  }

  // Check if slug is exactly "personal"
  if (team.slug.toLowerCase() === "personal") {
    return true;
  }

  // Check if single-member owned team
  if (team.memberCount === 1 && isOwner(team.role)) {
    return true;
  }

  return false;
}
