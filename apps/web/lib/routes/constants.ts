/**
 * Route Constants
 *
 * Centralized, type-safe route path constants for the entire application.
 * These are PATH constants (e.g., `/dashboard`), not full URLs.
 * Use with TeamLink or route builders to construct full URLs with locale/team context.
 *
 * @example
 * ```tsx
 * import { TEAM_ROUTES } from '@/lib/routes';
 *
 * // With TeamLink (automatically adds locale/teamSlug)
 * <TeamLink href={TEAM_ROUTES.DASHBOARD}>Dashboard</TeamLink>
 *
 * // With dynamic routes
 * <TeamLink href={TEAM_ROUTES.CAMPAIGN_DETAIL(campaignId)}>View Campaign</TeamLink>
 * ```
 */

/**
 * Team-scoped route paths.
 * These routes require team context and should be used with TeamLink or buildTeamRoute.
 *
 * Static routes are string constants.
 * Dynamic routes are functions that accept parameters and return a path string.
 */
export const TEAM_ROUTES = {
  /** Dashboard - Team overview page */
  DASHBOARD: "/dashboard",

  /** Campaigns - List of all campaigns */
  CAMPAIGNS: "/campaigns",

  /** Campaign detail page */
  CAMPAIGN_DETAIL: (id: string) => `/campaigns/${id}`,

  /** Campaign Sets - List of all campaign sets */
  CAMPAIGN_SETS: "/campaign-sets",

  /** Campaign set detail page */
  CAMPAIGN_SET_DETAIL: (id: string) => `/campaign-sets/${id}`,

  /** Create new campaign set */
  CAMPAIGN_SET_NEW: "/campaign-sets/new",

  /** Edit campaign set */
  CAMPAIGN_SET_EDIT: (id: string) => `/campaign-sets/${id}/edit`,

  /** Data Sources - List of all data sources */
  DATA_SOURCES: "/data-sources",

  /** Data source detail page */
  DATA_SOURCE_DETAIL: (id: string) => `/data-sources/${id}`,

  /** Templates - List of all templates */
  TEMPLATES: "/templates",

  /** Template editor - Create new template */
  TEMPLATE_EDITOR: "/templates/editor",

  /** Edit existing template */
  TEMPLATE_EDIT: (id: string) => `/templates/editor/${id}`,

  /** Preview template */
  TEMPLATE_PREVIEW: (id: string) => `/templates/${id}/preview`,

  /** Transforms - List of all transforms */
  TRANSFORMS: "/transforms",

  /** Transform builder - Create new transform */
  TRANSFORM_BUILDER: "/transforms/builder",

  /** Edit existing transform */
  TRANSFORM_EDIT: (id: string) => `/transforms/builder/${id}`,

  /** Rules - List of all rules */
  RULES: "/rules",

  /** Rule builder - Create new rule */
  RULE_BUILDER: "/rules/builder",

  /** Edit existing rule */
  RULE_EDIT: (id: string) => `/rules/builder/${id}`,

  /** Accounts - Connected accounts management */
  ACCOUNTS: "/accounts",

  /** Assets - Asset library with folder organization */
  ASSETS: "/assets",

  /** Settings - Team settings overview */
  SETTINGS: "/settings",

  /** Profile settings */
  SETTINGS_PROFILE: "/settings/profile",

  /** Team settings */
  SETTINGS_TEAM: "/settings/team",
} as const;

/**
 * Authentication route paths.
 * These routes are not team-scoped and should be used with buildAuthRoute.
 */
export const AUTH_ROUTES = {
  /** Login page */
  LOGIN: "/login",

  /** Email verification page */
  VERIFY: "/verify",
} as const;

/**
 * Admin panel route paths.
 * These routes require admin privileges and should be used with buildAdminRoute.
 */
export const ADMIN_ROUTES = {
  /** Admin dashboard */
  DASHBOARD: "/admin",

  /** User management list */
  USERS: "/admin/users",

  /** User detail page */
  USER_DETAIL: (id: string) => `/admin/users/${id}`,

  /** Create new user */
  USER_NEW: "/admin/users/new",

  /** Admin settings */
  SETTINGS: "/admin/settings",
} as const;

/**
 * Global route paths.
 * These routes are not team-scoped and should be used with buildGlobalRoute.
 */
export const GLOBAL_ROUTES = {
  /** Home/landing page */
  HOME: "/",

  /** Team invitation acceptance page */
  INVITE: (token: string) => `/invite/${token}`,
} as const;

/**
 * Type for extracting route keys from a routes object
 */
export type TeamRouteKey = keyof typeof TEAM_ROUTES;
export type AuthRouteKey = keyof typeof AUTH_ROUTES;
export type AdminRouteKey = keyof typeof ADMIN_ROUTES;
export type GlobalRouteKey = keyof typeof GLOBAL_ROUTES;

/**
 * Type helper for dynamic route functions
 */
export type DynamicRoute<T extends string = string> = (param: T) => string;
