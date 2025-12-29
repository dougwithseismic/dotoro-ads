"use client";

/**
 * Team Navigation Provider
 *
 * Provides team-aware navigation context and utilities to all components.
 * Works with the URL-based team routing system.
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import {
  buildTeamPath,
  getTeamPathWithoutSlug,
  replaceTeamSlug,
} from "./team-routes";

/**
 * Team Navigation Context Value
 */
export interface TeamNavigationContextValue {
  /** The current team slug from URL */
  teamSlug: string | null;
  /** The current locale from URL */
  locale: string;
  /** The current path without team slug (e.g., "/dashboard") */
  currentPath: string;
  /** Build a full path with current team context */
  buildPath: (path: string) => string;
  /** Navigate to a path within current team context */
  navigateTo: (path: string) => void;
  /** Switch to a different team while preserving current page */
  switchTeam: (newTeamSlug: string) => void;
}

const TeamNavigationContext = createContext<TeamNavigationContextValue | null>(
  null
);

/**
 * Hook to access team navigation utilities
 * @throws Error if used outside TeamNavigationProvider
 */
export function useTeamNavigation(): TeamNavigationContextValue {
  const context = useContext(TeamNavigationContext);
  if (!context) {
    throw new Error(
      "useTeamNavigation must be used within a TeamNavigationProvider"
    );
  }
  return context;
}

/**
 * Props for TeamNavigationProvider
 */
interface TeamNavigationProviderProps {
  children: ReactNode;
}

/**
 * Team Navigation Provider
 *
 * Wraps components that need team-aware navigation utilities.
 * Should be placed inside the [locale]/[teamSlug] layout.
 */
export function TeamNavigationProvider({
  children,
}: TeamNavigationProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  // Extract values from URL params
  const teamSlug = (params?.teamSlug as string) || null;
  const locale = (params?.locale as string) || "en";

  // Get current path without locale and team slug
  const currentPath = useMemo(() => {
    return getTeamPathWithoutSlug(pathname);
  }, [pathname]);

  // Build a full path with team context
  const buildPath = useCallback(
    (path: string): string => {
      if (!teamSlug) {
        // Fallback if no team slug (shouldn't happen in team context)
        return `/${locale}${path.startsWith("/") ? path : `/${path}`}`;
      }
      const teamPath = buildTeamPath(teamSlug, path);
      return `/${locale}${teamPath}`;
    },
    [teamSlug, locale]
  );

  // Navigate to a path within current team context
  const navigateTo = useCallback(
    (path: string) => {
      const fullPath = buildPath(path);
      router.push(fullPath);
    },
    [router, buildPath]
  );

  // Switch to a different team while preserving current page
  const switchTeam = useCallback(
    (newTeamSlug: string) => {
      const newPath = replaceTeamSlug(pathname, newTeamSlug);
      router.push(newPath);
    },
    [router, pathname]
  );

  const value = useMemo<TeamNavigationContextValue>(
    () => ({
      teamSlug,
      locale,
      currentPath,
      buildPath,
      navigateTo,
      switchTeam,
    }),
    [teamSlug, locale, currentPath, buildPath, navigateTo, switchTeam]
  );

  return (
    <TeamNavigationContext.Provider value={value}>
      {children}
    </TeamNavigationContext.Provider>
  );
}
