/**
 * Team URL Routing Utilities
 *
 * Provides utilities for building and parsing team-scoped URLs.
 * Used throughout the application for team-aware navigation.
 */

import { locales } from "@/src/i18n/config";

/**
 * Team-scoped route constants.
 * Use these throughout the application to avoid hardcoded strings.
 *
 * @example
 * // In a component with TeamLink
 * <TeamLink href={TEAM_ROUTES.CAMPAIGN_SETS}>Campaign Sets</TeamLink>
 *
 * // With useTeamNavigation hook
 * const { navigateTo } = useTeamNavigation();
 * navigateTo(TEAM_ROUTES.CAMPAIGN_SET_DETAIL("123"));
 */
export const TEAM_ROUTES = {
  // Dashboard
  DASHBOARD: "/dashboard",

  // Campaign Sets
  CAMPAIGN_SETS: "/campaign-sets",
  CAMPAIGN_SET_NEW: "/campaign-sets/new",
  CAMPAIGN_SET_DETAIL: (id: string) => `/campaign-sets/${id}`,
  CAMPAIGN_SET_EDIT: (id: string) => `/campaign-sets/${id}/edit`,

  // Campaigns
  CAMPAIGNS: "/campaigns",
  CAMPAIGN_DETAIL: (id: string) => `/campaigns/${id}`,

  // Data Sources
  DATA_SOURCES: "/data-sources",
  DATA_SOURCE_DETAIL: (id: string) => `/data-sources/${id}`,

  // Templates
  TEMPLATES: "/templates",
  TEMPLATE_DETAIL: (id: string) => `/templates/${id}`,
  TEMPLATE_EDIT: (id: string) => `/templates/${id}/edit`,
  TEMPLATE_EDITOR: "/templates/editor",
  TEMPLATE_EDITOR_ID: (id: string) => `/templates/editor/${id}`,

  // Transforms
  TRANSFORMS: "/transforms",
  TRANSFORM_BUILDER: "/transforms/builder",
  TRANSFORM_EDIT: (id: string) => `/transforms/builder/${id}`,

  // Rules
  RULES: "/rules",
  RULE_BUILDER: "/rules/builder",
  RULE_EDIT: (id: string) => `/rules/builder/${id}`,

  // Accounts
  ACCOUNTS: "/accounts",

  // Settings
  SETTINGS: "/settings",
  SETTINGS_PROFILE: "/settings/profile",
  SETTINGS_TEAM: "/settings/team",
} as const;

/**
 * Admin route constants.
 * These are not team-scoped but locale-scoped.
 */
export const ADMIN_ROUTES = {
  DASHBOARD: "/admin",
  USERS: "/admin/users",
  USER_DETAIL: (id: string) => `/admin/users/${id}`,
  USER_NEW: "/admin/users/new",
  USER_EDIT: (id: string) => `/admin/users/${id}/edit`,
  TEAMS: "/admin/teams",
  TEAM_DETAIL: (id: string) => `/admin/teams/${id}`,
} as const;

/**
 * Build a locale-prefixed admin route.
 *
 * @param locale - The current locale
 * @param path - The admin path (e.g., "/admin/users")
 * @returns The full path with locale prefix
 *
 * @example
 * buildAdminPath("en", ADMIN_ROUTES.USERS) // "/en/admin/users"
 * buildAdminPath("en", ADMIN_ROUTES.USER_DETAIL("123")) // "/en/admin/users/123"
 */
