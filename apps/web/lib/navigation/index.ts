/**
 * Navigation Utilities
 *
 * Team-aware navigation utilities for URL handling and routing.
 */

export {
  buildTeamPath,
  extractTeamSlug,
  isTeamScopedRoute,
  getTeamPathWithoutSlug,
  buildFullTeamPath,
  replaceTeamSlug,
  buildAdminPath,
  NON_TEAM_ROUTES,
  TEAM_SCOPED_ROUTES,
  TEAM_ROUTES,
  ADMIN_ROUTES,
} from "./team-routes";

export { useTeamNavigation, TeamNavigationProvider } from "./TeamNavigationProvider";
