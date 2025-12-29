/**
 * Team Storage Utilities
 *
 * Provides localStorage and cookie persistence for the current team selection.
 * - localStorage: Used for client-side state persistence
 * - Cookies: Used for middleware access (server-side routing)
 *
 * Handles SSR gracefully by checking for window availability.
 */

/**
 * localStorage key for storing the current team ID
 */
export const STORAGE_KEY = "dotoro_current_team_id";

/**
 * Cookie name for storing the current team slug
 * Used by middleware for team-based routing
 */
export const TEAM_SLUG_COOKIE = "dotoro_team_slug";

/**
 * Check if we're in a browser environment
 */
function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Get the stored team ID from localStorage
 * @returns The stored team ID or null if not found
 */
export function getStoredTeamId(): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const storedId = localStorage.getItem(STORAGE_KEY);
    // Return null for empty strings
    return storedId || null;
  } catch {
    // Handle cases where localStorage is not available (e.g., private browsing)
    return null;
  }
}

/**
 * Store the current team ID in localStorage
 * @param teamId - The team ID to store
 */
export function setStoredTeamId(teamId: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, teamId);
  } catch {
    // Handle cases where localStorage is not available
    console.warn("Unable to save team ID to localStorage");
  }
}

/**
 * Remove the stored team ID from localStorage
 */
export function clearStoredTeamId(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Handle cases where localStorage is not available
    console.warn("Unable to clear team ID from localStorage");
  }
}

/**
 * Get the stored team slug from cookie
 * @returns The stored team slug or null if not found
 */
export function getStoredTeamSlug(): string | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split("=");
      if (name === TEAM_SLUG_COOKIE) {
        return decodeURIComponent(value || "") || null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Store the current team slug in a cookie
 * This makes it available to middleware for routing
 *
 * @param teamSlug - The team slug to store
 */
export function setStoredTeamSlug(teamSlug: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    // Set cookie with path=/ so it's accessible across the site
    // Max age: 1 year (in seconds)
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${TEAM_SLUG_COOKIE}=${encodeURIComponent(teamSlug)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    console.warn("Unable to save team slug to cookie");
  }
}

/**
 * Remove the stored team slug cookie
 */
export function clearStoredTeamSlug(): void {
  if (!isBrowser()) {
    return;
  }

  try {
    // Set cookie with max-age=0 to delete it
    document.cookie = `${TEAM_SLUG_COOKIE}=; path=/; max-age=0`;
  } catch {
    console.warn("Unable to clear team slug cookie");
  }
}