export function buildAdminPath(locale: string, path: string): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${cleanPath}`;
}

/**
 * Routes that should NOT be team-scoped.
 * These are accessed without a team slug in the URL.
 */
export const NON_TEAM_ROUTES = [
  "login",
  "verify",
  "admin",
  "invite",
  "(auth)", // Auth route group
] as const;

/**
 * Team-scoped route prefixes.
 * Routes starting with these paths require team context.
 */
export const TEAM_SCOPED_ROUTES = [
  "dashboard",
  "campaign-sets",
  "campaigns",
  "data-sources",
  "templates",
  "transforms",
  "rules",
  "accounts",
  "settings",
] as const;

/**
 * Build a team-scoped path by prepending the team slug.
 *
 * @param teamSlug - The team's URL-friendly slug
 * @param path - The path within the team context
 * @returns The full path including team slug
 *
 * @example
 * buildTeamPath("acme-corp", "/dashboard") // "/acme-corp/dashboard"
 * buildTeamPath("acme-corp", "/") // "/acme-corp"
 */
export function buildTeamPath(teamSlug: string, path: string): string {
  const cleanSlug = teamSlug.trim();
  const cleanPath = path.trim();

  // Handle empty path or root path
  if (!cleanPath || cleanPath === "/") {
    return `/${cleanSlug}`;
  }

  // Ensure path starts with /
  const normalizedPath = cleanPath.startsWith("/")
    ? cleanPath
    : `/${cleanPath}`;

  return `/${cleanSlug}${normalizedPath}`;
}

/**
 * Extract the team slug from a full pathname.
 *
 * @param pathname - The full URL pathname (e.g., "/en/acme-corp/dashboard")
 * @returns The team slug or null if not found
 *
 * @example
 * extractTeamSlug("/en/acme-corp/dashboard") // "acme-corp"
 * extractTeamSlug("/en/login") // null
 */
export function extractTeamSlug(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);

  // Must have at least locale and team slug
  if (segments.length < 2) {
    return null;
  }

  const [localeSegment, potentialTeamSlug] = segments;

  // Verify first segment is a valid locale
  if (!locales.includes(localeSegment as (typeof locales)[number])) {
    return null;
  }

  // Check if the second segment is a non-team route
  if (isNonTeamRouteSegment(potentialTeamSlug!)) {
    return null;
  }

  return potentialTeamSlug ?? null;
}

/**
 * Check if a path is team-scoped (requires team context).
 *
 * @param pathname - The path to check (can be with or without locale)
 * @returns True if the route requires team context
 *
 * @example
 * isTeamScopedRoute("/dashboard") // true
 * isTeamScopedRoute("/login") // false
 */
export function isTeamScopedRoute(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return false;
  }

  // Remove locale prefix if present
  const pathSegments = locales.includes(
    segments[0] as (typeof locales)[number]
  )
    ? segments.slice(1)
    : segments;

  if (pathSegments.length === 0) {
    return false;
  }

  // Get the first meaningful segment (might be team slug or route)
  const firstSegment = pathSegments[0];

  // Check if it's a known non-team route
  if (isNonTeamRouteSegment(firstSegment!)) {
    return false;
  }

  // Check if it's a known team-scoped route
  // If first segment could be a team slug, check the second segment
  const routeSegment =
    pathSegments.length > 1 ? pathSegments[1] : pathSegments[0];

  return TEAM_SCOPED_ROUTES.some(
    (route) =>
      routeSegment === route ||
      routeSegment?.startsWith(`${route}/`) ||
      firstSegment === route ||
      firstSegment?.startsWith(`${route}/`)
  );
}

/**
 * Get the path portion after removing the team slug.
 *
 * @param pathname - The full pathname with locale and team slug
 * @returns The path without locale and team slug
 *
 * @example
 * getTeamPathWithoutSlug("/en/acme-corp/dashboard") // "/dashboard"
 * getTeamPathWithoutSlug("/en/acme-corp") // "/"
 */
export function getTeamPathWithoutSlug(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);

  // Handle query params
  const queryIndex = pathname.indexOf("?");
  const queryString = queryIndex !== -1 ? pathname.slice(queryIndex) : "";

  if (segments.length < 2) {
    return pathname;
  }

  const [localeSegment, potentialTeamSlug, ...rest] = segments;

  // Verify first segment is a valid locale
  if (!locales.includes(localeSegment as (typeof locales)[number])) {
    return pathname;
  }

  // If second segment is a non-team route, keep it
  if (isNonTeamRouteSegment(potentialTeamSlug!)) {
    const pathWithoutLocale = "/" + segments.slice(1).join("/");
    // Remove query string from path since it's added back at the end
    const cleanPath = pathWithoutLocale.split("?")[0];
    return cleanPath + queryString;
  }

  // Remove both locale and team slug, keep the rest
  if (rest.length === 0) {
    return "/";
  }

  const restPath = "/" + rest.join("/");
  // Remove query params from rest path if present (they're already in queryString)
  const cleanRestPath = restPath.split("?")[0];
  return cleanRestPath + queryString;
}

/**
 * Check if a segment is a known non-team route.
 */
function isNonTeamRouteSegment(segment: string): boolean {
  // Remove query params for checking
  const cleanSegment = segment.split("?")[0];
  return NON_TEAM_ROUTES.some(
    (route) =>
      cleanSegment === route ||
      cleanSegment?.startsWith(`${route}/`) ||
      cleanSegment?.startsWith(`${route}?`)
  );
}

/**
 * Build a full URL with locale and team context.
 *
 * @param locale - The locale code
 * @param teamSlug - The team's URL-friendly slug
 * @param path - The path within the team context
 * @returns The full path with locale and team
 *
 * @example
 * buildFullTeamPath("en", "acme-corp", "/dashboard") // "/en/acme-corp/dashboard"
 */
export function buildFullTeamPath(
  locale: string,
  teamSlug: string,
  path: string
): string {
  const teamPath = buildTeamPath(teamSlug, path);
  return `/${locale}${teamPath}`;
}

/**
 * Replace the team slug in a path with a new one.
 * Useful for team switching while preserving the current page.
 *
 * @param pathname - The current full pathname
 * @param newTeamSlug - The new team slug to use
 * @returns The path with the new team slug
 *
 * @example
 * replaceTeamSlug("/en/acme-corp/dashboard", "new-team") // "/en/new-team/dashboard"
 */
export function replaceTeamSlug(
  pathname: string,
  newTeamSlug: string
): string {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2) {
    return pathname;
  }

  const [localeSegment, , ...rest] = segments;

  // Verify first segment is a valid locale
  if (!locales.includes(localeSegment as (typeof locales)[number])) {
    return pathname;
  }

  // Build new path with new team slug
  const restPath = rest.length > 0 ? `/${rest.join("/")}` : "";
  return `/${localeSegment}/${newTeamSlug}${restPath}`;
}
